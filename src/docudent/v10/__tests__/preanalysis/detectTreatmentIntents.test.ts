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

    it('overrides llm treatment when deterministic evidence signal is unique', async () => {
        const dictation = 'Implantatinsertion regio 36 nach DVT-Planung.';
        const llmPayload = JSON.stringify({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation,
            needsConfirmation: false,
            intents: [
                {
                    intentId: 'wrong-1',
                    treatmentId: 'fuellung',
                    tooth: '36',
                    confidence: 0.95,
                    evidenceSpans: [{ start: 0, end: 26, text: 'Implantatinsertion regio 36' }],
                },
            ],
        });

        const result = await detectTreatmentIntents(dictation, { mockLlmContent: llmPayload });
        expect(result.source).toBe('llm');
        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('implant');
        expect(result.diagnostics.some(item => item.startsWith('llm-treatment-overridden-by-signal:wrong-1:fuellung->implant'))).toBe(true);
    });

    it('prunes llm phantom tooth intents created from root-canal length values', async () => {
        const dictation = 'Zahn 36. Zweiter Termin. Kein Kofferdam möglich wegen Kronenrand. Arbeitslängen per Apex Locator: MB 20, ML 19, D 21. ISO 30. Maschinell aufbereitet. NaOCl + EDTA Spülung. Einlage CaOH2.';
        const llmPayload = JSON.stringify({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation,
            needsConfirmation: false,
            intents: [
                {
                    intentId: 'endo-36',
                    treatmentId: 'endo',
                    tooth: '36',
                    confidence: 0.9,
                    evidenceSpans: [{ start: 0, end: 7, text: 'Zahn 36' }],
                },
                {
                    intentId: 'endo-21-phantom',
                    treatmentId: 'endo',
                    tooth: '21',
                    confidence: 0.88,
                    evidenceSpans: [{ start: 94, end: 99, text: 'D 21.' }],
                },
            ],
        });

        const result = await detectTreatmentIntents(dictation, { mockLlmContent: llmPayload });
        expect(result.source).toBe('llm');
        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('endo');
        expect(result.bundle.intents[0]?.tooth).toBe('36');
        expect(result.diagnostics.some(item => item.startsWith('root-canal-value-tooth-artifact-pruned:'))).toBe(true);
    });

    it('falls back when llm payload is invalid', async () => {
        const invalidPayload = '{"foo":"bar"}';
        const result = await detectTreatmentIntents('Endo 46 danach Aufbau.', { mockLlmContent: invalidPayload });
        expect(result.source).toBe('fallback');
        expect(result.bundle.intents.length).toBeGreaterThan(0);
        expect(result.diagnostics.some(item => item.startsWith('llm-schema-invalid'))).toBe(true);
    });

    it('auto-repairs llm payload when uncertainty exists but needsConfirmation is false', async () => {
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
        expect(result.source).toBe('llm');
        expect(result.needsConfirmation).toBe(true);
        expect(result.bundle.intents[1]?.uncertainty).toBe('llm_low_confidence');
    });

    it('auto-repairs llm low confidence payload by assigning uncertainty', async () => {
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
        expect(result.source).toBe('llm');
        expect(result.needsConfirmation).toBe(true);
        expect(result.bundle.intents[0]?.uncertainty).toBe('missing_tooth_reference');
    });

    it('sanitizes empty optional llm fields instead of falling back', async () => {
        const dictation = 'Extraktion Zahn 28 nach Luxation; danach Füllung Zahn 16 okklusal mit Komposit.';
        const llmPayload = JSON.stringify({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation,
            needsConfirmation: false,
            intents: [
                {
                    intentId: 1,
                    treatmentId: 'extraction',
                    tooth: '28',
                    phase: ' ',
                    step: '',
                    confidence: '1.0',
                    uncertainty: '',
                    evidenceSpans: [{ start: '0', end: '29', text: 'Extraktion Zahn 28 nach Luxation' }],
                },
                {
                    intentId: '2',
                    treatmentId: 'fuellung',
                    tooth: '16',
                    confidence: '0.9',
                    uncertainty: '',
                    evidenceSpans: [{ start: '39', end: '78', text: 'Füllung Zahn 16 okklusal mit Komposit' }],
                },
            ],
        });

        const result = await detectTreatmentIntents(dictation, { mockLlmContent: llmPayload });
        expect(result.source).toBe('llm');
        expect(result.bundle.intents).toHaveLength(2);
        expect(result.bundle.intents.every(intent => !intent.uncertainty)).toBe(true);
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

    it('retries gateway once before falling back', async () => {
        const llmPayload = JSON.stringify({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46 dann Aufbau.',
            needsConfirmation: false,
            intents: [
                {
                    intentId: 'retry-a',
                    treatmentId: 'endo',
                    tooth: '46',
                    confidence: 0.9,
                    evidenceSpans: [{ start: 0, end: 7, text: 'Endo 46' }],
                },
            ],
        });

        let attempts = 0;
        const result = await detectTreatmentIntents('Endo 46 dann Aufbau.', {
            llmGateway: async () => {
                attempts += 1;
                if (attempts === 1) throw new Error('gateway-timeout');
                return llmPayload;
            },
        });

        expect(result.source).toBe('llm');
        expect(attempts).toBe(2);
        expect(result.diagnostics).toContain('llm-retry:attempt2');
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
        expect(result.source).toBe('llm');
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

    it('detects teilprothese deterministically in fallback', async () => {
        const result = await detectTreatmentIntents(
            'Modellgussprothese im Unterkiefer eingegliedert und Druckstellen kontrolliert.',
            { forceFallback: true }
        );
        expect(result.bundle.intents[0]?.treatmentId).toBe('teilprothese');
    });

    it('detects totalprothese deterministically in fallback', async () => {
        const result = await detectTreatmentIntents(
            'Konventionelle Totalprothese im Oberkiefer eingegliedert, zahnloser Kiefer versorgt.',
            { forceFallback: true }
        );
        expect(result.bundle.intents[0]?.treatmentId).toBe('totalprothese');
    });

    it('detects pzr deterministically in fallback', async () => {
        const result = await detectTreatmentIntents(
            'Professionelle Zahnreinigung durchgeführt, Zahnstein entfernt und Fluoridierung erfolgt.',
            { forceFallback: true }
        );
        expect(result.bundle.intents[0]?.treatmentId).toBe('pzr');
    });

    it('does not add phantom fuellung for isolated fissurenversiegelung wording', async () => {
        const result = await detectTreatmentIntents(
            'Fissurenversiegelung an Zahn 16 zur Kariesprophylaxe mit Kunststoff durchgefuehrt.',
            { forceFallback: true }
        );
        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('fissurenversiegelung');
        expect(result.bundle.intents[0]?.tooth).toBe('16');
        expect(result.needsConfirmation).toBe(false);
    });

    it('keeps explicit fuellung when fissuren and fuellung are both clearly dictated', async () => {
        const result = await detectTreatmentIntents(
            'Fissurenversiegelung an Zahn 16, danach Füllung Zahn 14 okklusal mit Komposit.',
            { forceFallback: true }
        );
        expect(result.bundle.intents).toHaveLength(2);
        expect(result.bundle.intents[0]?.treatmentId).toBe('fissurenversiegelung');
        expect(result.bundle.intents[0]?.tooth).toBe('16');
        expect(result.bundle.intents[1]?.treatmentId).toBe('fuellung');
        expect(result.bundle.intents[1]?.tooth).toBe('14');
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
        expect(result.diagnostics).toContain('segment-context-note-attached:2');
        const sharedFacts = result.bundle.intents[0]?.sharedFacts as Record<string, unknown> | undefined;
        const forensicNotes = Array.isArray(sharedFacts?.forensicNotes) ? sharedFacts?.forensicNotes as string[] : [];
        expect(forensicNotes.some(note => note.toLowerCase().includes('bisskontrolle'))).toBe(true);
        expect(sharedFacts?.finishing).toBe(true);
    });

    it('demotes historical symptom-only clause to forensic context instead of creating phantom treatment', async () => {
        const dictation = 'Bei Zahn 24 heute MOD-Kompositfuellung gelegt. Patient berichtet, Zahn 36 seit letzter Fuellung weiter temperaturempfindlich.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('fuellung');
        expect(result.bundle.intents[0]?.tooth).toBe('24');
        const sharedFacts = result.bundle.intents[0]?.sharedFacts as Record<string, unknown> | undefined;
        const forensicNotes = Array.isArray(sharedFacts?.forensicNotes) ? sharedFacts?.forensicNotes as string[] : [];
        expect(forensicNotes.some(note => note.toLowerCase().includes('seit letzter fuellung'))).toBe(true);
        expect(result.diagnostics.some(item => item.startsWith('historical-context-intent-demoted:'))).toBe(true);
    });

    it('demotes historical symptom-only llm intent and keeps active treatment intent', async () => {
        const dictation = 'Heute Füllung Zahn 24 MOD gelegt. Zahn 36 seit letzter Füllung empfindlich.';
        const llmPayload = JSON.stringify({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation,
            needsConfirmation: false,
            intents: [
                {
                    intentId: 'llm-active',
                    treatmentId: 'fuellung',
                    tooth: '24',
                    confidence: 0.91,
                    evidenceSpans: [{ start: 0, end: 33, text: 'Heute Füllung Zahn 24 MOD gelegt.' }],
                },
                {
                    intentId: 'llm-historical',
                    treatmentId: 'fuellung',
                    tooth: '36',
                    confidence: 0.74,
                    evidenceSpans: [{ start: 34, end: dictation.length, text: 'Zahn 36 seit letzter Füllung empfindlich.' }],
                },
            ],
        });

        const result = await detectTreatmentIntents(dictation, { mockLlmContent: llmPayload });
        expect(result.source).toBe('llm');
        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.tooth).toBe('24');
        expect(result.diagnostics.some(item => item.startsWith('historical-context-intent-demoted:llm-historical'))).toBe(true);
    });

    it('demotes context-only family history clause instead of creating phantom treatment intent', async () => {
        const dictation = 'Untersuchung ohne akuten Interventionsbedarf. Familiaere Parodontitis Vorgeschichte wurde berichtet.';
        const llmPayload = JSON.stringify({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation,
            needsConfirmation: false,
            intents: [
                {
                    intentId: 'llm-untersuchung',
                    treatmentId: 'untersuchung',
                    tooth: '11',
                    confidence: 0.86,
                    evidenceSpans: [{ start: 0, end: 46, text: 'Untersuchung ohne akuten Interventionsbedarf.' }],
                },
                {
                    intentId: 'llm-phantom-paro',
                    treatmentId: 'parodontologie',
                    confidence: 0.74,
                    uncertainty: 'missing_tooth_reference',
                    evidenceSpans: [{ start: 47, end: dictation.length, text: 'Familiaere Parodontitis Vorgeschichte wurde berichtet.' }],
                },
            ],
        });

        const result = await detectTreatmentIntents(dictation, { mockLlmContent: llmPayload });
        expect(result.source).toBe('llm');
        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('untersuchung');
        expect(result.diagnostics.some(item => item.startsWith('historical-context-intent-demoted:llm-phantom-paro'))).toBe(true);
    });

    it('remaps llm crown_prep to krone when evidence describes definitive crown insertion', async () => {
        const dictation = 'Die definitive Krone an Zahn 16 wurde eingesetzt und okklusal feinadjustiert.';
        const llmPayload = JSON.stringify({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation,
            needsConfirmation: false,
            intents: [
                {
                    intentId: 'llm-crown-wrong',
                    treatmentId: 'crown_prep',
                    tooth: '16',
                    confidence: 0.9,
                    evidenceSpans: [{ start: 0, end: dictation.length, text: dictation }],
                },
            ],
        });

        const result = await detectTreatmentIntents(dictation, { mockLlmContent: llmPayload });
        expect(result.source).toBe('llm');
        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('krone');
        expect(result.diagnostics.some(item => item.startsWith('llm-treatment-overridden-by-prosthetic-step:llm-crown-wrong:crown_prep->krone'))).toBe(true);
    });

    it('remaps llm crown_prep to krone when evidence only says definitive crown (without insertion verb)', async () => {
        const dictation = 'Definitive Krone an Zahn 16, Okklusion feinadjustiert.';
        const llmPayload = JSON.stringify({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation,
            needsConfirmation: false,
            intents: [
                {
                    intentId: 'llm-crown-definitive',
                    treatmentId: 'crown_prep',
                    tooth: '16',
                    confidence: 0.84,
                    evidenceSpans: [{ start: 0, end: 29, text: 'Definitive Krone an Zahn 16' }],
                },
            ],
        });

        const result = await detectTreatmentIntents(dictation, { mockLlmContent: llmPayload });
        expect(result.source).toBe('llm');
        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('krone');
        expect(result.diagnostics.some(item => item.startsWith('llm-treatment-overridden-by-prosthetic-step:llm-crown-definitive:crown_prep->krone'))).toBe(true);
    });

    it('demotes ambiguous untoothed follow-up clause into existing tooth intents', async () => {
        const dictation = 'Fuellung Zahn 36 und Zahn 14 okklusal mit Komposit, danach adhaesiver Aufbau mit Komposit.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.needsConfirmation).toBe(false);
        expect(result.bundle.intents.map(intent => `${intent.treatmentId}:${intent.tooth ?? 'unknown'}`)).toEqual([
            'fuellung:36',
            'fuellung:14',
        ]);
        expect(result.bundle.intents.some(intent => !intent.tooth)).toBe(false);
        expect(result.diagnostics).toContain('tooth-context-ambiguous');
        expect(result.diagnostics.some(item => item.startsWith('ambiguous-untoothed-intent-demoted:'))).toBe(true);
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

    it('classifies WSR deterministically in fallback path', async () => {
        const dictation = 'Apektomie Zahn 11 durchgefuehrt.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('wsr');
        expect(result.bundle.intents[0]?.tooth).toBe('11');
        expect(result.needsConfirmation).toBe(false);
    });

    it('does not add phantom endo intent for isolated WSR dictation', async () => {
        const dictation = 'Wurzelspitzenresektion an Zahn 36 durch Osteotomie im Molarenbereich durchgefuehrt.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('wsr');
        expect(result.bundle.intents[0]?.tooth).toBe('36');
        expect(result.needsConfirmation).toBe(false);
    });

    it('keeps explicit endo plus wsr when both are clearly dictated', async () => {
        const dictation = 'Endo an Zahn 36 mit Wurzelkanalaufbereitung, danach Wurzelspitzenresektion an Zahn 36.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.bundle.intents).toHaveLength(2);
        expect(result.bundle.intents[0]?.treatmentId).toBe('endo');
        expect(result.bundle.intents[1]?.treatmentId).toBe('wsr');
        expect(result.bundle.intents[0]?.tooth).toBe('36');
        expect(result.bundle.intents[1]?.tooth).toBe('36');
    });

    it('classifies trauma deterministically in fallback path', async () => {
        const dictation = 'Zahntrauma Zahn 21, semipermanente Schienung angelegt.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('trauma');
        expect(result.bundle.intents[0]?.tooth).toBe('21');
        expect(result.needsConfirmation).toBe(false);
    });

    it('does not add phantom extraction intent for isolated trauma dictation', async () => {
        const dictation = 'Zahntrauma an Zahn 11 nach Luxation, semipermanente Schienung angelegt.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('trauma');
        expect(result.bundle.intents[0]?.tooth).toBe('11');
        expect(result.needsConfirmation).toBe(false);
    });

    it('keeps explicit extraction with trauma when both are clearly dictated', async () => {
        const dictation = 'Zahntrauma an Zahn 11 nach Luxation; Zahn 28 extrahiert und Alveole versorgt.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.bundle.intents).toHaveLength(2);
        expect(result.bundle.intents[0]?.treatmentId).toBe('trauma');
        expect(result.bundle.intents[1]?.treatmentId).toBe('extraction');
        expect(result.bundle.intents[0]?.tooth).toBe('11');
        expect(result.bundle.intents[1]?.tooth).toBe('28');
    });

    it('classifies implant deterministically in fallback path', async () => {
        const dictation = 'Implantatinsertion Zahn 36 durchgefuehrt.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('implant');
        expect(result.bundle.intents[0]?.tooth).toBe('36');
        expect(result.needsConfirmation).toBe(false);
    });

    it('classifies schiene deterministically in fallback path', async () => {
        const dictation = 'Okklusionsschiene an Zahn 16 eingegliedert, Nachkontrolle vereinbart.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('schiene');
        expect(result.bundle.intents[0]?.tooth).toBe('16');
        expect(result.needsConfirmation).toBe(false);
    });

    it('classifies bruecke deterministically in fallback path', async () => {
        const dictation = 'Definitive Bruecke an Zahn 36 eingegliedert und okklusal kontrolliert.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('bruecke');
        expect(result.bundle.intents[0]?.tooth).toBe('36');
        expect(result.needsConfirmation).toBe(false);
    });

    it('does not add phantom crown_prep intent for isolated crown placement dictation', async () => {
        const dictation = 'Vollkrone an Zahn 16 definitiv eingegliedert und okklusal kontrolliert.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('krone');
        expect(result.bundle.intents[0]?.tooth).toBe('16');
        expect(result.needsConfirmation).toBe(false);
    });

    it('keeps explicit crown_prep plus crown when both are clearly dictated', async () => {
        const dictation = 'Kronenpraeparation Zahn 16 mit Abformung, danach Vollkrone an Zahn 16 definitiv eingegliedert.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.bundle.intents).toHaveLength(2);
        expect(result.bundle.intents[0]?.treatmentId).toBe('crown_prep');
        expect(result.bundle.intents[1]?.treatmentId).toBe('krone');
        expect(result.bundle.intents[0]?.tooth).toBe('16');
        expect(result.bundle.intents[1]?.tooth).toBe('16');
    });

    it('does not add phantom crown_prep intent for isolated teilkrone placement dictation', async () => {
        const dictation = 'Teilkronenversorgung an Zahn 16, Teilkrone definitiv eingegliedert.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('teilkrone');
        expect(result.bundle.intents[0]?.tooth).toBe('16');
        expect(result.needsConfirmation).toBe(false);
    });

    it('keeps explicit crown_prep plus teilkrone when both are clearly dictated', async () => {
        const dictation = 'Kronenpraeparation Zahn 16 mit Abformung, danach Teilkrone an Zahn 16 definitiv eingegliedert.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.bundle.intents).toHaveLength(2);
        expect(result.bundle.intents[0]?.treatmentId).toBe('crown_prep');
        expect(result.bundle.intents[1]?.treatmentId).toBe('teilkrone');
        expect(result.bundle.intents[0]?.tooth).toBe('16');
        expect(result.bundle.intents[1]?.tooth).toBe('16');
    });

    it('does not infer phantom teeth from torque units like Ncm', async () => {
        const dictation = 'Implantatinsertion regio 36 mit Primaerstabilitaet 35 Ncm und Nachsorge.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('implant');
        expect(result.bundle.intents[0]?.tooth).toBe('36');
    });

    it('keeps explicit tooth reference even when the same value appears as root-canal length', async () => {
        const dictation = 'Endo Zahn 21. Arbeitslängen per Apex Locator: MB 20, D 21. NaOCl Spülung.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.bundle.intents).toHaveLength(1);
        expect(result.bundle.intents[0]?.treatmentId).toBe('endo');
        expect(result.bundle.intents[0]?.tooth).toBe('21');
    });

    it('does not infer phantom tooth 21 from root-canal values in fallback endo dictation', async () => {
        const dictation = 'Zahn 36. Zweiter Termin. Kein Kofferdam möglich wegen Kronenrand. Arbeitslängen per Apex Locator: MB 20, ML 19, D 21. ISO 30. Maschinell aufbereitet. NaOCl + EDTA Spülung. Einlage CaOH2.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        const mapped = result.bundle.intents.map(intent => `${intent.treatmentId}:${intent.tooth ?? 'unknown'}`);
        expect(mapped).toContain('endo:36');
        expect(mapped.some(entry => entry.endsWith(':21'))).toBe(false);
        expect(result.diagnostics.some(item => item.startsWith('root-canal-value-tooth-artifact-pruned:'))).toBe(false);
    });

    it('skips insurance-only preface segment and keeps crown_prep plus roentgen without phantom fuellung', async () => {
        const dictation = 'PKV. Zahn 11 wurde fuer eine Krone praepariert, abgeformt und provisorisch versorgt; zusaetzlich wurde ein OPG zur Therapieplanung angefertigt.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        const mapped = result.bundle.intents.map(intent => intent.treatmentId);
        expect(mapped).toContain('crown_prep');
        expect(mapped).toContain('roentgen');
        expect(mapped).not.toContain('fuellung');
    });
});
