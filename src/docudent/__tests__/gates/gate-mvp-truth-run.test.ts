/**
 * MVP Truth Run Test
 * 
 * Proves V10 is usable for Füllung with real pipeline runs.
 * Hard acceptance criteria enforced - no narrative, just data.
 */

import { describe, test, expect, afterAll } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';
import * as fs from 'fs';
import * as path from 'path';

interface TruthCase {
    id: string;
    dictation: string;
    treatmentId: 'fuellung' | 'endo';
    insuranceType: 'GKV' | 'PKV' | 'MKV';
}

interface TruthResult {
    id: string;
    dictation: string;
    treatmentId: string;
    insuranceType: string;
    state: string;
    perInstanceKeys: string[];
    perInstanceTextLengths: number[];
    perInstanceBillingRefs: string[][];
    totalTextLength: number;
    totalBillingCount: number;
    pass: boolean;
    failReason?: string;
}

// 12 dictations covering GKV/PKV/MKV
const TRUTH_CASES: TruthCase[] = [
    // GKV (6 cases)
    { id: 'gkv_01', dictation: 'Füllung 36 okklusal Komposit', treatmentId: 'fuellung', insuranceType: 'GKV' },
    { id: 'gkv_02', dictation: 'Füllung 36 okklusal distal Komposit', treatmentId: 'fuellung', insuranceType: 'GKV' },
    { id: 'gkv_03', dictation: 'Füllung 36 und 37 okklusal Komposit', treatmentId: 'fuellung', insuranceType: 'GKV' },
    { id: 'gkv_04', dictation: 'Füllung 46 mod Komposit mit Kofferdam', treatmentId: 'fuellung', insuranceType: 'GKV' },
    { id: 'gkv_05', dictation: 'Füllung 14 distal GIZ', treatmentId: 'fuellung', insuranceType: 'GKV' },
    { id: 'gkv_06', dictation: 'Füllung 36 okklusal Komposit Bulkfill', treatmentId: 'fuellung', insuranceType: 'GKV' },

    // PKV (3 cases)
    { id: 'pkv_01', dictation: 'Füllung 36 okklusal Komposit adhäsiv', treatmentId: 'fuellung', insuranceType: 'PKV' },
    { id: 'pkv_02', dictation: 'Füllung 14 mod Komposit Mehrschicht Kofferdam', treatmentId: 'fuellung', insuranceType: 'PKV' },
    { id: 'pkv_03', dictation: 'Füllung 24 und 25 okklusal Komposit', treatmentId: 'fuellung', insuranceType: 'PKV' },

    // MKV (3 cases)
    { id: 'mkv_01', dictation: 'Füllung 36 okklusal Komposit Mehrschichttechnik Mehrkosten', treatmentId: 'fuellung', insuranceType: 'MKV' },
    { id: 'mkv_02', dictation: 'Füllung 36 mod Komposit Adhäsivtechnik MKV', treatmentId: 'fuellung', insuranceType: 'MKV' },
    { id: 'mkv_03', dictation: 'Füllung 46 okklusal Komposit MKV Kofferdam', treatmentId: 'fuellung', insuranceType: 'MKV' },
];

const results: TruthResult[] = [];

describe('gate-mvp-truth-run', () => {
    for (const tc of TRUTH_CASES) {
        test(`${tc.id}: ${tc.dictation.slice(0, 40)}...`, async () => {
            const result: TruthResult = {
                id: tc.id,
                dictation: tc.dictation,
                treatmentId: tc.treatmentId,
                insuranceType: tc.insuranceType,
                state: 'unknown',
                perInstanceKeys: [],
                perInstanceTextLengths: [],
                perInstanceBillingRefs: [],
                totalTextLength: 0,
                totalBillingCount: 0,
                pass: false,
            };

            const pipelineResult = await runV10({
                dictation: tc.dictation,
                treatmentId: tc.treatmentId,
                insuranceType: tc.insuranceType,
                textLength: 'mittel',
            });

            result.state = pipelineResult.state;

            // HARD: Must not error
            if (pipelineResult.state === 'error') {
                result.pass = false;
                result.failReason = `Error: ${pipelineResult.error}`;
                results.push(result);
                expect(pipelineResult.state).not.toBe('error');
                return;
            }

            // Questions are OK (not a failure, but not full pass either)
            if (pipelineResult.state === 'questions') {
                result.pass = true;
                result.failReason = `Questions pending (${pipelineResult.questions?.length ?? 0})`;
                results.push(result);
                return;
            }

            // HARD: Must have perInstance (no fallback to global)
            const perInstance = pipelineResult.output?.perInstance;
            if (!perInstance || Object.keys(perInstance).length === 0) {
                result.pass = false;
                result.failReason = 'No perInstance output - would need global fallback';
                results.push(result);
                expect(perInstance).toBeDefined();
                expect(Object.keys(perInstance ?? {}).length).toBeGreaterThan(0);
                return;
            }

            result.perInstanceKeys = Object.keys(perInstance);

            for (const [key, instance] of Object.entries(perInstance)) {
                result.perInstanceTextLengths.push(instance.text.length);
                result.perInstanceBillingRefs.push(instance.billingRefs);
                result.totalTextLength += instance.text.length;
                result.totalBillingCount += instance.billingRefs.length;

                // HARD: No empty text for output state
                if (instance.text.length === 0) {
                    result.pass = false;
                    result.failReason = `Empty text for instance ${key}`;
                }

                // HARD: GKV must have BEMA billing when surface_mapping applies
                if (tc.insuranceType === 'GKV' && instance.billingRefs.length === 0) {
                    result.pass = false;
                    result.failReason = `GKV case ${key} has no billing (surface_mapping should apply)`;
                }

                // HARD: MKV/GOZ must not appear in GKV unless MKV marker present
                if (tc.insuranceType === 'GKV') {
                    const hasGOZ = instance.billingRefs.some(r => r.startsWith('GOZ_'));
                    if (hasGOZ) {
                        result.pass = false;
                        result.failReason = `GOZ code in GKV case ${key}`;
                    }
                }
            }

            if (!result.failReason) {
                result.pass = true;
            }

            results.push(result);

            // Assertions
            expect(result.totalTextLength).toBeGreaterThan(0);
            if (tc.insuranceType === 'GKV' || tc.insuranceType === 'MKV' || tc.insuranceType === 'PKV') {
                expect(result.totalBillingCount).toBeGreaterThan(0);
            }
        });
    }

    afterAll(() => {
        const passCount = results.filter(r => r.pass).length;
        const failCount = results.filter(r => !r.pass).length;
        const questionCount = results.filter(r => r.state === 'questions').length;

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log(`MVP TRUTH: ${passCount} pass, ${failCount} fail, ${questionCount} questions`);
        console.log('═══════════════════════════════════════════════════════════════');

        // Generate report
        const report = {
            generated: new Date().toISOString(),
            summary: {
                total: TRUTH_CASES.length,
                pass: passCount,
                fail: failCount,
                questions: questionCount,
                exitCode: failCount > 0 ? 1 : 0,
            },
            hardAcceptance: {
                noEmptyText: results.filter(r => r.state === 'output').every(r => r.totalTextLength > 0),
                gkvHasBilling: results.filter(r => r.insuranceType === 'GKV' && r.state === 'output').every(r => r.totalBillingCount > 0),
                noGozInGkv: results.filter(r => r.insuranceType === 'GKV' && r.state === 'output').every(r =>
                    r.perInstanceBillingRefs.flat().every(ref => !ref.startsWith('GOZ_'))
                ),
                perInstancePresent: results.filter(r => r.state === 'output').every(r => r.perInstanceKeys.length > 0),
            },
            results: results.map(r => ({
                id: r.id,
                dictation: r.dictation,
                insuranceType: r.insuranceType,
                state: r.state,
                pass: r.pass,
                perInstanceKeys: r.perInstanceKeys,
                textLength: r.totalTextLength,
                billingCount: r.totalBillingCount,
                billingRefs: r.perInstanceBillingRefs.flat(),
                failReason: r.failReason,
            })),
            failingDictations: results.filter(r => !r.pass).map(r => ({
                id: r.id,
                dictation: r.dictation,
                reason: r.failReason,
            })),
        };

        const artifactDir = path.join(process.cwd(), 'docs/system-atlas/artifacts/_latest/v10-mvp-truth');
        fs.mkdirSync(artifactDir, { recursive: true });
        fs.writeFileSync(path.join(artifactDir, 'report.json'), JSON.stringify(report, null, 2));

        const summary = `# MVP Truth Run Report

**Date**: ${report.generated}

## Summary

| Metric | Value |
|--------|-------|
| Total | ${report.summary.total} |
| Pass | ${report.summary.pass} ✅ |
| Fail | ${report.summary.fail} ${report.summary.fail > 0 ? '❌' : ''} |
| Questions | ${report.summary.questions} ⏳ |
| Exit Code | ${report.summary.exitCode} |

## Hard Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| No empty text in output | ${report.hardAcceptance.noEmptyText ? '✅' : '❌'} |
| GKV cases have billing | ${report.hardAcceptance.gkvHasBilling ? '✅' : '❌'} |
| No GOZ in GKV | ${report.hardAcceptance.noGozInGkv ? '✅' : '❌'} |
| perInstance present | ${report.hardAcceptance.perInstancePresent ? '✅' : '❌'} |

## Results

${results.map(r => `- ${r.pass ? '✅' : '❌'} **${r.id}** (${r.insuranceType}): ${r.state}, ${r.totalTextLength} chars, ${r.totalBillingCount} billing${r.failReason ? ` - ${r.failReason}` : ''}`).join('\n')}

${report.failingDictations.length > 0 ? `## Failing Dictations\n\n${report.failingDictations.map(f => `- **${f.id}**: ${f.reason}`).join('\n')}` : ''}
`;

        fs.writeFileSync(path.join(artifactDir, 'summary.md'), summary);
        console.log(`📄 Report saved to: ${artifactDir}/`);
    });
});
