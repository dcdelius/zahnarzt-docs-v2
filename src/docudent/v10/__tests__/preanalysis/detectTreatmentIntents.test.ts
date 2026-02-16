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

    it('falls back when llm payload has uncertainty but misses confirmation flag', async () => {
        const invalidPayload = JSON.stringify({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46 danach Aufbau',
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
                    confidence: 0.58,
                    uncertainty: 'llm_low_confidence',
                    evidenceSpans: [{ start: 8, end: 21, text: 'danach Aufbau' }],
                },
            ],
        });
        const result = await detectTreatmentIntents('Endo 46 danach Aufbau', { mockLlmContent: invalidPayload });
        expect(result.source).toBe('fallback');
        expect(result.diagnostics.some(item => item.startsWith('llm-schema-invalid'))).toBe(true);
    });

    it('falls back when llm payload has low confidence without uncertainty', async () => {
        const invalidPayload = JSON.stringify({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Kompositversorgung gelegt',
            needsConfirmation: true,
            intents: [
                {
                    intentId: 'a',
                    treatmentId: 'fuellung',
                    confidence: 0.41,
                    evidenceSpans: [{ start: 0, end: 18, text: 'Kompositversorgung' }],
                },
            ],
        });
        const result = await detectTreatmentIntents('Kompositversorgung gelegt', { mockLlmContent: invalidPayload });
        expect(result.source).toBe('fallback');
        expect(result.diagnostics.some(item => item.startsWith('llm-schema-invalid'))).toBe(true);
    });

    it('accepts gateway payload for browser-safe llm preanalysis', async () => {
        const llmPayload = JSON.stringify({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46 dann Aufbau.',
            needsConfirmation: false,
            intents: [
                {
                    intentId: 'gw-a',
                    treatmentId: 'endo',
                    tooth: '46',
                    confidence: 0.93,
                    evidenceSpans: [{ start: 0, end: 7, text: 'Endo 46' }],
                },
            ],
        });
        const result = await detectTreatmentIntents('Endo 46 dann Aufbau.', {
            llmGateway: async () => llmPayload,
        });
        expect(result.source).toBe('llm');
        expect(result.bundle.intents).toHaveLength(1);
    });

    it('falls back when gateway throws', async () => {
        const result = await detectTreatmentIntents('Endo 46 danach Aufbau.', {
            llmGateway: async () => {
                throw new Error('gateway-unavailable');
            },
        });
        expect(result.source).toBe('fallback');
        expect(result.diagnostics.some(item => item.includes('gateway-unavailable'))).toBe(true);
    });

    it('overrides llm payload when extraction signal is present but extraction intent is missing', async () => {
        const dictation = 'Extraktion Zahn 28 nach Luxation mit Infiltrationsanästhesie; danach Füllung Zahn 16 okklusal mit Komposit.';
        const llmPayload = JSON.stringify({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation,
            needsConfirmation: false,
            intents: [
                {
                    intentId: 'a',
                    treatmentId: 'fuellung',
                    tooth: '28',
                    confidence: 0.81,
                    evidenceSpans: [{ start: 0, end: dictation.length, text: dictation }],
                },
                {
                    intentId: 'b',
                    treatmentId: 'fuellung',
                    tooth: '16',
                    confidence: 0.79,
                    evidenceSpans: [{ start: 0, end: dictation.length, text: dictation }],
                },
            ],
        });

        const result = await detectTreatmentIntents(dictation, { mockLlmContent: llmPayload });
        expect(result.source).toBe('fallback');
        expect(result.bundle.intents.some(intent => intent.treatmentId === 'extraction')).toBe(true);
        expect(result.diagnostics).toContain('llm-missed-extraction:fallback-override');
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
                if (check.uncertainty) expect(intent.uncertainty).toBe(check.uncertainty);
            });
        }
    });

    it('adds diagnostics when tooth is inferred from context', async () => {
        const result = await detectTreatmentIntents(
            'Endo 46 abgeschlossen, danach adhäsiver Kompositaufbau.',
            { forceFallback: true }
        );
        expect(result.needsConfirmation).toBe(true);
        expect(result.diagnostics).toContain('tooth-inferred-from-context');
    });

    it('treats explicit same-tooth phrasing as deterministic (no uncertainty)', async () => {
        const result = await detectTreatmentIntents(
            'Endo 46 abgeschlossen, danach adhäsiver Kompositaufbau am selben Zahn.',
            { forceFallback: true }
        );
        expect(result.needsConfirmation).toBe(false);
        expect(result.bundle.intents).toHaveLength(2);
        expect(result.bundle.intents[1]?.tooth).toBe('46');
        expect(result.bundle.intents[1]?.uncertainty).toBeUndefined();
        expect(result.diagnostics).toContain('tooth-linked-explicit-same-context');
    });

    it('forces confirmation when no tooth reference exists', async () => {
        const result = await detectTreatmentIntents(
            'Adhaesive Kompositversorgung gelegt, Kofferdam verwendet.',
            { forceFallback: true }
        );
        expect(result.needsConfirmation).toBe(true);
        expect(result.bundle.intents[0]?.uncertainty).toBe('missing_tooth_reference');
        expect(result.diagnostics).toContain('tooth-missing-reference');
    });

    it('keeps extraction intent when segment contains provisional wording', async () => {
        const result = await detectTreatmentIntents(
            'Extraktion Zahn 28 mit Luxation, anschliessend Provisorium zur Wundabdeckung.',
            { forceFallback: true }
        );
        expect(result.bundle.intents[0]?.treatmentId).toBe('extraction');
    });

    it('collapses duplicate fallback intents for same tooth+treatment', async () => {
        const dictation = 'Heute Stelle 14 okklusal mit Komposit unter Kofferdam, danach Füllung nachpoliert und Okklusion kontrolliert.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });
        const keys = result.bundle.intents.map(intent => `${intent.treatmentId}::${intent.tooth ?? 'unknown'}`);
        const uniqueKeys = new Set(keys);
        expect(keys.length).toBe(uniqueKeys.size);
        expect(uniqueKeys.has('fuellung::14')).toBe(true);
        const tooth14 = result.bundle.intents.find(intent => intent.treatmentId === 'fuellung' && intent.tooth === '14');
        expect(tooth14?.uncertainty).toBe('inferred_tooth_from_context');
        expect(result.diagnostics.some(item => item.startsWith('duplicate-intent-collapsed:fuellung::14'))).toBe(true);
        expect(result.needsConfirmation).toBe(true);
    });

    it('collapses duplicate llm intents for same tooth+treatment', async () => {
        const dictation = 'Füllung Zahn 14 und 36.';
        const llmPayload = JSON.stringify({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation,
            needsConfirmation: false,
            intents: [
                {
                    intentId: 'llm-a',
                    treatmentId: 'fuellung',
                    tooth: '14',
                    confidence: 0.67,
                    evidenceSpans: [{ start: 0, end: 12, text: 'Füllung Zahn' }],
                },
                {
                    intentId: 'llm-b',
                    treatmentId: 'fuellung',
                    tooth: '14',
                    confidence: 0.88,
                    evidenceSpans: [{ start: 0, end: dictation.length, text: dictation }],
                },
                {
                    intentId: 'llm-c',
                    treatmentId: 'fuellung',
                    tooth: '36',
                    confidence: 0.83,
                    evidenceSpans: [{ start: 13, end: dictation.length, text: '14 und 36.' }],
                },
            ],
        });
        const result = await detectTreatmentIntents(dictation, { mockLlmContent: llmPayload });
        expect(result.source).toBe('llm');
        expect(result.bundle.intents).toHaveLength(2);
        expect(result.bundle.intents.some(intent => intent.tooth === '14')).toBe(true);
        expect(result.bundle.intents.some(intent => intent.tooth === '36')).toBe(true);
        expect(result.diagnostics.some(item => item.startsWith('duplicate-intent-collapsed:fuellung::14'))).toBe(true);
        expect(result.needsConfirmation).toBe(false);
    });

    it('skips low-confidence noise segments without treatment signal after first intent', async () => {
        const dictation = 'Füllung Zahn 36 okklusal mit Komposit, danach Bisskontrolle durchgeführt und Verlauf reizlos.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });
        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('fuellung');
        expect(result.bundle.intents[0]?.tooth).toBe('36');
        expect(result.diagnostics).toContain('segment-skipped-no-treatment-signal:2');
    });

    it('keeps cross-clause tooth context unresolved when previous clause contains multiple teeth', async () => {
        const dictation = 'Fuellung Zahn 36 und Zahn 14 okklusal mit Komposit, danach adhaesiver Aufbau mit Komposit.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.needsConfirmation).toBe(true);
        expect(result.bundle.intents.map(intent => `${intent.treatmentId}:${intent.tooth ?? 'unknown'}`)).toEqual([
            'fuellung:36',
            'fuellung:14',
            'fuellung:unknown',
        ]);
        const unresolvedFollowup = result.bundle.intents.find(intent => !intent.tooth);
        expect(unresolvedFollowup?.uncertainty).toBe('llm_ambiguous_mapping');
        expect(result.diagnostics).toContain('tooth-context-ambiguous');
    });

    it('detects deterministic triple overlap for crown + build-up + extraction', async () => {
        const dictation = 'Zahn 16 fuer Krone beschliffen, supragingival praepariert, danach am selben Zahn adhaesiver Aufbau mit Komposit; zusaetzlich Extraktion Zahn 28 mit Nahtversorgung.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.needsConfirmation).toBe(false);
        expect(result.bundle.intents).toHaveLength(3);
        expect(result.bundle.intents.map(intent => `${intent.treatmentId}:${intent.tooth}`)).toEqual([
            'crown_prep:16',
            'fuellung:16',
            'extraction:28',
        ]);
        expect(result.diagnostics).toContain('tooth-linked-explicit-same-context');
    });

    it('forces confirmation for ambiguous single-clause overlap instead of silently dropping treatment', async () => {
        const dictation = 'Zahn 16 Krone beschliffen mit adhaesivem Kompositaufbau in derselben Sitzung.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.needsConfirmation).toBe(true);
        expect(result.bundle.intents.map(intent => `${intent.treatmentId}:${intent.tooth}`)).toEqual([
            'crown_prep:16',
            'fuellung:16',
        ]);
        expect(result.bundle.intents.every(intent => intent.uncertainty === 'llm_ambiguous_mapping')).toBe(true);
        expect(result.diagnostics.some(item => item.startsWith('segment-multi-treatment-signals:1:'))).toBe(true);
    });
});
