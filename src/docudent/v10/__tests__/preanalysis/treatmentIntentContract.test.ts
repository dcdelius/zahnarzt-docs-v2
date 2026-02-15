import { describe, expect, it } from 'vitest';
import {
    TREATMENT_INTENT_CONTRACT_VERSION,
    toDeterministicIntentHashInput,
    validateTreatmentIntentBundle,
} from '../../preanalysis/treatmentIntentContract';

describe('treatmentIntentContract', () => {
    it('accepts valid bundle with evidence spans', () => {
        const result = validateTreatmentIntentBundle({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46 und danach Aufbau mit Komposit.',
            intents: [
                {
                    intentId: 'i-1',
                    treatmentId: 'endo',
                    tooth: '46',
                    confidence: 0.93,
                    evidenceSpans: [{ start: 0, end: 7, text: 'Endo 46' }],
                },
                {
                    intentId: 'i-2',
                    treatmentId: 'fuellung',
                    tooth: '46',
                    confidence: 0.87,
                    evidenceSpans: [{ start: 19, end: 39, text: 'danach Aufbau mit Komposit' }],
                },
            ],
            needsConfirmation: false,
        });
        expect(result.ok).toBe(true);
    });

    it('rejects missing evidence spans', () => {
        const result = validateTreatmentIntentBundle({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46.',
            intents: [{
                intentId: 'i-1',
                treatmentId: 'endo',
                tooth: '46',
                confidence: 0.7,
                evidenceSpans: [],
            }],
        });
        expect(result.ok).toBe(false);
    });

    it('rejects unknown treatment id', () => {
        const result = validateTreatmentIntentBundle({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Kronenpraep 16.',
            intents: [{
                intentId: 'i-1',
                treatmentId: 'crown_prep',
                tooth: '16',
                confidence: 0.7,
                evidenceSpans: [{ start: 0, end: 12, text: 'Kronenpraep 16' }],
            }],
        });
        expect(result.ok).toBe(false);
    });

    it('serializes deterministically', () => {
        const a = {
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46, danach Aufbau.',
            intents: [
                {
                    intentId: 'b',
                    treatmentId: 'fuellung',
                    tooth: '46',
                    confidence: 0.8,
                    evidenceSpans: [{ start: 9, end: 20, text: 'danach Aufbau' }],
                },
                {
                    intentId: 'a',
                    treatmentId: 'endo',
                    tooth: '46',
                    confidence: 0.9,
                    evidenceSpans: [{ start: 0, end: 7, text: 'Endo 46' }],
                },
            ],
        } as const;

        const b = {
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46, danach Aufbau.',
            intents: [
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
                    evidenceSpans: [{ start: 9, end: 20, text: 'danach Aufbau' }],
                },
            ],
        } as const;

        const av = validateTreatmentIntentBundle(a);
        const bv = validateTreatmentIntentBundle(b);
        expect(av.ok).toBe(true);
        expect(bv.ok).toBe(true);
        if (!av.ok || !bv.ok) return;
        expect(toDeterministicIntentHashInput(av.data)).toBe(toDeterministicIntentHashInput(bv.data));
    });
});

