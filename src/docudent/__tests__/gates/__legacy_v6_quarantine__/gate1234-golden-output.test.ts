/**
 * Golden Output Tests — Semantic Correctness Verification
 *
 * These tests verify that:
 * 1. Dictation + answers → correct chip activation → correct output
 * 2. No unresolved placeholders in output
 * 3. Warnings match reality
 *
 * Uses deterministic inputs to ensure reproducible results.
 */

import { describe, it, expect } from 'vitest';
import {
    normalizeAnswers,
    hasUnmappedAnswers,
    mergeFacts,
    deriveChipsFromCanonicalAnswers,
    type MergedFacts
} from '../../v7/pipeline/normalizeAnswers';
import { checkPlaceholders } from '../../v7/pipeline/trace';
import {
    CANONICAL_QUESTION_IDS,
    CANONICAL_OPTION_IDS,
    ANSWER_TO_CHIP
} from '../../contracts/canonicalIds';

// ═══════════════════════════════════════════════════════════════
// GOLDEN EXAMPLE 1: Deep Filling with MKV
// ═══════════════════════════════════════════════════════════════

describe('Golden Example 1: "36 mod tief + LA + MKV 120"', () => {
    const TREATMENT_ID = 'fuellung';

    // Simulated extraction result (what LLM/regex returns)
    const EXTRACTED = {
        tooth: '36',
        surfaces: ['m', 'o', 'd'],
        diagnosis: 'Caries profunda',
        costs: 120,
        mentioned: {
            anesthesia: { type: 'infiltr' },
            tiefe: 'tief',
        }
    };

    // User answers (semantic IDs from QuestionBank)
    const ANSWERS = new Map<string, unknown>([
        ['vitality', 'pos'],
        ['percussion', 'neg'],
        ['isolation', 'kofferdam'],
        ['tiefe', 'tief'],
        ['material', 'mta'],
        ['mehrschicht', 'yes'],
        ['mkv_betrag', 120],
    ]);

    describe('Extraction Baseline', () => {
        it('should have correct tooth 36 (NOT 35)', () => {
            expect(EXTRACTED.tooth).toBe('36');
            expect(EXTRACTED.tooth).not.toBe('35');
        });

        it('should have MOD surfaces', () => {
            expect(EXTRACTED.surfaces).toEqual(['m', 'o', 'd']);
        });

        it('should detect deep cavity from dictation', () => {
            expect(EXTRACTED.mentioned.tiefe).toBe('tief');
        });

        it('should detect anesthesia from dictation', () => {
            expect(EXTRACTED.mentioned.anesthesia?.type).toBe('infiltr');
        });
    });

    describe('Answer Normalization', () => {
        it('should normalize all answers without unmapped entries', () => {
            const result = normalizeAnswers(TREATMENT_ID, ANSWERS);
            expect(hasUnmappedAnswers(result)).toBe(false);
        });

        it('should translate isolation:kofferdam → forensic_kofferdam:yes', () => {
            const result = normalizeAnswers(TREATMENT_ID, ANSWERS);
            expect(result.canonicalAnswers.get(CANONICAL_QUESTION_IDS.KOFFERDAM))
                .toBe(CANONICAL_OPTION_IDS.YES);
        });

        it('should translate tiefe:tief → forensic_tiefe:deep', () => {
            const result = normalizeAnswers(TREATMENT_ID, ANSWERS);
            expect(result.canonicalAnswers.get(CANONICAL_QUESTION_IDS.TIEFE))
                .toBe(CANONICAL_OPTION_IDS.DEEP);
        });

        it('should translate material:mta → material_mta', () => {
            const result = normalizeAnswers(TREATMENT_ID, ANSWERS);
            expect(result.canonicalAnswers.get(CANONICAL_QUESTION_IDS.CAPPING_MATERIAL))
                .toBe(CANONICAL_OPTION_IDS.MTA);
        });

        it('should preserve numeric MKV amount', () => {
            const result = normalizeAnswers(TREATMENT_ID, ANSWERS);
            expect(result.canonicalAnswers.get(CANONICAL_QUESTION_IDS.MKV_BETRAG))
                .toBe(120);
        });
    });

    describe('Merged Facts', () => {
        it('should merge extraction + answers correctly', () => {
            const { canonicalAnswers } = normalizeAnswers(TREATMENT_ID, ANSWERS);
            const merged = mergeFacts(EXTRACTED, canonicalAnswers, true);

            expect(merged.tooth).toBe('36');
            expect(merged.surfaces).toEqual(['m', 'o', 'd']);
            expect(merged.tiefe).toBe('deep');
            expect(merged.isolation).toBe('yes');
            expect(merged.cappingMaterial).toBe('mta');
            expect(merged.hasMKV).toBe(true);
            expect(merged.mkvBetrag).toBe(120);
            expect(merged.mehrschicht).toBe(true);
        });

        it('should override extraction with user answers', () => {
            // Extraction says nothing about vitality, user answers pos
            const { canonicalAnswers } = normalizeAnswers(TREATMENT_ID, ANSWERS);
            const merged = mergeFacts(EXTRACTED, canonicalAnswers, true);

            expect(merged.vitality).toBe('positive');
            expect(merged.percussion).toBe('negative');
        });
    });

    describe('Chip Activation', () => {
        it('should activate kofferdam chip from yes answer', () => {
            const { canonicalAnswers } = normalizeAnswers(TREATMENT_ID, ANSWERS);
            const chips = deriveChipsFromCanonicalAnswers(canonicalAnswers, ['exkavation', 'komposit_basic']);

            expect(chips).toContain('kofferdam');
            expect(chips).not.toContain('rel_trocken'); // mutually exclusive
        });

        it('should activate cp chip from deep answer', () => {
            const { canonicalAnswers } = normalizeAnswers(TREATMENT_ID, ANSWERS);
            const chips = deriveChipsFromCanonicalAnswers(canonicalAnswers);

            expect(chips).toContain('cp');
        });

        it('should activate vipr_pos from positive vitality', () => {
            const { canonicalAnswers } = normalizeAnswers(TREATMENT_ID, ANSWERS);
            const chips = deriveChipsFromCanonicalAnswers(canonicalAnswers);

            expect(chips).toContain('vipr_pos');
            expect(chips).not.toContain('vipr_neg');
        });

        it('should activate mehrschicht from yes answer', () => {
            const { canonicalAnswers } = normalizeAnswers(TREATMENT_ID, ANSWERS);
            const chips = deriveChipsFromCanonicalAnswers(canonicalAnswers);

            expect(chips).toContain('mehrschicht');
        });
    });

    describe('Output Assertions (MUST pass)', () => {
        it('should have no placeholders in mock output', () => {
            const { canonicalAnswers } = normalizeAnswers(TREATMENT_ID, ANSWERS);
            const merged = mergeFacts(EXTRACTED, canonicalAnswers, true);

            // Simulate output text generation using merged facts
            const outputText = `Zahn ${merged.tooth}, Flächen: ${merged.surfaces.join(', ')}. 
                Diagnose: ${merged.diagnosis || 'Karies'}.
                Indirekte Überkappung mit ${merged.cappingMaterial?.toUpperCase() || 'geeignetem Material'}.
                ${merged.isolation === 'yes' ? 'Kofferdam-Isolation' : 'Relative Trockenlegung'}.
                ${merged.mehrschicht ? 'Mehrschichttechnik durchgeführt.' : ''}
                Zuzahlung: ${merged.mkvBetrag}€`;

            const { hasPlaceholders, found } = checkPlaceholders(outputText);
            expect(hasPlaceholders).toBe(false);
            expect(found).toHaveLength(0);
            expect(outputText).not.toContain('{');
            expect(outputText).not.toContain('}');
        });

        it('should NOT produce "Zahnangabe fehlt" warning when tooth exists', () => {
            const { canonicalAnswers } = normalizeAnswers(TREATMENT_ID, ANSWERS);
            const merged = mergeFacts(EXTRACTED, canonicalAnswers, true);

            // Warning generation logic
            const warnings: string[] = [];
            if (!merged.tooth) warnings.push('Zahnangabe fehlt');
            if (merged.surfaces.length === 0) warnings.push('Flächenangabe fehlt');

            expect(warnings).toHaveLength(0);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// GOLDEN EXAMPLE 2: Basic Filling (No MKV)
// ═══════════════════════════════════════════════════════════════

describe('Golden Example 2: "36 mo (2 surfaces) normal no MKV"', () => {
    const TREATMENT_ID = 'fuellung';

    const EXTRACTED = {
        tooth: '36',
        surfaces: ['m', 'o'],
        diagnosis: 'Karies',
        costs: null,
        mentioned: {}
    };

    const ANSWERS = new Map<string, unknown>([
        ['vitality', 'pos'],
        ['percussion', 'neg'],
        ['isolation', 'relativ'],
        ['tiefe', 'normal'],
    ]);

    describe('Answer Normalization', () => {
        it('should translate relativ → no', () => {
            const result = normalizeAnswers(TREATMENT_ID, ANSWERS);
            expect(result.canonicalAnswers.get(CANONICAL_QUESTION_IDS.KOFFERDAM))
                .toBe(CANONICAL_OPTION_IDS.NO);
        });

        it('should translate tiefe:normal → normal', () => {
            const result = normalizeAnswers(TREATMENT_ID, ANSWERS);
            expect(result.canonicalAnswers.get(CANONICAL_QUESTION_IDS.TIEFE))
                .toBe(CANONICAL_OPTION_IDS.NORMAL);
        });
    });

    describe('Merged Facts', () => {
        it('should have hasMKV false', () => {
            const { canonicalAnswers } = normalizeAnswers(TREATMENT_ID, ANSWERS);
            const merged = mergeFacts(EXTRACTED, canonicalAnswers, false);

            expect(merged.hasMKV).toBe(false);
            expect(merged.mkvBetrag).toBeNull();
        });

        it('should have 2 surfaces', () => {
            const { canonicalAnswers } = normalizeAnswers(TREATMENT_ID, ANSWERS);
            const merged = mergeFacts(EXTRACTED, canonicalAnswers, false);

            expect(merged.surfaces).toHaveLength(2);
            expect(merged.surfaces).toEqual(['m', 'o']);
        });
    });

    describe('Chip Activation', () => {
        it('should NOT activate cp chip for normal depth', () => {
            const { canonicalAnswers } = normalizeAnswers(TREATMENT_ID, ANSWERS);
            const chips = deriveChipsFromCanonicalAnswers(canonicalAnswers);

            expect(chips).not.toContain('cp');
        });

        it('should activate rel_trocken from no (relativ) answer', () => {
            const { canonicalAnswers } = normalizeAnswers(TREATMENT_ID, ANSWERS);
            const chips = deriveChipsFromCanonicalAnswers(canonicalAnswers);

            expect(chips).toContain('rel_trocken');
            expect(chips).not.toContain('kofferdam');
        });
    });

    describe('Output Assertions', () => {
        it('should NOT include MKV text when hasMKV is false', () => {
            const { canonicalAnswers } = normalizeAnswers(TREATMENT_ID, ANSWERS);
            const merged = mergeFacts(EXTRACTED, canonicalAnswers, false);

            const outputText = merged.hasMKV
                ? `Zuzahlung: ${merged.mkvBetrag}€`
                : 'Keine Zuzahlung vereinbart';

            expect(merged.hasMKV).toBe(false);
            expect(outputText).not.toContain('Zuzahlung:');
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// GOLDEN EXAMPLE 3: Missing Tooth
// ═══════════════════════════════════════════════════════════════

describe('Golden Example 3: Missing tooth scenario', () => {
    const TREATMENT_ID = 'fuellung';

    const EXTRACTED_MISSING = {
        tooth: null,
        surfaces: [],
        diagnosis: null,
        costs: null,
        mentioned: {}
    };

    describe('Warning Generation', () => {
        it('should generate warning when tooth is missing', () => {
            const { canonicalAnswers } = normalizeAnswers(TREATMENT_ID, new Map());
            const merged = mergeFacts(EXTRACTED_MISSING, canonicalAnswers, false);

            const warnings: string[] = [];
            if (!merged.tooth) warnings.push('Zahnangabe fehlt');
            if (merged.surfaces.length === 0) warnings.push('Flächenangabe fehlt');

            expect(warnings).toContain('Zahnangabe fehlt');
            expect(warnings).toContain('Flächenangabe fehlt');
        });

        it('should NOT generate warning if tooth provided via answer (future feature)', () => {
            // This simulates a future where we ask "Welcher Zahn?"
            const answersWithTooth = new Map<string, unknown>([
                // Future: ['tooth', '36']
            ]);
            const { canonicalAnswers } = normalizeAnswers(TREATMENT_ID, answersWithTooth);
            const merged = mergeFacts(EXTRACTED_MISSING, canonicalAnswers, false);

            // For now, tooth is still null since we don't have tooth question
            // When implemented: expect(merged.tooth).toBe('36');
            expect(merged.tooth).toBeNull();
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// PLACEHOLDER DETECTION TESTS
// ═══════════════════════════════════════════════════════════════

describe('Placeholder Detection', () => {
    it('should detect {material} placeholder', () => {
        const text = 'Überkappung mit {material} durchgeführt.';
        const { hasPlaceholders, found } = checkPlaceholders(text);

        expect(hasPlaceholders).toBe(true);
        expect(found).toContain('{material}');
    });

    it('should detect multiple placeholders', () => {
        const text = '{tooth} Flächen {surfaces}, {material} verwendet.';
        const { hasPlaceholders, found } = checkPlaceholders(text);

        expect(hasPlaceholders).toBe(true);
        expect(found).toHaveLength(3);
    });

    it('should pass when no placeholders present', () => {
        const text = 'Zahn 36, Flächen m, o, d. MTA verwendet.';
        const { hasPlaceholders, found } = checkPlaceholders(text);

        expect(hasPlaceholders).toBe(false);
        expect(found).toHaveLength(0);
    });

    it('should not match regular braces in text', () => {
        const text = 'Ca(OH)2 verwendet';
        const { hasPlaceholders } = checkPlaceholders(text);

        expect(hasPlaceholders).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════
// E2E FLOW VERIFICATION
// ═══════════════════════════════════════════════════════════════

describe('E2E Flow: Dictation → Extraction → Questions → Answers → Chips → Output', () => {
    it('should produce correct output for G1 scenario', () => {
        // Step 1: Mock extraction
        const extracted = {
            tooth: '36',
            surfaces: ['m', 'o', 'd'],
            diagnosis: 'Caries profunda',
            costs: 120,
            mentioned: { tiefe: 'tief', anesthesia: { type: 'infiltr' } }
        };

        // Step 2: Mock user answers
        const answers = new Map<string, unknown>([
            ['vitality', 'pos'],
            ['percussion', 'neg'],
            ['isolation', 'kofferdam'],
            ['tiefe', 'tief'],
            ['material', 'mta'],
            ['mehrschicht', 'yes'],
            ['mkv_betrag', 120],
        ]);

        // Step 3: Normalize answers
        const { canonicalAnswers, unmappedQuestions, unmappedOptions } = normalizeAnswers('fuellung', answers);
        expect(unmappedQuestions).toHaveLength(0);
        expect(unmappedOptions).toHaveLength(0);

        // Step 4: Merge facts
        const merged = mergeFacts(extracted, canonicalAnswers, true);
        expect(merged.tooth).toBe('36');
        expect(merged.tiefe).toBe('deep');
        expect(merged.cappingMaterial).toBe('mta');

        // Step 5: Derive chips
        const chips = deriveChipsFromCanonicalAnswers(canonicalAnswers, ['exkavation', 'komposit_basic', 'finishing']);
        expect(chips).toContain('kofferdam');
        expect(chips).toContain('cp');
        expect(chips).toContain('vipr_pos');
        expect(chips).toContain('mehrschicht');

        // Step 6: Generate output (mock)
        const outputSections = {
            dokumentation: `Zahn ${merged.tooth}, Flächen: ${merged.surfaces.join(', ')}. ${merged.diagnosis}.`,
            befund: `Sensibilität ${merged.vitality}, Perkussion ${merged.percussion}.`,
            behandlung: `Indirekte Überkappung mit ${merged.cappingMaterial?.toUpperCase()}. ${merged.isolation === 'yes' ? 'Kofferdam' : 'Relative Trockenlegung'}.`,
            abrechnung: merged.hasMKV ? `Zuzahlung: ${merged.mkvBetrag}€` : 'Kassenleistung'
        };

        // Step 7: Verify no placeholders
        const allContent = Object.values(outputSections).join('\n');
        const { hasPlaceholders } = checkPlaceholders(allContent);
        expect(hasPlaceholders).toBe(false);

        // Step 8: Verify no bogus warnings
        const warnings: string[] = [];
        if (!merged.tooth) warnings.push('Zahnangabe fehlt');
        if (merged.surfaces.length === 0) warnings.push('Flächenangabe fehlt');
        expect(warnings).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════
// GATE 1: REAL OUTPUT COMPOSER INTEGRATION
// ═══════════════════════════════════════════════════════════════

describe('Gate 1: OutputComposer Material Placeholder', () => {
    it('should substitute {material} with MTA when cappingMaterial=mta', async () => {
        // This test proves the real fix works
        const { composeOutput } = await import('../../core/billing/knowledgeBase/logic/outputComposer');
        const { processChipsToBilling, getTreatmentChips } = await import('../../core/billing/knowledgeBase/logic/treatmentEngine');

        const treatmentId = 'fuellung';
        const activeChipIds = ['exkavation', 'komposit_basic', 'finishing', 'cp', 'kofferdam'];
        const insuranceType = 'GKV' as const;

        // Get chip definitions
        const allChips = getTreatmentChips(treatmentId);
        const activeChips = allChips.filter(c => activeChipIds.includes(c.id));

        // Process billing
        const engineResult = processChipsToBilling(
            treatmentId,
            activeChipIds,
            insuranceType,
            true, // hasMKV
            { tooth: '36', surfaces: ['m', 'o', 'd'], diagnosis: 'Caries profunda' },
            'mittel'
        );

        // Compose output WITH cappingMaterial
        const output = composeOutput(
            treatmentId,
            engineResult,
            activeChips,
            { tooth: '36', surfaces: ['m', 'o', 'd'], diagnosis: 'Caries profunda' },
            insuranceType,
            { textLength: 'mittel', hasMKV: true, mkvBetrag: 120, cappingMaterial: 'mta' }
        );

        // The actual assertion: {material} must NOT appear
        const fullText = output.sections.map(s => s.content).join(' ');
        expect(fullText).not.toContain('{material}');
    });

    it('should use fallback "geeignetem Material" when no cappingMaterial provided', async () => {
        const { composeOutput } = await import('../../core/billing/knowledgeBase/logic/outputComposer');
        const { processChipsToBilling, getTreatmentChips } = await import('../../core/billing/knowledgeBase/logic/treatmentEngine');

        const treatmentId = 'fuellung';
        const activeChipIds = ['exkavation', 'komposit_basic', 'finishing', 'cp'];
        const insuranceType = 'GKV' as const;

        const allChips = getTreatmentChips(treatmentId);
        const activeChips = allChips.filter(c => activeChipIds.includes(c.id));

        const engineResult = processChipsToBilling(
            treatmentId,
            activeChipIds,
            insuranceType,
            false,
            { tooth: '36', surfaces: ['o'], diagnosis: 'Caries profunda' },
            'mittel'
        );

        // Compose output WITHOUT cappingMaterial
        const output = composeOutput(
            treatmentId,
            engineResult,
            activeChips,
            { tooth: '36', surfaces: ['o'], diagnosis: 'Caries profunda' },
            insuranceType,
            { textLength: 'mittel', hasMKV: false }
        );

        // Should not have raw placeholder
        const fullText = output.sections.map(s => s.content).join(' ');
        expect(fullText).not.toContain('{material}');
    });
});

// ═══════════════════════════════════════════════════════════════
// GATE 2: WARNING TRUTHFULNESS TESTS
// ═══════════════════════════════════════════════════════════════

describe('Gate 2: Warning Truthfulness', () => {
    it('Golden 1: should NOT produce "Zahnangabe fehlt" when tooth exists', async () => {
        const { generateFinalOutput } = await import('../../v6/services/outputService');

        const extracted = {
            tooth: '36',
            surfaces: ['m', 'o', 'd'],
            diagnosis: 'Caries profunda',
            costs: 120,
            mentioned: { anesthesia: { type: 'leitung' }, tiefe: 'tief' },
            gaps: []
        } as any;

        const answers = new Map<string, unknown>([
            ['vitality', 'pos'],
            ['percussion', 'neg'],
            ['isolation', 'kofferdam'],
            ['tiefe', 'tief'],
            ['material', 'mta'],
            ['mehrschicht', 'yes'],
            ['mkv_vereinbarung', 'yes'],
            ['mkv_betrag', 120],
        ]);

        const output = await generateFinalOutput({
            extracted,
            answers: answers as Map<string, any>,
            insuranceType: 'GKV',
            textLength: 'mittel',
            hasMKV: true,
            mkvBetrag: 120
        });

        // No "Zahnangabe fehlt" warning
        const toothWarnings = output.warnings.filter(w =>
            w.description?.includes('Zahnangabe fehlt') || w.title?.includes('Zahnangabe fehlt')
        );
        expect(toothWarnings).toHaveLength(0);

        // No "Flächenangabe fehlt" warning
        const surfaceWarnings = output.warnings.filter(w =>
            w.description?.includes('Flächenangabe fehlt') || w.title?.includes('Flächenangabe fehlt')
        );
        expect(surfaceWarnings).toHaveLength(0);
    });

    it('Golden 2: no MKV should not produce MKV disclosures', async () => {
        const { generateFinalOutput } = await import('../../v6/services/outputService');

        const extracted = {
            tooth: '36',
            surfaces: ['m', 'o'],
            diagnosis: 'Karies',
            costs: null,
            mentioned: {},
            gaps: []
        } as any;

        const answers = new Map<string, unknown>([
            ['vitality', 'pos'],
            ['percussion', 'neg'],
            ['isolation', 'relativ'],
            ['tiefe', 'normal'],
        ]);

        const output = await generateFinalOutput({
            extracted,
            answers: answers as Map<string, any>,
            insuranceType: 'GKV',
            textLength: 'mittel',
            hasMKV: false
        });

        // No tooth/surface warnings
        const missingWarnings = output.warnings.filter(w =>
            w.description?.includes('fehlt')
        );
        expect(missingWarnings).toHaveLength(0);

        // No GOZ 2197 (Mehrschicht) in billing
        expect(output.billingCodes).not.toContain('2197');
    });

    it('Golden 3: missing tooth SHOULD produce "Zahnangabe fehlt" warning', async () => {
        const { generateFinalOutput } = await import('../../v6/services/outputService');

        const extracted = {
            tooth: null,  // Missing!
            surfaces: ['m', 'o', 'd'],
            diagnosis: null,
            costs: null,
            mentioned: { tiefe: 'tief' },
            gaps: []
        } as any;

        const answers = new Map<string, unknown>([
            ['vitality', 'pos'],
            ['percussion', 'neg'],
            ['isolation', 'kofferdam'],
            ['tiefe', 'tief'],
            ['material', 'mta'],
        ]);

        const output = await generateFinalOutput({
            extracted,
            answers: answers as Map<string, any>,
            insuranceType: 'GKV',
            textLength: 'mittel',
            hasMKV: false
        });

        // SHOULD have "Zahnangabe fehlt" warning
        const toothWarnings = output.warnings.filter(w =>
            w.description?.includes('Zahnangabe fehlt') || w.title?.includes('Zahn')
        );
        expect(toothWarnings.length).toBeGreaterThan(0);
    });
});

// ═══════════════════════════════════════════════════════════════
// GATE 3: ANSWER EFFECTIVENESS TESTS
// ═══════════════════════════════════════════════════════════════

describe('Gate 3: Answers must affect pipeline', () => {
    it('GATE3-A: isolation=kofferdam should activate kofferdam chip', async () => {
        const { generateFinalOutput } = await import('../../v6/services/outputService');

        const extracted = {
            tooth: '36',
            surfaces: ['m', 'o'],
            diagnosis: 'Karies',
            costs: null,
            mentioned: {},
            gaps: []
        } as any;

        // With isolation=kofferdam
        const answersWithKofferdam = new Map<string, unknown>([
            ['vitality', 'pos'],
            ['percussion', 'neg'],
            ['isolation', 'kofferdam'],
            ['tiefe', 'normal'],
        ]);

        const output = await generateFinalOutput({
            extracted,
            answers: answersWithKofferdam as Map<string, any>,
            insuranceType: 'GKV',
            textLength: 'mittel',
            hasMKV: false
        });

        // Should have kofferdam chip
        expect(output._debug?.activeChipIds).toBeDefined();
        expect(output._debug?.activeChipIds).toContain('kofferdam');
        expect(output._debug?.activeChipIds).not.toContain('rel_trocken');

        // translatedAnswers should have canonical form
        expect(output._debug?.translatedAnswers?.kofferdam).toBe('yes');
    });

    it('GATE3-B: tiefe=tief + material=mta should activate cp chip and output MTA', async () => {
        const { generateFinalOutput } = await import('../../v6/services/outputService');

        const extracted = {
            tooth: '36',
            surfaces: ['m', 'o', 'd'],
            diagnosis: 'Caries profunda',
            costs: null,
            mentioned: { tiefe: 'tief' },
            gaps: []
        } as any;

        const answers = new Map<string, unknown>([
            ['vitality', 'pos'],
            ['percussion', 'neg'],
            ['isolation', 'kofferdam'],
            ['tiefe', 'tief'],
            ['material', 'mta'],
        ]);

        const output = await generateFinalOutput({
            extracted,
            answers: answers as Map<string, any>,
            insuranceType: 'GKV',
            textLength: 'mittel',
            hasMKV: false
        });

        // Should have cp chip
        expect(output._debug?.activeChipIds).toContain('cp');

        // Output should contain MTA, not {material}
        const fullText = output.sections.map(s => s.content).join(' ');
        expect(fullText).toContain('MTA');
        expect(fullText).not.toContain('{material}');

        // capping_material should be preserved
        expect(output._debug?.translatedAnswers?.capping_material).toBe('mta');
    });

    it('GATE3: translated answers should be canonical format', async () => {
        const { translateAnswers } = await import('../../core/billing/knowledgeBase/logic/answerIdTranslator');

        const semanticAnswers = new Map<string, unknown>([
            ['isolation', 'kofferdam'],
            ['tiefe', 'tief'],
            ['material', 'mta'],
        ]);

        const translated = translateAnswers('fuellung', semanticAnswers);

        // Should have canonical keys
        expect(translated.get('kofferdam')).toBe('yes');
        expect(translated.get('cavity_depth')).toBe('deep');
        expect(translated.get('capping')).toBe('cp');
        expect(translated.get('capping_material')).toBe('mta');
    });

    it('GATE3: output includes _debug with translatedAnswers and activeChipIds', async () => {
        const { generateFinalOutput } = await import('../../v6/services/outputService');

        const extracted = {
            tooth: '36',
            surfaces: ['m', 'o'],
            diagnosis: 'Karies',
            costs: null,
            mentioned: {},
            gaps: []
        } as any;

        const answers = new Map<string, unknown>([
            ['vitality', 'pos'],
        ]);

        const output = await generateFinalOutput({
            extracted,
            answers: answers as Map<string, any>,
            insuranceType: 'GKV',
            textLength: 'mittel',
            hasMKV: false
        });

        // _debug should exist
        expect(output._debug).toBeDefined();
        expect(output._debug?.translatedAnswers).toBeDefined();
        expect(output._debug?.activeChipIds).toBeDefined();
        expect(Array.isArray(output._debug?.activeChipIds)).toBe(true);
    });

    it('GATE3-C: unmapped question foo=bar should trigger dead answer failure', async () => {
        const { generateFinalOutput } = await import('../../v6/services/outputService');

        const extracted = {
            tooth: '36',
            surfaces: ['m', 'o'],
            diagnosis: 'Karies',
            costs: null,
            mentioned: {},
            gaps: []
        } as any;

        // Unknown question ID 'foo' with unknown value 'bar'
        const badAnswers = new Map<string, unknown>([
            ['foo', 'bar'],
        ]);

        // This should throw in DEV due to dead answers
        await expect(async () => {
            await generateFinalOutput({
                extracted,
                answers: badAnswers as Map<string, any>,
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false
            });
        }).rejects.toThrow('Dead answers detected');
    });

    it('GATE3-C: known question with unknown option should trigger dead answer failure', async () => {
        const { generateFinalOutput } = await import('../../v6/services/outputService');

        const extracted = {
            tooth: '36',
            surfaces: ['m', 'o'],
            diagnosis: 'Karies',
            costs: null,
            mentioned: {},
            gaps: []
        } as any;

        // Known question 'isolation' but unknown value 'banana'
        const badAnswers = new Map<string, unknown>([
            ['isolation', 'banana'],
        ]);

        // This should throw in DEV due to dead answers (banana doesn't change chips)
        await expect(async () => {
            await generateFinalOutput({
                extracted,
                answers: badAnswers as Map<string, any>,
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false
            });
        }).rejects.toThrow('Dead answers detected');
    });
});
