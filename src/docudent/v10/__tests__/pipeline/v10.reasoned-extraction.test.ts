import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('runV10 reasoned extraction wiring', () => {
    it('exposes reasoned extraction summary in meta/trace', async () => {
        const prevOpenAi = process.env.OPENAI_API_KEY;
        const prevViteOpenAi = process.env.VITE_OPENAI_API_KEY;
        const prevReactOpenAi = process.env.REACT_APP_OPENAI_API_KEY;
        delete process.env.OPENAI_API_KEY;
        delete process.env.VITE_OPENAI_API_KEY;
        delete process.env.REACT_APP_OPENAI_API_KEY;
        try {
            const result = await runV10({
                dictation: 'Endo Zahn 36, NaOCl-Spuelung, Arbeitslaenge per Apex-Lokator.',
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'mittel',
                preExtracted: {
                    tooth: '36',
                    teeth: ['36'],
                    surfaces: [],
                    diagnosis: null,
                    mentioned: {},
                    reasoning: {
                        version: 'v1',
                        intentHints: [
                            {
                                treatmentId: 'endo',
                                confidence: 0.91,
                                basis: 'explicit',
                                evidence: ['Endo Zahn 36'],
                                step: 'irrigation',
                            },
                        ],
                        factHints: [
                            {
                                key: 'working_length',
                                value: 'MB 20 / ML 19 / D 21',
                                confidence: 0.86,
                                basis: 'explicit',
                                evidence: ['Arbeitslaenge per Apex-Lokator'],
                            },
                        ],
                        forensicNotes: ['Patient berichtet persistierenden Klopfschmerz nach Vorbehandlung'],
                        unresolved: ['Arbeitslaengen-Methode bestaetigen'],
                    },
                },
            });

            expect(result.meta.reasonedExtraction).toBeDefined();
            expect(result.meta.reasonedExtraction?.intentHints).toBe(1);
            expect(result.meta.reasonedExtraction?.factHints).toBe(1);
            expect(result.meta.reasonedExtraction?.appliedKeys).toContain('mentioned.working_length');
            expect(result.meta.reasonedExtraction?.appliedKeys).toContain('mentioned.endo_step');
            expect(result.meta.traceLines?.some(line => line.includes('reasonedHints=2'))).toBe(true);
        } finally {
            if (prevOpenAi === undefined) delete process.env.OPENAI_API_KEY;
            else process.env.OPENAI_API_KEY = prevOpenAi;
            if (prevViteOpenAi === undefined) delete process.env.VITE_OPENAI_API_KEY;
            else process.env.VITE_OPENAI_API_KEY = prevViteOpenAi;
            if (prevReactOpenAi === undefined) delete process.env.REACT_APP_OPENAI_API_KEY;
            else process.env.REACT_APP_OPENAI_API_KEY = prevReactOpenAi;
        }
    });

    it('uses inferred/unresolved reasoned hints to trigger targeted askbacks', async () => {
        const prevOpenAi = process.env.OPENAI_API_KEY;
        const prevViteOpenAi = process.env.VITE_OPENAI_API_KEY;
        const prevReactOpenAi = process.env.REACT_APP_OPENAI_API_KEY;
        delete process.env.OPENAI_API_KEY;
        delete process.env.VITE_OPENAI_API_KEY;
        delete process.env.REACT_APP_OPENAI_API_KEY;
        try {
            const result = await runV10({
                dictation: 'Endo Zahn 36, Spuelung dokumentiert, Technik unklar.',
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'mittel',
                preExtracted: {
                    tooth: '36',
                    teeth: ['36'],
                    surfaces: [],
                    diagnosis: null,
                    mentioned: {},
                    reasoning: {
                        version: 'v1',
                        factHints: [
                            {
                                key: 'wf_technique',
                                value: 'warm',
                                confidence: 0.9,
                                basis: 'inferred',
                                evidence: ['Technik klingt nach warm, aber unsicher'],
                            },
                        ],
                        unresolved: [
                            'Arbeitslaengen-Methode unklar',
                        ],
                    },
                },
            });

            expect(result.state).toBe('questions');
            if (result.state !== 'questions') return;
            const ids = (result.questions ?? []).map(question => question.id);
            expect(ids.some(id => id.includes('wf_technique'))).toBe(true);
            expect(
                ids.some(id => id.includes('wl_method'))
                || ids.some(id => id.includes('WORKING_LENGTH_METHOD'))
            ).toBe(true);
        } finally {
            if (prevOpenAi === undefined) delete process.env.OPENAI_API_KEY;
            else process.env.OPENAI_API_KEY = prevOpenAi;
            if (prevViteOpenAi === undefined) delete process.env.VITE_OPENAI_API_KEY;
            else process.env.VITE_OPENAI_API_KEY = prevViteOpenAi;
            if (prevReactOpenAi === undefined) delete process.env.REACT_APP_OPENAI_API_KEY;
            else process.env.REACT_APP_OPENAI_API_KEY = prevReactOpenAi;
        }
    });
});
