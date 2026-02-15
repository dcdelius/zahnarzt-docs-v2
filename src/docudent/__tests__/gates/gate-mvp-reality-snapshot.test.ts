/**
 * Reality Snapshot Generator — Prompt 1/6
 * 
 * Runs 12 realistic dictations through runV10 and captures:
 * - instances, facts, chips, text length, billingRefs, state
 * 
 * Usage: npx vitest run src/docudent/__tests__/gates/gate-mvp-reality-snapshot.test.ts
 */

import { describe, test, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';

interface DictationCase {
    id: string;
    dictation: string;
    treatmentId: 'fuellung' | 'endo';
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    expected: {
        minInstances: number;
        hasBilling: boolean;
        comment?: string;
    };
}

const REALITY_CASES: DictationCase[] = [
    // GKV Cases
    {
        id: 'gkv_01', dictation: 'Füllung 36 okklusal', treatmentId: 'fuellung', insuranceType: 'GKV',
        expected: { minInstances: 1, hasBilling: true, comment: 'Basic GKV 1-surface' }
    },
    {
        id: 'gkv_02', dictation: 'Füllung 36 okklusal distal Komposit', treatmentId: 'fuellung', insuranceType: 'GKV',
        expected: { minInstances: 1, hasBilling: true, comment: 'GKV 2-surface composite' }
    },
    {
        id: 'gkv_03', dictation: 'Füllung 14 distal GIZ', treatmentId: 'fuellung', insuranceType: 'GKV',
        expected: { minInstances: 1, hasBilling: true, comment: 'GKV glass ionomer' }
    },
    {
        id: 'gkv_04', dictation: 'Füllung 36 und 37 okklusal Komposit', treatmentId: 'fuellung', insuranceType: 'GKV',
        expected: { minInstances: 2, hasBilling: true, comment: 'Multi-tooth GKV' }
    },
    {
        id: 'gkv_05', dictation: 'Füllung 46 mod Komposit mit Kofferdam', treatmentId: 'fuellung', insuranceType: 'GKV',
        expected: { minInstances: 1, hasBilling: true, comment: 'GKV 3-surface with Kofferdam' }
    },
    {
        id: 'gkv_06', dictation: 'Füllung 36 profunda Ca(OH)2', treatmentId: 'fuellung', insuranceType: 'GKV',
        expected: { minInstances: 1, hasBilling: true, comment: 'GKV profunda - needs Cp' }
    },

    // PKV Cases
    {
        id: 'pkv_01', dictation: 'Füllung 36 okklusal Komposit adhäsiv', treatmentId: 'fuellung', insuranceType: 'PKV',
        expected: { minInstances: 1, hasBilling: true, comment: 'PKV composite adhesive' }
    },
    {
        id: 'pkv_02', dictation: 'Füllung 14 mod Komposit Mehrschicht Kofferdam', treatmentId: 'fuellung', insuranceType: 'PKV',
        expected: { minInstances: 1, hasBilling: true, comment: 'PKV full premium' }
    },
    {
        id: 'pkv_03', dictation: 'Füllung 24 und 25 okklusal Komposit', treatmentId: 'fuellung', insuranceType: 'PKV',
        expected: { minInstances: 2, hasBilling: true, comment: 'Multi-tooth PKV' }
    },

    // MKV Cases (GKV patient with Mehrkosten)
    {
        id: 'mkv_01', dictation: 'Füllung 36 okklusal Komposit Mehrschichttechnik Mehrkosten', treatmentId: 'fuellung', insuranceType: 'MKV',
        expected: { minInstances: 1, hasBilling: true, comment: 'MKV Mehrschicht' }
    },
    {
        id: 'mkv_02', dictation: 'Füllung 36 mod Komposit Adhäsivtechnik MKV', treatmentId: 'fuellung', insuranceType: 'MKV',
        expected: { minInstances: 1, hasBilling: true, comment: 'MKV adhesive' }
    },

    // Edge Case
    {
        id: 'edge_01', dictation: 'Füllung 36 okklusal ohne Kofferdam', treatmentId: 'fuellung', insuranceType: 'GKV',
        expected: { minInstances: 1, hasBilling: true, comment: 'Explicit no-kofferdam' }
    },
];

interface SnapshotResult {
    id: string;
    dictation: string;
    insuranceType: string;
    state: string;
    instances: Array<{
        instanceId: string;
        teeth: string[];
        surfaces?: string[];
    }>;
    facts: Record<string, unknown>;
    chips: string[];
    textLength: number;
    billingRefs: string[];
    billingCount: number;
    isMvpBlocker: boolean;
    blockerReason?: string;
    questionsCount?: number;
    error?: string;
}

describe('gate-mvp-reality-snapshot', () => {
    const results: SnapshotResult[] = [];

    for (const testCase of REALITY_CASES) {
        test(`${testCase.id}: ${testCase.dictation.slice(0, 40)}...`, async () => {
            const result = await runV10({
                dictation: testCase.dictation,
                treatmentId: testCase.treatmentId,
                insuranceType: testCase.insuranceType,
                textLength: 'mittel',
            });

            const snapshot: SnapshotResult = {
                id: testCase.id,
                dictation: testCase.dictation,
                insuranceType: testCase.insuranceType,
                state: result.state,
                instances: [],
                facts: {},
                chips: [],
                textLength: 0,
                billingRefs: [],
                billingCount: 0,
                isMvpBlocker: false,
            };

            if (result.state === 'output') {
                // Extract per-instance data
                for (const [instanceId, instance] of Object.entries(result.output.perInstance)) {
                    snapshot.instances.push({
                        instanceId,
                        teeth: instance.teeth,
                    });
                    snapshot.chips.push(...instance.chips);
                    snapshot.textLength += instance.text.length;
                    snapshot.billingRefs.push(...instance.billingRefs);
                }
                snapshot.billingCount = snapshot.billingRefs.length;
                snapshot.chips = [...new Set(snapshot.chips)];
                snapshot.billingRefs = [...new Set(snapshot.billingRefs)];

                // Check MVP blocker
                if (snapshot.billingCount === 0 && testCase.expected.hasBilling) {
                    snapshot.isMvpBlocker = true;
                    // Identify reason
                    if (snapshot.chips.length === 0) {
                        snapshot.blockerReason = '0 chips emitted';
                    } else if (snapshot.chips.includes('fuellung_grundleistung')) {
                        snapshot.blockerReason = 'fuellung_grundleistung has billingRef:null, surface_mapping not implemented';
                    } else {
                        snapshot.blockerReason = 'chips emitted but no billingRef in unified.json';
                    }
                }

                // Extract relevant facts from provenance
                if (result.meta.provenance?.chips) {
                    snapshot.facts = {
                        chipsCount: result.meta.provenance.chips.length,
                        billingEligible: result.meta.provenance.chips.filter(c => c.billingEligible).length,
                    };
                }
            } else if (result.state === 'questions') {
                snapshot.questionsCount = result.questions?.length ?? 0;
                snapshot.state = `questions(${snapshot.questionsCount})`;
            } else if (result.state === 'error') {
                snapshot.error = result.error;
                snapshot.isMvpBlocker = true;
                snapshot.blockerReason = `Error: ${result.error}`;
            }

            results.push(snapshot);

            // Assertions
            expect(result.state).not.toBe('error');
            if (result.state === 'output') {
                expect(snapshot.instances.length).toBeGreaterThanOrEqual(testCase.expected.minInstances);
            }
        });
    }

    test('generate summary table', () => {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('                    REALITY SNAPSHOT SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════\n');

        console.log('| ID | Dictation | Ins | State | Chips | Text | Billing | Blocker |');
        console.log('|----|-----------|-----|-------|-------|------|---------|---------|');

        for (const r of results) {
            const dictShort = r.dictation.slice(0, 30) + (r.dictation.length > 30 ? '...' : '');
            const blocker = r.isMvpBlocker ? '🔴' : '✅';
            console.log(`| ${r.id} | ${dictShort} | ${r.instances.length} | ${r.state} | ${r.chips.length} | ${r.textLength} | ${r.billingCount} | ${blocker} |`);
        }

        const blockers = results.filter(r => r.isMvpBlocker);
        console.log(`\n📊 Summary: ${results.length} cases, ${blockers.length} MVP blockers`);

        if (blockers.length > 0) {
            console.log('\n🔴 MVP Blockers:');
            for (const b of blockers) {
                console.log(`  - ${b.id}: ${b.blockerReason}`);
            }
        }

        // Output JSON for artifact
        console.log('\n📄 JSON Report:');
        console.log(JSON.stringify({
            generated: new Date().toISOString(),
            totalCases: results.length,
            blockerCount: blockers.length,
            cases: results,
        }, null, 2));
    });
});
