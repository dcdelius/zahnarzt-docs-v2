/**
 * Gate M11: Determinism 30x Bundle
 *
 * Ensures bundle output is identical across 30 runs.
 */

import { describe, it, expect } from 'vitest';
import { runV10Bundle } from '../../../v10';

describe('Gate M11: Determinism 30x Bundle', () => {
    // ═══════════════════════════════════════════════════════════════
    // TEST: Single segment determinism
    // ═══════════════════════════════════════════════════════════════

    describe('Single segment determinism', () => {
        it('produces identical questions 30x', async () => {
            const input = {
                segments: [{
                    segmentId: 'seg1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV' as const,
                    textLength: 'mittel' as const,
                    dictation: 'Tiefe Karies.',
                    instances: [
                        { instanceId: 'tooth:16', tooth: '16' },
                        { instanceId: 'tooth:26', tooth: '26' },
                    ],
                }],
            };

            const firstRun = await runV10Bundle(input);

            for (let i = 0; i < 30; i++) {
                const run = await runV10Bundle(input);

                expect(run.state).toBe(firstRun.state);
                expect(run.questions?.map(q => q.id)).toEqual(
                    firstRun.questions?.map(q => q.id)
                );
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Multi-segment determinism
    // ═══════════════════════════════════════════════════════════════

    describe('Multi-segment determinism', () => {
        it('produces identical output 30x', async () => {
            const input = {
                segments: [
                    {
                        segmentId: 'seg-a',
                        treatmentId: 'fuellung',
                        insuranceType: 'GKV' as const,
                        textLength: 'kurz' as const,
                        dictation: 'Normale Karies.',
                        instances: [{ instanceId: 'tooth:16', tooth: '16' }],
                    },
                    {
                        segmentId: 'seg-b',
                        treatmentId: 'fuellung',
                        insuranceType: 'GKV' as const,
                        textLength: 'kurz' as const,
                        dictation: 'Normale Karies.',
                        instances: [{ instanceId: 'tooth:26', tooth: '26' }],
                    },
                ],
            };

            const firstRun = await runV10Bundle(input);

            for (let i = 0; i < 30; i++) {
                const run = await runV10Bundle(input);

                expect(run.state).toBe(firstRun.state);
                expect(run.meta.instanceCount).toBe(firstRun.meta.instanceCount);

                if (run.output && firstRun.output) {
                    expect(run.output.fullText).toBe(firstRun.output.fullText);
                    expect(run.output.billingCodes.map(c => c.code).sort()).toEqual(
                        firstRun.output.billingCodes.map(c => c.code).sort()
                    );
                }
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Trace determinism
    // ═══════════════════════════════════════════════════════════════

    describe('Trace determinism', () => {
        it('trace contains same rule hits 30x', async () => {
            const input = {
                segments: [{
                    segmentId: 'seg1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV' as const,
                    textLength: 'mittel' as const,
                    dictation: 'Tiefe Karies.',
                    instances: [{ instanceId: 'tooth:16', tooth: '16' }],
                }],
            };

            const firstRun = await runV10Bundle(input);

            for (let i = 0; i < 30; i++) {
                const run = await runV10Bundle(input);

                expect(run.trace?.allRuleHits.sort()).toEqual(
                    firstRun.trace?.allRuleHits.sort()
                );
            }
        });
    });
});
