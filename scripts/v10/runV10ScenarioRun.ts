/**
 * V10 Headless Scenario Runner
 *
 * Runs V10 pipeline via createV10Session (like UI) without browser.
 * Validates billingRefs, questions, combinability per scenario.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createV10Session, type V10UiState, type OutputState } from '../../src/docudent/v10/uiController/createV10Session';
import type { SettingsContext } from '../../src/docudent/v10/settings/resolveDefaultsToFacts';
import { resolveScenarioAnswer, type ScenarioAnswerContext, type ScenarioQuestion } from './scenarioAnswerDefaults';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Scenario {
    id: string;
    title: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    hasMKV: boolean;
    dictation: string;
    forceExtraction?: Record<string, unknown>;
    forceAnswers?: Record<string, unknown>;
    settings?: SettingsContext;
    expected: {
        mustIncludeCodes: string[];
        mustNotIncludePrefixes: string[];
        allowAliases: Record<string, string[]>;
        mustAskQuestionIds: string[];
        mustNotAskQuestionIds: string[];
        combinabilityMustNotBe: string[];
        perInstanceMinKeys?: number;
        textMustInclude?: string[];
        mustNotIncludeBillingRefs?: string[];
        textMustNotInclude?: string[];
    };
    answers: Record<string, string>;
}

interface CaseResult {
    id: string;
    title: string;
    insuranceType: string;
    dictation: string;
    questionsAsked: string[];
    answersUsed: Record<string, string>;
    billingRefs: string[];
    perInstance: Record<string, { billingRefs: string[]; textLen: number }>;
    combinability: { result: string; reasons: string[] };
    textLen: number;
    fullText?: string;
    perInstanceText?: Record<string, string>;
    status: 'PASS' | 'FAIL';
    failures: string[];
}

interface Report {
    runId: string;
    total: number;
    pass: number;
    fail: number;
    cases: CaseResult[];
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function codeMatches(code: string, expected: string, aliases: Record<string, string[]>): boolean {
    if (code === expected) return true;
    const aliasList = aliases[expected] || [];
    return aliasList.includes(code);
}

function hasCode(codes: string[], expected: string, aliases: Record<string, string[]>): boolean {
    return codes.some(c => codeMatches(c, expected, aliases) || codeMatches(expected, c, aliases));
}

function hasForbiddenPrefix(codes: string[], prefixes: string[]): string[] {
    const forbidden: string[] = [];
    for (const code of codes) {
        for (const prefix of prefixes) {
            if (code.startsWith(prefix)) {
                forbidden.push(code);
            }
        }
    }
    return forbidden;
}

function hasForbiddenBillingRefs(codes: string[], forbiddenRefs: string[]): string[] {
    const hits: string[] = [];
    for (const ref of forbiddenRefs) {
        for (const code of codes) {
            if (code === ref || code.includes(ref)) {
                hits.push(ref);
                break;
            }
        }
    }
    return hits;
}

// ═══════════════════════════════════════════════════════════════
// MAIN RUNNER
// ═══════════════════════════════════════════════════════════════

async function runScenario(scenario: Scenario): Promise<CaseResult> {
    // Default to fuellung for backwards compatibility; main() can pass a different packId globally.
    const treatmentId = (scenario as unknown as { treatmentId?: string }).treatmentId ?? 'fuellung';
    const session = createV10Session();
    const questionsAsked: string[] = [];
    const answersUsed: Record<string, string> = {};
    const failures: string[] = [];

    // Start session
    let state = await session.start(scenario.dictation, {
        treatmentId,
        insuranceType: scenario.insuranceType,
        textLength: 'mittel',
        forceExtraction: scenario.forceExtraction,
        forceAnswers: scenario.forceAnswers,
        settings: scenario.settings,
    });

    // Answer questions loop (max 10 iterations to prevent infinite loop)
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

        // Collect all questions across instances
        for (const [instanceId, questions] of Object.entries(questionsState.questions)) {
            for (const q of questions) {
                if (answersUsed[q.id]) continue;
                questionsAsked.push(q.id);

                // Find answer from scenario.answers
                // Try multiple key formats
                const ruleId = q.ruleId || q.id.split('::')[1];
                const answerValue = scenario.answers[`${instanceId}::${ruleId}`]
                    || scenario.answers[ruleId]
                    || scenario.answers[q.id];
                const normalizedAnswerValue = typeof answerValue === 'string' && answerValue.trim() === ''
                    ? undefined
                    : answerValue;

                const context: ScenarioAnswerContext = {
                    dictation: scenario.dictation,
                    insuranceType: scenario.insuranceType,
                    hasMKV: scenario.hasMKV,
                    instanceFacts: instanceFactsById.get(instanceId) ?? {},
                };

                const resolvedAnswer = normalizedAnswerValue ?? resolveScenarioAnswer(q, context);

                if (resolvedAnswer !== undefined) {
                    const answerString = String(resolvedAnswer);
                    answersUsed[q.id] = answerString;
                    state = await session.answer(instanceId, q.id, answerString);
                    if (state.phase !== 'questions') {
                        break questionLoop;
                    }
                } else {
                    // No answer provided - use default or fail
                    console.warn(`[Scenario ${scenario.id}] No answer for ${q.id}`);
                    failures.push(`No answer provided for question: ${q.id}`);
                }
            }
        }
    }

    // Extract results
    let billingRefs: string[] = [];
    let perInstance: Record<string, { billingRefs: string[]; textLen: number }> = {};
    let perInstanceText: Record<string, string> = {};
    let fullText: string | undefined;
    let textLen = 0;

    if (state.phase === 'output') {
        const output = (state as { phase: 'output'; output: OutputState }).output;
        billingRefs = output.billingRefs || [];
        fullText = output.fullText || '';
        textLen = fullText.length || 0;

        for (const [key, val] of Object.entries(output.perInstance || {})) {
            perInstance[key] = {
                billingRefs: val.billingRefs || [],
                textLen: val.text?.length || 0,
            };
            perInstanceText[key] = val.text || '';
        }
    } else if (state.phase === 'error') {
        failures.push(`Pipeline error: ${(state as { phase: 'error'; error: string }).error}`);
    } else {
        failures.push(`Unexpected final state: ${state.phase}`);
    }

    // Validations
    // 1. perInstance must exist
    if (Object.keys(perInstance).length === 0) {
        failures.push('perInstance is empty');
    }

    // 2. perInstanceMinKeys check
    if (scenario.expected.perInstanceMinKeys && Object.keys(perInstance).length < scenario.expected.perInstanceMinKeys) {
        failures.push(`perInstance has ${Object.keys(perInstance).length} keys, expected ${scenario.expected.perInstanceMinKeys}`);
    }

    // 3. Text not empty
    if (textLen === 0) {
        failures.push('fullText is empty');
    }

    // 4. mustIncludeCodes
    for (const code of scenario.expected.mustIncludeCodes) {
        if (!hasCode(billingRefs, code, scenario.expected.allowAliases)) {
            failures.push(`Missing expected code: ${code}, actual: ${billingRefs.join(', ')}`);
        }
    }

    // 5. mustNotIncludePrefixes
    const forbidden = hasForbiddenPrefix(billingRefs, scenario.expected.mustNotIncludePrefixes);
    if (forbidden.length > 0) {
        failures.push(`Forbidden codes found: ${forbidden.join(', ')}`);
    }

    // 6. mustNotIncludeBillingRefs
    if (scenario.expected.mustNotIncludeBillingRefs && scenario.expected.mustNotIncludeBillingRefs.length > 0) {
        const forbiddenRefs = hasForbiddenBillingRefs(billingRefs, scenario.expected.mustNotIncludeBillingRefs);
        if (forbiddenRefs.length > 0) {
            failures.push(`Forbidden billing refs found: ${forbiddenRefs.join(', ')}`);
        }
    }

    // 7. mustAskQuestionIds
    for (const qId of scenario.expected.mustAskQuestionIds) {
        if (!questionsAsked.some(q => q.includes(qId))) {
            failures.push(`Expected question not asked: ${qId}`);
        }
    }

    // 8. mustNotAskQuestionIds
    for (const qId of scenario.expected.mustNotAskQuestionIds) {
        if (questionsAsked.some(q => q.includes(qId))) {
            failures.push(`Unexpected question asked: ${qId}`);
        }
    }

    // 9. textMustInclude
    if (scenario.expected.textMustInclude && scenario.expected.textMustInclude.length > 0) {
        for (const snippet of scenario.expected.textMustInclude) {
            if (!fullText?.includes(snippet)) {
                failures.push(`Expected text to include: ${snippet}`);
            }
        }
    }

    // 10. textMustNotInclude
    if (scenario.expected.textMustNotInclude && scenario.expected.textMustNotInclude.length > 0) {
        for (const snippet of scenario.expected.textMustNotInclude) {
            if (fullText?.includes(snippet)) {
                failures.push(`Expected text to NOT include: ${snippet}`);
            }
        }
    }

    return {
        id: scenario.id,
        title: scenario.title,
        insuranceType: scenario.insuranceType,
        dictation: scenario.dictation,
        questionsAsked,
        answersUsed,
        billingRefs,
        perInstance,
        perInstanceText,
        combinability: { result: 'PASS', reasons: [] }, // TODO: extract from trace
        textLen,
        fullText,
        status: failures.length === 0 ? 'PASS' : 'FAIL',
        failures,
    };
}

async function main() {
    console.log('\n🏥 V10 Scenario Runner\n');

    const args = process.argv.slice(2);
    const argValue = (name: string): string | undefined => {
        const idx = args.indexOf(name);
        if (idx === -1) return undefined;
        return args[idx + 1];
    };

    // Load scenarios
    const scenariosPath = path.resolve(__dirname, argValue('--file') ?? 'scenarios.v10.fuellung.json');
    const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8'));
    const suiteTreatmentId = scenariosData?._meta?.treatmentId as string | undefined;
    const cliTreatmentId = argValue('--treatment');
    const treatmentId = cliTreatmentId ?? suiteTreatmentId ?? 'fuellung';
    const scenarios: Scenario[] = (scenariosData.cases as Scenario[]).map(s => ({
        ...s,
        // Inject treatmentId into each scenario (used by runScenario).
        treatmentId,
    })) as unknown as Scenario[];

    // Run all scenarios
    const results: CaseResult[] = [];
    for (const scenario of scenarios) {
        console.log(`Running case ${scenario.id}: ${scenario.title}...`);
        const result = await runScenario(scenario);
        results.push(result);
        console.log(`  → ${result.status} ${result.failures.length > 0 ? `(${result.failures.length} failures)` : ''}`);
    }

    // Build report
    const report: Report = {
        runId: new Date().toISOString(),
        total: results.length,
        pass: results.filter(r => r.status === 'PASS').length,
        fail: results.filter(r => r.status === 'FAIL').length,
        cases: results,
    };

    // Ensure output directory
    const outputDirName = `v10-scenario-run-${treatmentId}`;
    const outputDir = path.resolve(__dirname, `../../docs/system-atlas/artifacts/_latest/${outputDirName}`);
    fs.mkdirSync(outputDir, { recursive: true });

    // Write report.json
    fs.writeFileSync(
        path.join(outputDir, 'report.json'),
        JSON.stringify(report, null, 2)
    );

    // Write summary.md
    const summaryLines = [
        '# V10 Scenario Run Summary',
        '',
        `**Run ID:** ${report.runId}`,
        `**Total:** ${report.total} | **Pass:** ${report.pass} | **Fail:** ${report.fail}`,
        '',
        '## Results',
        '',
        '| ID | Insurance | Title | BillingRefs | Status |',
        '|----|-----------|-------|-------------|--------|',
    ];

    for (const r of results) {
        const codes = r.billingRefs.slice(0, 4).join(', ') + (r.billingRefs.length > 4 ? '...' : '');
        summaryLines.push(`| ${r.id} | ${r.insuranceType} | ${r.title} | ${codes} | ${r.status} |`);
    }

    // Failures section
    const failedCases = results.filter(r => r.status === 'FAIL');
    if (failedCases.length > 0) {
        summaryLines.push('', '## Failures', '');
        for (const r of failedCases) {
            summaryLines.push(`### Case ${r.id}: ${r.title}`);
            for (const f of r.failures) {
                summaryLines.push(`- ${f}`);
            }
            summaryLines.push('');
        }
    }

    fs.writeFileSync(
        path.join(outputDir, 'summary.md'),
        summaryLines.join('\n')
    );

    // Print summary
    console.log(`\n📊 Results: ${report.pass}/${report.total} PASSED\n`);
    console.log(`📄 Report: ${path.join(outputDir, 'report.json')}`);
    console.log(`📄 Summary: ${path.join(outputDir, 'summary.md')}`);

    // Exit with error if failures
    if (report.fail > 0) {
        console.log('\n❌ HARD FAIL - Scenarios failed');
        process.exit(1);
    } else {
        console.log('\n✅ ALL SCENARIOS PASSED');
    }
}

main().catch(err => {
    console.error('Runner error:', err);
    process.exit(1);
});
