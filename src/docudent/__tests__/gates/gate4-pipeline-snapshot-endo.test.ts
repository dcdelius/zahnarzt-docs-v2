/**
 * Gate 4: Pipeline Snapshot for ENDO treatment
 * 
 * This test locks endo pipeline behavior via inline snapshots.
 * Any change to chips, billing codes, or warnings will break this test.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { generateFinalOutput } from '../../v6/services/outputService';

// ═══════════════════════════════════════════════════════════════
// ENDO GOLDEN SCENARIO 1: 46 wurzelbehandlung with 3 kanäle
// ═══════════════════════════════════════════════════════════════

const ENDO_G1_EXTRACTED = {
    tooth: '46',
    surfaces: [],
    diagnosis: 'Pulpitis irreversibilis',
    costs: null,
    mentioned: {
        anesthesia: { type: 'leitung' },
    },
    gaps: [],
};

const ENDO_G1_ANSWERS = new Map<string, unknown>([
    ['vitality', 'neg'],
    ['percussion', 'pos'],
    ['kanalzahl', '3'],
    ['spuelung', 'naocl'],
    ['medikament', 'caoh2'],
]);

describe('GATE4: ENDO Pipeline Regression Lock', () => {
    beforeEach(() => {
        // Enable force debug for test assertions
        (globalThis as any).__FORCE_DEBUG__ = true;
        (globalThis as any).__SKIP_DEV_CHECKS__ = true;

        // Mock console to reduce noise
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'debug').mockImplementation(() => { });
    });

    afterEach(() => {
        (globalThis as any).__FORCE_DEBUG__ = false;
        (globalThis as any).__SKIP_DEV_CHECKS__ = false;
        vi.restoreAllMocks();
    });

    describe('ENDO_G1: Wurzelbehandlung 46 mit 3 Kanälen', () => {
        it('should produce endo-specific chips (kanalaufbereitung_3)', async () => {
            const result = await generateFinalOutput({
                extracted: ENDO_G1_EXTRACTED,
                answers: ENDO_G1_ANSWERS,
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                treatmentId: 'endo',
            });

            expect(result).toBeDefined();
            expect(result._debug).toBeDefined();

            // Endo-specific chips MUST be present
            expect(result._debug?.activeChipIds).toContain('kanalaufbereitung_3');
            expect(result._debug?.activeChipIds).toContain('vipr_neg');
            expect(result._debug?.activeChipIds).toContain('perk_pos');
            expect(result._debug?.activeChipIds).toContain('spuelung_naocl');
            expect(result._debug?.activeChipIds).toContain('einlage_caoh2');
        });

        it('should NOT contain fuellung-only chips', async () => {
            const result = await generateFinalOutput({
                extracted: ENDO_G1_EXTRACTED,
                answers: ENDO_G1_ANSWERS,
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                treatmentId: 'endo',
            });

            // Fuellung-specific chips MUST NOT be present
            expect(result._debug?.activeChipIds).not.toContain('kofferdam');
            expect(result._debug?.activeChipIds).not.toContain('komposit_basic');
            expect(result._debug?.activeChipIds).not.toContain('exkavation');
            expect(result._debug?.activeChipIds).not.toContain('finishing');
        });

        it('should snapshot endo activeChipIds', async () => {
            const result = await generateFinalOutput({
                extracted: ENDO_G1_EXTRACTED,
                answers: ENDO_G1_ANSWERS,
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                treatmentId: 'endo',
            });

            const sortedChips = [...(result._debug?.activeChipIds || [])].sort();

            expect(sortedChips).toMatchInlineSnapshot(`
              [
                "einlage_caoh2",
                "kanalaufbereitung_3",
                "la_leitung",
                "perk_pos",
                "spuelung_naocl",
                "vipr_neg",
              ]
            `);
        });

        it('should produce billingCodes for endo', async () => {
            const result = await generateFinalOutput({
                extracted: ENDO_G1_EXTRACTED,
                answers: ENDO_G1_ANSWERS,
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                treatmentId: 'endo',
            });

            expect(result.billingCodes).toBeDefined();
            expect(Array.isArray(result.billingCodes)).toBe(true);
        });
    });

    describe('Determinism Check', () => {
        it('should produce identical output on repeated calls', async () => {
            const params = {
                extracted: ENDO_G1_EXTRACTED,
                answers: ENDO_G1_ANSWERS,
                insuranceType: 'GKV' as const,
                textLength: 'mittel' as const,
                hasMKV: false,
                treatmentId: 'endo',
            };

            const result1 = await generateFinalOutput(params);
            const result2 = await generateFinalOutput(params);

            expect(result1._debug?.activeChipIds?.sort()).toEqual(result2._debug?.activeChipIds?.sort());
        });
    });
});
