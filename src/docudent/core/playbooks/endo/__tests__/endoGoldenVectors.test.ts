/**
 * Golden Vectors Test Runner — Regression Lock for Endo T2 Pipeline
 *
 * ═══════════════════════════════════════════════════════════════
 * Tests canonical code flow through pipeline:
 * - Answers use CANONICAL CODES
 * - Fields contain CANONICAL CODES
 * - Rendered note uses GERMAN LABELS (not codes)
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { evaluateEndoT2 } from '../endoTextRenderer';
import type { AnswersByQuestionId } from '../../../../contracts/questionEngineTypes';
import {
    DEVIATION_REASON_LABELS,
    FISTULA_STATUS_LABELS,
    SUPPURATION_STATUS_LABELS,
    MEDICATION_LABELS,
    IRRIGATION_SOLUTION_LABELS,
} from '../../../endo/vocab/endoCanonicalVocab';

// ═══════════════════════════════════════════════════════════════
// KEY GOLDEN VECTORS — Canonical Code → German Label Flow
// ═══════════════════════════════════════════════════════════════

interface GoldenVector {
    id: string;
    rawDictation: string;
    answersByQuestionId: AnswersByQuestionId;
    expectedFieldCodes: Record<string, unknown>;
    expectedNoteContains: string[];
    expectedNoteNotContains?: string[];
}

const GOLDEN_VECTORS: GoldenVector[] = [
    // ═══════════════════════════════════════════════════════════
    // 1-5: INFECTION DEVIATION VECTORS
    // ═══════════════════════════════════════════════════════════
    {
        id: 'T2_INFECTION_FISTULA_SUPPURATION',
        rawDictation: 'Zweiter Termin 36. Fistelgang. Eiter austritt.',
        answersByQuestionId: {
            'ENDO_T2_DEVIATION_REASON': 'FISTULA_EXSUDATE',
            'ENDO_T2_FISTULA_STATUS': 'PRESENT',
            'ENDO_T2_SUPPURATION': 'PRESENT',
            'ENDO_T2_IRRIGATION': ['NAOCL', 'EDTA'],
            'ENDO_T2_MEDICATION': 'CAOH2',
            'ENDO_T2_TEMP_SEAL': 'PROVISIONAL',
        },
        expectedFieldCodes: {
            deviationReason: 'FISTULA_EXSUDATE',
            fistulaStatus: 'PRESENT',
            suppurationStatus: 'PRESENT',
            irrigationSolutions: ['NAOCL', 'EDTA'],
            medication: 'CAOH2',
            tempSeal: 'PROVISIONAL',
        },
        expectedNoteContains: [
            'Fistelgang',
            'Eiter-/Exsudataustritt',
            'NaOCl',
            'EDTA',
            'Calciumhydroxid',
            'provisorisch verschlossen',
        ],
        expectedNoteNotContains: ['FISTULA_EXSUDATE', 'PRESENT', 'NAOCL', 'CAOH2'],
    },
    {
        id: 'T2_INFECTION_FISTULA_ONLY',
        rawDictation: 'Zweiter Termin. Fistelgang noch vorhanden.',
        answersByQuestionId: {
            'ENDO_T2_DEVIATION_REASON': 'FISTULA_EXSUDATE',
            'ENDO_T2_FISTULA_STATUS': 'PRESENT',
            'ENDO_T2_SUPPURATION': 'ABSENT',
            'ENDO_T2_IRRIGATION': ['NAOCL', 'EDTA', 'NACL'],
            'ENDO_T2_MEDICATION': 'CAOH2',
        },
        expectedFieldCodes: {
            deviationReason: 'FISTULA_EXSUDATE',
            fistulaStatus: 'PRESENT',
            suppurationStatus: 'ABSENT',
            irrigationSolutions: ['NAOCL', 'EDTA', 'NACL'],
            medication: 'CAOH2',
        },
        expectedNoteContains: [
            'Fistelgang',
            'NaOCl',
            'NaCl',
        ],
        expectedNoteNotContains: ['(ggf. abschließend NaCl)'],  // No suffix when NaCl present
    },
    {
        id: 'T2_PAIN_DEVIATION',
        rawDictation: 'Zweiter Termin. Patient gemuckert. Persistierende Beschwerden.',
        answersByQuestionId: {
            'ENDO_T2_DEVIATION_REASON': 'PAIN',
            'ENDO_T2_FISTULA_STATUS': 'FREE',
            'ENDO_T2_IRRIGATION': ['NAOCL', 'EDTA'],
            'ENDO_T2_MEDICATION': 'CAOH2',
            'ENDO_T2_TEMP_SEAL': 'PROVISIONAL',
        },
        expectedFieldCodes: {
            deviationReason: 'PAIN',
            irrigationSolutions: ['NAOCL', 'EDTA'],
            medication: 'CAOH2',
            tempSeal: 'PROVISIONAL',
        },
        expectedNoteContains: [
            'persistierende Beschwerden',
            'NaOCl',
            'Calciumhydroxid',
            '(ggf. abschließend NaCl)',
        ],
        expectedNoteNotContains: ['PAIN', 'FREE'],
    },
    {
        id: 'T2_NOT_DRY_SECRETION',
        rawDictation: 'Zweiter Termin. Kanäle nicht trocken.',
        answersByQuestionId: {
            'ENDO_T2_DEVIATION_REASON': 'NOT_DRY_SECRETION',
            'ENDO_T2_IRRIGATION': ['NAOCL', 'EDTA'],
        },
        expectedFieldCodes: {
            irrigationSolutions: ['NAOCL', 'EDTA'],
        },
        expectedNoteContains: [
            'NaOCl',
            'EDTA',
        ],
    },
    {
        id: 'T2_CHX_GEL_MEDICATION',
        rawDictation: 'Zweiter Termin. Fistelgang. CHX Gel eingelegt.',
        answersByQuestionId: {
            'ENDO_T2_DEVIATION_REASON': 'FISTULA_EXSUDATE',
            'ENDO_T2_FISTULA_STATUS': 'PRESENT',
            'ENDO_T2_IRRIGATION': ['CHX'],
            'ENDO_T2_MEDICATION': 'CHX_GEL',
        },
        expectedFieldCodes: {
            deviationReason: 'FISTULA_EXSUDATE',
            fistulaStatus: 'PRESENT',
            irrigationSolutions: ['CHX'],
            medication: 'CHX_GEL',
        },
        expectedNoteContains: [
            'Fistelgang',
            'CHX',
            'CHX-Gel',
        ],
    },

    // ═══════════════════════════════════════════════════════════
    // 6-10: APEX DEVIATION VECTORS
    // ═══════════════════════════════════════════════════════════
    {
        id: 'T2_APEX_BLOCKAGE_MB',
        rawDictation: 'Dritter Termin Zahn 26. Obturation geplant. Stufe im MB Kanal. Nicht bis Apex.',
        answersByQuestionId: {
            'ENDO_T2_NEGOTIATION_STATUS': 'NOT_TO_APEX_BLOCKAGE',
            'ENDO_T2_CANALS_AFFECTED': ['MB'],
            'ENDO_T2_PLAN_NEXT': 'RETRY_NEXT_APPT',
        },
        expectedFieldCodes: {
            negotiationStatus: 'NOT_TO_APEX_BLOCKAGE',
            canalsAffected: ['MB'],
            planNext: 'RETRY_NEXT_APPT',
        },
        expectedNoteContains: [
            'nicht bis Apex',
            'Betroffene Kanäle: MB',
            'erneuter Versuch',
        ],
        expectedNoteNotContains: ['NOT_TO_APEX_BLOCKAGE', 'RETRY_NEXT_APPT'],
    },
    {
        id: 'T2_APEX_BLOCKAGE_MULTIPLE_CANALS',
        rawDictation: 'Dritter Termin 16. Blockade. MB und ML nicht passierbar.',
        answersByQuestionId: {
            'ENDO_T2_NEGOTIATION_STATUS': 'NOT_TO_APEX_BLOCKAGE',
            'ENDO_T2_CANALS_AFFECTED': ['MB', 'ML'],
            'ENDO_T2_PLAN_NEXT': 'RETRY_NEXT_APPT',
        },
        expectedFieldCodes: {
            negotiationStatus: 'NOT_TO_APEX_BLOCKAGE',
            canalsAffected: ['MB', 'ML'],
            planNext: 'RETRY_NEXT_APPT',
        },
        expectedNoteContains: [
            'Betroffene Kanäle: MB, ML',
        ],
    },
    {
        id: 'T2_APEX_PARTIAL_OBTURATE',
        rawDictation: 'Dritter Termin 46. Stufe. Teilweise bis Apex. Nur kurz.',
        answersByQuestionId: {
            'ENDO_T2_NEGOTIATION_STATUS': 'PARTIAL',
            'ENDO_T2_CANALS_AFFECTED': ['DB'],
            'ENDO_T2_PLAN_NEXT': 'OBTURATE_TO_REACHED_LENGTH',
        },
        expectedFieldCodes: {
            negotiationStatus: 'PARTIAL',
            canalsAffected: ['DB'],
            planNext: 'OBTURATE_TO_REACHED_LENGTH',
        },
        expectedNoteContains: [
            'nicht bis Apex',
            'Betroffene Kanäle: DB',
        ],
    },
    {
        id: 'T2_APEX_REFER_REVISION',
        rawDictation: 'Dritter Termin 36. Stufe. Überweisung erforderlich.',
        answersByQuestionId: {
            'ENDO_T2_NEGOTIATION_STATUS': 'NOT_TO_APEX_BLOCKAGE',
            'ENDO_T2_CANALS_AFFECTED': [],
            'ENDO_T2_PLAN_NEXT': 'REFER_REVISION',
        },
        expectedFieldCodes: {
            negotiationStatus: 'NOT_TO_APEX_BLOCKAGE',
            canalsAffected: [],
            planNext: 'REFER_REVISION',
        },
        expectedNoteContains: [
            'nicht bis Apex',
            'Überweisung zur Revision',
        ],
    },
    {
        id: 'T2_APEX_THREE_CANALS',
        rawDictation: 'Dritter Termin 16. Stufe in drei Kanälen. Nicht passierbar.',
        answersByQuestionId: {
            'ENDO_T2_NEGOTIATION_STATUS': 'NOT_TO_APEX_BLOCKAGE',
            'ENDO_T2_CANALS_AFFECTED': ['MB', 'MB2', 'DB'],
            'ENDO_T2_PLAN_NEXT': 'REFER_REVISION',
        },
        expectedFieldCodes: {
            negotiationStatus: 'NOT_TO_APEX_BLOCKAGE',
            canalsAffected: ['MB', 'MB2', 'DB'],
            planNext: 'REFER_REVISION',
        },
        expectedNoteContains: [
            'nicht bis Apex',
            'Betroffene Kanäle: MB, MB2, DB',
        ],
    },
];

// ═══════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════

describe('Endo Golden Vectors', () => {
    describe(`${GOLDEN_VECTORS.length} canonical code flow vectors`, () => {
        for (const vector of GOLDEN_VECTORS) {
            describe(`Vector: ${vector.id}`, () => {
                const result = evaluateEndoT2(
                    vector.rawDictation,
                    vector.answersByQuestionId
                );

                it('normalizes fields with CANONICAL CODES', () => {
                    expect(result.fields).toEqual(vector.expectedFieldCodes);
                });

                it('renders note with GERMAN LABELS', () => {
                    for (const expected of vector.expectedNoteContains) {
                        expect(
                            result.notePreview,
                            `Expected note to contain: "${expected}"`
                        ).toContain(expected);
                    }
                });

                if (vector.expectedNoteNotContains) {
                    it('does NOT expose raw codes in rendered note', () => {
                        for (const notExpected of vector.expectedNoteNotContains) {
                            expect(
                                result.notePreview,
                                `Note should NOT contain raw code: "${notExpected}"`
                            ).not.toContain(notExpected);
                        }
                    });
                }
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // SUMMARY TESTS
    // ═══════════════════════════════════════════════════════════════

    it('has >= 10 vectors', () => {
        expect(GOLDEN_VECTORS.length).toBeGreaterThanOrEqual(10);
    });

    it('all answers use canonical codes (no label strings)', () => {
        const labelPatterns = /[äöüß\s\/]/;
        const errors: string[] = [];

        for (const vector of GOLDEN_VECTORS) {
            for (const [qid, answer] of Object.entries(vector.answersByQuestionId)) {
                if (typeof answer === 'string' && labelPatterns.test(answer)) {
                    errors.push(`${vector.id}: ${qid} = "${answer}" looks like label`);
                }
                if (Array.isArray(answer)) {
                    for (const item of answer) {
                        if (typeof item === 'string' && labelPatterns.test(item)) {
                            errors.push(`${vector.id}: ${qid} contains "${item}" which looks like label`);
                        }
                    }
                }
            }
        }

        if (errors.length > 0) {
            expect.fail(`Found label strings in answers:\n${errors.join('\n')}`);
        }
    });

    it('rendered notes never contain raw canonical codes', () => {
        const codePatterns = [
            'FISTULA_EXSUDATE',
            'NOT_TO_APEX_BLOCKAGE',
            'RETRY_NEXT_APPT',
            'OBTURATE_TO_REACHED_LENGTH',
            'REFER_REVISION',
            'NOT_DRY_SECRETION',
        ];

        for (const vector of GOLDEN_VECTORS) {
            const result = evaluateEndoT2(vector.rawDictation, vector.answersByQuestionId);
            for (const code of codePatterns) {
                if (result.notePreview.includes(code)) {
                    expect.fail(`${vector.id}: Note contains raw code "${code}"`);
                }
            }
        }
    });
});
