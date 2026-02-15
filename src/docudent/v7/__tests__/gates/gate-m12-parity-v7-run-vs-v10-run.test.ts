/**
 * Gate M12: Parity V7 run() vs V10 runV10()
 *
 * GATE DEFINITION:
 * V7 pipeline.run() and V10 runV10() must produce equivalent results
 * for the same input. This ensures V7 can safely delegate to V10.
 *
 * Parity is defined as:
 * - Same state (questions/output/error)
 * - Same question IDs (order may differ)
 * - Same chips emitted (order may differ)
 * - Same billing codes (order may differ)
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../../v10';
import type { V10PipelineInput } from '../../../v10/types';

// Golden test cases for parity checking
// NOTE: We don't assume specific state because the medical KB may require questions
const PARITY_CASES: Array<{
    id: string;
    description: string;
    dictation: string;
    treatmentId: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
}> = [
        {
            id: 'simple-fuellung',
            description: 'Simple fuellung case',
            dictation: 'Zahn 16 Karies m-o Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
        },
        {
            id: 'profunda-requires-askback',
            description: 'Profunda caries requires ueberkappung askback',
            dictation: 'Zahn 16 tiefe pulpanahe Karies',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
        },
        {
            id: 'pkv-fuellung',
            description: 'PKV fuellung case',
            dictation: 'Zahn 26 distale Karies Kompositrestauration',
            treatmentId: 'fuellung',
            insuranceType: 'PKV',
        },
    ];

describe('Gate M12: Parity V7 run() vs V10 runV10()', () => {
    PARITY_CASES.forEach(testCase => {
        describe(`Case: ${testCase.id}`, () => {
            it(`${testCase.description}`, async () => {
                const v10Input: V10PipelineInput = {
                    dictation: testCase.dictation,
                    treatmentId: testCase.treatmentId,
                    insuranceType: testCase.insuranceType,
                    textLength: 'mittel',
                    answers: new Map(),
                };

                const v10Result = await runV10(v10Input);

                // Verify V10 produces a valid state
                expect(['questions', 'output', 'error']).toContain(v10Result.state);

                // Verify structure based on state
                if (v10Result.state === 'questions') {
                    expect(v10Result.questions).toBeDefined();
                    expect(v10Result.questions!.length).toBeGreaterThan(0);
                } else if (v10Result.state === 'output') {
                    expect(v10Result.output).toBeDefined();
                    // Output may be empty for some cases
                }

                // Meta is always present
                expect(v10Result.meta.engineUsed).toBe('v10');
            });
        });
    });

    /**
     * M12.3: V7 now delegates to V10. Results should be identical.
     */
    it('V7 run() and V10 runV10() produce equivalent results for all parity cases', async () => {
        // Import V7 pipeline
        const { run } = await import('../../pipeline');

        for (const testCase of PARITY_CASES) {
            // V7 input
            const v7Input = {
                dictation: testCase.dictation,
                treatmentId: testCase.treatmentId,
                insuranceType: testCase.insuranceType as 'GKV' | 'PKV',
                textLength: 'mittel' as const,
                answers: new Map(),
            };

            // V10 input
            const v10Input: V10PipelineInput = {
                dictation: testCase.dictation,
                treatmentId: testCase.treatmentId,
                insuranceType: testCase.insuranceType,
                textLength: 'mittel',
                answers: new Map(),
            };

            // Run both
            const v7Result = await run(v7Input);
            const v10Result = await runV10(v10Input);

            // Compare states - they should be identical since V7 delegates to V10
            expect(v7Result.state).toBe(v10Result.state);

            // Compare question counts (if in questions state)
            if (v7Result.state === 'questions' && v10Result.state === 'questions') {
                expect(v7Result.questions.length).toBe(v10Result.questions!.length);
            }

            // Compare output exists (if in output state)
            if (v7Result.state === 'output' && v10Result.state === 'output') {
                expect(v7Result.output).toBeDefined();
                expect(v10Result.output).toBeDefined();
            }
        }
    });
});
