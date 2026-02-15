/**
 * Gate Test: P12 Billing Combinability
 *
 * Validates the BillingCombinabilityChecker using SSOT kombinationen.json.
 *
 * INVARIANTS:
 * - kombinationen.json exists and is valid
 * - Exclusion rules produce BLOCK for forbidden pairs
 * - Frequency rules detect duplicates
 * - Cross-treatment (fuellung + endo) does not falsely conflict
 */

import { describe, it, expect } from 'vitest';
import {
    checkCombinability,
    getAllRuleIds,
    getRulesForCodes
} from '../../core/billing/combinability/billingCombinabilityChecker';

describe('GATE: P12 Billing Combinability - SSOT Coverage', () => {

    it('kombinationen.json should have rules', () => {
        const ruleIds = getAllRuleIds();
        expect(ruleIds.length).toBeGreaterThan(0);
    });

    it('kombinationen.json should have rules for both BEMA and GOZ codes', () => {
        const ruleIds = getAllRuleIds();

        const hasBema = ruleIds.some(id => id.includes('bema'));
        const hasGoz = ruleIds.some(id => id.includes('goz'));

        expect(hasBema).toBe(true);
        expect(hasGoz).toBe(true);
    });

    it('should have rules covering endo codes (GOZ_2390 family)', () => {
        const rules = getRulesForCodes(['GOZ_2390', 'GOZ_2400', 'GOZ_2410', 'GOZ_2420', 'GOZ_2430', 'GOZ_2440']);
        expect(rules.length).toBeGreaterThan(0);
    });
});

describe('GATE: P12 Billing Combinability - Exclusion Rules', () => {

    it('GOZ_2197 + GOZ_2060 should return BLOCK (ausschluss rule)', () => {
        const result = checkCombinability(
            ['GOZ_2197', 'GOZ_2060'],
            'fuellung',
            'PKV'
        );

        expect(result.verdict).toBe('BLOCK');
        expect(result.conflicts.length).toBeGreaterThan(0);
        expect(result.conflicts[0].ruleId).toBe('regel_goz2197_nicht_neben_2060');
    });

    it('GOZ_2197 + GOZ_2080 should return BLOCK', () => {
        const result = checkCombinability(
            ['GOZ_2197', 'GOZ_2080'],
            'fuellung',
            'PKV'
        );

        expect(result.verdict).toBe('BLOCK');
    });

    it('GOZ_2197 + GOZ_2100 should return BLOCK', () => {
        const result = checkCombinability(
            ['GOZ_2197', 'GOZ_2100'],
            'fuellung',
            'PKV'
        );

        expect(result.verdict).toBe('BLOCK');
    });

    it('GOZ_2060 alone should PASS', () => {
        const result = checkCombinability(
            ['GOZ_2060'],
            'fuellung',
            'PKV'
        );

        expect(result.verdict).toBe('PASS');
    });
});

describe('GATE: P12 Billing Combinability - Frequency Rules', () => {

    it('duplicate BEMA_12 should WARN or BLOCK (max 1 per Kieferhälfte)', () => {
        const result = checkCombinability(
            ['BEMA_12', 'BEMA_12'],
            'fuellung',
            'GKV'
        );

        // Should at least warn about frequency
        expect(['WARN', 'BLOCK']).toContain(result.verdict);
    });

    it('single BEMA_12 should PASS', () => {
        const result = checkCombinability(
            ['BEMA_12'],
            'fuellung',
            'GKV'
        );

        expect(result.verdict).toBe('PASS');
    });
});

describe('GATE: P12 Billing Combinability - Cross-Treatment', () => {

    it('fuellung + endo codes in same session should PASS (different treatments)', () => {
        const result = checkCombinability(
            ['BEMA_13a', 'GOZ_2390', 'GOZ_2400'],
            'fuellung',  // Primary treatment
            'GKV'
        );

        // Should not falsely conflict - they are different treatments
        expect(result.conflicts.filter(c =>
            c.codeA.includes('13') && c.codeB.includes('239')
        )).toHaveLength(0);
    });
});

describe('GATE: P12 Billing Combinability - Required Justifications', () => {

    it('BEMA_12 should require justification for Kofferdam documentation', () => {
        const result = checkCombinability(
            ['BEMA_12'],
            'fuellung',
            'GKV'
        );

        expect(result.requiredJustifications.length).toBeGreaterThan(0);
        expect(result.requiredJustifications.some(j => j.includes('BEMA_12'))).toBe(true);
    });

    it('BEMA_25 (Cp) should require justification for profunda documentation', () => {
        const result = checkCombinability(
            ['BEMA_25'],
            'fuellung',
            'GKV'
        );

        expect(result.requiredJustifications.some(j => j.includes('BEMA_25'))).toBe(true);
    });
});
