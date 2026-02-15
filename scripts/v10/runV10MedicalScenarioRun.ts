import 'dotenv/config';

/**
 * V10 Medical Scenario Runner
 *
 * Headless runner for 10 Fuellung medical scenarios.
 * Tests extraction → facts → askbacks → billing → combinability.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createV10Session } from '../../src/docudent/v10/uiController/createV10Session';
import { resolveScenarioAnswer, type ScenarioAnswerContext, type ScenarioQuestion } from './scenarioAnswerDefaults';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ScenarioSuiteMeta = {
    description?: string;
    version?: string;
    created?: string;
    treatmentId?: string;
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Scenario {
    id: string;
    title: string;
    treatmentId?: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    dictation: string;
    expect: {
        phase: 'output' | 'questions';
        mustIncludePrefixes?: string[];
        mustNotIncludePrefixes?: string[];
        mustIncludeAnyBillingRefs?: string[];
        mustIncludeAllBillingRefs?: string[];
        mustNotIncludeBillingRefs?: string[];
        mustAskbackIds?: string[];
        mustIncludeTextSnippets?: string[];
        mustNotIncludeTextSnippets?: string[];
        mustHavePerInstance?: boolean;
        perInstanceCount?: number;
    };
}

interface CaseResult {
    id: string;
    title: string;
    treatmentId: string;
    insuranceType: string;
    dictation: string;
    phase: string;
    billingRefs: string[];
    questions: string[];
    answersUsed: Record<string, string>;
    perInstanceCount: number;
    textLength: number;
    combinability: string;
    instanceTraces: Array<{
        instanceId: string;
        teeth: string[];
        facts: Record<string, unknown>;
        chips: string[];
    }>;
    outputText?: string;
    pass: boolean;
    failures: string[];
}

interface Report {
    runId: string;
    suiteFile: string;
    meta?: ScenarioSuiteMeta;
    total: number;
    pass: number;
    fail: number;
    cases: CaseResult[];
}

// ═══════════════════════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════════════════════

async function runScenario(scenario: Scenario, options: { defaultTreatmentId?: string }): Promise<CaseResult> {
    const failures: string[] = [];
    const questionsAsked = new Set<string>();
    const answeredQuestions = new Set<string>();
    const answersUsed: Record<string, string> = {};

    const session = createV10Session();

    const treatmentId = scenario.treatmentId ?? options.defaultTreatmentId ?? 'fuellung';
    let state = await session.start(scenario.dictation, {
        treatmentId,
        insuranceType: scenario.insuranceType,
        textLength: 'mittel',
    });

    const recordQuestion = (q: ScenarioQuestion) => {
        questionsAsked.add(q.ruleId ?? q.id);
    };

    if (state.phase === 'questions') {
        const initialQuestions = (state as { questions: Record<string, ScenarioQuestion[]> }).questions;
        for (const questions of Object.values(initialQuestions)) {
            for (const q of questions) {
                recordQuestion(q);
            }
        }
    }

    if (scenario.expect.phase === 'output') {
        let iterations = 0;
        questionLoop: while (state.phase === 'questions' && iterations < 10) {
            iterations++;
            const questionsState = state as {
                phase: 'questions';
                questions: Record<string, ScenarioQuestion[]>;
                instances: Array<{ instanceId: string; facts: Record<string, unknown> }>;
            };
            const instanceFactsById = new Map(
                (questionsState.instances || []).map(inst => [inst.instanceId, inst.facts ?? {}])
            );

            for (const [instanceId, questions] of Object.entries(questionsState.questions)) {
                for (const q of questions) {
                    if (answeredQuestions.has(q.id)) continue;
                    answeredQuestions.add(q.id);
                    recordQuestion(q);
                    const context: ScenarioAnswerContext = {
                        dictation: scenario.dictation,
                        insuranceType: scenario.insuranceType,
                        instanceFacts: instanceFactsById.get(instanceId) ?? {},
                    };
                    const answer = resolveScenarioAnswer(q, context);
                    if (answer === undefined || (typeof answer === 'string' && answer.trim() === '')) {
                        failures.push(`No auto-answer for question: ${q.id}`);
                        continue;
                    }
                    answersUsed[q.id] = String(answer);
                    state = await session.answer(instanceId, q.id, String(answer));
                    if (state.phase !== 'questions') {
                        break questionLoop;
                    }
                }
            }
        }
    }

    const phase = state.phase;
    let billingRefs: string[] = [];
    let perInstanceCount = 0;
    let textLength = 0;
    const combinability = 'n/a';
    const instanceTraces: CaseResult['instanceTraces'] = [];
    let outputText: string | undefined;

    if (state.phase === 'output') {
        const output = (state as {
            phase: 'output';
            output: { billingRefs?: string[]; fullText?: string; perInstance?: Record<string, unknown> };
        }).output;
        billingRefs = output.billingRefs ?? [];
        perInstanceCount = Object.keys(output.perInstance ?? {}).length;
        outputText = output.fullText ?? '';
        textLength = outputText.length ?? 0;
    } else if (state.phase === 'error') {
        failures.push(`Pipeline error: ${(state as { phase: 'error'; error: string }).error}`);
    }

    const instances = (state as any).instances as Array<{
        instanceId: string;
        teeth?: string[];
        facts?: Record<string, unknown>;
        chips?: Set<string>;
    }> | undefined;
    for (const inst of instances ?? []) {
        instanceTraces.push({
            instanceId: inst.instanceId,
            teeth: inst.teeth ?? [],
            facts: inst.facts ?? {},
            chips: Array.from(inst.chips ?? []).sort(),
        });
    }

    // Evaluate expectations
    const expect = scenario.expect;

    // Phase check
    if (expect.phase === 'questions' && phase !== 'questions') {
        failures.push(`Expected phase 'questions', got '${phase}'`);
    }
    if (expect.phase === 'output' && phase !== 'output') {
        failures.push(`Expected phase 'output', got '${phase}'`);
    }

    // Askback check
    if (expect.mustAskbackIds && expect.mustAskbackIds.length > 0) {
        for (const askbackId of expect.mustAskbackIds) {
            const found = Array.from(questionsAsked).some(q => q.includes(askbackId));
            if (!found) {
                failures.push(`Expected askback '${askbackId}' not found in questions: ${Array.from(questionsAsked).join(', ')}`);
            }
        }
    }

    // Only check billing for output phase
    if (phase === 'output') {
        // mustIncludePrefixes
        if (expect.mustIncludePrefixes && expect.mustIncludePrefixes.length > 0) {
            for (const prefix of expect.mustIncludePrefixes) {
                const found = billingRefs.some(ref => ref.startsWith(prefix));
                if (!found) {
                    failures.push(`Expected billing with prefix '${prefix}', got: ${billingRefs.join(', ')}`);
                }
            }
        }

        // mustNotIncludePrefixes
        if (expect.mustNotIncludePrefixes && expect.mustNotIncludePrefixes.length > 0) {
            for (const prefix of expect.mustNotIncludePrefixes) {
                const forbidden = billingRefs.filter(ref => ref.startsWith(prefix));
                if (forbidden.length > 0) {
                    failures.push(`Forbidden billing prefix '${prefix}' found: ${forbidden.join(', ')}`);
                }
            }
        }

        // mustIncludeAnyBillingRefs
        if (expect.mustIncludeAnyBillingRefs && expect.mustIncludeAnyBillingRefs.length > 0) {
            const foundAny = expect.mustIncludeAnyBillingRefs.some(ref =>
                billingRefs.some(actual => actual === ref || actual.includes(ref.replace('BEMA_', '').replace('GOZ_', '')))
            );
            if (!foundAny) {
                failures.push(`Expected any of ${expect.mustIncludeAnyBillingRefs.join(', ')}, got: ${billingRefs.join(', ')}`);
            }
        }

        if (expect.mustIncludeAllBillingRefs && expect.mustIncludeAllBillingRefs.length > 0) {
            for (const ref of expect.mustIncludeAllBillingRefs) {
                const found = billingRefs.some(
                    actual => actual === ref || actual.includes(ref.replace('BEMA_', '').replace('GOZ_', ''))
                );
                if (!found) {
                    failures.push(`Expected billing ref '${ref}' not found, got: ${billingRefs.join(', ')}`);
                }
            }
        }

        if (expect.mustNotIncludeBillingRefs && expect.mustNotIncludeBillingRefs.length > 0) {
            for (const ref of expect.mustNotIncludeBillingRefs) {
                const found = billingRefs.some(
                    actual => actual === ref || actual.includes(ref.replace('BEMA_', '').replace('GOZ_', ''))
                );
                if (found) {
                    failures.push(`Forbidden billing ref '${ref}' found, got: ${billingRefs.join(', ')}`);
                }
            }
        }

        if (expect.mustIncludeTextSnippets && expect.mustIncludeTextSnippets.length > 0) {
            for (const snippet of expect.mustIncludeTextSnippets) {
                if (!outputText?.includes(snippet)) {
                    failures.push(`Expected text to include snippet: ${snippet}`);
                }
            }
        }

        if (expect.mustNotIncludeTextSnippets && expect.mustNotIncludeTextSnippets.length > 0) {
            for (const snippet of expect.mustNotIncludeTextSnippets) {
                if (outputText?.includes(snippet)) {
                    failures.push(`Forbidden text snippet found: ${snippet}`);
                }
            }
        }

        // perInstance check
        if (expect.mustHavePerInstance && perInstanceCount === 0) {
            failures.push('Expected perInstance but got none');
        }
        if (expect.perInstanceCount && perInstanceCount !== expect.perInstanceCount) {
            failures.push(`Expected ${expect.perInstanceCount} instances, got ${perInstanceCount}`);
        }

        // Text length check
        if (textLength === 0) {
            failures.push('Expected non-empty text output');
        }
    }

    return {
        id: scenario.id,
        title: scenario.title,
        treatmentId,
        insuranceType: scenario.insuranceType,
        dictation: scenario.dictation,
        phase,
        billingRefs,
        questions: Array.from(questionsAsked),
        answersUsed,
        perInstanceCount,
        textLength,
        combinability,
        instanceTraces,
        outputText,
        pass: failures.length === 0,
        failures,
    };
}

async function main() {
    console.log('\n🏥 V10 Medical Scenario Runner\n');
    console.log('[ENV]', {
        VITE_OPENAI_API_KEY: Boolean(process.env.VITE_OPENAI_API_KEY),
        VITE_GOOGLE_GEMINI_API_KEY: Boolean(process.env.VITE_GOOGLE_GEMINI_API_KEY),
        VITE_FIREBASE_API_KEY: Boolean(process.env.VITE_FIREBASE_API_KEY),
        VITE_FIREBASE_PROJECT_ID: Boolean(process.env.VITE_FIREBASE_PROJECT_ID),
    });

    // Load scenarios
    const args = process.argv.slice(2);
    const getArgValue = (name: string): string | undefined => {
        const idx = args.indexOf(name);
        if (idx === -1) return undefined;
        return args[idx + 1];
    };

    const suiteFile = getArgValue('--file') ?? 'scenarios.v10.fuellung.medical.json';
    const scenariosPath = path.isAbsolute(suiteFile)
        ? suiteFile
        : path.resolve(process.cwd(), suiteFile);
    const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8')) as {
        _meta?: ScenarioSuiteMeta;
        cases: Scenario[];
    };
    const scenarios: Scenario[] = scenariosData.cases;
    const defaultTreatmentId = scenariosData._meta?.treatmentId;
    const suiteName = path.basename(scenariosPath).replace(/\.json$/i, '');

    // Run all scenarios
    const results: CaseResult[] = [];
    for (const scenario of scenarios) {
        console.log(`Running case ${scenario.id}: ${scenario.title}...`);
        try {
            const result = await runScenario(scenario, { defaultTreatmentId });
            results.push(result);
            console.log(`  → ${result.pass ? 'PASS' : 'FAIL'} ${result.failures.length > 0 ? `(${result.failures.join('; ')})` : ''}`);
        } catch (err) {
            console.log(`  → ERROR: ${err}`);
            results.push({
                id: scenario.id,
                title: scenario.title,
                treatmentId: scenario.treatmentId ?? defaultTreatmentId ?? 'fuellung',
                insuranceType: scenario.insuranceType,
                dictation: scenario.dictation,
                phase: 'error',
                billingRefs: [],
                questions: [],
                answersUsed: {},
                perInstanceCount: 0,
                textLength: 0,
                combinability: 'error',
                instanceTraces: [],
                pass: false,
                failures: [String(err)],
            });
        }
    }

    // Build report
    const report: Report = {
        runId: new Date().toISOString(),
        suiteFile: scenariosPath,
        meta: scenariosData._meta,
        total: results.length,
        pass: results.filter(r => r.pass).length,
        fail: results.filter(r => !r.pass).length,
        cases: results,
    };

    // Ensure output directory
    const outputDir = path.resolve(
        __dirname,
        '../../docs/system-atlas/artifacts/_latest/v10-medical-scenario-run',
        suiteName
    );
    fs.mkdirSync(outputDir, { recursive: true });

    // Write report.json
    fs.writeFileSync(
        path.join(outputDir, 'report.json'),
        JSON.stringify(report, null, 2)
    );

    // Write summary.md
    const summaryLines = [
        '# V10 Medical Scenario Run Summary',
        '',
        `**Run ID:** ${report.runId}`,
        `**Suite:** ${suiteName}`,
        `**Total:** ${report.total} | **Pass:** ${report.pass} | **Fail:** ${report.fail}`,
        '',
        '## Results',
        '',
        '| ID | Treatment | Insurance | Phase | Questions | BillingRefs | Status |',
        '|----|-----------|-----------|-------|-----------|-------------|--------|',
    ];

    for (const r of results) {
        const refs = r.billingRefs.slice(0, 3).join(', ') + (r.billingRefs.length > 3 ? '...' : '');
        summaryLines.push(`| ${r.id} | ${r.treatmentId} | ${r.insuranceType} | ${r.phase} | ${r.questions.length} | ${refs} | ${r.pass ? '✅' : '❌'} |`);
    }

    // Add failures section
    const failedCases = results.filter(r => !r.pass);
    if (failedCases.length > 0) {
        summaryLines.push('', '## Failures', '');
        for (const r of failedCases) {
            summaryLines.push(`### Case ${r.id}: ${r.title}`);
            summaryLines.push(`- Treatment: ${r.treatmentId}`);
            summaryLines.push(`- Phase: ${r.phase}`);
            for (const f of r.failures) {
                summaryLines.push(`- ${f}`);
            }
            summaryLines.push('');
        }
    }

    fs.writeFileSync(path.join(outputDir, 'summary.md'), summaryLines.join('\n'));

    // Print summary
    console.log(`\n📊 Results: ${report.pass}/${report.total} PASSED\n`);
    console.log(`📄 Report: ${path.join(outputDir, 'report.json')}`);
    console.log(`📄 Summary: ${path.join(outputDir, 'summary.md')}`);

    // Exit with error if failures
    if (report.fail > 0) {
        console.log('\n❌ HARD FAIL - Some scenarios failed');
        process.exit(1);
    } else {
        console.log('\n✅ ALL SCENARIOS PASSED');
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Runner error:', err);
    process.exit(1);
});
