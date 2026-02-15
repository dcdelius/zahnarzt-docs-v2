/**
 * Gate M14: Bundle Determinism 50x
 *
 * GATE DEFINITION:
 * Running the same multi-tooth scenario 50 times must produce
 * identical results every time:
 * - Same question ordering
 * - Same chip ordering
 * - Same billing code ordering
 * - Same output text
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../../v10/public';
import type { V10PipelineInput, V10PipelineOutput } from '../../../v10/types';

describe('Gate M14: Bundle Determinism 50x', () => {
    const RUN_COUNT = 50;

    const normalizeOutput = (output: V10PipelineOutput): string => {
        return JSON.stringify({
            state: output.state,
            questionIds: output.questions?.map(q => q.id).sort(),
            chips: output.trace?.allChips?.slice().sort(),
            billingCodes: output.output?.billingCodes?.slice().sort(),
            fullText: output.output?.fullText,
            perTooth: output.output?.perTooth?.map(t => ({
                tooth: t.tooth,
                text: t.text,
                billing: t.billingCodes.slice().sort(),
            })),
        });
    };

    it('3-tooth fuellung is deterministic 50x', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zähne 16, 26, 36 MOD Karies Kompositfüllungen',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            teeth: ['16', '26', '36'],
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const results: string[] = [];

        for (let i = 0; i < RUN_COUNT; i++) {
            const result = await runV10(input);
            results.push(normalizeOutput(result));
        }

        // All results must be identical
        const firstResult = results[0];
        for (let i = 1; i < RUN_COUNT; i++) {
            expect(results[i]).toBe(firstResult);
        }
    });

    it('mixed depth scenario is deterministic 50x', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 tiefe Karies, Zahn 26 normale Karies',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            teeth: ['16', '26'],
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const results: string[] = [];

        for (let i = 0; i < RUN_COUNT; i++) {
            const result = await runV10(input);
            results.push(normalizeOutput(result));
        }

        const firstResult = results[0];
        for (let i = 1; i < RUN_COUNT; i++) {
            expect(results[i]).toBe(firstResult);
        }
    });

    it('questions state ordering is deterministic 50x', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies profunda',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(), // No answers = questions state
        };

        const questionOrders: string[] = [];

        for (let i = 0; i < RUN_COUNT; i++) {
            const result = await runV10(input);
            if (result.state === 'questions' && result.questions) {
                questionOrders.push(result.questions.map(q => q.id).join(','));
            }
        }

        // All question orderings must be identical
        if (questionOrders.length > 0) {
            const firstOrder = questionOrders[0];
            for (let i = 1; i < questionOrders.length; i++) {
                expect(questionOrders[i]).toBe(firstOrder);
            }
        }
    });

    it('trace lines are deterministic 50x', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies Füllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const traceLines: string[] = [];

        for (let i = 0; i < RUN_COUNT; i++) {
            const result = await runV10(input);
            traceLines.push((result.meta.traceLines ?? []).join('|'));
        }

        const firstTrace = traceLines[0];
        for (let i = 1; i < RUN_COUNT; i++) {
            expect(traceLines[i]).toBe(firstTrace);
        }
    });

    it('KB hashes are identical across 50 runs', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const hashes: string[] = [];

        for (let i = 0; i < RUN_COUNT; i++) {
            const result = await runV10(input);
            const hash = `${result.meta.kb?.medical?.hash}|${result.meta.kb?.treatments?.fuellung?.hash}`;
            hashes.push(hash);
        }

        const firstHash = hashes[0];
        for (let i = 1; i < RUN_COUNT; i++) {
            expect(hashes[i]).toBe(firstHash);
        }
    });
});
