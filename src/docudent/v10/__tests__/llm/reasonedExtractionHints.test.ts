import { describe, expect, it } from 'vitest';

import { applyReasonedExtractionHints } from '../../extraction/adapters/reasonedExtractionHints';

describe('applyReasonedExtractionHints', () => {
    it('applies explicit high-confidence hints conservatively', () => {
        const extraction = {
            tooth: null,
            mentioned: {},
            klinischeZusatzinfos: ['Bereits dokumentiert'],
            reasoning: {
                version: 'v1',
                intentHints: [
                    {
                        treatmentId: 'endo',
                        confidence: 0.9,
                        basis: 'explicit',
                        evidence: ['Trepanation erneut geoeffnet'],
                        tooth: '27',
                        step: 'irrigation',
                        phase: 'medication',
                    },
                ],
                factHints: [
                    {
                        key: 'working_length',
                        value: 'MB 20 / ML 19 / D 21',
                        confidence: 0.86,
                        basis: 'explicit',
                        evidence: ['Apex-Lokator dokumentiert'],
                    },
                    {
                        key: 'root_canals',
                        value: 3,
                        confidence: 0.74,
                        basis: 'explicit',
                        evidence: ['3 Kanaele aufbereitet'],
                    },
                ],
                forensicNotes: ['Patient berichtet weiter Klopfschmerz nach letzter Sitzung'],
            },
        };

        const result = applyReasonedExtractionHints(extraction, 'endo');

        expect(result.extracted.tooth).toBe('27');
        const mentioned = result.extracted.mentioned as Record<string, unknown>;
        expect(mentioned.working_length).toBe('MB 20 / ML 19 / D 21');
        expect(mentioned.root_canals).toBe(3);
        expect(mentioned.endo_step).toBe('irrigation');
        expect(mentioned.endo_phase).toBe('medication');
        expect(result.summary?.appliedKeys).toContain('patientenangaben');
    });

    it('keeps inferred or low-confidence hints out of mentioned facts', () => {
        const extraction = {
            mentioned: {},
            reasoning: {
                version: 'v1',
                factHints: [
                    {
                        key: 'wf_technique',
                        value: 'lateralkondensation',
                        confidence: 0.95,
                        basis: 'inferred',
                        evidence: ['naheliegend aus wording'],
                    },
                    {
                        key: 'irrigation_solutions',
                        value: ['NaOCl'],
                        confidence: 0.4,
                        basis: 'explicit',
                        evidence: ['Spuelung'],
                    },
                ],
                unresolved: ['Arbeitslaenge fehlt'],
            },
        };

        const result = applyReasonedExtractionHints(extraction, 'endo');
        const mentioned = result.extracted.mentioned as Record<string, unknown>;

        expect(mentioned.wf_technique).toBeUndefined();
        expect(mentioned.irrigation_solutions).toBeUndefined();
        expect(result.summary?.inferredHints).toBe(1);
        expect(result.summary?.unresolved).toBe(1);
    });

    it('routes non-procedural context fact hints into context arrays', () => {
        const extraction = {
            mentioned: {},
            reasoning: {
                version: 'v1',
                factHints: [
                    {
                        key: 'medication_change',
                        value: 'Marcumar pausiert seit gestern',
                        confidence: 0.92,
                        basis: 'explicit',
                        evidence: ['Marcumar pausiert seit gestern'],
                    },
                    {
                        key: 'comorbidities',
                        value: ['Diabetes Typ II'],
                        confidence: 0.85,
                        basis: 'explicit',
                        evidence: ['Diabetes Typ II bekannt'],
                    },
                    {
                        key: 'family_context',
                        value: 'Todesfall in der Familie, Patientin stark belastet',
                        confidence: 0.9,
                        basis: 'explicit',
                        evidence: ['Todesfall in der Familie'],
                    },
                    {
                        key: 'administrative_note',
                        value: 'Abreise in zwei Tagen, Kontrolltermin vorziehen',
                        confidence: 0.89,
                        basis: 'explicit',
                        evidence: ['Abreise in zwei Tagen'],
                    },
                ],
            },
        };

        const result = applyReasonedExtractionHints(extraction, 'fuellung');
        const clinical = (result.extracted.klinischeZusatzinfos as string[] | undefined) ?? [];
        const patient = (result.extracted.patientenangaben as string[] | undefined) ?? [];
        const legacy = (result.extracted.zusatzinfos as string[] | undefined) ?? [];
        const documentationContext = (result.extracted.documentationContext as {
            clinical?: string[];
            patient?: string[];
            administrative?: string[];
        } | undefined) ?? {};

        expect(clinical.some(item => item.includes('Medikationsaenderung: Marcumar pausiert seit gestern'))).toBe(true);
        expect(clinical.some(item => item.includes('Begleiterkrankungen: Diabetes Typ II'))).toBe(true);
        expect(patient.some(item => item.includes('Familiaerer Kontext: Todesfall in der Familie'))).toBe(true);
        expect(legacy.some(item => item.includes('Organisatorischer Hinweis: Abreise in zwei Tagen'))).toBe(true);
        expect((documentationContext.clinical ?? []).length).toBeGreaterThan(0);
        expect((documentationContext.patient ?? []).length).toBeGreaterThan(0);
        expect((documentationContext.administrative ?? []).length).toBeGreaterThan(0);
        expect(result.summary?.appliedKeys).toContain('klinischeZusatzinfos');
        expect(result.summary?.appliedKeys).toContain('patientenangaben');
        expect(result.summary?.appliedKeys).toContain('zusatzinfos');
    });
});
