/**
 * Question Generation Reality Test Suite
 *
 * Tests questionServiceV2 against fixtures.
 *
 * Rules:
 * - Questions must come from QuestionBank (no hardcoded texts)
 * - IDs must be stable
 * - Options must match QuestionBank
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateQuestionsV2, type QuestionContext } from '../questionServiceV2';
import type { DynamicQuestion } from '../../../contracts/questions';
import type { ExtractedDataV2 } from '../../../contracts/extraction';
import { getAllQuestionKeys, getQuestionDef } from '../../../core/billing/knowledgeBase/questions/questionBank';
import fixtures from '../__fixtures__/questions_fixtures.json';

// ═══════════════════════════════════════════════════════════════
// FIXTURE TYPE
// ═══════════════════════════════════════════════════════════════

interface Fixture {
    id: string;
    description: string;
    extracted: ExtractedDataV2;
    insuranceType: 'GKV' | 'PKV';
    hasMKV: boolean;
    expectQuestionKeys?: string[];
    forbidQuestionKeys?: string[];
    expectQuestionCategories?: string[];
    expectDefaultValue?: Record<string, number>;
    expectStableIds?: string[];
}

const typedFixtures = fixtures as Fixture[];

// ═══════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════

describe('Question Generation Reality Tests', () => {
    // Get all valid question keys from QuestionBank
    let validQuestionKeys: string[];

    beforeAll(() => {
        validQuestionKeys = getAllQuestionKeys('fuellung');
    });

    describe('SSOT Compliance', () => {
        it('should have QuestionBank loaded', () => {
            expect(validQuestionKeys.length).toBeGreaterThan(0);
        });

        it('should have required question keys in QuestionBank', () => {
            const required = ['vitality', 'percussion', 'tiefe', 'isolation', 'material', 'mkv_vereinbarung', 'mkv_betrag'];
            for (const key of required) {
                expect(validQuestionKeys).toContain(key);
            }
        });
    });

    describe('Fixture Tests', () => {
        describe.each(typedFixtures)('Fixture $id: $description', (fixture) => {
            let questions: DynamicQuestion[];

            beforeAll(() => {
                const context: QuestionContext = {
                    treatmentId: 'fuellung',
                    insuranceType: fixture.insuranceType,
                    hasMKV: fixture.hasMKV
                };

                questions = generateQuestionsV2(fixture.extracted, context);
            });

            if (fixture.expectQuestionKeys) {
                it('should generate expected question keys', () => {
                    const generatedKeys = questions.map(q => q.questionKey);
                    for (const expectedKey of fixture.expectQuestionKeys!) {
                        expect(generatedKeys).toContain(expectedKey);
                    }
                });
            }

            if (fixture.forbidQuestionKeys) {
                it('should not generate forbidden question keys', () => {
                    const generatedKeys = questions.map(q => q.questionKey);
                    for (const forbiddenKey of fixture.forbidQuestionKeys!) {
                        expect(generatedKeys).not.toContain(forbiddenKey);
                    }
                });
            }

            if (fixture.expectQuestionCategories) {
                it('should have expected categories', () => {
                    const categories = [...new Set(questions.map(q => q.category))];
                    for (const cat of fixture.expectQuestionCategories!) {
                        expect(categories).toContain(cat);
                    }
                });
            }

            if (fixture.expectDefaultValue) {
                it('should have correct default values', () => {
                    for (const [key, value] of Object.entries(fixture.expectDefaultValue!)) {
                        const question = questions.find(q => q.questionKey === key);
                        expect(question).toBeDefined();
                        expect(question?.defaultValue).toBe(value);
                    }
                });
            }

            if (fixture.expectStableIds) {
                it('should have stable IDs', () => {
                    const ids = questions.map(q => q.id);
                    for (const expectedId of fixture.expectStableIds!) {
                        expect(ids).toContain(expectedId);
                    }
                });
            }

            it('should only generate questions from QuestionBank', () => {
                for (const q of questions) {
                    expect(validQuestionKeys).toContain(q.questionKey);
                }
            });

            it('should have prompts from QuestionBank (not hardcoded)', () => {
                for (const q of questions) {
                    const def = getQuestionDef('fuellung', q.questionKey!);
                    expect(def).toBeDefined();
                    expect(q.question).toBe(def?.prompt);
                }
            });

            it('should have options matching QuestionBank', () => {
                for (const q of questions) {
                    if (!q.options || q.options.length === 0) continue;

                    const def = getQuestionDef('fuellung', q.questionKey!);
                    expect(def?.options).toBeDefined();

                    const defOptionIds = (def?.options || []).map(o => o.id);
                    const questionOptionIds = q.options.map(o => o.id);

                    expect(questionOptionIds.sort()).toEqual(defOptionIds.sort());
                }
            });
        });
    });

    describe('No Hardcoded Logic Gate', () => {
        // NOTE: File content scanning is done via grep/AST gates at build time
        // Here we verify the service behavior, not source code

        it('should not have hardcoded question prompts', () => {
            const context: QuestionContext = {
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                hasMKV: true
            };

            const extracted = {
                tooth: { value: '36', confidence: 1, evidence: [], needsConfirmation: false },
                surfaces: { value: ['m'], confidence: 1, evidence: [], needsConfirmation: false },
                diagnosis: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
                costs: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
                mentioned: {},
                originalDictation: 'test',
                normalizedDictation: 'test'
            } as ExtractedDataV2;

            const questions = generateQuestionsV2(extracted, context);

            // All prompts must come from QuestionBank
            for (const q of questions) {
                const def = getQuestionDef('fuellung', q.questionKey!);
                expect(def).toBeDefined();
                expect(q.question).toBe(def?.prompt);
            }
        });

        it('should use questionKey from QuestionBank', () => {
            const context: QuestionContext = {
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                hasMKV: false
            };

            const extracted = {
                tooth: { value: '36', confidence: 1, evidence: [], needsConfirmation: false },
                surfaces: { value: ['m'], confidence: 1, evidence: [], needsConfirmation: false },
                diagnosis: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
                costs: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
                mentioned: {
                    vitality: { value: null, confidence: 0, evidence: [], needsConfirmation: true }
                },
                originalDictation: 'test',
                normalizedDictation: 'test'
            } as ExtractedDataV2;

            const questions = generateQuestionsV2(extracted, context);

            // All questionKeys must be valid QuestionBank keys
            for (const q of questions) {
                expect(validQuestionKeys).toContain(q.questionKey);
            }
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty mentioned object', () => {
            const context: QuestionContext = {
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                hasMKV: false
            };

            const extracted = {
                tooth: { value: '36', confidence: 1, evidence: [], needsConfirmation: false },
                surfaces: { value: ['m'], confidence: 1, evidence: [], needsConfirmation: false },
                diagnosis: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
                costs: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
                mentioned: {},
                originalDictation: 'test',
                normalizedDictation: 'test'
            } as ExtractedDataV2;

            const questions = generateQuestionsV2(extracted, context);

            // Should generate forensic questions for missing fields
            expect(questions.length).toBeGreaterThan(0);
        });

        it('should not duplicate questions', () => {
            const context: QuestionContext = {
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                hasMKV: true
            };

            const extracted = {
                tooth: { value: '36', confidence: 1, evidence: [], needsConfirmation: false },
                surfaces: { value: ['m'], confidence: 1, evidence: [], needsConfirmation: false },
                diagnosis: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
                costs: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
                mentioned: {
                    vitality: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
                    percussion: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
                    kofferdam: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
                    tiefe: { value: null, confidence: 0, evidence: [], needsConfirmation: true }
                },
                originalDictation: 'test',
                normalizedDictation: 'test'
            } as ExtractedDataV2;

            const questions = generateQuestionsV2(extracted, context);
            const ids = questions.map(q => q.id);
            const uniqueIds = [...new Set(ids)];

            expect(ids.length).toBe(uniqueIds.length);
        });
    });
});
