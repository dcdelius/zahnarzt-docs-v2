import { describe, expect, it } from 'vitest';
import { buildSegmentsFromIntents } from '../../v10/preanalysis/buildSegmentsFromIntents';
import { TREATMENT_INTENT_CONTRACT_VERSION } from '../../v10/preanalysis/treatmentIntentContract';

describe('gate-v10-intent-to-segment-determinism', () => {
    it('intent order does not change segment mapping output', () => {
        const inputA = {
            version: TREATMENT_INTENT_CONTRACT_VERSION as const,
            dictation: 'Endo 46 danach Aufbau.',
            intents: [
                {
                    intentId: 'intent-2',
                    treatmentId: 'fuellung',
                    tooth: '46',
                    confidence: 0.8,
                    evidenceSpans: [{ start: 12, end: 22, text: 'danach Aufbau' }],
                },
                {
                    intentId: 'intent-1',
                    treatmentId: 'endo',
                    tooth: '46',
                    confidence: 0.9,
                    evidenceSpans: [{ start: 0, end: 7, text: 'Endo 46' }],
                },
            ],
        };
        const inputB = {
            ...inputA,
            intents: [...inputA.intents].reverse(),
        };

        const a = buildSegmentsFromIntents({
            bundle: inputA as any,
            insuranceType: 'GKV',
            textLength: 'mittel',
        });
        const b = buildSegmentsFromIntents({
            bundle: inputB as any,
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        expect(a).toEqual(b);
    });
});

