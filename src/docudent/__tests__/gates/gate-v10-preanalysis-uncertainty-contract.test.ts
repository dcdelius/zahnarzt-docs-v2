import { describe, expect, it } from 'vitest';
import {
    TREATMENT_INTENT_CONTRACT_VERSION,
    validateTreatmentIntentBundle,
} from '@/docudent/v10/preanalysis/treatmentIntentContract';

describe('gate-v10-preanalysis-uncertainty-contract', () => {
    it('blocks bundles where uncertainty is present but needsConfirmation is false', () => {
        const result = validateTreatmentIntentBundle({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46 danach Aufbau.',
            needsConfirmation: false,
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
                    confidence: 0.57,
                    uncertainty: 'llm_low_confidence',
                    evidenceSpans: [{ start: 8, end: 21, text: 'danach Aufbau' }],
                },
            ],
        });
        expect(result.ok).toBe(false);
    });
});
