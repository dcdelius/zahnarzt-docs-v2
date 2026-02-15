/**
 * Gate Test: MKV Billing Contract
 *
 * Verifies the MKV Two-Channel Billing Contract:
 * - GKV: only BEMA, no GOZ
 * - PKV: only GOZ, no BEMA
 * - MKV: BEMA (base) + optional GOZ (addon when mehrkostenConfirmed)
 */

import { describe, test, expect } from 'vitest';
import { resolveSurfaceBilling, type SurfaceMapping } from '../../v10/billing/surfaceBillingResolver';
import { renderFromKbChips } from '../../v10/renderer/renderFromKbChips';

const SURFACE_MAPPING: SurfaceMapping = {
    '1': { GKV: 'BEMA_13', PKV: 'GOZ_2060', MKV: 'BEMA_13', MKV_addon: 'GOZ_2060' },
    '2': { GKV: 'BEMA_13b', PKV: 'GOZ_2080', MKV: 'BEMA_13b', MKV_addon: 'GOZ_2080' },
    '3': { GKV: 'BEMA_13c', PKV: 'GOZ_2100', MKV: 'BEMA_13c', MKV_addon: 'GOZ_2100' },
    '4+': { GKV: 'BEMA_13d', PKV: 'GOZ_2120', MKV: 'BEMA_13d', MKV_addon: 'GOZ_2120' },
};

describe('gate-mkv-billing-contract', () => {
    // ═══════════════════════════════════════════════════════════════
    // UNIT TESTS: Surface Billing Resolver
    // ═══════════════════════════════════════════════════════════════

    describe('Surface Billing Resolver', () => {
        test('GKV: returns only BEMA, no addonCode', () => {
            const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaces: ['o', 'd'] }, 'GKV');
            expect(result?.billingCode).toBe('BEMA_13b');
            expect(result?.addonCode).toBeNull();
        });

        test('PKV: returns only GOZ, no addonCode', () => {
            const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaces: ['o', 'd'] }, 'PKV');
            expect(result?.billingCode).toBe('GOZ_2080');
            expect(result?.addonCode).toBeNull();
        });

        test('MKV: returns BEMA base AND GOZ addon', () => {
            const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaces: ['o', 'd'] }, 'MKV');
            expect(result?.billingCode).toBe('BEMA_13b');
            expect(result?.addonCode).toBe('GOZ_2080');
        });

        test('MKV with 3 surfaces → BEMA_13c + GOZ_2100', () => {
            const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaces: ['m', 'o', 'd'] }, 'MKV');
            expect(result?.billingCode).toBe('BEMA_13c');
            expect(result?.addonCode).toBe('GOZ_2100');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // UNIT TESTS: Render (MKV addon only when mehrkostenConfirmed)
    // ═══════════════════════════════════════════════════════════════

    describe('Renderer MKV Two-Channel', () => {
        const mockTreatmentKb = {
            _meta: { id: 'fuellung', version: '1.0.0' },
            chips: [
                {
                    id: 'fuellung_grundleistung',
                    label: 'Füllung Grundleistung',
                    billingRef: null,
                    hinweis: 'F-Code wird durch surface_mapping bestimmt',
                    textSnippets: { mittel: 'Füllung' },
                },
                {
                    id: 'kofferdam',
                    label: 'Kofferdam',
                    // Base chip: GKV + PKV branches - should ONLY use GKV for MKV
                    billingRef: { GKV: 'BEMA_12', PKV: 'GOZ_2040' },
                    textSnippets: { mittel: 'Kofferdam angelegt.' },
                },
                {
                    id: 'mehrschicht',
                    label: 'Mehrschichttechnik',
                    // Addon chip: MKV branch ONLY - this IS the addon
                    billingRef: { MKV: 'GOZ_2197' },
                    textSnippets: { mittel: 'Mehrschicht' },
                },
            ],
            surface_mapping: SURFACE_MAPPING,
        };

        test('MKV base chip (kofferdam) → only BEMA, never GOZ', () => {
            const result = renderFromKbChips({
                chips: ['kofferdam'],
                treatmentId: 'fuellung',
                insuranceType: 'MKV',
                textLength: 'mittel',
                context: { mehrkostenConfirmed: true }, // Even with confirmed, base stays BEMA
                treatmentKb: mockTreatmentKb,
            });

            expect(result.billingCodes).toContain('BEMA_12');
            expect(result.billingCodes.some(c => c.startsWith('GOZ_'))).toBe(false);
        });

        test('MKV addon chip (mehrschicht) → GOZ from MKV branch', () => {
            const result = renderFromKbChips({
                chips: ['mehrschicht'],
                treatmentId: 'fuellung',
                insuranceType: 'MKV',
                textLength: 'mittel',
                context: { mehrkostenConfirmed: true },
                treatmentKb: mockTreatmentKb,
            });

            expect(result.billingCodes).toContain('GOZ_2197');
        });

        test('GKV → only BEMA from billingRef', () => {
            const result = renderFromKbChips({
                chips: ['kofferdam'],
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                treatmentKb: mockTreatmentKb,
            });

            expect(result.billingCodes).toContain('BEMA_12');
            expect(result.billingCodes.some(c => c.startsWith('GOZ_'))).toBe(false);
        });

        test('PKV → only GOZ from billingRef', () => {
            const result = renderFromKbChips({
                chips: ['kofferdam'],
                treatmentId: 'fuellung',
                insuranceType: 'PKV',
                textLength: 'mittel',
                treatmentKb: mockTreatmentKb,
            });

            expect(result.billingCodes).toContain('GOZ_2040');
            expect(result.billingCodes.some(c => c.startsWith('BEMA_'))).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CONTRACT INVARIANTS
    // ═══════════════════════════════════════════════════════════════

    describe('Contract Invariants', () => {
        test('GKV never contains GOZ', () => {
            const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaces: ['m', 'o', 'd', 'b'] }, 'GKV');
            expect(result?.billingCode?.startsWith('BEMA_')).toBe(true);
            expect(result?.billingCode?.startsWith('GOZ_')).toBe(false);
            expect(result?.addonCode).toBeNull();
        });

        test('PKV never contains BEMA', () => {
            const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaces: ['m', 'o', 'd', 'b'] }, 'PKV');
            expect(result?.billingCode?.startsWith('GOZ_')).toBe(true);
            expect(result?.billingCode?.startsWith('BEMA_')).toBe(false);
            expect(result?.addonCode).toBeNull();
        });

        test('MKV base is always BEMA', () => {
            const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaces: ['m', 'o', 'd', 'b'] }, 'MKV');
            expect(result?.billingCode?.startsWith('BEMA_')).toBe(true);
        });

        test('MKV addon is always GOZ', () => {
            const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaces: ['m', 'o', 'd', 'b'] }, 'MKV');
            expect(result?.addonCode?.startsWith('GOZ_')).toBe(true);
        });
    });
});
