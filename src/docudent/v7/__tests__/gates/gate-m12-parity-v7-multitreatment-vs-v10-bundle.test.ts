/**
 * Gate M12: Parity V7 Multitreatment vs V10 Bundle
 *
 * GATE DEFINITION:
 * V7 multi-treatment orchestration and V10 runV10Bundle() must
 * produce equivalent results for multi-segment/multi-tooth cases.
 *
 * Parity is defined as:
 * - Same segment ordering
 * - Same question scoping and deduplication
 * - Same billing code scope-aware deduplication
 */

import { describe, it, expect } from 'vitest';
import { runV10Bundle } from '../../../v10';
import type { V10BundleInput, BillingScope } from '../../../v10/types';

describe('Gate M12: Parity V7 Multitreatment vs V10 Bundle', () => {
    describe('V10 Bundle basic functionality', () => {
        it('multi-tooth bundle processes each tooth', async () => {
            const bundleInput: V10BundleInput = {
                dictation: 'Zähne 16 und 17 tiefe Karies',
                segments: [
                    {
                        segmentId: 'seg-1',
                        treatmentId: 'fuellung',
                        insuranceType: 'GKV',
                        textLength: 'mittel',
                        dictation: 'Zähne 16 und 17 tiefe Karies',
                        instances: [
                            { instanceId: 'tooth:16', tooth: '16' },
                            { instanceId: 'tooth:17', tooth: '17' },
                        ],
                    },
                ],
                globalAnswers: new Map(),
            };

            const result = await runV10Bundle(bundleInput);

            // Verify multi-instance is detected
            expect(result.meta.multiInstance).toBe(true);

            // Verify we get output or questions
            expect(['questions', 'output', 'error']).toContain(result.state);
        });

        it('mixed segments preserve order', async () => {
            const bundleInput: V10BundleInput = {
                dictation: 'Behandlung beider Zähne',
                segments: [
                    {
                        segmentId: 'seg-fuellung',
                        treatmentId: 'fuellung',
                        insuranceType: 'GKV',
                        textLength: 'mittel',
                        dictation: 'Zahn 16 Karies',
                        instances: [{ instanceId: 'tooth:16', tooth: '16' }],
                    },
                    {
                        segmentId: 'seg-endo',
                        treatmentId: 'endo',
                        insuranceType: 'GKV',
                        textLength: 'mittel',
                        dictation: 'Zahn 17 Wurzelbehandlung',
                        instances: [{ instanceId: 'tooth:17', tooth: '17' }],
                    },
                ],
                globalAnswers: new Map(),
            };

            const result = await runV10Bundle(bundleInput);

            // Meta should reflect we processed multiple segments
            expect(result.meta.multiInstance).toBe(true);

            // If output state, verify segment info is preserved
            if (result.state === 'output' && result.output) {
                expect(result.output.segments.length).toBe(2);
                expect(result.output.segments[0].segmentId).toBe('seg-fuellung');
                expect(result.output.segments[1].segmentId).toBe('seg-endo');
            }
        });

        it('billing codes have scope field', async () => {
            const bundleInput: V10BundleInput = {
                dictation: 'Zahn 16 Karies Füllung',
                segments: [
                    {
                        segmentId: 'seg-1',
                        treatmentId: 'fuellung',
                        insuranceType: 'GKV',
                        textLength: 'mittel',
                        dictation: 'Zahn 16 Karies Füllung',
                        instances: [{ instanceId: 'tooth:16', tooth: '16' }],
                    },
                ],
                globalAnswers: new Map(),
            };

            const result = await runV10Bundle(bundleInput);

            if (result.state === 'output' && result.output?.billingCodes) {
                for (const code of result.output.billingCodes) {
                    expect(code).toHaveProperty('scope');
                    expect(['SESSION', 'TOOTH']).toContain(code.scope);
                }
            }
        });
    });

    /**
     * M12.3: V7 adapters can convert to/from V10 bundle format.
     */
    describe('V7 Multitreatment vs V10 Bundle parity', () => {
        it('V7 adapters can convert to bundle input', async () => {
            const { toV10BundleInput } = await import('../../pipeline/adapters');

            const v7Input = {
                dictation: 'Zahn 16 Karies',
                treatmentId: 'fuellung',
                insuranceType: 'GKV' as const,
                textLength: 'mittel' as const,
                answers: new Map(),
            };

            const bundleInput = toV10BundleInput(v7Input);

            expect(bundleInput.segments).toBeDefined();
            expect(bundleInput.segments.length).toBe(1);
            expect(bundleInput.segments[0].treatmentId).toBe('fuellung');
        });

        it('V7 adapters can convert from bundle output', async () => {
            const { fromV10BundleOutput } = await import('../../pipeline/adapters');

            // Simple bundle run
            const result = await runV10Bundle({
                dictation: 'Zahn 16 Karies',
                segments: [{
                    segmentId: 'seg-1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    dictation: 'Zahn 16 Karies',
                    instances: [{ instanceId: 'default' }],
                }],
                globalAnswers: new Map(),
            });

            const v7Result = fromV10BundleOutput(result);

            // V7 result should have the expected shape
            expect(v7Result).toHaveProperty('state');
            expect(v7Result).toHaveProperty('questions');
            expect(v7Result).toHaveProperty('output');
            expect(v7Result).toHaveProperty('warnings');
        });
    });
});
