/**
 * Gate Test: MVP Smoke Runner
 * 
 * Runs 12 scenarios through V10 pipeline and generates report.
 * Usage: npx vitest run src/docudent/__tests__/gates/gate-mvp-smoke-runner.test.ts
 */

import { describe, test, expect, afterAll } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';
import * as fs from 'fs';
import * as path from 'path';

interface Scenario {
    id: string;
    dictation: string;
    treatmentId: 'fuellung' | 'endo';
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    expected: {
        minTextLength?: number;
        hasBilling?: boolean;
        instanceCount?: number;
    };
}

interface ScenarioResult {
    id: string;
    state: string;
    passed: boolean;
    textLength: number;
    billingCount: number;
    instanceCount: number;
    chips: string[];
    errors: string[];
}

const SCENARIOS: Scenario[] = [
    {
        id: 'gkv_1fl', dictation: 'Füllung 36 okklusal Komposit', treatmentId: 'fuellung', insuranceType: 'GKV',
        expected: { minTextLength: 50, hasBilling: true }
    },
    {
        id: 'gkv_2fl', dictation: 'Füllung 36 okklusal distal Komposit', treatmentId: 'fuellung', insuranceType: 'GKV',
        expected: { minTextLength: 50, hasBilling: true }
    },
    {
        id: 'gkv_multi', dictation: 'Füllung 36 und 37 okklusal Komposit', treatmentId: 'fuellung', insuranceType: 'GKV',
        expected: { minTextLength: 100, hasBilling: true, instanceCount: 2 }
    },
    {
        id: 'gkv_koff', dictation: 'Füllung 36 okklusal Komposit Kofferdam', treatmentId: 'fuellung', insuranceType: 'GKV',
        expected: { minTextLength: 50, hasBilling: true }
    },
    {
        id: 'gkv_giz', dictation: 'Füllung 14 distal GIZ', treatmentId: 'fuellung', insuranceType: 'GKV',
        expected: { minTextLength: 50, hasBilling: true }
    },
    {
        id: 'gkv_bulk', dictation: 'Füllung 36 okklusal Komposit Bulkfill', treatmentId: 'fuellung', insuranceType: 'GKV',
        expected: { minTextLength: 50, hasBilling: true }
    },
    {
        id: 'pkv_std', dictation: 'Füllung 36 okklusal Komposit adhäsiv', treatmentId: 'fuellung', insuranceType: 'PKV',
        expected: { minTextLength: 50, hasBilling: true }
    },
    {
        id: 'pkv_koff', dictation: 'Füllung 36 okklusal Komposit Kofferdam', treatmentId: 'fuellung', insuranceType: 'PKV',
        expected: { minTextLength: 50, hasBilling: true }
    },
    {
        id: 'pkv_multi', dictation: 'Füllung 24 und 25 okklusal Komposit', treatmentId: 'fuellung', insuranceType: 'PKV',
        expected: { minTextLength: 100, hasBilling: true, instanceCount: 2 }
    },
    {
        id: 'mkv_mehr', dictation: 'Füllung 36 okklusal Komposit Mehrschichttechnik Mehrkosten', treatmentId: 'fuellung', insuranceType: 'MKV',
        expected: { minTextLength: 100, hasBilling: true }
    },
    {
        id: 'mkv_adh', dictation: 'Füllung 36 mod Komposit Adhäsivtechnik MKV', treatmentId: 'fuellung', insuranceType: 'MKV',
        expected: { minTextLength: 100, hasBilling: true }
    },
    {
        id: 'endo_1k', dictation: 'Wurzelkanalbehandlung 36', treatmentId: 'endo', insuranceType: 'GKV',
        expected: {}
    }, // Endo may have questions, just verify no error
];

const results: ScenarioResult[] = [];

describe('gate-mvp-smoke-runner', () => {
    for (const scenario of SCENARIOS) {
        test(`${scenario.id}: ${scenario.dictation.slice(0, 40)}...`, async () => {
            const result: ScenarioResult = {
                id: scenario.id,
                state: 'unknown',
                passed: false,
                textLength: 0,
                billingCount: 0,
                instanceCount: 0,
                chips: [],
                errors: [],
            };

            const pipelineResult = await runV10({
                dictation: scenario.dictation,
                treatmentId: scenario.treatmentId,
                insuranceType: scenario.insuranceType,
                textLength: 'mittel',
            });

            result.state = pipelineResult.state;

            // Error is a failure
            expect(pipelineResult.state).not.toBe('error');

            if (pipelineResult.state === 'questions') {
                result.passed = true; // Questions pending is OK
            } else if (pipelineResult.state === 'output') {
                const instances = Object.values(pipelineResult.output.perInstance);
                result.instanceCount = instances.length;
                result.textLength = instances.reduce((sum, i) => sum + i.text.length, 0);
                result.billingCount = instances.reduce((sum, i) => sum + i.billingRefs.length, 0);
                result.chips = [...new Set(instances.flatMap(i => i.chips))];

                let passed = true;
                if (scenario.expected.minTextLength && result.textLength < scenario.expected.minTextLength) {
                    result.errors.push(`Text too short: ${result.textLength} < ${scenario.expected.minTextLength}`);
                    passed = false;
                }
                if (scenario.expected.hasBilling && result.billingCount === 0) {
                    result.errors.push('No billing codes');
                    passed = false;
                }
                if (scenario.expected.instanceCount && result.instanceCount !== scenario.expected.instanceCount) {
                    result.errors.push(`Instance count mismatch: ${result.instanceCount} != ${scenario.expected.instanceCount}`);
                    passed = false;
                }

                result.passed = passed;

                // Assert expectations
                if (scenario.expected.minTextLength) {
                    expect(result.textLength).toBeGreaterThanOrEqual(scenario.expected.minTextLength);
                }
                if (scenario.expected.hasBilling) {
                    expect(result.billingCount).toBeGreaterThan(0);
                }
                if (scenario.expected.instanceCount) {
                    expect(result.instanceCount).toBe(scenario.expected.instanceCount);
                }
            }

            results.push(result);

            console.log(`[${scenario.id}] ${result.state}: ${result.textLength} chars, ${result.billingCount} billing`);
        });
    }

    afterAll(() => {
        const passCount = results.filter(r => r.passed).length;
        const failCount = results.filter(r => !r.passed && r.state !== 'questions').length;

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log(`MVP SMOKE: ${passCount} passed, ${failCount} failed, ${results.length} total`);
        console.log('═══════════════════════════════════════════════════════════════');

        // Generate report
        const report = {
            generated: new Date().toISOString(),
            summary: { total: SCENARIOS.length, passed: passCount, failed: failCount },
            results,
        };

        try {
            const artifactDir = path.join(process.cwd(), 'docs/system-atlas/artifacts/_latest/v10-mvp-smoke');
            fs.mkdirSync(artifactDir, { recursive: true });
            fs.writeFileSync(path.join(artifactDir, 'report.json'), JSON.stringify(report, null, 2));
            fs.writeFileSync(path.join(artifactDir, 'summary.md'),
                `# V10 MVP Smoke Report\n\n**Date**: ${report.generated}\n\n## Summary\n\n- Total: ${SCENARIOS.length}\n- Passed: ${passCount}\n- Failed: ${failCount}\n`);
        } catch (e) {
            console.warn('Could not write report:', e);
        }
    });
});
