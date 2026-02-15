/**
 * Filling Golden Vectors — Regression Lock for Filling Pipeline
 *
 * ═══════════════════════════════════════════════════════════════
 * Tests canonical code flow through filling pipeline:
 * - Answers use CANONICAL CODES
 * - Fields contain CANONICAL CODES
 * - Rendered note uses GERMAN LABELS (not codes)
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { evaluateFilling } from '../fillingTextRenderer';
import type { AnswersByQuestionId } from '../../../contracts/questionEngineTypes';
import { FILLING_QUESTION_IDS as QID } from '../fillingPlaybookV1';

// ═══════════════════════════════════════════════════════════════
// GOLDEN VECTORS
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
    // 1. Simple GKV composite, no anesthesia
    // ═══════════════════════════════════════════════════════════
    {
        id: 'FILL_01_SIMPLE_GKV_COMPOSITE',
        rawDictation: 'Zahn 36, okklusale Kompositfüllung.',
        answersByQuestionId: {
            [QID.SURFACES]: ['O'],
            [QID.MATERIAL]: 'COMPOSITE',
            [QID.ANESTHESIA]: 'NONE',
            [QID.ISOLATION]: 'RELATIVE',
            [QID.BILLING_MODE]: 'GKV_ONLY',
        },
        expectedFieldCodes: {
            surfaces: ['O'],
            material: 'COMPOSITE',
            anesthesia: 'NONE',
            isolation: 'RELATIVE',
            billingMode: 'GKV_ONLY',
        },
        expectedNoteContains: [
            'Zahn 36',
            'Kompositfüllung',
            'Relative Trockenlegung',
        ],
        expectedNoteNotContains: ['COMPOSITE', 'GKV_ONLY', 'NONE'],
    },

    // ═══════════════════════════════════════════════════════════
    // 2. MOD composite + rubber dam + infiltration
    // ═══════════════════════════════════════════════════════════
    {
        id: 'FILL_02_MOD_RUBBERDAM_INFILTRATION',
        rawDictation: 'Zahn 46, MOD-Füllung, Kofferdam, betäubt.',
        answersByQuestionId: {
            [QID.SURFACES]: ['MOD'],
            [QID.MATERIAL]: 'COMPOSITE',
            [QID.ANESTHESIA]: 'INFILTRATION',
            [QID.ISOLATION]: 'RUBBER_DAM',
            [QID.BILLING_MODE]: 'GKV_PLUS_PRIVATE',
        },
        expectedFieldCodes: {
            surfaces: ['MOD'],
            material: 'COMPOSITE',
            anesthesia: 'INFILTRATION',
            isolation: 'RUBBER_DAM',
            billingMode: 'GKV_PLUS_PRIVATE',
        },
        expectedNoteContains: [
            'MOD-Kompositfüllung',
            'Lokalanästhesie',
            'Infiltrationsanästhesie',
            'Kofferdam angelegt',
            'Mehrkostenvereinbarung',
        ],
        expectedNoteNotContains: ['RUBBER_DAM', 'INFILTRATION'],
    },

    // ═══════════════════════════════════════════════════════════
    // 3. Deep caries, pulp proximity
    // ═══════════════════════════════════════════════════════════
    {
        id: 'FILL_03_DEEP_CARIES_PULP',
        rawDictation: 'Zahn 26, tiefe Karies, fast an der Pulpa.',
        answersByQuestionId: {
            [QID.SURFACES]: ['O', 'D'],
            [QID.MATERIAL]: 'COMPOSITE',
            [QID.ANESTHESIA]: 'INFILTRATION',
            [QID.ISOLATION]: 'RUBBER_DAM',
            [QID.CARIES_DEPTH]: 'PULP_PROXIMAL',
            [QID.BILLING_MODE]: 'GKV_PLUS_PRIVATE',
        },
        expectedFieldCodes: {
            surfaces: ['O', 'D'],
            material: 'COMPOSITE',
            anesthesia: 'INFILTRATION',
            isolation: 'RUBBER_DAM',
            cariesDepth: 'PULP_PROXIMAL',
            billingMode: 'GKV_PLUS_PRIVATE',
        },
        expectedNoteContains: [
            'pulpanahe Karies',
            'Caries profunda',
        ],
        expectedNoteNotContains: ['PULP_PROXIMAL'],
    },

    // ═══════════════════════════════════════════════════════════
    // 4. GKV + private co-pay
    // ═══════════════════════════════════════════════════════════
    {
        id: 'FILL_04_GKV_PLUS_MEHRKOSTEN',
        rawDictation: 'Zahn 16, Komposit mit Mehrkosten.',
        answersByQuestionId: {
            [QID.SURFACES]: ['M', 'O'],
            [QID.MATERIAL]: 'COMPOSITE',
            [QID.ANESTHESIA]: 'NONE',
            [QID.ISOLATION]: 'RELATIVE',
            [QID.BILLING_MODE]: 'GKV_PLUS_PRIVATE',
        },
        expectedFieldCodes: {
            surfaces: ['M', 'O'],
            material: 'COMPOSITE',
            anesthesia: 'NONE',
            isolation: 'RELATIVE',
            billingMode: 'GKV_PLUS_PRIVATE',
        },
        expectedNoteContains: [
            'Mehrkostenvereinbarung nach Aufklärung',
        ],
        expectedNoteNotContains: ['GKV_PLUS_PRIVATE'],
    },

    // ═══════════════════════════════════════════════════════════
    // 5. Temporary filling
    // ═══════════════════════════════════════════════════════════
    {
        id: 'FILL_05_TEMPORARY',
        rawDictation: 'Zahn 36, provisorische Füllung.',
        answersByQuestionId: {
            [QID.SURFACES]: ['O'],
            [QID.MATERIAL]: 'TEMPORARY',
            [QID.ANESTHESIA]: 'NONE',
            [QID.BILLING_MODE]: 'GKV_ONLY',
        },
        expectedFieldCodes: {
            surfaces: ['O'],
            material: 'TEMPORARY',
            anesthesia: 'NONE',
            billingMode: 'GKV_ONLY',
        },
        expectedNoteContains: [
            'provisorische Füllung',
        ],
        expectedNoteNotContains: ['TEMPORARY'],
    },

    // ═══════════════════════════════════════════════════════════
    // 6. No rubber dam documented → question asked (signals test)
    // ═══════════════════════════════════════════════════════════
    {
        id: 'FILL_06_NO_ISOLATION_MENTIONED',
        rawDictation: 'Zahn 46, Kompositfüllung.',
        answersByQuestionId: {
            [QID.SURFACES]: ['O'],
            [QID.MATERIAL]: 'COMPOSITE',
            [QID.ISOLATION]: 'NONE',
            [QID.BILLING_MODE]: 'GKV_ONLY',
        },
        expectedFieldCodes: {
            surfaces: ['O'],
            material: 'COMPOSITE',
            isolation: 'NONE',
            billingMode: 'GKV_ONLY',
        },
        expectedNoteContains: [
            'Kompositfüllung',
        ],
    },

    // ═══════════════════════════════════════════════════════════
    // 7. Anesthesia mentioned colloquially ("pieks")
    // ═══════════════════════════════════════════════════════════
    {
        id: 'FILL_07_PIEKS_ANESTHESIA',
        rawDictation: 'Zahn 36, kurz nen Pieks gegeben, dann gefüllt.',
        answersByQuestionId: {
            [QID.SURFACES]: ['O'],
            [QID.MATERIAL]: 'COMPOSITE',
            [QID.ANESTHESIA]: 'INFILTRATION',
            [QID.BILLING_MODE]: 'GKV_ONLY',
        },
        expectedFieldCodes: {
            surfaces: ['O'],
            material: 'COMPOSITE',
            anesthesia: 'INFILTRATION',
            billingMode: 'GKV_ONLY',
        },
        expectedNoteContains: [
            'Lokalanästhesie (Infiltrationsanästhesie)',
        ],
    },

    // ═══════════════════════════════════════════════════════════
    // 8. "Hab ich privat gemacht" billing wording
    // ═══════════════════════════════════════════════════════════
    {
        id: 'FILL_08_PRIVAT_GEMACHT',
        rawDictation: 'Zahn 26, das hab ich privat gemacht.',
        answersByQuestionId: {
            [QID.SURFACES]: ['O'],
            [QID.MATERIAL]: 'COMPOSITE',
            [QID.BILLING_MODE]: 'PRIVATE_ONLY',
        },
        expectedFieldCodes: {
            surfaces: ['O'],
            material: 'COMPOSITE',
            billingMode: 'PRIVATE_ONLY',
        },
        expectedNoteContains: [
            'Privatleistung nach Aufklärung',
        ],
        expectedNoteNotContains: ['PRIVATE_ONLY'],
    },

    // ═══════════════════════════════════════════════════════════
    // 9. Surface slang ("zwischen 36/37")
    // ═══════════════════════════════════════════════════════════
    {
        id: 'FILL_09_ZWISCHEN_SLANG',
        rawDictation: 'Karies zwischen 36 und 37, mesial gefüllt.',
        answersByQuestionId: {
            [QID.SURFACES]: ['M'],
            [QID.MATERIAL]: 'COMPOSITE',
            [QID.BILLING_MODE]: 'GKV_ONLY',
        },
        expectedFieldCodes: {
            surfaces: ['M'],
            material: 'COMPOSITE',
            billingMode: 'GKV_ONLY',
        },
        expectedNoteContains: [
            'M-Kompositfüllung',
        ],
    },

    // ═══════════════════════════════════════════════════════════
    // 10. Deviation (planned composite → temporary)
    // ═══════════════════════════════════════════════════════════
    {
        id: 'FILL_10_DEVIATION_TO_TEMPORARY',
        rawDictation: 'Zahn 46, eigentlich wollten wir Komposit, leider nur provisorisch.',
        answersByQuestionId: {
            [QID.SURFACES]: ['O'],
            [QID.MATERIAL]: 'TEMPORARY',
            [QID.DEVIATION_REASON]: 'TIME_CONSTRAINT',
            [QID.BILLING_MODE]: 'GKV_ONLY',
        },
        expectedFieldCodes: {
            surfaces: ['O'],
            material: 'TEMPORARY',
            fillingDeviationReason: 'TIME_CONSTRAINT',
            billingMode: 'GKV_ONLY',
        },
        expectedNoteContains: [
            'provisorische Füllung',
        ],
        expectedNoteNotContains: ['TIME_CONSTRAINT', 'TEMPORARY'],
    },
];

// ═══════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════

describe('Filling Golden Vectors', () => {
    describe(`${GOLDEN_VECTORS.length} canonical code flow vectors`, () => {
        for (const vector of GOLDEN_VECTORS) {
            describe(`Vector: ${vector.id}`, () => {
                const result = evaluateFilling(
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
                            `Expected note to contain: "${expected}"\n\nActual note:\n${result.notePreview}`
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

    // ═══════════════════════════════════════════════════════════
    // SUMMARY TESTS
    // ═══════════════════════════════════════════════════════════

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
            'COMPOSITE',
            'RUBBER_DAM',
            'INFILTRATION',
            'CONDUCTION',
            'ETCH_AND_RINSE',
            'GKV_ONLY',
            'GKV_PLUS_PRIVATE',
            'PRIVATE_ONLY',
            'PULP_PROXIMAL',
        ];

        for (const vector of GOLDEN_VECTORS) {
            const result = evaluateFilling(vector.rawDictation, vector.answersByQuestionId);
            for (const code of codePatterns) {
                if (result.notePreview.includes(code)) {
                    expect.fail(`${vector.id}: Note contains raw code "${code}"`);
                }
            }
        }
    });
});
