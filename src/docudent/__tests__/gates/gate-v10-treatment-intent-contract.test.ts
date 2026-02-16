import { describe, expect, it } from 'vitest';
import {
    TREATMENT_INTENT_CONTRACT_VERSION,
    toDeterministicIntentHashInput,
    validateTreatmentIntentBundle,
} from '../../v10/preanalysis/treatmentIntentContract';

describe('gate-v10-treatment-intent-contract', () => {
    it('fails fast when any intent has no evidence span', () => {
        const parsed = validateTreatmentIntentBundle({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46 danach Aufbau.',
            intents: [
                {
                    intentId: 'endo-46',
                    treatmentId: 'endo',
                    tooth: '46',
                    confidence: 0.89,
                    evidenceSpans: [],
                },
            ],
        });
        expect(parsed.ok).toBe(false);
    });

    it('fails fast on unknown treatment ids', () => {
        const parsed = validateTreatmentIntentBundle({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Extraktion Zahn 28.',
            intents: [
                {
                    intentId: 'extract-28',
                    treatmentId: 'extraction_stub',
                    tooth: '28',
                    confidence: 0.82,
                    evidenceSpans: [{ start: 0, end: 18, text: 'Extraktion Zahn 28' }],
                },
            ],
        });
        expect(parsed.ok).toBe(false);
    });

    it('keeps deterministic serialization for equivalent bundles', () => {
        const left = validateTreatmentIntentBundle({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46, danach Aufbau.',
            intents: [
                {
                    intentId: 'x2',
                    treatmentId: 'fuellung',
                    tooth: '46',
                    confidence: 0.81,
                    evidenceSpans: [{ start: 10, end: 23, text: 'danach Aufbau' }],
                },
                {
                    intentId: 'x1',
                    treatmentId: 'endo',
                    tooth: '46',
                    confidence: 0.95,
                    evidenceSpans: [{ start: 0, end: 7, text: 'Endo 46' }],
                },
            ],
        });
        const right = validateTreatmentIntentBundle({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46, danach Aufbau.',
            intents: [
                {
                    intentId: 'x1',
                    treatmentId: 'endo',
                    tooth: '46',
                    confidence: 0.95,
                    evidenceSpans: [{ start: 0, end: 7, text: 'Endo 46' }],
                },
                {
                    intentId: 'x2',
                    treatmentId: 'fuellung',
                    tooth: '46',
                    confidence: 0.81,
                    evidenceSpans: [{ start: 10, end: 23, text: 'danach Aufbau' }],
                },
            ],
        });

        expect(left.ok).toBe(true);
        expect(right.ok).toBe(true);
        if (!left.ok || !right.ok) return;
        expect(toDeterministicIntentHashInput(left.data)).toBe(toDeterministicIntentHashInput(right.data));
    });
});
