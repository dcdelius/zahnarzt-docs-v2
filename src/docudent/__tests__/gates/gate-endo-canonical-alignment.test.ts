/**
 * Gate Test: Endo Canonical Alignment
 * 
 * Verifies that Endo QuestionBank uses canonical IDs consistently
 * and that legacy answer IDs are properly translated.
 */

import { describe, it, expect } from 'vitest';
import { CANONICAL_QUESTION_IDS, CANONICAL_OPTION_IDS } from '../../contracts/canonicalIds';
import { loadQuestionBank, getAllQuestionKeys } from '../../core/billing/knowledgeBase/questions/questionBank';

// Load Endo question bank
const endoBank = loadQuestionBank('endo');
const endoQuestions = endoBank.questions;

describe('Gate: Endo Canonical Alignment', () => {
    // ════════════════════════════════════════════════════════════════
    // Canonical Question IDs exist
    // ════════════════════════════════════════════════════════════════
    describe('Canonical Question IDs', () => {
        it('should have ENDO_STEP in canonicalIds', () => {
            expect(CANONICAL_QUESTION_IDS.ENDO_STEP).toBe('forensic_endo_step');
        });

        it('should have ENDO_CANAL_COUNT in canonicalIds', () => {
            expect(CANONICAL_QUESTION_IDS.ENDO_CANAL_COUNT).toBe('forensic_endo_canal_count');
        });

        it('should have ENDO_IRRIGATION_PROTOCOL in canonicalIds', () => {
            expect(CANONICAL_QUESTION_IDS.ENDO_IRRIGATION_PROTOCOL).toBe('forensic_endo_irrigation_protocol');
        });

        it('should have ENDO_MEDICATION in canonicalIds', () => {
            expect(CANONICAL_QUESTION_IDS.ENDO_MEDICATION).toBe('forensic_endo_medication');
        });

        it('should have ENDO_OBTURATION in canonicalIds', () => {
            expect(CANONICAL_QUESTION_IDS.ENDO_OBTURATION).toBe('endo_obturation');
        });
    });

    // ════════════════════════════════════════════════════════════════
    // Answer IDs use positive/negative (not pos/neg)
    // ════════════════════════════════════════════════════════════════
    describe('Answer IDs use canonical format', () => {
        it('should NOT have "pos" option IDs in vitality question', () => {
            const vitality = endoQuestions.find(q => q.key === 'vitality');
            expect(vitality).toBeDefined();
            const optionIds = vitality!.options?.map(o => o.id) || [];
            expect(optionIds).not.toContain('pos');
            expect(optionIds).not.toContain('neg');
        });

        it('should have "positive"/"negative" option IDs in vitality', () => {
            const vitality = endoQuestions.find(q => q.key === 'vitality');
            const optionIds = vitality!.options?.map(o => o.id) || [];
            expect(optionIds).toContain('positive');
            expect(optionIds).toContain('negative');
        });

        it('should NOT have "pos" option IDs in percussion question', () => {
            const percussion = endoQuestions.find(q => q.key === 'percussion');
            expect(percussion).toBeDefined();
            const optionIds = percussion!.options?.map(o => o.id) || [];
            expect(optionIds).not.toContain('pos');
            expect(optionIds).not.toContain('neg');
        });

        it('should have "positive"/"negative" option IDs in percussion', () => {
            const percussion = endoQuestions.find(q => q.key === 'percussion');
            const optionIds = percussion!.options?.map(o => o.id) || [];
            expect(optionIds).toContain('positive');
            expect(optionIds).toContain('negative');
        });
    });

    // ════════════════════════════════════════════════════════════════
    // Question keys use canonical naming
    // ════════════════════════════════════════════════════════════════
    describe('Question keys use canonical naming', () => {
        it('should have "spuelprotokoll" not "spuelung"', () => {
            const keys = getAllQuestionKeys('endo');
            expect(keys).toContain('spuelprotokoll');
            expect(keys).not.toContain('spuelung');
        });

        it('should have "endo_step" key', () => {
            const keys = getAllQuestionKeys('endo');
            expect(keys).toContain('endo_step');
        });

        it('should have "kanalzahl" key', () => {
            const keys = getAllQuestionKeys('endo');
            expect(keys).toContain('kanalzahl');
        });

        it('should have "obturation" key', () => {
            const keys = getAllQuestionKeys('endo');
            expect(keys).toContain('obturation');
        });
    });

    // ════════════════════════════════════════════════════════════════
    // Endo_step options use canonical format
    // ════════════════════════════════════════════════════════════════
    describe('Endo step options', () => {
        it('should have endo_start/endo_interim/endo_complete option IDs', () => {
            const endoStep = endoQuestions.find(q => q.key === 'endo_step');
            expect(endoStep).toBeDefined();
            const optionIds = endoStep!.options?.map(o => o.id) || [];
            expect(optionIds).toContain('endo_start');
            expect(optionIds).toContain('endo_interim');
            expect(optionIds).toContain('endo_complete');
        });

        it('should NOT have bare "start"/"interim"/"complete" option IDs', () => {
            const endoStep = endoQuestions.find(q => q.key === 'endo_step');
            const optionIds = endoStep!.options?.map(o => o.id) || [];
            expect(optionIds).not.toContain('start');
            expect(optionIds).not.toContain('interim');
            expect(optionIds).not.toContain('complete');
        });
    });

    // ════════════════════════════════════════════════════════════════
    // Canonical Option IDs exist
    // ════════════════════════════════════════════════════════════════
    describe('Canonical Option IDs', () => {
        it('should have POSITIVE/NEGATIVE in canonicalIds', () => {
            expect(CANONICAL_OPTION_IDS.POSITIVE).toBe('positive');
            expect(CANONICAL_OPTION_IDS.NEGATIVE).toBe('negative');
        });

        it('should have ENDO_START/INTERIM/COMPLETE in canonicalIds', () => {
            expect(CANONICAL_OPTION_IDS.ENDO_START).toBe('endo_start');
            expect(CANONICAL_OPTION_IDS.ENDO_INTERIM).toBe('endo_interim');
            expect(CANONICAL_OPTION_IDS.ENDO_COMPLETE).toBe('endo_complete');
        });

        it('should have irrigation protocol options in canonicalIds', () => {
            expect(CANONICAL_OPTION_IDS.IRRIGATION_NAOCL_EDTA).toBe('irrigation_naocl_edta');
            expect(CANONICAL_OPTION_IDS.IRRIGATION_NAOCL).toBe('irrigation_naocl');
        });

        it('should have obturation options in canonicalIds', () => {
            expect(CANONICAL_OPTION_IDS.OBTURATION_THERMOPLASTIC).toBe('obturation_thermoplastic');
            expect(CANONICAL_OPTION_IDS.OBTURATION_LATERAL).toBe('obturation_lateral');
        });
    });

    // ════════════════════════════════════════════════════════════════
    // All questions have canonicalId field
    // ════════════════════════════════════════════════════════════════
    describe('All Endo questions have canonicalId', () => {
        it('should have canonicalId on all questions', () => {
            for (const q of endoQuestions) {
                // @ts-expect-error - canonicalId might not be in type yet
                expect(q.canonicalId, `Question ${q.key} missing canonicalId`).toBeDefined();
            }
        });
    });

    // ════════════════════════════════════════════════════════════════
    // No hardcoded chip strings
    // ════════════════════════════════════════════════════════════════
    describe('No hardcoded chip strings in question options', () => {
        it('should not have chipActivation in forensic questions', () => {
            const forensicQuestions = endoQuestions.filter(q => q.category === 'forensic');
            for (const q of forensicQuestions) {
                for (const opt of q.options || []) {
                    // chipActivation should be undefined for docFact-only questions
                    if (opt.chipActivation) {
                        // Only allowed for specific chips that ARE activated
                        const allowedChipActivations = ['vipr_pos', 'vipr_neg', 'perk_pos', 'perk_neg', 'kofferdam'];
                        if (!allowedChipActivations.includes(opt.chipActivation)) {
                            expect.fail(`Unexpected chipActivation "${opt.chipActivation}" on ${q.key}.${opt.id}`);
                        }
                    }
                }
            }
        });
    });
});
