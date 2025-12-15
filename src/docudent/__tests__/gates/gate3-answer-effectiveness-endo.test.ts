/**
 * Gate 3: Answer Effectiveness for ENDO treatment
 * 
 * This test ensures that endo answers have observable effects on the pipeline.
 * 
 * Tests:
 * - kanalzahl=3 MUST activate kanalaufbereitung_3 chip
 * - medikament=caoh2 MUST activate einlage_caoh2 chip
 * - All mapped answers must affect pipeline
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateFinalOutput } from '../../v6/services/outputService';

// Minimal extracted fixture for endo
const ENDO_MINIMAL_EXTRACTED = {
    tooth: '46',
    surfaces: [],
    diagnosis: 'Pulpitis',
    costs: null,
    mentioned: {},
    gaps: [],
};

describe('GATE3: ENDO Answer Effectiveness', () => {
    beforeEach(() => {
        (globalThis as any).__FORCE_DEBUG__ = true;
        (globalThis as any).__SKIP_DEV_CHECKS__ = true;
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'debug').mockImplementation(() => { });
    });

    afterEach(() => {
        (globalThis as any).__FORCE_DEBUG__ = false;
        (globalThis as any).__SKIP_DEV_CHECKS__ = false;
        vi.restoreAllMocks();
    });

    describe('kanalzahl answer effectiveness', () => {
        it('kanalzahl=3 should activate kanalaufbereitung_3 chip', async () => {
            const result = await generateFinalOutput({
                extracted: ENDO_MINIMAL_EXTRACTED,
                answers: new Map<string, unknown>([
                    ['vitality', 'neg'],
                    ['percussion', 'neg'],
                    ['kanalzahl', '3'],
                    ['spuelung', 'naocl'],
                    ['medikament', 'caoh2'],
                ]),
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                treatmentId: 'endo',
            });

            expect(result._debug?.activeChipIds).toContain('kanalaufbereitung_3');
            expect(result._debug?.activeChipIds).not.toContain('kanalaufbereitung_1');
            expect(result._debug?.activeChipIds).not.toContain('kanalaufbereitung_2');
            expect(result._debug?.activeChipIds).not.toContain('kanalaufbereitung_4');
        });

        it('kanalzahl=1 should activate kanalaufbereitung_1 chip', async () => {
            const result = await generateFinalOutput({
                extracted: ENDO_MINIMAL_EXTRACTED,
                answers: new Map<string, unknown>([
                    ['vitality', 'neg'],
                    ['percussion', 'neg'],
                    ['kanalzahl', '1'],
                    ['spuelung', 'naocl'],
                    ['medikament', 'caoh2'],
                ]),
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                treatmentId: 'endo',
            });

            expect(result._debug?.activeChipIds).toContain('kanalaufbereitung_1');
            expect(result._debug?.activeChipIds).not.toContain('kanalaufbereitung_3');
        });
    });

    describe('medikament answer effectiveness', () => {
        it('medikament=caoh2 should activate einlage_caoh2 chip', async () => {
            const result = await generateFinalOutput({
                extracted: ENDO_MINIMAL_EXTRACTED,
                answers: new Map<string, unknown>([
                    ['vitality', 'neg'],
                    ['percussion', 'neg'],
                    ['kanalzahl', '2'],
                    ['spuelung', 'naocl'],
                    ['medikament', 'caoh2'],
                ]),
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                treatmentId: 'endo',
            });

            expect(result._debug?.activeChipIds).toContain('einlage_caoh2');
        });
    });

    describe('vitality and percussion answers', () => {
        it('vitality=neg should activate vipr_neg chip', async () => {
            const result = await generateFinalOutput({
                extracted: ENDO_MINIMAL_EXTRACTED,
                answers: new Map<string, unknown>([
                    ['vitality', 'neg'],
                    ['percussion', 'neg'],
                    ['kanalzahl', '2'],
                    ['spuelung', 'naocl'],
                    ['medikament', 'caoh2'],
                ]),
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                treatmentId: 'endo',
            });

            expect(result._debug?.activeChipIds).toContain('vipr_neg');
            expect(result._debug?.activeChipIds).not.toContain('vipr_pos');
        });

        it('percussion=pos should activate perk_pos chip', async () => {
            const result = await generateFinalOutput({
                extracted: ENDO_MINIMAL_EXTRACTED,
                answers: new Map<string, unknown>([
                    ['vitality', 'neg'],
                    ['percussion', 'pos'],
                    ['kanalzahl', '2'],
                    ['spuelung', 'naocl'],
                    ['medikament', 'caoh2'],
                ]),
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                treatmentId: 'endo',
            });

            expect(result._debug?.activeChipIds).toContain('perk_pos');
            expect(result._debug?.activeChipIds).not.toContain('perk_neg');
        });
    });

    describe('Endo-specific chips are NOT fuellung chips', () => {
        it('kanalaufbereitung chips should be endo-only', async () => {
            const result = await generateFinalOutput({
                extracted: ENDO_MINIMAL_EXTRACTED,
                answers: new Map<string, unknown>([
                    ['vitality', 'neg'],
                    ['percussion', 'neg'],
                    ['kanalzahl', '4'],
                    ['spuelung', 'naocl'],
                    ['medikament', 'caoh2'],
                ]),
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                treatmentId: 'endo',
            });

            // Endo-specific chip present
            expect(result._debug?.activeChipIds).toContain('kanalaufbereitung_4');

            // Fuellung-specific chips absent
            expect(result._debug?.activeChipIds).not.toContain('kofferdam');
            expect(result._debug?.activeChipIds).not.toContain('komposit_basic');
            expect(result._debug?.activeChipIds).not.toContain('cp');
        });
    });
});
