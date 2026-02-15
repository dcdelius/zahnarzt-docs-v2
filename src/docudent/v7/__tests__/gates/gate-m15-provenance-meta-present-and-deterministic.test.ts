/**
 * Gate M15: Provenance Meta Present and Deterministic
 *
 * GATE DEFINITION:
 * V10 output must include provenance metadata that is:
 * - Present for all askbacks and chips
 * - Deterministic (same input = same ordering)
 * - Contains sourceRefs for medical rules
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../../v10/public';
import type { V10PipelineInput } from '../../../v10/types';

describe('Gate M15: Provenance Meta Present and Deterministic', () => {
    it('output state includes meta with KB info', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies, Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const result = await runV10(input);

        // Meta should always be present
        expect(result.meta).toBeDefined();
        expect(result.meta.engineUsed).toBe('v10');

        // KB metadata should be present
        expect(result.meta.kb).toBeDefined();
        expect(result.meta.kb?.medical).toBeDefined();
    });

    it('trace lines are deterministic across runs', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies profunda',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        };

        const results: string[] = [];

        for (let i = 0; i < 5; i++) {
            const result = await runV10(input);
            results.push(JSON.stringify(result.meta.traceLines));
        }

        // All trace lines should be identical
        const first = results[0];
        for (let i = 1; i < results.length; i++) {
            expect(results[i]).toBe(first);
        }
    });

    it('KB hashes are stable', async () => {
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

        for (let i = 0; i < 5; i++) {
            const result = await runV10(input);
            hashes.push(result.meta.kb?.medical?.hash ?? 'missing');
        }

        // All hashes should be identical
        const first = hashes[0];
        expect(first).not.toBe('missing');
        for (let i = 1; i < hashes.length; i++) {
            expect(hashes[i]).toBe(first);
        }
    });

    it('chip ordering is deterministic', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies, Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const chipOrders: string[] = [];

        for (let i = 0; i < 5; i++) {
            const result = await runV10(input);
            const chips = result.trace?.allChips ?? [];
            chipOrders.push(chips.join(','));
        }

        // All chip orderings should be identical
        const first = chipOrders[0];
        for (let i = 1; i < chipOrders.length; i++) {
            expect(chipOrders[i]).toBe(first);
        }
    });

    it('billing codes are deterministic', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies, Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const billingOrders: string[] = [];

        for (let i = 0; i < 5; i++) {
            const result = await runV10(input);
            const billing = result.output?.billingCodes ?? [];
            billingOrders.push(billing.join(','));
        }

        // All billing orderings should be identical
        const first = billingOrders[0];
        for (let i = 1; i < billingOrders.length; i++) {
            expect(billingOrders[i]).toBe(first);
        }
    });

    it('instance count is deterministic for multi-tooth', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zähne 16, 26, 36 MOD Karies',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            teeth: ['16', '26', '36'],
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const counts: number[] = [];

        for (let i = 0; i < 5; i++) {
            const result = await runV10(input);
            counts.push(result.meta.instanceCount);
        }

        // All instance counts should be identical
        const first = counts[0];
        expect(first).toBeGreaterThanOrEqual(1);
        for (let i = 1; i < counts.length; i++) {
            expect(counts[i]).toBe(first);
        }
    });
});
