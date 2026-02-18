import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractFromDictation } from '../extractionService';

const originalOpenAiKey = process.env.OPENAI_API_KEY;
const originalViteOpenAiKey = process.env.VITE_OPENAI_API_KEY;
const originalReactOpenAiKey = process.env.REACT_APP_OPENAI_API_KEY;
const originalFetch = globalThis.fetch;

afterEach(() => {
    process.env.OPENAI_API_KEY = originalOpenAiKey;
    process.env.VITE_OPENAI_API_KEY = originalViteOpenAiKey;
    process.env.REACT_APP_OPENAI_API_KEY = originalReactOpenAiKey;
    globalThis.fetch = originalFetch;
});

describe('extractFromDictation - tooth extraction hardening', () => {
    it('does not infer phantom tooth numbers from endo canal values', async () => {
        process.env.OPENAI_API_KEY = '';
        process.env.VITE_OPENAI_API_KEY = '';
        process.env.REACT_APP_OPENAI_API_KEY = '';
        const dictation = 'Zahn 36. Zweiter Termin. Kein Kofferdam möglich wegen Kronenrand. Arbeitslängen per Apex Locator: MB 20, ML 19, D 21. ISO 30. Maschinell aufbereitet. NaOCl + EDTA Spülung. Einlage CaOH2.';
        const result = await extractFromDictation(dictation);

        expect(result.teeth).toContain('36');
        expect(result.teeth).not.toContain('21');
        expect(result.teeth).not.toContain('20');
        expect(result.teeth).not.toContain('19');
    });

    it('keeps explicit tooth references even if the same value appears as canal length', async () => {
        process.env.OPENAI_API_KEY = '';
        process.env.VITE_OPENAI_API_KEY = '';
        process.env.REACT_APP_OPENAI_API_KEY = '';
        const dictation = 'Endo Zahn 21. Arbeitslängen per Apex Locator: MB 20, D 21. NaOCl Spülung.';
        const result = await extractFromDictation(dictation);

        expect(result.teeth).toContain('21');
    });

    it('uses VITE_OPENAI_API_KEY as runtime fallback key in node extraction path', async () => {
        process.env.OPENAI_API_KEY = '';
        process.env.VITE_OPENAI_API_KEY = 'vite-test-key';
        process.env.REACT_APP_OPENAI_API_KEY = '';

        const fetchSpy = vi.fn(async () => ({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: '{"tooth":"11","teeth":["11"],"surfaces":["o"]}' } }],
            }),
        }));
        globalThis.fetch = fetchSpy as unknown as typeof fetch;

        const result = await extractFromDictation('Zahn 11 okklusal versorgt.');

        expect((result as Record<string, unknown>)._extractionMethod).toBe('llm');
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const request = fetchSpy.mock.calls[0]?.[1] as { headers?: Record<string, string> } | undefined;
        expect(request?.headers?.Authorization).toContain('vite-test-key');
    });

    it('normalizes reasoned LLM extraction hints into extraction payload', async () => {
        process.env.OPENAI_API_KEY = '';
        process.env.VITE_OPENAI_API_KEY = 'vite-test-key';
        process.env.REACT_APP_OPENAI_API_KEY = '';

        const fetchSpy = vi.fn(async () => ({
            ok: true,
            json: async () => ({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            tooth: '36',
                            teeth: ['36'],
                            surfaces: ['o'],
                            reasoning: {
                                version: 'v1',
                                intentHints: [
                                    {
                                        treatmentId: 'endo',
                                        confidence: 0.88,
                                        basis: 'explicit',
                                        evidence: ['Trepanation und NaOCl-Spuelung'],
                                        step: 'irrigation',
                                    }
                                ],
                                factHints: [
                                    {
                                        key: 'working_length',
                                        value: 'MB 20 / ML 19 / D 21',
                                        confidence: 0.84,
                                        basis: 'explicit',
                                        evidence: ['Arbeitslaengen per Apex-Lokator'],
                                    }
                                ],
                                forensicNotes: ['Patient berichtet weiterhin Klopfschmerz trotz Vorbehandlung'],
                                unresolved: ['Arbeitslaengen-Methode bestaetigen'],
                            },
                        }),
                    },
                }],
            }),
        }));
        globalThis.fetch = fetchSpy as unknown as typeof fetch;

        const result = await extractFromDictation('Endo Zahn 36, NaOCl, Arbeitslaengen bestimmt.');

        expect(result.reasoning?.version).toBe('v1');
        expect(result.reasoning?.intentHints?.[0]?.treatmentId).toBe('endo');
        expect(result.reasoning?.factHints?.[0]?.key).toBe('working_length');
        expect(result.reasoning?.forensicNotes?.length).toBe(1);
        expect(result.reasoning?.unresolved?.length).toBe(1);
    });

    it('preserves free-text context strings as single entries (no word-splitting)', async () => {
        process.env.OPENAI_API_KEY = '';
        process.env.VITE_OPENAI_API_KEY = 'vite-test-key';
        process.env.REACT_APP_OPENAI_API_KEY = '';

        const fetchSpy = vi.fn(async () => ({
            ok: true,
            json: async () => ({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            tooth: '24',
                            teeth: ['24'],
                            surfaces: ['m', 'o', 'd'],
                            klinischeZusatzinfos: 'Antikoagulation mit Apixaban, morgen Kontrolle INR-Ersatzwert',
                            patientenangaben: 'Patient berichtet seit letzter Fuellung persistierende Empfindlichkeit an Zahn 36',
                            reasoning: {
                                version: 'v1',
                                forensicNotes: 'Belastung durch familiaeres Ereignis',
                            },
                        }),
                    },
                }],
            }),
        }));
        globalThis.fetch = fetchSpy as unknown as typeof fetch;

        const result = await extractFromDictation('Zahn 24 MOD Füllung, Kontextangaben vorhanden.');

        expect(result.klinischeZusatzinfos).toEqual([
            'Antikoagulation mit Apixaban, morgen Kontrolle INR-Ersatzwert',
        ]);
        expect(result.patientenangaben).toEqual([
            'Patient berichtet seit letzter Fuellung persistierende Empfindlichkeit an Zahn 36',
        ]);
        expect(result.reasoning?.forensicNotes).toEqual([
            'Belastung durch familiaeres Ereignis',
        ]);
    });

    it('keeps llm extraction active when reasoning contains nullable/partial hint payload', async () => {
        process.env.OPENAI_API_KEY = '';
        process.env.VITE_OPENAI_API_KEY = 'vite-test-key';
        process.env.REACT_APP_OPENAI_API_KEY = '';

        const fetchSpy = vi.fn(async () => ({
            ok: true,
            json: async () => ({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            tooth: '36',
                            teeth: ['36'],
                            surfaces: ['o'],
                            reasoning: {
                                intentHints: [
                                    {
                                        treatmentId: null,
                                        confidence: 0.9,
                                        basis: 'explicit',
                                        evidence: ['Implantat inseriert'],
                                    },
                                ],
                                factHints: [
                                    {
                                        key: null,
                                        value: 'ignored',
                                        confidence: 0.7,
                                        basis: 'explicit',
                                        evidence: ['unspecific'],
                                    },
                                ],
                                forensicNotes: ['Kontext bleibt erhalten'],
                                unresolved: [],
                            },
                        }),
                    },
                }],
            }),
        }));
        globalThis.fetch = fetchSpy as unknown as typeof fetch;

        const result = await extractFromDictation('Zahn 36 okklusal versorgt, Kontext genannt.');

        expect((result as Record<string, unknown>)._extractionMethod).toBe('llm');
        expect(result.tooth).toBe('36');
        expect(result.reasoning?.forensicNotes).toContain('Kontext bleibt erhalten');
        expect(result.reasoning?.intentHints?.length ?? 0).toBe(0);
        expect(result.reasoning?.factHints?.length ?? 0).toBe(0);
    });
});
