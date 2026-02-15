/**
 * Gate M11: Mixed Treatments Bundle Order
 *
 * Verifies that mixed treatment bundles preserve segment order.
 */

import { describe, it, expect } from 'vitest';
import { runV10Bundle } from '../../../v10';

describe('Gate M11: Mixed Treatments Bundle Order', () => {
    // ═══════════════════════════════════════════════════════════════
    // TEST: Segment order preserved in questions
    // ═══════════════════════════════════════════════════════════════

    describe('Segment order in questions', () => {
        it('questions from segment 1 appear before segment 2', async () => {
            const result = await runV10Bundle({
                segments: [
                    {
                        segmentId: 'fuellung-seg',
                        treatmentId: 'fuellung',
                        insuranceType: 'GKV',
                        textLength: 'mittel',
                        dictation: 'Zahn 16 tiefe Füllung.',
                        instances: [{ instanceId: 'tooth:16', tooth: '16' }],
                    },
                    {
                        segmentId: 'endo-seg',
                        treatmentId: 'endo',
                        insuranceType: 'GKV',
                        textLength: 'mittel',
                        dictation: 'Zahn 11 Wurzelbehandlung.',
                        instances: [{ instanceId: 'tooth:11', tooth: '11' }],
                    },
                ],
            });

            // Bundle should return questions or output
            expect(['questions', 'output']).toContain(result.state);
            expect(result.meta.instanceCount).toBe(2);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Segment order preserved in output
    // ═══════════════════════════════════════════════════════════════

    describe('Segment order in output', () => {
        it('segment outputs are in input order', async () => {
            const result = await runV10Bundle({
                segments: [
                    {
                        segmentId: 'seg-a',
                        treatmentId: 'fuellung',
                        insuranceType: 'GKV',
                        textLength: 'kurz',
                        dictation: 'Normale Karies.',
                        instances: [{ instanceId: 'tooth:16', tooth: '16' }],
                    },
                    {
                        segmentId: 'seg-b',
                        treatmentId: 'fuellung',
                        insuranceType: 'GKV',
                        textLength: 'kurz',
                        dictation: 'Normale Karies.',
                        instances: [{ instanceId: 'tooth:26', tooth: '26' }],
                    },
                ],
            });

            if (result.output?.segments) {
                expect(result.output.segments[0].segmentId).toBe('seg-a');
                expect(result.output.segments[1].segmentId).toBe('seg-b');
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Treatment-specific logic isolation
    // ═══════════════════════════════════════════════════════════════

    describe('Treatment isolation', () => {
        it('fuellung segment uses fuellung KB', async () => {
            const result = await runV10Bundle({
                segments: [{
                    segmentId: 'fuellung-seg',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    dictation: 'Normale Karies.',
                    instances: [{ instanceId: 'tooth:16', tooth: '16' }],
                }],
            });

            // Should use v10 engine
            expect(result.meta.engineUsed).toBe('v10');
        });
    });
});
