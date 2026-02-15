/**
 * Gate M8: Askback Compilation to Question Bank
 *
 * Verifies that all askbacks from golden cases compile to valid questions.
 */

import { describe, it, expect } from 'vitest';
import { GOLDEN_MEDICAL_CASES } from '../fixtures/goldenMedicalCases.v1';
import { stubExtractFromDictation } from '../../pipeline/__test__/stubExtractor';
import { createFactsFromExtracted } from '../../medical/facts';
import { applyMedicalKb, stripToothScope } from '../../medical';
import {
    compileAskbacksToQuestions,
    engineTraceToAskbackMeta,
    getQuestionByKey,
} from '../../medical/askbacks';

describe('Gate M8: Askback Compilation to Question Bank', () => {
    // ═══════════════════════════════════════════════════════════════
    // TEST: All askbacks resolve to valid questions
    // ═══════════════════════════════════════════════════════════════

    describe('Askback resolution', () => {
        const casesWithAskbacks = GOLDEN_MEDICAL_CASES.filter(
            c => c.expect.askbacks && c.expect.askbacks.length > 0
        );

        for (const testCase of casesWithAskbacks) {
            it(`${testCase.id}: askbacks compile to questions`, () => {
                const extracted = stubExtractFromDictation(
                    testCase.input.dictation,
                    testCase.input.treatmentId
                );

                const facts = createFactsFromExtracted(
                    extracted as Record<string, unknown>,
                    testCase.input.treatmentId
                );

                const engineResult = applyMedicalKb({
                    facts: facts as unknown as Record<string, unknown>,
                    treatmentId: testCase.input.treatmentId,
                });

                const askbackMeta = engineTraceToAskbackMeta(
                    engineResult.trace,
                    engineResult.optionalAskbacks
                );

                // This should NOT throw
                const bundle = compileAskbacksToQuestions({
                    askbacks: askbackMeta,
                    treatmentId: testCase.input.treatmentId,
                });

                // All required askbacks should compile
                expect(bundle.required.length).toBe(askbackMeta.required.length);

                // Each question should have essential fields
                for (const q of bundle.required) {
                    expect(q.id).toBeDefined();
                    expect(q.questionKey).toBeDefined();
                    expect(q.question).toBeDefined();
                    expect(q.type).toBeDefined();
                }
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Scoped IDs preserve tooth scope
    // ═══════════════════════════════════════════════════════════════

    describe('Tooth scope preservation', () => {
        it('scoped askbacks contain tooth in question text', () => {
            const testCase = GOLDEN_MEDICAL_CASES.find(c => c.id === 'multitooth-scoped-askback');
            if (!testCase) return;

            const extracted = stubExtractFromDictation(
                testCase.input.dictation,
                testCase.input.treatmentId
            );

            const facts = createFactsFromExtracted(
                extracted as Record<string, unknown>,
                testCase.input.treatmentId,
                { tooth: '16' }
            );

            const engineResult = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: testCase.input.treatmentId,
                instanceScope: { tooth: '16' },
            });

            const askbackMeta = engineTraceToAskbackMeta(
                engineResult.trace,
                engineResult.optionalAskbacks
            );

            const bundle = compileAskbacksToQuestions({
                askbacks: askbackMeta,
                treatmentId: testCase.input.treatmentId,
            });

            // Questions should contain tooth reference
            for (const q of bundle.required) {
                const tooth = (q as any).meta?.scope?.tooth;
                if (tooth) {
                    expect(q.question).toContain(tooth);
                }
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Question bank lookup works for all medical askbacks
    // ═══════════════════════════════════════════════════════════════

    describe('Question bank coverage', () => {
        const medicalKeys = ['ueberkappung', 'hemostasis', 'sensitivity_followup'];

        for (const key of medicalKeys) {
            it(`question "${key}" exists in fuellung question_bank`, () => {
                const entry = getQuestionByKey('fuellung', key);
                expect(entry).not.toBeNull();
                expect(entry?.prompt).toBeDefined();
                expect(entry?.options).toBeDefined();
                expect(entry?.options?.length).toBeGreaterThan(0);
            });
        }
    });
});
