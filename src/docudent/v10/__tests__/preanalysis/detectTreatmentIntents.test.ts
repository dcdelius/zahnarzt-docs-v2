import { describe, expect, it } from 'vitest';
import { detectTreatmentIntents } from '../../preanalysis/detectTreatmentIntents';
import { TREATMENT_INTENT_CONTRACT_VERSION } from '../../preanalysis/treatmentIntentContract';
import { MIXED_INTENT_FIXTURES } from './fixtures/mixedIntentFixtures';

describe('detectTreatmentIntents', () => {
    it('uses llm payload when valid', async () => {
        const llmPayload = JSON.stringify({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46 dann Aufbau.',
            needsConfirmation: false,
            intents: [
                {
                    intentId: 'a',
                    treatmentId: 'endo',
                    tooth: '46',
                    confidence: 0.92,
                    evidenceSpans: [{ start: 0, end: 7, text: 'Endo 46' }],
                },
                {
                    intentId: 'b',
                    treatmentId: 'fuellung',
                    tooth: '46',
                    confidence: 0.83,
                    evidenceSpans: [{ start: 12, end: 18, text: 'Aufbau' }],
                },
            ],
        });
        const result = await detectTreatmentIntents('Endo 46 dann Aufbau.', { mockLlmContent: llmPayload });
        expect(result.source).toBe('llm');
        expect(result.bundle.intents).toHaveLength(2);
    });

    it('falls back when llm payload is invalid', async () => {
        const invalidPayload = '{"foo":"bar"}';
        const result = await detectTreatmentIntents('Endo 46 danach Aufbau.', { mockLlmContent: invalidPayload });
        expect(result.source).toBe('fallback');
        expect(result.bundle.intents.length).toBeGreaterThan(0);
        expect(result.diagnostics.some(item => item.startsWith('llm-schema-invalid'))).toBe(true);
    });

    it('matches fixture expectations (fallback path)', async () => {
        for (const fixture of MIXED_INTENT_FIXTURES) {
            const result = await detectTreatmentIntents(fixture.dictation, { forceFallback: true });
            expect(result.source).toBe(fixture.expected.source);
            expect(result.needsConfirmation).toBe(fixture.expected.needsConfirmation);
            expect(result.bundle.intents).toHaveLength(fixture.expected.intentCount);
            fixture.expected.intentChecks.forEach((check, index) => {
                const intent = result.bundle.intents[index];
                expect(intent.treatmentId).toBe(check.treatmentId);
                if (check.tooth) expect(intent.tooth).toBe(check.tooth);
                if (check.phase) expect(intent.phase).toBe(check.phase);
            });
        }
    });
});

