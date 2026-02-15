/**
 * Gate M12.3: Parity V7 run() vs V10 public.ts
 *
 * GATE DEFINITION:
 * V7 run() must produce identical results to V10 runV10() because
 * V7 now delegates entirely to V10.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../../v10/public';
import { run } from '../../pipeline';
import type { V10PipelineInput } from '../../../v10/types';

// Test cases for parity verification
const PARITY_CASES = [
    {
        name: 'Simple fuellung GKV',
        dictation: 'Zahn 16 MOD Karies Kompositfüllung',
        treatmentId: 'fuellung',
        insuranceType: 'GKV' as const,
    },
    {
        name: 'Simple fuellung PKV',
        dictation: 'Zahn 26 OK Komposit',
        treatmentId: 'fuellung',
        insuranceType: 'PKV' as const,
    },
    {
        name: 'Endo case',
        dictation: 'Zahn 36 irreversible Pulpitis Wurzelbehandlung',
        treatmentId: 'endo',
        insuranceType: 'GKV' as const,
    },
];

describe('Gate M12.3: Parity V7 run() vs V10 runV10()', () => {
    for (const testCase of PARITY_CASES) {
        describe(testCase.name, () => {
            it('V7 and V10 produce same state', async () => {
                const v7Input = {
                    dictation: testCase.dictation,
                    treatmentId: testCase.treatmentId,
                    insuranceType: testCase.insuranceType,
                    textLength: 'mittel' as const,
                    answers: new Map<string, unknown>(),
                };

                const v10Input: V10PipelineInput = {
                    dictation: testCase.dictation,
                    treatmentId: testCase.treatmentId,
                    insuranceType: testCase.insuranceType,
                    textLength: 'mittel',
                    answers: new Map(),
                };

                const v7Result = await run(v7Input);
                const v10Result = await runV10(v10Input);

                // States should be identical
                expect(v7Result.state).toBe(v10Result.state);
            });

            it('V7 and V10 produce same question count', async () => {
                const v7Input = {
                    dictation: testCase.dictation,
                    treatmentId: testCase.treatmentId,
                    insuranceType: testCase.insuranceType,
                    textLength: 'mittel' as const,
                    answers: new Map<string, unknown>(),
                };

                const v10Input: V10PipelineInput = {
                    dictation: testCase.dictation,
                    treatmentId: testCase.treatmentId,
                    insuranceType: testCase.insuranceType,
                    textLength: 'mittel',
                    answers: new Map(),
                };

                const v7Result = await run(v7Input);
                const v10Result = await runV10(v10Input);

                if (v7Result.state === 'questions' && v10Result.state === 'questions') {
                    expect(v7Result.questions.length).toBe(v10Result.questions!.length);
                }
            });

            it('V7 debug includes V10 trace', async () => {
                const v7Input = {
                    dictation: testCase.dictation,
                    treatmentId: testCase.treatmentId,
                    insuranceType: testCase.insuranceType,
                    textLength: 'mittel' as const,
                    answers: new Map<string, unknown>(),
                };

                const v7Result = await run(v7Input);

                // V7 should have debug.v10TraceLines from V10
                if (v7Result.debug) {
                    expect((v7Result.debug as any).v10TraceLines).toBeDefined();
                }
            });
        });
    }

    it('V7 run returns valid PipelineResult shape', async () => {
        const result = await run({
            dictation: 'Zahn 16 Karies',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        // Required fields
        expect(result.state).toBeDefined();
        expect(['questions', 'output', 'error']).toContain(result.state);
        expect(result.questions).toBeDefined();
        expect(Array.isArray(result.questions)).toBe(true);
        expect(result.warnings).toBeDefined();
        expect(Array.isArray(result.warnings)).toBe(true);
    });
});
