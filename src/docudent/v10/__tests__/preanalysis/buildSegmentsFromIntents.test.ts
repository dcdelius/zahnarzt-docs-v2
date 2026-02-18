import { describe, expect, it } from 'vitest';
import { buildSegmentsFromIntents } from '../../preanalysis/buildSegmentsFromIntents';
import { TREATMENT_INTENT_CONTRACT_VERSION } from '../../preanalysis/treatmentIntentContract';

describe('buildSegmentsFromIntents', () => {
    it('maps intents to deterministic segment runs with focused dictation + hints', () => {
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
        expect(segments[0].dictation).toContain('Endo 46');
        expect(segments[1].dictation).toContain('Aufbau');
        expect(segments[0].instances[0].preanalysisHints?.intentId).toBe('endo-46');
        expect(segments[1].instances[0].preanalysisHints?.intentId).toBe('fuellung-46');
    });

    it('focuses dictation per tooth when one evidence span contains multiple teeth', () => {
        const dictation = 'Heute zwei Stellen: 36 OD mit Komposit unter Kofferdam und 14 okklusal ebenfalls versorgt, danach Bisskontrolle.';
        const segments = buildSegmentsFromIntents({
            bundle: {
                version: TREATMENT_INTENT_CONTRACT_VERSION,
                dictation,
                intents: [
                    {
                        intentId: 'seg-1-1-1',
                        treatmentId: 'fuellung',
                        tooth: '36',
                        confidence: 0.68,
                        evidenceSpans: [{ start: 0, end: 70, text: 'Heute zwei Stellen: 36 OD mit Komposit unter Kofferdam und 14 okklusal' }],
                    },
                    {
                        intentId: 'seg-1-1-2',
                        treatmentId: 'fuellung',
                        tooth: '14',
                        confidence: 0.68,
                        evidenceSpans: [{ start: 0, end: 70, text: 'Heute zwei Stellen: 36 OD mit Komposit unter Kofferdam und 14 okklusal' }],
                    },
                ],
            },
            insuranceType: 'GKV',
            textLength: 'kurz',
        });

        expect(segments).toHaveLength(2);
        expect(segments[0].dictation).toContain('36');
        expect(segments[0].dictation).not.toContain('14');
        expect(segments[1].dictation).toContain('14');
        expect(segments[1].dictation).not.toContain('36');
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

    it('maps sharedFacts to extraction-mentioned hints', () => {
        const segments = buildSegmentsFromIntents({
            bundle: {
                version: TREATMENT_INTENT_CONTRACT_VERSION,
                dictation: 'Revision Endo Zahn 36, Spuelung mit NaOCl und EDTA, 3 Kanaele, Ledermix.',
                intents: [
                    {
                        intentId: 'endo-36',
                        treatmentId: 'endo',
                        tooth: '36',
                        confidence: 0.91,
                        phase: 'revision',
                        step: 'irrigation',
                        sharedFacts: {
                            workingLengthMethod: 'electronic',
                            canalCount: 3,
                            irrigationSolutions: ['NaOCl', 'EDTA'],
                            medication: 'Ledermix',
                            mkv: false,
                            finishing: true,
                            okklusion: true,
                            politur: true,
                        },
                        evidenceSpans: [{ start: 0, end: 75, text: 'Revision Endo Zahn 36, Spuelung mit NaOCl und EDTA, 3 Kanaele, Ledermix.' }],
                    },
                ],
            },
            insuranceType: 'PKV',
            textLength: 'lang',
        });

        expect(segments).toHaveLength(1);
        const hints = segments[0].instances[0].preanalysisHints;
        expect(hints?.mentioned?.wl_method).toBe('electronic');
        expect(hints?.mentioned?.root_canals).toBe(3);
        expect(hints?.mentioned?.irrigation_solutions).toEqual(['NaOCl', 'EDTA']);
        expect(hints?.mentioned?.finishing).toBe(true);
        expect(hints?.mentioned?.okklusion).toBe(true);
        expect(hints?.mentioned?.politur).toBe(true);
        expect(hints?.step).toBe('irrigation');
        expect(hints?.phase).toBe('revision');
    });
});
