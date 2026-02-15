/**
 * Gate M8: Multi-Instance Questions Order Determinism
 *
 * Verifies that compiled questions have stable ordering across 30 runs.
 */

import { describe, it, expect } from 'vitest';
import { getGoldenCase } from '../fixtures/goldenMedicalCases.v1';
import { stubExtractFromDictation } from '../../pipeline/__test__/stubExtractor';
import { createFactsFromExtracted } from '../../medical/facts';
import { applyMedicalKb } from '../../medical';
import {
    compileAskbacksToQuestions,
    engineTraceToAskbackMeta,
} from '../../medical/askbacks';

interface RunResult {
    requiredQuestionIds: string[];
    optionalQuestionIds: string[];
}

function runMultiToothCase(caseId: string): RunResult {
    const testCase = getGoldenCase(caseId);
    if (!testCase) return { requiredQuestionIds: [], optionalQuestionIds: [] };

    const teeth = testCase.input.teeth || [];
    const allQuestionIds: { required: string[]; optional: string[] } = { required: [], optional: [] };

    for (const tooth of teeth) {
        const extracted = stubExtractFromDictation(
            testCase.input.dictation,
            testCase.input.treatmentId
        );

        const facts = createFactsFromExtracted(
            extracted as Record<string, unknown>,
            testCase.input.treatmentId,
            { tooth }
        );

        const engineResult = applyMedicalKb({
            facts: facts as unknown as Record<string, unknown>,
            treatmentId: testCase.input.treatmentId,
            instanceScope: { tooth },
        });

        const askbackMeta = engineTraceToAskbackMeta(
            engineResult.trace,
            engineResult.optionalAskbacks
        );

        const bundle = compileAskbacksToQuestions({
            askbacks: askbackMeta,
            treatmentId: testCase.input.treatmentId,
        });

        allQuestionIds.required.push(...bundle.required.map(q => q.id));
        allQuestionIds.optional.push(...bundle.optional.map(q => q.id));
    }

    return {
        requiredQuestionIds: allQuestionIds.required.sort(),
        optionalQuestionIds: allQuestionIds.optional.sort(),
    };
}

describe('Gate M8: Multi-Instance Questions Order Determinism', () => {
    // ═══════════════════════════════════════════════════════════════
    // TEST: 30 runs produce identical question ordering
    // ═══════════════════════════════════════════════════════════════

    describe('multitooth-scoped-askback', () => {
        it('30 runs produce identical question ordering', () => {
            const firstRun = runMultiToothCase('multitooth-scoped-askback');

            for (let i = 0; i < 30; i++) {
                const run = runMultiToothCase('multitooth-scoped-askback');
                expect(run.requiredQuestionIds).toEqual(firstRun.requiredQuestionIds);
                expect(run.optionalQuestionIds).toEqual(firstRun.optionalQuestionIds);
            }
        });
    });

    describe('multitooth-three-teeth', () => {
        it('30 runs produce identical question ordering', () => {
            const firstRun = runMultiToothCase('multitooth-three-teeth');

            for (let i = 0; i < 30; i++) {
                const run = runMultiToothCase('multitooth-three-teeth');
                expect(run.requiredQuestionIds).toEqual(firstRun.requiredQuestionIds);
                expect(run.optionalQuestionIds).toEqual(firstRun.optionalQuestionIds);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Compiled questions have deterministic meta
    // ═══════════════════════════════════════════════════════════════

    describe('Meta determinism', () => {
        it('question meta is identical across runs', () => {
            const testCase = getGoldenCase('multitooth-scoped-askback');
            if (!testCase) return;

            const runOnce = () => {
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

                return compileAskbacksToQuestions({
                    askbacks: askbackMeta,
                    treatmentId: testCase.input.treatmentId,
                });
            };

            const bundle1 = runOnce();
            const bundle2 = runOnce();

            // Compare meta for each question
            expect(bundle1.required.length).toBe(bundle2.required.length);
            for (let i = 0; i < bundle1.required.length; i++) {
                const meta1 = (bundle1.required[i] as any).meta;
                const meta2 = (bundle2.required[i] as any).meta;
                expect(meta1).toEqual(meta2);
            }
        });
    });
});
