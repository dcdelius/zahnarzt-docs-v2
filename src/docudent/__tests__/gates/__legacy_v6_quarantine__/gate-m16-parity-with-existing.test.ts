/**
 * M16 Gate: Parity with Existing Checker
 *
 * Verifies the new KB-based checker produces the same verdict as the existing
 * billingCombinabilityChecker for all golden scenarios derived from real rules.
 */

import { describe, it, expect } from 'vitest';
import { checkCombinabilityFromKb } from '../../../v10/billing/combinability';
import { checkCombinability } from '../../../core/billing/combinability/billingCombinabilityChecker';

describe('Gate M16: Parity with Existing Checker', () => {
    const goldenScenarios = [
        // BLOCK cases from regel_goz2197_nicht_neben_2060
        {
            name: 'GOZ_2197 + GOZ_2060 → BLOCK',
            codes: ['GOZ_2197', 'GOZ_2060'],
            treatmentId: 'fuellung',
            insuranceType: 'PKV' as const,
            expectedVerdict: 'BLOCK',
        },
        {
            name: 'GOZ_2197 + GOZ_2080 → BLOCK',
            codes: ['GOZ_2197', 'GOZ_2080'],
            treatmentId: 'fuellung',
            insuranceType: 'PKV' as const,
            expectedVerdict: 'BLOCK',
        },
        {
            name: 'GOZ_2197 + GOZ_2100 → BLOCK',
            codes: ['GOZ_2197', 'GOZ_2100'],
            treatmentId: 'fuellung',
            insuranceType: 'PKV' as const,
            expectedVerdict: 'BLOCK',
        },
        {
            name: 'GOZ_2197 + GOZ_2120 → BLOCK',
            codes: ['GOZ_2197', 'GOZ_2120'],
            treatmentId: 'fuellung',
            insuranceType: 'PKV' as const,
            expectedVerdict: 'BLOCK',
        },
        // PASS cases
        {
            name: 'GOZ_2197 alone → PASS',
            codes: ['GOZ_2197'],
            treatmentId: 'fuellung',
            insuranceType: 'PKV' as const,
            expectedVerdict: 'PASS',
        },
        {
            name: 'GOZ_2060 alone → PASS',
            codes: ['GOZ_2060'],
            treatmentId: 'fuellung',
            insuranceType: 'PKV' as const,
            expectedVerdict: 'PASS',
        },
        {
            name: 'Basic BEMA filling → PASS',
            codes: ['BEMA_40', 'BEMA_13'],
            treatmentId: 'fuellung',
            insuranceType: 'GKV' as const,
            expectedVerdict: 'PASS',
        },
        {
            name: 'GOZ endo codes → PASS',
            codes: ['GOZ_2390', 'GOZ_2400', 'GOZ_2410'],
            treatmentId: 'endo',
            insuranceType: 'PKV' as const,
            expectedVerdict: 'PASS',
        },
        // WARN cases from regel_e2e_test_warn
        {
            name: 'TEST_WARN_A + TEST_WARN_B → WARN',
            codes: ['TEST_WARN_A', 'TEST_WARN_B'],
            treatmentId: 'fuellung',
            insuranceType: 'GKV' as const,
            expectedVerdict: 'WARN',
        },
    ];

    for (const scenario of goldenScenarios) {
        it(`new checker: ${scenario.name}`, () => {
            const result = checkCombinabilityFromKb(scenario.codes, {
                treatmentId: scenario.treatmentId,
                insuranceType: scenario.insuranceType,
            });

            expect(result.verdict).toBe(scenario.expectedVerdict);
        });

        it(`parity: ${scenario.name}`, () => {
            const newResult = checkCombinabilityFromKb(scenario.codes, {
                treatmentId: scenario.treatmentId,
                insuranceType: scenario.insuranceType,
            });

            const oldResult = checkCombinability(
                scenario.codes,
                scenario.treatmentId,
                scenario.insuranceType
            );

            expect(newResult.verdict).toBe(oldResult.verdict);
        });
    }

    it('conflict ruleIds match between old and new', () => {
        // Test a known conflict
        const codes = ['GOZ_2197', 'GOZ_2060'];
        const treatmentId = 'fuellung';
        const insuranceType = 'PKV' as const;

        const newResult = checkCombinabilityFromKb(codes, { treatmentId, insuranceType });
        const oldResult = checkCombinability(codes, treatmentId, insuranceType);

        // Both should report the same rule
        if (newResult.conflicts.length > 0 && oldResult.conflicts.length > 0) {
            expect(newResult.conflicts[0].ruleId).toBe(oldResult.conflicts[0].ruleId);
        }
    });
});
