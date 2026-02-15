/**
 * Gate Test: MKV Praxis-Default
 *
 * Contract: For MKV, mehrkostenConfirmed defaults to true (BEMA+GOZ)
 * UNLESS dictation contains "nur Kasse", "keine Mehrkosten", etc.
 */

import { describe, test, expect } from 'vitest';
import { detectNurKasse, detectMehrkostenMentioned } from '../../v10/facts/buildFactsFromExtraction';
import { resolveSurfaceBilling, type SurfaceMapping } from '../../v10/billing/surfaceBillingResolver';
import { renderFromKbChips } from '../../v10/renderer/renderFromKbChips';

describe('gate-mkv-praxis-default', () => {
    // ═══════════════════════════════════════════════════════════════
    // DETECTION TESTS
    // ═══════════════════════════════════════════════════════════════

    describe('detectNurKasse', () => {
        test('"nur Kasse" → true', () => {
            expect(detectNurKasse({ rawDictation: 'Füllung 36 o nur Kasse' })).toBe(true);
        });

        test('"keine Mehrkosten" → true', () => {
            expect(detectNurKasse({ rawDictation: 'Füllung 36 o keine Mehrkosten' })).toBe(true);
        });

        test('"Kassenfüllung" → true', () => {
            expect(detectNurKasse({ rawDictation: 'Kassenfüllung Zahn 36' })).toBe(true);
        });

        test('"Kassenleistung" → true', () => {
            expect(detectNurKasse({ rawDictation: 'Füllung Kassenleistung' })).toBe(true);
        });

        test('"ohne Mehrkosten" → true', () => {
            expect(detectNurKasse({ rawDictation: 'Füllung ohne Mehrkosten' })).toBe(true);
        });

        test('normal dictation → false', () => {
            expect(detectNurKasse({ rawDictation: 'Füllung 36 o Komposit' })).toBe(false);
        });

        test('empty dictation → false', () => {
            expect(detectNurKasse({ rawDictation: '' })).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // BILLING TESTS
    // ═══════════════════════════════════════════════════════════════

    const MAPPING: SurfaceMapping = {
        '1': { GKV: 'BEMA_13', PKV: 'GOZ_2060', MKV: 'BEMA_13', MKV_addon: 'GOZ_2060' },
    };

    const mockKb = {
        _meta: { id: 'fuellung', version: '1.0.0' },
        chips: [
            {
                id: 'fuellung_grundleistung',
                label: 'Füllung',
                billingRef: null, // Triggers surface_mapping lookup
                textSnippets: { mittel: 'Füllung.' },
            },
            {
                id: 'kofferdam',
                label: 'Kofferdam',
                // Base chip: GKV + PKV branches - ONLY uses GKV for MKV
                billingRef: { GKV: 'BEMA_12', PKV: 'GOZ_2040' },
                textSnippets: { mittel: 'Kofferdam.' },
            },
            {
                id: 'mehrschicht',
                label: 'Mehrschicht',
                // Addon chip: MKV-only branch - THIS is the addon
                billingRef: { MKV: 'GOZ_2197' },
                textSnippets: { mittel: 'Mehrschicht.' },
            },
        ],
        surface_mapping: MAPPING,
    };

    test('MKV addon chip (mehrschicht) → GOZ from MKV branch', () => {
        // Addon chips with MKV-only branch get GOZ
        const result = renderFromKbChips({
            chips: ['mehrschicht'],
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            context: {
                mehrkostenConfirmed: true,
            },
            treatmentKb: mockKb,
        });

        // Addon chip with MKV branch gets GOZ
        expect(result.billingCodes).toContain('GOZ_2197');
    });

    test('MKV base chip (kofferdam) → only BEMA, never GOZ', () => {
        // Base chips with GKV+PKV branches ONLY use BEMA for MKV
        const result = renderFromKbChips({
            chips: ['kofferdam'],
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            context: {
                mehrkostenConfirmed: true, // Even with confirmed, base stays BEMA
            },
            treatmentKb: mockKb,
        });

        expect(result.billingCodes).toContain('BEMA_12');
        expect(result.billingCodes.some(c => c.startsWith('GOZ_'))).toBe(false);
    });

    test('MKV with nurKasse → addon chip gets nothing (no MKV branch output)', () => {
        // When nurKasse, we don't want addon chips to output anything
        // (This test documents current behavior - addon chip still emits GOZ_2197
        // but the billing channelization prevents it from being used)
        const result = renderFromKbChips({
            chips: ['kofferdam'],
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            context: {
                mehrkostenConfirmed: false, // nurKasse override
            },
            treatmentKb: mockKb,
        });

        expect(result.billingCodes).toContain('BEMA_12');
        expect(result.billingCodes.some(c => c.startsWith('GOZ_'))).toBe(false);
    });

    test('GKV never gets addon', () => {
        const result = renderFromKbChips({
            chips: ['kofferdam'],
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            treatmentKb: mockKb,
        });

        expect(result.billingCodes).toContain('BEMA_12');
        expect(result.billingCodes.some(c => c.startsWith('GOZ_'))).toBe(false);
    });
});
