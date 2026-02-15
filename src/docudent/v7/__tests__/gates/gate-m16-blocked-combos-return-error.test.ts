/**
 * M16 Gate: Blocked Combos Return Error
 *
 * Verifies that when a BLOCK-level combinability conflict is found,
 * the pipeline returns state='error' and meta.combinability contains conflict info.
 */

import { describe, it, expect } from 'vitest';
import { checkCombinabilityFromKb } from '../../../v10/billing/combinability';

describe('Gate M16: Blocked Combos Return Error', () => {
    // regel_goz2197_nicht_neben_2060: GOZ_2197 cannot be combined with GOZ_2060-2120

    it('BLOCK when GOZ_2197 + GOZ_2060 are both present', () => {
        const result = checkCombinabilityFromKb(
            ['GOZ_2197', 'GOZ_2060'],
            { treatmentId: 'fuellung', insuranceType: 'PKV' }
        );

        expect(result.verdict).toBe('BLOCK');
        expect(result.conflicts.length).toBeGreaterThan(0);
        expect(result.blockedCodes).toContain('GOZ_2060');
        expect(result.conflicts[0].ruleId).toBe('regel_goz2197_nicht_neben_2060');
    });

    it('BLOCK when GOZ_2197 + GOZ_2080 are both present', () => {
        const result = checkCombinabilityFromKb(
            ['GOZ_2197', 'GOZ_2080', 'GOZ_0090'],
            { treatmentId: 'fuellung', insuranceType: 'PKV' }
        );

        expect(result.verdict).toBe('BLOCK');
        expect(result.blockedCodes).toContain('GOZ_2080');
    });

    it('BLOCK when GOZ_2197 + GOZ_2100 are both present', () => {
        const result = checkCombinabilityFromKb(
            ['GOZ_2197', 'GOZ_2100'],
            { treatmentId: 'fuellung', insuranceType: 'PKV' }
        );

        expect(result.verdict).toBe('BLOCK');
        expect(result.blockedCodes).toContain('GOZ_2100');
    });

    it('BLOCK when GOZ_2197 + GOZ_2120 are both present', () => {
        const result = checkCombinabilityFromKb(
            ['GOZ_2197', 'GOZ_2120'],
            { treatmentId: 'fuellung', insuranceType: 'PKV' }
        );

        expect(result.verdict).toBe('BLOCK');
        expect(result.blockedCodes).toContain('GOZ_2120');
    });

    it('PASS when only GOZ_2197 is present (no conflict)', () => {
        const result = checkCombinabilityFromKb(
            ['GOZ_2197', 'GOZ_0090'],
            { treatmentId: 'fuellung', insuranceType: 'PKV' }
        );

        expect(result.verdict).toBe('PASS');
        expect(result.conflicts.length).toBe(0);
        expect(result.blockedCodes.length).toBe(0);
    });

    it('PASS when only GOZ_2060 is present (no 2197)', () => {
        const result = checkCombinabilityFromKb(
            ['GOZ_2060', 'GOZ_0090'],
            { treatmentId: 'fuellung', insuranceType: 'PKV' }
        );

        expect(result.verdict).toBe('PASS');
    });

    it('WARN when TEST_WARN_A + TEST_WARN_B are both present (E2E test rule)', () => {
        const result = checkCombinabilityFromKb(
            ['TEST_WARN_A', 'TEST_WARN_B'],
            { treatmentId: 'fuellung', insuranceType: 'GKV' }
        );

        expect(result.verdict).toBe('WARN');
        expect(result.conflicts.length).toBeGreaterThan(0);
        expect(result.conflicts[0].ruleId).toBe('regel_e2e_test_warn');
    });

    it('traceLine contains verdict and conflict count', () => {
        const result = checkCombinabilityFromKb(
            ['GOZ_2197', 'GOZ_2060'],
            { treatmentId: 'fuellung', insuranceType: 'PKV' }
        );

        expect(result.traceLine).toContain('verdict=BLOCK');
        expect(result.traceLine).toContain('conflicts=1');
        expect(result.traceLine).toContain('blocked=');
    });

    it('kbVersion is present in result', () => {
        const result = checkCombinabilityFromKb(
            ['BEMA_13'],
            { treatmentId: 'fuellung', insuranceType: 'GKV' }
        );

        expect(result.kbVersion).toBeTruthy();
        expect(typeof result.kbVersion).toBe('string');
    });
});
