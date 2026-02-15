/**
 * V10 Chip Overrides — pipeline integration tests
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';
import { scopeExtractionToInstances } from '../../multitreatment/scoping';

const BASE_DICTATION = 'Zahn 16 MOD Karies, Kompositfüllung';

function buildBaseInput() {
    const instanceId = scopeExtractionToInstances(BASE_DICTATION, 'fuellung').instances[0].instanceId;
    return {
        instanceId,
        input: {
            dictation: BASE_DICTATION,
            treatmentId: 'fuellung',
            insuranceType: 'GKV' as const,
            textLength: 'mittel' as const,
            answers: new Map<string, unknown>([
                ['medical_vipr', 'positiv'],
                ['fuellung_material', 'komposit'],
                ['medical_material', 'komposit'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '16',
                    surfaces: ['m', 'o', 'd'],
                    rawDictation: BASE_DICTATION,
                },
            },
        },
    };
}

describe('V10 chip overrides', () => {
    it('adds a toggle chip via overrides', async () => {
        const { instanceId, input } = buildBaseInput();
        const result = await runV10({
            ...input,
            chipOverrides: {
                [instanceId]: {
                    fluor: { mode: 'on' },
                },
            },
        });

        expect(result.state).toBe('output');
        expect(result.output?.billingCodes).toContain('BEMA_IP4');
    });

    it('applies param control mapping via overrides', async () => {
        const { instanceId, input } = buildBaseInput();
        const result = await runV10({
            ...input,
            chipOverrides: {
                [instanceId]: {
                    la_type: { mode: 'on', value: 'leitung' },
                },
            },
        });

        expect(result.state).toBe('output');
        expect(result.output?.billingCodes).toContain('BEMA_41a');
    });
});
