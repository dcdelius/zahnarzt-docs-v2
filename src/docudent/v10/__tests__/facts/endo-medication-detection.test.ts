import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('endo medication detection', () => {
    it('detects Ledermix as explicit endo medication from dictation', () => {
        const facts = buildFactsFromExtraction({
            extracted: {
                tooth: '36',
                treatmentId: 'endo',
                rawDictation: 'Endo 36. Trepanation. Medikamentöse Einlage Ledermix. Kofferdam.',
                mentioned: { material: 'Ledermix' },
            },
            treatmentId: 'endo',
        });

        expect(facts.endo?.medication).toBe('Ledermix');
    });

    it('prefers explicit mentioned endo hints for step/irrigation/wf-technique', () => {
        const facts = buildFactsFromExtraction({
            extracted: {
                tooth: '36',
                treatmentId: 'endo',
                rawDictation: 'Revision an Zahn 36.',
                mentioned: {
                    endo_step: 'irrigation',
                    irrigation_solutions: ['NaOCl', 'EDTA'],
                    wf_technique: 'warm',
                    wl_method: 'electronic',
                    root_canals: 3,
                    endo_medication: 'Ledermix',
                },
            },
            treatmentId: 'endo',
        });

        expect(facts.endo?.step).toBe('irrigation');
        expect(facts.endo?.irrigationSolutions).toEqual(['NaOCl', 'EDTA']);
        expect(facts.endo?.wfTechnique).toBe('warm');
        expect(facts.endo?.workingLengthMethod).toBe('electronic');
        expect(facts.endo?.canalCount).toBe(3);
        expect(facts.endo?.medication).toBe('Ledermix');
    });
});
