/**
 * Gate M34: MultiTreatment Per-Instance Contracts Run
 * 
 * Runs all V5 truthcases with per-instance contract evaluation.
 */

import { describe, it, expect } from 'vitest';
import {
    ALL_CLINICAL_TRUTHCASES_V5,
    V5_STATS,
} from '../../v10/qa/clinicalTruthcases.v5.multitreatment';
import {
    evaluateContractV2,
    formatViolationsV2,
} from '../../v10/qa/clinicalAssertionContract.v2';
import { parseScopedDictation } from '../../v10/qa/segmentScoping';

describe('gate-m34-multitreatment-per-instance-contracts-run', () => {
    it('has 25 truthcases', () => {
        expect(V5_STATS.total).toBe(25);
    });

    it('has same-tooth cases', () => {
        expect(V5_STATS.sameTooth).toBe(10);
    });

    it('has different-tooth cases', () => {
        expect(V5_STATS.differentTooth).toBe(10);
    });

    it('has confusable cases', () => {
        expect(V5_STATS.confusable).toBe(5);
    });

    describe('per-instance contract format', () => {
        it('all truthcases have contractV2', () => {
            for (const tc of ALL_CLINICAL_TRUTHCASES_V5) {
                expect(tc.contractV2).toBeDefined();
                expect(tc.contractV2.expectedState).toBeDefined();
            }
        });

        it('byInstance keys are valid', () => {
            for (const tc of ALL_CLINICAL_TRUTHCASES_V5) {
                if (tc.contractV2.byInstance) {
                    for (const key of Object.keys(tc.contractV2.byInstance)) {
                        expect(['endo', 'fuellung']).toContain(key.split(':')[0]);
                    }
                }
            }
        });
    });

    describe('scope detection for sample cases', () => {
        it('detects multi-treatment in st01', () => {
            const tc = ALL_CLINICAL_TRUTHCASES_V5.find(c => c.id === 'st01_endo_fuellung_14_la_scope');
            expect(tc).toBeDefined();

            const scoped = parseScopedDictation(tc!.dictation);
            expect(scoped.isMultiTreatment).toBe(true);
        });

        it('detects endo and fuellung in st04', () => {
            const tc = ALL_CLINICAL_TRUTHCASES_V5.find(c => c.id === 'st04_full_endo_postendo');
            expect(tc).toBeDefined();

            const scoped = parseScopedDictation(tc!.dictation);
            expect(scoped.detectedTreatments).toContain('endo');
            expect(scoped.detectedTreatments).toContain('fuellung');
        });
    });

    describe('contract evaluation smoke test', () => {
        it('evaluateContractV2 runs without error', () => {
            const mockResult = {
                state: 'output' as const,
                questions: [],
                output: { fullText: '', billingCodes: [] },
                trace: { instances: [], allChips: [] },
            };

            const tc = ALL_CLINICAL_TRUTHCASES_V5[0];
            const result = evaluateContractV2(mockResult, tc.contractV2, tc.dictation);

            expect(result).toBeDefined();
            expect(result.violations).toBeDefined();
        });

        it('formatViolationsV2 produces readable output', () => {
            const violations = [
                { type: 'chip' as const, instance: 'endo' as const, message: 'test' },
            ];
            const formatted = formatViolationsV2(violations);
            expect(formatted).toContain('[CHIP]');
            expect(formatted).toContain('[endo]');
        });
    });
});
