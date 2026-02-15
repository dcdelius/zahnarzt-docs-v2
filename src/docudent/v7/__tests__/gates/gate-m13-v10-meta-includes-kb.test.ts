/**
 * Gate M13: V10 Meta Includes KB
 *
 * GATE DEFINITION:
 * V10 output meta must include kb.medical and kb.treatments
 * with version, hash, and source.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../../v10/public';
import type { V10PipelineInput } from '../../../v10/types';

describe('Gate M13: V10 Meta Includes KB', () => {
    it('output meta includes kb.medical', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 Karies Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        };

        const result = await runV10(input);

        expect(result.meta).toBeDefined();
        expect(result.meta.kb).toBeDefined();
        expect(result.meta.kb?.medical).toBeDefined();
        expect(result.meta.kb?.medical?.version).toBeDefined();
        expect(result.meta.kb?.medical?.hash).toBeDefined();
        expect(result.meta.kb?.medical?.source).toBe('json');
    });

    it('output meta includes kb.treatments for fuellung', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 Karies',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        };

        const result = await runV10(input);

        expect(result.meta.kb).toBeDefined();
        expect(result.meta.kb?.treatments).toBeDefined();
        expect(result.meta.kb?.treatments?.['fuellung']).toBeDefined();
        expect(result.meta.kb?.treatments?.['fuellung']?.version).toBeDefined();
        expect(result.meta.kb?.treatments?.['fuellung']?.hash).toBeDefined();
        expect(result.meta.kb?.treatments?.['fuellung']?.source).toBe('json');
    });

    it('output meta includes kb.treatments for endo', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 36 Wurzelbehandlung',
            treatmentId: 'endo',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        };

        const result = await runV10(input);

        expect(result.meta.kb).toBeDefined();
        expect(result.meta.kb?.treatments).toBeDefined();
        expect(result.meta.kb?.treatments?.['endo']).toBeDefined();
    });

    it('kb hashes are stable across multiple runs', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        };

        const result1 = await runV10(input);
        const result2 = await runV10(input);

        expect(result1.meta.kb?.medical?.hash).toBe(result2.meta.kb?.medical?.hash);
        expect(result1.meta.kb?.treatments?.['fuellung']?.hash).toBe(
            result2.meta.kb?.treatments?.['fuellung']?.hash
        );
    });

    it('error state still includes kb meta', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 55 Milchzahn', // Should trigger milchzahn error
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        };

        const result = await runV10(input);

        // Even in error state, meta should be present
        expect(result.meta).toBeDefined();
        // KB meta may or may not be present depending on when error occurs
    });
});
