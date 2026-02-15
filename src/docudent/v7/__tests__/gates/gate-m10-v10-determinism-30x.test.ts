/**
 * Gate M10-C: V10 Determinism 30x
 *
 * Ensures V10 pipeline produces identical output across 30 runs.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../../v10';

describe('Gate M10-C: V10 Determinism 30x', () => {
    // ═══════════════════════════════════════════════════════════════
    // TEST: Single instance determinism
    // ═══════════════════════════════════════════════════════════════

    describe('Single instance determinism', () => {
        it('profunda case produces identical output 30x', async () => {
            const input = {
                dictation: 'Zahn 16 MOD-Füllung bei Caries profunda.',
                treatmentId: 'fuellung',
                insuranceType: 'GKV' as const,
                textLength: 'mittel' as const,
            };

            const firstRun = await runV10(input);

            for (let i = 0; i < 30; i++) {
                const run = await runV10(input);

                expect(run.state).toBe(firstRun.state);
                expect(run.questions?.map(q => q.id).sort()).toEqual(
                    firstRun.questions?.map(q => q.id).sort()
                );
            }
        });

        it('with no required questions produces identical output 30x', async () => {
            // Use dictation that doesn't trigger required askbacks
            const input = {
                dictation: 'Zahn 16 okklusal Füllung bei normaler Karies.',
                treatmentId: 'fuellung',
                insuranceType: 'GKV' as const,
                textLength: 'kurz' as const,
            };

            const firstRun = await runV10(input);

            // No required questions = output state
            const hasRequired = (firstRun.questions?.filter(q => q.medicalSeverity === 'hard') ?? []).length > 0;

            for (let i = 0; i < 30; i++) {
                const run = await runV10(input);

                expect(run.state).toBe(firstRun.state);
                expect(run.trace?.allChips.sort()).toEqual(
                    firstRun.trace?.allChips.sort()
                );

                if (!hasRequired && firstRun.state === 'output') {
                    expect(run.output?.billingCodes.sort()).toEqual(
                        firstRun.output?.billingCodes.sort()
                    );
                }
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Multi-instance determinism
    // ═══════════════════════════════════════════════════════════════

    describe('Multi-instance determinism', () => {
        it('multi-tooth case produces identical questions 30x', async () => {
            const input = {
                dictation: 'Zähne 16 und 26 tiefe Füllungen.',
                treatmentId: 'fuellung',
                insuranceType: 'GKV' as const,
                textLength: 'mittel' as const,
                teeth: ['16', '26'],
            };

            const firstRun = await runV10(input);

            for (let i = 0; i < 30; i++) {
                const run = await runV10(input);

                expect(run.state).toBe(firstRun.state);
                expect(run.meta.instanceCount).toBe(firstRun.meta.instanceCount);
                expect(run.questions?.map(q => q.id).sort()).toEqual(
                    firstRun.questions?.map(q => q.id).sort()
                );
            }
        });

        it('multi-tooth with answers produces identical output 30x', async () => {
            const input = {
                dictation: 'Zähne 16 und 26 tiefe Füllungen.',
                treatmentId: 'fuellung',
                insuranceType: 'GKV' as const,
                textLength: 'kurz' as const,
                teeth: ['16', '26'],
                answers: {
                    'medical_ueberkappung::tooth:16': 'yes',
                    'medical_ueberkappung::tooth:26': 'no',
                },
            };

            const firstRun = await runV10(input);

            for (let i = 0; i < 30; i++) {
                const run = await runV10(input);

                expect(run.state).toBe(firstRun.state);
                expect(run.trace?.allChips.sort()).toEqual(
                    firstRun.trace?.allChips.sort()
                );
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Trace determinism
    // ═══════════════════════════════════════════════════════════════

    describe('Trace determinism', () => {
        it('trace rule hits are identical 30x', async () => {
            const input = {
                dictation: 'Zahn 16 tiefe Füllung mit starker Blutung.',
                treatmentId: 'fuellung',
                insuranceType: 'GKV' as const,
                textLength: 'mittel' as const,
            };

            const firstRun = await runV10(input);

            for (let i = 0; i < 30; i++) {
                const run = await runV10(input);

                expect(run.trace?.allRuleHits.sort()).toEqual(
                    firstRun.trace?.allRuleHits.sort()
                );
            }
        });
    });
});
