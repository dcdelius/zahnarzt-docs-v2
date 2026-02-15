/**
 * M16 Gate: Combinability Determinism (50x)
 *
 * Verifies the combinability checker produces identical results across 50 runs.
 */

import { describe, it, expect } from 'vitest';
import { checkCombinabilityFromKb } from '../../../v10/billing/combinability';

describe('Gate M16: Determinism (50x)', () => {
    const testCases = [
        {
            name: 'BLOCK case: GOZ_2197 + GOZ_2060',
            codes: ['GOZ_2197', 'GOZ_2060'],
            context: { treatmentId: 'fuellung', insuranceType: 'PKV' as const },
        },
        {
            name: 'PASS case: basic BEMA filling',
            codes: ['BEMA_40', 'BEMA_13', 'BEMA_13b'],
            context: { treatmentId: 'fuellung', insuranceType: 'GKV' as const },
        },
        {
            name: 'WARN case: TEST_WARN_A + TEST_WARN_B',
            codes: ['TEST_WARN_A', 'TEST_WARN_B'],
            context: { treatmentId: 'fuellung', insuranceType: 'GKV' as const },
        },
        {
            name: 'PASS case: GOZ endo codes',
            codes: ['GOZ_2390', 'GOZ_2400', 'GOZ_2410'],
            context: { treatmentId: 'endo', insuranceType: 'PKV' as const },
        },
    ];

    for (const testCase of testCases) {
        it(`deterministic over 50 runs: ${testCase.name}`, () => {
            // Get baseline
            const baseline = checkCombinabilityFromKb(testCase.codes, testCase.context);

            // Run 49 more times
            for (let i = 0; i < 49; i++) {
                const result = checkCombinabilityFromKb(testCase.codes, testCase.context);

                expect(result.verdict).toBe(baseline.verdict);
                expect(result.conflicts.length).toBe(baseline.conflicts.length);
                expect(result.blockedCodes).toEqual(baseline.blockedCodes);
                expect(result.traceLine).toBe(baseline.traceLine);
                expect(result.kbVersion).toBe(baseline.kbVersion);
            }
        });
    }

    it('conflict order is stable', () => {
        // Use a case that triggers a conflict
        const codes = ['GOZ_2197', 'GOZ_2060', 'GOZ_2080'];
        const context = { treatmentId: 'fuellung', insuranceType: 'PKV' as const };

        const baseline = checkCombinabilityFromKb(codes, context);

        for (let i = 0; i < 20; i++) {
            const result = checkCombinabilityFromKb(codes, context);

            // Conflicts should be in the same order
            expect(result.conflicts.map(c => c.ruleId)).toEqual(
                baseline.conflicts.map(c => c.ruleId)
            );

            // Blocked codes should be sorted
            expect(result.blockedCodes).toEqual(result.blockedCodes.slice().sort());
        }
    });
});
