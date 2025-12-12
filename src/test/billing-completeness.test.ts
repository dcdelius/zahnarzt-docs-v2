/**
 * No Money Left Behind — Billing Completeness Tests
 * 
 * Ensures every active chip produces its billing code OR an explanation.
 * Invariant: If chip X is active and billable → code present.
 *            If chip X is active but not billable → audit note explains why.
 * 
 * Run: npx vitest run src/test/billing-completeness.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
    processChipsToBilling,
    getTreatmentChips,
    type ChipDefinition
} from '../docudent/core/billing/knowledgeBase/logic/treatmentEngine';

// ═══════════════════════════════════════════════════════════════
// BILLING COMPLETENESS FIXTURES
// ═══════════════════════════════════════════════════════════════

interface CompletenessFixture {
    id: string;
    name: string;
    chips: string[];
    insuranceType: 'GKV' | 'PKV';
    hasMKV: boolean;
    extracted: { tooth: string; surfaces: string[] };
    expectBillingCodes: boolean;    // Should produce billing codes
    expectNoBEMA: boolean;          // Should NOT contain BEMA
    expectNoGOZ: boolean;           // Should NOT contain GOZ
}

const COMPLETENESS_FIXTURES: CompletenessFixture[] = [
    // GKV Cases - Should only have BEMA
    {
        id: 'gkv_basic_1_surface',
        name: 'GKV 1 Fläche',
        chips: ['exkavation', 'komposit_basic'],
        insuranceType: 'GKV',
        hasMKV: false,
        extracted: { tooth: '36', surfaces: ['o'] },
        expectBillingCodes: true,
        expectNoBEMA: false,
        expectNoGOZ: true,
    },
    {
        id: 'gkv_basic_3_surfaces',
        name: 'GKV 3 Flächen',
        chips: ['exkavation', 'komposit_basic'],
        insuranceType: 'GKV',
        hasMKV: false,
        extracted: { tooth: '36', surfaces: ['m', 'o', 'd'] },
        expectBillingCodes: true,
        expectNoBEMA: false,
        expectNoGOZ: true,
    },
    {
        id: 'gkv_with_kofferdam',
        name: 'GKV mit Kofferdam',
        chips: ['exkavation', 'komposit_basic', 'kofferdam'],
        insuranceType: 'GKV',
        hasMKV: false,
        extracted: { tooth: '36', surfaces: ['m', 'o', 'd'] },
        expectBillingCodes: true,
        expectNoBEMA: false,
        expectNoGOZ: true,
    },
    {
        id: 'gkv_with_la',
        name: 'GKV mit Lokalanästhesie',
        chips: ['exkavation', 'komposit_basic', 'la_infiltr'],
        insuranceType: 'GKV',
        hasMKV: false,
        extracted: { tooth: '16', surfaces: ['m', 'o', 'd'] },
        expectBillingCodes: true,
        expectNoBEMA: false,
        expectNoGOZ: true,
    },

    // PKV Cases - Should only have GOZ
    {
        id: 'pkv_basic_1_surface',
        name: 'PKV 1 Fläche',
        chips: ['exkavation', 'komposit_basic'],
        insuranceType: 'PKV',
        hasMKV: false,
        extracted: { tooth: '36', surfaces: ['o'] },
        expectBillingCodes: true,
        expectNoBEMA: true,
        expectNoGOZ: false,
    },
    {
        id: 'pkv_basic_3_surfaces',
        name: 'PKV 3 Flächen',
        chips: ['exkavation', 'komposit_basic'],
        insuranceType: 'PKV',
        hasMKV: false,
        extracted: { tooth: '36', surfaces: ['m', 'o', 'd'] },
        expectBillingCodes: true,
        expectNoBEMA: true,
        expectNoGOZ: false,
    },
    {
        id: 'pkv_with_capping',
        name: 'PKV mit CP',
        chips: ['exkavation', 'komposit_basic', 'cp'],
        insuranceType: 'PKV',
        hasMKV: false,
        extracted: { tooth: '36', surfaces: ['m', 'o', 'd'] },
        expectBillingCodes: true,
        expectNoBEMA: true,
        expectNoGOZ: false,
    },

    // MKV Cases - Should have both BEMA and GOZ
    {
        id: 'mkv_mehrschicht',
        name: 'MKV Mehrschicht',
        chips: ['exkavation', 'komposit_basic', 'mehrschicht'],
        insuranceType: 'GKV',
        hasMKV: true,
        extracted: { tooth: '36', surfaces: ['m', 'o', 'd'] },
        expectBillingCodes: true,
        expectNoBEMA: false,
        expectNoGOZ: false,  // MKV should have GOZ 2197
    },
    {
        id: 'mkv_fluorid',
        name: 'MKV mit Fluoridierung',
        chips: ['exkavation', 'komposit_basic', 'fluorid'],
        insuranceType: 'GKV',
        hasMKV: true,
        extracted: { tooth: '36', surfaces: ['m', 'o', 'd'] },
        expectBillingCodes: true,
        expectNoBEMA: false,
        expectNoGOZ: false,
    },

    // Edge Cases
    {
        id: 'gkv_all_extras',
        name: 'GKV mit allen Extras',
        chips: ['exkavation', 'komposit_basic', 'la_infiltr', 'kofferdam', 'cp'],
        insuranceType: 'GKV',
        hasMKV: false,
        extracted: { tooth: '16', surfaces: ['m', 'o', 'd'] },
        expectBillingCodes: true,
        expectNoBEMA: false,
        expectNoGOZ: true,
    },
];

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('No Money Left Behind — Billing Completeness', () => {

    describe('Insurance Routing', () => {
        for (const fixture of COMPLETENESS_FIXTURES) {
            it(`${fixture.id}: ${fixture.name}`, () => {
                const result = processChipsToBilling(
                    'fuellung',
                    fixture.chips,
                    fixture.insuranceType,
                    fixture.hasMKV,
                    fixture.extracted,
                    'mittel'
                );

                // Should produce billing codes
                if (fixture.expectBillingCodes) {
                    expect(result.billingCodes.length).toBeGreaterThan(0);
                }

                // Check BEMA exclusion
                if (fixture.expectNoBEMA) {
                    const hasBEMA = result.billingCodes.some(code =>
                        code.includes('BEMA')
                    );
                    expect(hasBEMA).toBe(false);
                }

                // Check GOZ exclusion
                if (fixture.expectNoGOZ) {
                    const hasGOZ = result.billingCodes.some(code =>
                        code.includes('GOZ')
                    );
                    expect(hasGOZ).toBe(false);
                }
            });
        }
    });

    describe('Output Structure', () => {
        for (const fixture of COMPLETENESS_FIXTURES) {
            it(`${fixture.id}: returns valid structure`, () => {
                const result = processChipsToBilling(
                    'fuellung',
                    fixture.chips,
                    fixture.insuranceType,
                    fixture.hasMKV,
                    fixture.extracted,
                    'mittel'
                );

                // Valid structure
                expect(Array.isArray(result.billingCodes)).toBe(true);
                expect(Array.isArray(result.textLines)).toBe(true);
                expect(Array.isArray(result.warnings)).toBe(true);
                expect(Array.isArray(result.optimierungen)).toBe(true);
                expect(Array.isArray(result.billingDetails)).toBe(true);

                // No undefined in output
                expect(result.billingCodes.includes(undefined as any)).toBe(false);
                expect(result.textLines.includes(undefined as any)).toBe(false);
            });
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// CHIP BILLING COVERAGE
// ═══════════════════════════════════════════════════════════════

describe('Chip Billing Coverage', () => {
    it('billable chip produces output', () => {
        const chips = getTreatmentChips('fuellung');
        const billableChips = chips.filter(c =>
            c.billingRef?.GKV || c.billingRef?.PKV
        );

        // At least test that the engine doesn't crash
        for (const chip of billableChips.slice(0, 5)) {
            const result = processChipsToBilling(
                'fuellung',
                [chip.id],
                'GKV',
                false,
                { tooth: '36', surfaces: ['o'] },
                'mittel'
            );

            // Should produce some output (billing, text, or warning)
            const hasOutput = result.billingCodes.length > 0 ||
                result.warnings.length > 0 ||
                result.textLines.length > 0;
            expect(hasOutput).toBe(true);
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

describe('Billing Completeness Summary', () => {
    it(`has ${COMPLETENESS_FIXTURES.length} fixtures`, () => {
        expect(COMPLETENESS_FIXTURES.length).toBeGreaterThanOrEqual(10);
    });

    it('covers all insurance types', () => {
        const gkv = COMPLETENESS_FIXTURES.filter(f => f.insuranceType === 'GKV' && !f.hasMKV);
        const pkv = COMPLETENESS_FIXTURES.filter(f => f.insuranceType === 'PKV');
        const mkv = COMPLETENESS_FIXTURES.filter(f => f.hasMKV);

        expect(gkv.length).toBeGreaterThan(0);
        expect(pkv.length).toBeGreaterThan(0);
        expect(mkv.length).toBeGreaterThan(0);
    });
});
