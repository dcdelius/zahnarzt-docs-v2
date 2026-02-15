/**
 * Gate M7: Golden Medical Cases Full Pipeline
 *
 * Runs all 20 golden cases through:
 * - Stub extraction
 * - Facts creation (via mapping layer)
 * - Medical engine (applyMedicalKb)
 * - Asserts expected askbacks/chips
 */

import { describe, it, expect } from 'vitest';
import { GOLDEN_MEDICAL_CASES, type GoldenMedicalCase } from '../fixtures/goldenMedicalCases.v1';
import { stubExtractFromDictation } from '../../pipeline/__test__/stubExtractor';
import { createFactsFromExtracted, applyAnswersToFacts } from '../../medical/facts';
import { applyMedicalKb } from '../../medical';

// Helper: run a single case through the pipeline
function runCase(testCase: GoldenMedicalCase, toothScope?: string) {
    // 1. Extract
    const extracted = stubExtractFromDictation(
        testCase.input.dictation,
        testCase.input.treatmentId
    );

    // 2. Create facts (with optional tooth scope)
    let facts = createFactsFromExtracted(
        extracted as Record<string, unknown>,
        testCase.input.treatmentId,
        toothScope ? { tooth: toothScope } : undefined
    );

    // 3. Apply answers if provided
    if (testCase.input.answers) {
        facts = applyAnswersToFacts(facts, testCase.input.answers);
    }

    // 4. Run medical engine
    const engineResult = applyMedicalKb({
        facts: facts as Record<string, unknown>,
        treatmentId: testCase.input.treatmentId,
        instanceScope: toothScope ? { tooth: toothScope } : undefined,
    });

    return { extracted, facts, engineResult };
}

describe('Gate M7: Golden Medical Cases Full Pipeline', () => {
    // ═══════════════════════════════════════════════════════════════
    // BASIC CASES (1-10)
    // ═══════════════════════════════════════════════════════════════

    for (const testCase of GOLDEN_MEDICAL_CASES) {
        describe(`Case: ${testCase.id}`, () => {
            it(testCase.description, () => {
                // For multi-tooth cases, we test each tooth
                if (testCase.input.teeth && testCase.input.teeth.length > 0) {
                    // Multi-tooth: aggregate all askbacks
                    const allAskbacks: string[] = [];

                    for (const tooth of testCase.input.teeth) {
                        const { engineResult } = runCase(testCase, tooth);
                        allAskbacks.push(...engineResult.requiredAskbacks);
                    }

                    // Assert expected askbacks
                    if (testCase.expect.askbacks) {
                        for (const expectedAskback of testCase.expect.askbacks) {
                            expect(allAskbacks).toContain(expectedAskback);
                        }
                    }
                } else {
                    // Single tooth
                    const { facts, engineResult } = runCase(testCase);

                    // Assert facts if expected
                    if (testCase.expect.facts) {
                        for (const [key, value] of Object.entries(testCase.expect.facts)) {
                            if (typeof value === 'object' && value !== null) {
                                // Deep partial match for nested objects
                                for (const [nestedKey, nestedValue] of Object.entries(value)) {
                                    expect((facts as any)[key]?.[nestedKey]).toBe(nestedValue);
                                }
                            } else {
                                expect((facts as any)[key]).toBe(value);
                            }
                        }
                    }

                    // Assert askbacks
                    if (testCase.expect.askbacks !== undefined) {
                        if (testCase.expect.askbacks.length === 0) {
                            // Expect NO medical askbacks
                            expect(engineResult.requiredAskbacks.filter(a =>
                                a.startsWith('medical_')
                            )).toHaveLength(0);
                        } else {
                            for (const expectedAskback of testCase.expect.askbacks) {
                                expect(engineResult.requiredAskbacks).toContain(expectedAskback);
                            }
                        }
                    }

                    // Assert chips
                    if (testCase.expect.chips) {
                        for (const expectedChip of testCase.expect.chips) {
                            expect(engineResult.emittedChips).toContain(expectedChip);
                        }
                    }
                }
            });
        });
    }
});
