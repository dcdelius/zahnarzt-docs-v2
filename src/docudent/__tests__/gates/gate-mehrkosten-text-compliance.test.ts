/**
 * Gate Test: Mehrkosten Text Compliance
 *
 * Contract: When addon billing (GOZ) is included for MKV,
 * the output must contain Mehrkosten documentation text.
 */

import { describe, test, expect } from 'vitest';
import { renderFromKbChips } from '../../v10/renderer/renderFromKbChips';
import type { SurfaceMapping } from '../../v10/billing/surfaceBillingResolver';

const SURFACE_MAPPING: SurfaceMapping = {
    '1': { GKV: 'BEMA_13', PKV: 'GOZ_2060', MKV: 'BEMA_13', MKV_addon: 'GOZ_2060' },
};

describe('gate-mehrkosten-text-compliance', () => {
    const mockTreatmentKb = {
        _meta: { id: 'fuellung', version: '1.0.0' },
        chips: [
            {
                id: 'fuellung_grundleistung',
                label: 'Füllung',
                billingRef: null,
                hinweis: 'F-Code via surface_mapping',
                textSnippets: { mittel: 'Füllung durchgeführt.' },
            },
            {
                id: 'insurance_gkv_mkv',
                label: 'Mehrkosten',
                billingRef: null,
                textSnippets: {
                    kurz: 'Mehrkostenvereinbarung.',
                    mittel: 'Höherwertige Versorgung mit Mehrkostenvereinbarung (§ 28 SGB V).',
                    lang: 'Patientenaufklärung über Mehrkosten erfolgt.',
                },
            },
        ],
        surface_mapping: SURFACE_MAPPING,
    };

    test('MKV with addon billing must include Mehrkosten text', () => {
        const result = renderFromKbChips({
            chips: ['fuellung_grundleistung', 'insurance_gkv_mkv'],
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            context: {
                mehrkostenConfirmed: true,
                surfaces: ['o'],
            },
            treatmentKb: mockTreatmentKb,
        });

        // Must contain both BEMA and GOZ
        expect(result.billingCodes).toContain('BEMA_13');
        expect(result.billingCodes).toContain('GOZ_2060');

        // Must contain Mehrkosten text for compliance
        expect(result.fullText).toContain('Mehrkostenvereinbarung');
    });

    test('GKV never includes Mehrkosten text (no addon billing)', () => {
        const result = renderFromKbChips({
            chips: ['fuellung_grundleistung'],
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            context: {
                surfaces: ['o'],
            },
            treatmentKb: mockTreatmentKb,
        });

        // Only BEMA, no GOZ
        expect(result.billingCodes).toContain('BEMA_13');
        expect(result.billingCodes.some(c => c.startsWith('GOZ_'))).toBe(false);
    });

    test('MKV without mehrkostenConfirmed does NOT include addon', () => {
        const result = renderFromKbChips({
            chips: ['fuellung_grundleistung'],
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            context: {
                mehrkostenConfirmed: false,
                surfaces: ['o'],
            },
            treatmentKb: mockTreatmentKb,
        });

        // Only BEMA base
        expect(result.billingCodes).toContain('BEMA_13');
        expect(result.billingCodes.some(c => c.startsWith('GOZ_'))).toBe(false);
    });
});
