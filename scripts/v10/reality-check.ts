#!/usr/bin/env npx tsx
/**
 * V10 Reality Check Runner
 * 
 * Runs all scenarios and generates report.
 * Usage: npm run v10:reality-check
 */

import * as fs from 'fs';
import * as path from 'path';
import { createV10Session } from '../../src/docudent/v10/uiController/createV10Session';
import scenarios from '../../src/docudent/v10/reality/scenarios.v1.json';

interface ScenarioResult {
    id: string;
    name: string;
    dictation: string;
    passed: boolean;
    instances: number;
    phase: string;
    questions: Record<string, string[]>;
    chips: Record<string, string[]>;
    errors: string[];
    duration: number;
}

interface Report {
    timestamp: string;
    totalScenarios: number;
    passed: number;
    failed: number;
    results: ScenarioResult[];
}

function normalizeQuestionId(id: string): string {
    const trimmed = String(id ?? '').trim().toLowerCase();
    if (!trimmed) return '';
    const short = trimmed.includes('.') ? trimmed.split('.').pop() ?? trimmed : trimmed;
    if (short === 'capping') return 'ueberkappung';
    return short;
}

async function runScenario(scenario: typeof scenarios.scenarios[0]): Promise<ScenarioResult> {
    const start = Date.now();
    const session = createV10Session();
    const errors: string[] = [];

    try {
        const state = await session.start(scenario.dictation, {
            goldenMode: scenario.goldenMode,
        });

        const instances = session.getInstances();

        // Check instance count
        if (instances.length < scenario.expected.minInstances) {
            errors.push(`Expected >= ${scenario.expected.minInstances} instances, got ${instances.length}`);
        }

        // Check blocking questions
        if (scenario.expected.expectBlockingQuestions) {
            if (state.phase !== 'questions') {
                errors.push(`Expected questions phase, got ${state.phase}`);
            }
        }

        // Check question containment
        if (state.phase === 'questions' && scenario.expected.mustContainQuestions.length > 0) {
            const allQuestions = Object.values(state.questions)
                .flat()
                .map((q) => normalizeQuestionId(q.ruleId));
            for (const expected of scenario.expected.mustContainQuestions) {
                const normalizedExpected = normalizeQuestionId(expected);
                if (!allQuestions.some((q) => q === normalizedExpected)) {
                    errors.push(`Expected question containing "${expected}" not found`);
                }
            }
        }

        // Build result
        const questionsMap: Record<string, string[]> = {};
        const chipsMap: Record<string, string[]> = {};

        if (state.phase === 'questions') {
            for (const [instId, qs] of Object.entries(state.questions)) {
                questionsMap[instId] = qs.map(q => q.ruleId);
            }
        }

        for (const inst of instances) {
            chipsMap[inst.instanceId] = Array.isArray(inst.chips)
                ? inst.chips
                : Array.from(inst.chips ?? []);
        }

        return {
            id: scenario.id,
            name: scenario.name,
            dictation: scenario.dictation,
            passed: errors.length === 0,
            instances: instances.length,
            phase: state.phase,
            questions: questionsMap,
            chips: chipsMap,
            errors,
            duration: Date.now() - start,
        };

    } catch (err) {
        return {
            id: scenario.id,
            name: scenario.name,
            dictation: scenario.dictation,
            passed: false,
            instances: 0,
            phase: 'error',
            questions: {},
            chips: {},
            errors: [String(err)],
            duration: Date.now() - start,
        };
    }
}

async function main() {
    console.log('🔍 V10 Reality Check\n');

    const results: ScenarioResult[] = [];

    for (const scenario of scenarios.scenarios) {
        const result = await runScenario(scenario);
        results.push(result);

        const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${result.id}: ${result.name} (${result.duration}ms)`);

        if (!result.passed) {
            for (const err of result.errors) {
                console.log(`   ⚠️ ${err}`);
            }
        }
    }

    const report: Report = {
        timestamp: new Date().toISOString(),
        totalScenarios: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        results,
    };

    // Write report
    const reportDir = path.join(process.cwd(), 'docs/system-atlas/artifacts/_latest/frontend-reality');
    fs.mkdirSync(reportDir, { recursive: true });

    fs.writeFileSync(
        path.join(reportDir, 'report.json'),
        JSON.stringify(report, null, 2)
    );

    // Write summary
    const summary = `# V10 Reality Check Summary

**Date:** ${report.timestamp.split('T')[0]}
**Total:** ${report.totalScenarios} | **Passed:** ${report.passed} | **Failed:** ${report.failed}

## Results

${results.map(r => `- ${r.passed ? '✅' : '❌'} **${r.id}**: ${r.name} (${r.instances} instances, ${r.duration}ms)${r.errors.length ? `\n  - ${r.errors.join('\n  - ')}` : ''}`).join('\n')}
`;

    fs.writeFileSync(path.join(reportDir, 'summary.md'), summary);

    console.log(`\n📄 Report: ${reportDir}/report.json`);
    console.log(`📝 Summary: ${reportDir}/summary.md`);
    console.log(`\n${report.passed}/${report.totalScenarios} scenarios passed`);

    process.exit(report.failed > 0 ? 1 : 0);
}

main().catch(console.error);
