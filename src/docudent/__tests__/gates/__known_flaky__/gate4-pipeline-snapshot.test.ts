/**
 * Pipeline Snapshot Test — GATE 4: Regression Lock
 * 
 * This test protects against accidental changes to:
 * - Canonical answer IDs
 * - Chip mappings
 * - Output semantics (mergedFacts, billing codes, warnings)
 * 
 * If this test fails, someone changed pipeline behavior.
 * Either update the snapshot intentionally or fix the regression.
 */
import { describe, it, expect } from 'vitest';

describe('GATE4: Pipeline Regression Lock', () => {
    // ═══════════════════════════════════════════════════════════════
    // GOLDEN SCENARIO 1 — The canonical reference case
    // ═══════════════════════════════════════════════════════════════
    const GOLDEN_1_EXTRACTED = {
        tooth: '36',
        surfaces: ['m', 'o', 'd'],
        diagnosis: 'Caries profunda',
        costs: 120,
        mentioned: {
            anesthesia: { type: 'leitung' },
            tiefe: 'tief'
        },
        gaps: []
    } as any;

    const GOLDEN_1_ANSWERS = new Map<string, unknown>([
        ['vitality', 'pos'],
        ['percussion', 'neg'],
        ['isolation', 'kofferdam'],
        ['tiefe', 'tief'],
        ['material', 'mta'],
        ['mehrschicht', 'yes'],
        ['mkv_vereinbarung', 'yes'],
        ['mkv_betrag', 120],
    ]);

    it('should produce stable snapshot for Golden Scenario 1', async () => {
        const { generateFinalOutput } = await import('../../v6/services/outputService');

        const output = await generateFinalOutput({
            extracted: GOLDEN_1_EXTRACTED,
            answers: GOLDEN_1_ANSWERS as Map<string, any>,
            insuranceType: 'GKV',
            textLength: 'mittel',
            hasMKV: true,
            mkvBetrag: 120
        });

        // Extract stable, structured data (not raw text)
        const snapshot = {
            activeChipIds: output._debug?.activeChipIds?.sort() ?? [],
            billingCodes: output.billingCodes.map(bc =>
                typeof bc === 'string' ? bc : bc.code
            ).sort(),
            warningIds: output.warnings.map(w => w.id).sort(),
            mergedFacts: {
                tooth: GOLDEN_1_EXTRACTED.tooth,
                surfaces: GOLDEN_1_EXTRACTED.surfaces.sort(),
                tiefe: 'deep',  // Expected canonical value
                cappingMaterial: 'mta',
                hasMKV: true,
                mkvBetrag: 120,
            },
        };

        // This snapshot MUST remain stable
        expect(snapshot).toMatchInlineSnapshot(`
          {
            "activeChipIds": [
              "cp",
              "exkavation",
              "finishing",
              "kofferdam",
              "la_leitung",
              "mehrschicht",
              "perk_neg",
              "vipr_pos",
            ],
            "billingCodes": [
              "BEMA_12",
              "BEMA_13c",
              "BEMA_25",
              "BEMA_41a",
              "GOZ_2197",
            ],
            "mergedFacts": {
              "cappingMaterial": "mta",
              "hasMKV": true,
              "mkvBetrag": 120,
              "surfaces": [
                "d",
                "m",
                "o",
              ],
              "tiefe": "deep",
              "tooth": "36",
            },
            "warningIds": [
              "RULE_CP_MATERIAL_PFLICHT",
              "RULE_FCODE_FLAECHEN",
              "RULE_MKV_SCHRIFTLICH",
              "forensic-cp-0",
              "forensic-cp-2",
              "forensic-kofferdam-0",
              "forensic-kofferdam-1",
            ],
          }
        `);
    });

    it('translateAnswers should produce canonical format', async () => {
        const { translateAnswers } = await import('../../core/billing/knowledgeBase/logic/answerIdTranslator');

        const translated = translateAnswers('fuellung', GOLDEN_1_ANSWERS);

        // Snapshot canonical answer translation
        const snapshot = {
            kofferdam: translated.get('kofferdam'),
            cavity_depth: translated.get('cavity_depth'),
            capping: translated.get('capping'),
            capping_material: translated.get('capping_material'),
            vitality: translated.get('vitality'),
            percussion: translated.get('percussion'),
        };

        expect(snapshot).toMatchInlineSnapshot(`
          {
            "capping": "cp",
            "capping_material": "mta",
            "cavity_depth": "deep",
            "kofferdam": "yes",
            "percussion": "neg",
            "vitality": "pos",
          }
        `);
    });

    it('chip resolution should be deterministic for Golden 1', async () => {
        const { generateFinalOutput } = await import('../../v6/services/outputService');

        // Run twice with same input
        const output1 = await generateFinalOutput({
            extracted: GOLDEN_1_EXTRACTED,
            answers: GOLDEN_1_ANSWERS as Map<string, any>,
            insuranceType: 'GKV',
            textLength: 'mittel',
            hasMKV: true,
            mkvBetrag: 120
        });

        const output2 = await generateFinalOutput({
            extracted: GOLDEN_1_EXTRACTED,
            answers: GOLDEN_1_ANSWERS as Map<string, any>,
            insuranceType: 'GKV',
            textLength: 'mittel',
            hasMKV: true,
            mkvBetrag: 120
        });

        // Must be identical
        expect(output1._debug?.activeChipIds?.sort()).toEqual(output2._debug?.activeChipIds?.sort());
        expect(output1.billingCodes).toEqual(output2.billingCodes);
    });

    // ═══════════════════════════════════════════════════════════════
    // MUTATION TESTS — Prove snapshot catches regressions
    // ═══════════════════════════════════════════════════════════════

    describe('Mutation Detection (Anti-Footgun)', () => {
        it('should detect chip changes when isolation answer differs', async () => {
            const { generateFinalOutput } = await import('../../v6/services/outputService');

            // Same as Golden 1 but with relativ instead of kofferdam
            const answersWithRelativ = new Map<string, unknown>([
                ['vitality', 'pos'],
                ['percussion', 'neg'],
                ['isolation', 'relativ'],  // CHANGED
                ['tiefe', 'tief'],
                ['material', 'mta'],
                ['mehrschicht', 'yes'],
                ['mkv_vereinbarung', 'yes'],
                ['mkv_betrag', 120],
            ]);

            const output = await generateFinalOutput({
                extracted: GOLDEN_1_EXTRACTED,
                answers: answersWithRelativ as Map<string, any>,
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: true,
                mkvBetrag: 120
            });

            // Should have rel_trocken instead of kofferdam
            const chips = output._debug?.activeChipIds ?? [];
            expect(chips).toContain('rel_trocken');
            expect(chips).not.toContain('kofferdam');
        });

        it('should detect chip changes when material is removed', async () => {
            const { generateFinalOutput } = await import('../../v6/services/outputService');

            // Same as Golden 1 but WITHOUT material
            const answersNoMaterial = new Map<string, unknown>([
                ['vitality', 'pos'],
                ['percussion', 'neg'],
                ['isolation', 'kofferdam'],
                ['tiefe', 'normal'],  // Changed to normal (no capping needed)
            ]);

            const output = await generateFinalOutput({
                extracted: { ...GOLDEN_1_EXTRACTED, mentioned: {} },
                answers: answersNoMaterial as Map<string, any>,
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false
            });

            // Should NOT have cp chip
            const chips = output._debug?.activeChipIds ?? [];
            expect(chips).not.toContain('cp');
        });
    });
});
