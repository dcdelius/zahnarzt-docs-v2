/**
 * MVP Smoke Runner
 * 
 * Runs 12 scenarios through V10 pipeline and generates a report.
 * Usage: npm run v10:mvp-smoke
 */

import { runV10 } from '../../src/docudent/v10/pipeline/runV10';
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
    durationMs: number;
}

const SCENARIOS: Scenario[] = [
    // GKV standard cases
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

    // PKV cases
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

    // MKV cases
    {
        id: 'mkv_mehr', dictation: 'Füllung 36 okklusal Komposit Mehrschichttechnik Mehrkosten', treatmentId: 'fuellung', insuranceType: 'MKV',
        expected: { minTextLength: 100, hasBilling: true }
    },
    {
        id: 'mkv_adh', dictation: 'Füllung 36 mod Komposit Adhäsivtechnik MKV', treatmentId: 'fuellung', insuranceType: 'MKV',
        expected: { minTextLength: 100, hasBilling: true }
    },

    // Endo (if supported)
    {
        id: 'endo_1k', dictation: 'Wurzelkanalbehandlung 36 ein Kanal', treatmentId: 'endo', insuranceType: 'GKV',
        expected: { minTextLength: 20 }
    },
];

async function runSmoke(): Promise<void> {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    V10 MVP SMOKE RUNNER');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Running ${SCENARIOS.length} scenarios...\n`);

    const results: ScenarioResult[] = [];
    let passCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const scenario of SCENARIOS) {
        const start = Date.now();
        const result: ScenarioResult = {
            id: scenario.id,
            state: 'unknown',
            passed: false,
            textLength: 0,
            billingCount: 0,
            instanceCount: 0,
            chips: [],
            errors: [],
            durationMs: 0,
        };

        try {
            const pipelineResult = await runV10({
                dictation: scenario.dictation,
                treatmentId: scenario.treatmentId,
                insuranceType: scenario.insuranceType,
                textLength: 'mittel',
            });

            result.state = pipelineResult.state;
            result.durationMs = Date.now() - start;

            if (pipelineResult.state === 'error') {
                result.errors.push(pipelineResult.error ?? 'Unknown error');
                failCount++;
            } else if (pipelineResult.state === 'questions') {
                // Questions pending - not a failure, just skip
                skipCount++;
                result.passed = true;
            } else if (pipelineResult.state === 'output') {
                const instances = Object.values(pipelineResult.output.perInstance);
                result.instanceCount = instances.length;
                result.textLength = instances.reduce((sum: number, i: { text: string }) => sum + i.text.length, 0);
                result.billingCount = instances.reduce((sum: number, i: { billingRefs: string[] }) => sum + i.billingRefs.length, 0);
                result.chips = [...new Set(instances.flatMap((i: { chips: string[] }) => i.chips))];

                // Check expectations
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
                    result.errors.push(`Instance count: ${result.instanceCount} != ${scenario.expected.instanceCount}`);
                    passed = false;
                }

                result.passed = passed;
                if (passed) passCount++;
                else failCount++;
            }
        } catch (err) {
            result.state = 'exception';
            result.errors.push(String(err));
            result.durationMs = Date.now() - start;
            failCount++;
        }

        results.push(result);

        // Print progress
        const icon = result.passed ? '✅' : (result.state === 'questions' ? '⏳' : '❌');
        console.log(`${icon} ${scenario.id}: ${result.state} (${result.durationMs}ms)`);
        if (result.errors.length > 0) {
            console.log(`   Errors: ${result.errors.join(', ')}`);
        }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`SUMMARY: ${passCount} passed, ${failCount} failed, ${skipCount} skipped`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Generate report
    const report = {
        generated: new Date().toISOString(),
        summary: { total: SCENARIOS.length, passed: passCount, failed: failCount, skipped: skipCount },
        results,
    };

    const artifactDir = path.join(process.cwd(), 'docs/system-atlas/artifacts/_latest/v10-mvp-smoke');
    fs.mkdirSync(artifactDir, { recursive: true });

    fs.writeFileSync(
        path.join(artifactDir, 'report.json'),
        JSON.stringify(report, null, 2)
    );

    fs.writeFileSync(
        path.join(artifactDir, 'summary.md'),
        `# V10 MVP Smoke Report

**Date**: ${report.generated}

## Summary

| Metric | Value |
|--------|-------|
| Total | ${SCENARIOS.length} |
| Passed | ${passCount} ✅ |
| Failed | ${failCount} ❌ |
| Skipped | ${skipCount} ⏳ |

## Results

${results.map(r => `- ${r.passed ? '✅' : '❌'} **${r.id}**: ${r.state} (${r.textLength} chars, ${r.billingCount} billing)`).join('\n')}
`
    );

    console.log(`📄 Report saved to: ${artifactDir}/`);

    // Exit with error if any failures
    if (failCount > 0) {
        process.exit(1);
    }
}

runSmoke().catch(err => {
    console.error('Smoke runner failed:', err);
    process.exit(1);
});
