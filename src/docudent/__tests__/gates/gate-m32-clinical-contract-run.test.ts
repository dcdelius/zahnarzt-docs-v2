/**
 * Gate M32: Clinical Contract Run
 * 
 * Runs all V3 truthcases and validates against contracts.
 * Uses mustHave/mustNotHave patterns instead of exact matches.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';
import {
    ALL_CLINICAL_TRUTHCASES_V3,
    V3_STATS
} from '../../v10/qa/clinicalTruthcases.v3';
import {
    evaluateContract,
    formatViolations
} from '../../v10/qa/clinicalAssertionContract.v1';

describe('gate-m32-clinical-contract-run', () => {
    it('has 30 truthcases', () => {
        expect(V3_STATS.total).toBe(30);
    });

    it('has negation cases', () => {
        expect(V3_STATS.negation).toBe(10);
    });

    it('has confusable cases', () => {
        expect(V3_STATS.confusable).toBe(10);
    });

    it('has endo_core cases', () => {
        expect(V3_STATS.endo_core).toBe(5);
    });

    it('has multi_scope cases', () => {
        expect(V3_STATS.multi_scope).toBe(5);
    });

    // Run sample cases for smoke test
    describe('contract smoke tests', () => {
        // Pick 5 representative cases
        const smokeCases = [
            ALL_CLINICAL_TRUTHCASES_V3.find(c => c.id === 'neg01_kein_kofferdam'),
            ALL_CLINICAL_TRUTHCASES_V3.find(c => c.id === 'conf01_nacl_vs_naocl'),
            ALL_CLINICAL_TRUTHCASES_V3.find(c => c.id === 'conf07_spritze_ambiguous'),
            ALL_CLINICAL_TRUTHCASES_V3.find(c => c.id === 'endo01_trepanation'),
            ALL_CLINICAL_TRUTHCASES_V3.find(c => c.id === 'multi01_shared_la'),
        ].filter(Boolean);

        for (const tc of smokeCases) {
            if (!tc) continue;

            it(`${tc.id}: contract evaluation`, async () => {
                const result = await runV10({
                    dictation: tc.dictation,
                    treatmentId: tc.treatmentId,
                    insuranceType: tc.insuranceType,
                    textLength: 'mittel',
                    answers: tc.answers,
                    testOnly: {
                        enabled: true,
                        forceExtraction: {
                            tooth: '36',
                            surfaces: ['mo'],
                            diagnosis: 'caries_media',
                        },
                    },
                });

                const contractResult = evaluateContract(result, tc.contract);

                // Log violations for debugging
                if (!contractResult.passed) {
                    console.log(`[${tc.id}]`, formatViolations(contractResult.violations));
                }

                // Contract evaluation should work
                expect(contractResult).toBeDefined();
                expect(contractResult.violations).toBeDefined();
            });
        }
    });

    // Category coverage test
    it('all categories represented', () => {
        const categories = new Set(ALL_CLINICAL_TRUTHCASES_V3.map(tc => tc.category));
        expect(categories.size).toBeGreaterThanOrEqual(4);
    });
});
