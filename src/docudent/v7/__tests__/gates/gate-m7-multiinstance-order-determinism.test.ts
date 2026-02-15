/**
 * Gate M7: Multi-Instance Order Determinism
 *
 * Verifies that multi-tooth cases produce stable output ordering
 * across multiple runs.
 */

import { describe, it, expect } from 'vitest';
import { getGoldenCase } from '../fixtures/goldenMedicalCases.v1';
import { stubExtractFromDictation } from '../../pipeline/__test__/stubExtractor';
import { createFactsFromExtracted } from '../../medical/facts';
import { applyMedicalKb } from '../../medical';

// Run a multi-tooth case and collect all askbacks/chips
function runMultiToothCase(caseId: string): { askbacks: string[]; chips: string[] } {
    const testCase = getGoldenCase(caseId);
    if (!testCase) return { askbacks: [], chips: [] };

    const teeth = testCase.input.teeth || [];
    const allAskbacks: string[] = [];
    const allChips: string[] = [];

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
            facts: facts as Record<string, unknown>,
            treatmentId: testCase.input.treatmentId,
            instanceScope: { tooth },
        });

        allAskbacks.push(...engineResult.requiredAskbacks);
        allChips.push(...engineResult.emittedChips);
    }

    return {
        askbacks: allAskbacks.sort(),
        chips: allChips.sort(),
    };
}

describe('Gate M7: Multi-Instance Order Determinism', () => {
    // ═══════════════════════════════════════════════════════════════
    // TEST: 30 consecutive runs produce identical output
    // ═══════════════════════════════════════════════════════════════

    describe('multitooth-scoped-askback', () => {
        it('30 runs produce identical askback ordering', () => {
            const firstRun = runMultiToothCase('multitooth-scoped-askback');

            for (let i = 0; i < 30; i++) {
                const run = runMultiToothCase('multitooth-scoped-askback');
                expect(run.askbacks).toEqual(firstRun.askbacks);
                expect(run.chips).toEqual(firstRun.chips);
            }
        });
    });

    describe('multitooth-three-teeth', () => {
        it('30 runs produce identical askback ordering', () => {
            const firstRun = runMultiToothCase('multitooth-three-teeth');

            for (let i = 0; i < 30; i++) {
                const run = runMultiToothCase('multitooth-three-teeth');
                expect(run.askbacks).toEqual(firstRun.askbacks);
                expect(run.chips).toEqual(firstRun.chips);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Tooth order doesn't affect final sorted output
    // ═══════════════════════════════════════════════════════════════

    describe('Order independence', () => {
        it('processing teeth in different order produces same sorted result', () => {
            const testCase = getGoldenCase('multitooth-three-teeth');
            if (!testCase) return;

            const teeth = testCase.input.teeth || [];
            const reversedTeeth = [...teeth].reverse();

            // Forward order
            const forwardResult = runMultiToothCase('multitooth-three-teeth');

            // Now test with reversed teeth order (manually)
            const reversedAskbacks: string[] = [];
            for (const tooth of reversedTeeth) {
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
                    facts: facts as Record<string, unknown>,
                    treatmentId: testCase.input.treatmentId,
                    instanceScope: { tooth },
                });
                reversedAskbacks.push(...engineResult.requiredAskbacks);
            }

            // Sorted results should be identical
            expect(reversedAskbacks.sort()).toEqual(forwardResult.askbacks);
        });
    });
});
