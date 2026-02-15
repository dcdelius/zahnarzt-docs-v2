import { describe, expect, it } from 'vitest';
import { buildSegmentsFromIntents } from '../../preanalysis/buildSegmentsFromIntents';
import { TREATMENT_INTENT_CONTRACT_VERSION } from '../../preanalysis/treatmentIntentContract';

describe('buildSegmentsFromIntents', () => {
    it('maps intents to deterministic segment runs', () => {
        const segments = buildSegmentsFromIntents({
            bundle: {
                version: TREATMENT_INTENT_CONTRACT_VERSION,
                dictation: 'Endo 46 danach Aufbau.',
                intents: [
                    {
                        intentId: 'fuellung-46',
                        treatmentId: 'fuellung',
                        tooth: '46',
                        confidence: 0.8,
                        evidenceSpans: [{ start: 12, end: 20, text: 'danach Aufbau' }],
                    },
                    {
                        intentId: 'endo-46',
                        treatmentId: 'endo',
                        tooth: '46',
                        confidence: 0.9,
                        evidenceSpans: [{ start: 0, end: 7, text: 'Endo 46' }],
                    },
                ],
            },
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        expect(segments).toHaveLength(2);
        expect(segments[0].treatmentId).toBe('endo');
        expect(segments[1].treatmentId).toBe('fuellung');
        expect(segments[0].instances[0].tooth).toBe('46');
        expect(segments[0].dictation).toBe('Endo 46 danach Aufbau.');
        expect(segments[1].dictation).toBe('Endo 46 danach Aufbau.');
    });

    it('remains deterministic when intent order differs', () => {
        const build = (intents: any[]) => buildSegmentsFromIntents({
            bundle: {
                version: TREATMENT_INTENT_CONTRACT_VERSION,
                dictation: 'Endo 46 danach Aufbau.',
                intents,
            },
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        const a = build([
            {
                intentId: 'b',
                treatmentId: 'fuellung',
                tooth: '46',
                confidence: 0.8,
                evidenceSpans: [{ start: 10, end: 22, text: 'danach Aufbau' }],
            },
            {
                intentId: 'a',
                treatmentId: 'endo',
                tooth: '46',
                confidence: 0.9,
                evidenceSpans: [{ start: 0, end: 7, text: 'Endo 46' }],
            },
        ]);
        const b = build([
            {
                intentId: 'a',
                treatmentId: 'endo',
                tooth: '46',
                confidence: 0.9,
                evidenceSpans: [{ start: 0, end: 7, text: 'Endo 46' }],
            },
            {
                intentId: 'b',
                treatmentId: 'fuellung',
                tooth: '46',
                confidence: 0.8,
                evidenceSpans: [{ start: 10, end: 22, text: 'danach Aufbau' }],
            },
        ]);
        expect(a).toEqual(b);
    });
});
