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
                treatmentId: 'unknown_treatment',
                tooth: '16',
                confidence: 0.7,
                evidenceSpans: [{ start: 0, end: 12, text: 'Kronenpraep 16' }],
            }],
        });
        expect(result.ok).toBe(false);
    });

    it('rejects treatment ids outside preanalysis allowlist even if pack exists', () => {
        const result = validateTreatmentIntentBundle({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Extraktion Zahn 28.',
            intents: [{
                intentId: 'i-1',
                treatmentId: 'extraction_stub',
                tooth: '28',
                confidence: 0.7,
                evidenceSpans: [{ start: 0, end: 17, text: 'Extraktion Zahn 28' }],
            }],
        });
        expect(result.ok).toBe(false);
    });

    it('rejects unknown uncertainty code', () => {
        const result = validateTreatmentIntentBundle({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46.',
            intents: [{
                intentId: 'i-1',
                treatmentId: 'endo',
                tooth: '46',
                confidence: 0.7,
                evidenceSpans: [{ start: 0, end: 7, text: 'Endo 46' }],
                uncertainty: 'free-text-uncertainty',
            }],
        });
        expect(result.ok).toBe(false);
    });

    it('accepts uncertainty guardrails for inferred/missing tooth references', () => {
        const result = validateTreatmentIntentBundle({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46, danach Aufbau.',
            intents: [
                {
                    intentId: 'i-1',
                    treatmentId: 'endo',
                    tooth: '46',
                    confidence: 0.9,
                    evidenceSpans: [{ start: 0, end: 7, text: 'Endo 46' }],
                },
                {
                    intentId: 'i-2',
                    treatmentId: 'fuellung',
                    tooth: '46',
                    confidence: 0.68,
                    uncertainty: 'inferred_tooth_from_context',
                    evidenceSpans: [{ start: 9, end: 22, text: 'danach Aufbau' }],
                },
                {
                    intentId: 'i-3',
                    treatmentId: 'fuellung',
                    confidence: 0.45,
                    uncertainty: 'missing_tooth_reference',
                    evidenceSpans: [{ start: 9, end: 22, text: 'danach Aufbau' }],
                },
            ],
            needsConfirmation: true,
        });
        expect(result.ok).toBe(true);
    });

    it('rejects uncertainty when needsConfirmation is false', () => {
        const result = validateTreatmentIntentBundle({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46, danach Aufbau.',
            intents: [
                {
                    intentId: 'i-1',
                    treatmentId: 'endo',
                    tooth: '46',
                    confidence: 0.9,
                    evidenceSpans: [{ start: 0, end: 7, text: 'Endo 46' }],
                },
                {
                    intentId: 'i-2',
                    treatmentId: 'fuellung',
                    tooth: '46',
                    confidence: 0.58,
                    uncertainty: 'inferred_tooth_from_context',
                    evidenceSpans: [{ start: 9, end: 22, text: 'danach Aufbau' }],
                },
            ],
            needsConfirmation: false,
        });
        expect(result.ok).toBe(false);
    });

    it('rejects low confidence intent without uncertainty code', () => {
        const result = validateTreatmentIntentBundle({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Aufbau nach Endo.',
            intents: [
                {
                    intentId: 'i-1',
                    treatmentId: 'fuellung',
                    confidence: 0.4,
                    evidenceSpans: [{ start: 0, end: 6, text: 'Aufbau' }],
                },
            ],
            needsConfirmation: true,
        });
        expect(result.ok).toBe(false);
    });

    it('rejects unknown top-level and intent fields (strict schema)', () => {
        const result = validateTreatmentIntentBundle({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46.',
            billingCodes: ['BEMA_31'],
            intents: [{
                intentId: 'i-1',
                treatmentId: 'endo',
                tooth: '46',
                confidence: 0.7,
                evidenceSpans: [{ start: 0, end: 7, text: 'Endo 46' }],
                billingRefs: ['BEMA_31'],
            }],
        });
        expect(result.ok).toBe(false);
    });

    it('rejects billing signals in sharedFacts/evidence span text', () => {
        const result = validateTreatmentIntentBundle({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46, BEMA 31 notieren.',
            intents: [{
                intentId: 'i-1',
                treatmentId: 'endo',
                tooth: '46',
                confidence: 0.8,
                evidenceSpans: [{ start: 0, end: 7, text: 'BEMA 31' }],
                sharedFacts: { billingCode: 'BEMA_31' },
            }],
        });
        expect(result.ok).toBe(false);
    });

    it('rejects duplicate intent ids and out-of-bounds evidence spans', () => {
        const result = validateTreatmentIntentBundle({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46 und Aufbau.',
            intents: [
                {
                    intentId: 'i-1',
                    treatmentId: 'endo',
                    tooth: '46',
                    confidence: 0.8,
                    evidenceSpans: [{ start: 0, end: 7, text: 'Endo 46' }],
                },
                {
                    intentId: 'i-1',
                    treatmentId: 'fuellung',
                    tooth: '46',
                    confidence: 0.7,
                    evidenceSpans: [{ start: 20, end: 30, text: 'Aufbau' }],
                },
            ],
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
