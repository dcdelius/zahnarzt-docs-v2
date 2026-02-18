import { describe, expect, it } from 'vitest';

import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('buildFactsFromExtraction documentation context wiring', () => {
    it('attaches structured documentationContext to facts when extraction contains contextual notes', () => {
        const facts = buildFactsFromExtraction({
            treatmentId: 'untersuchung',
            extracted: {
                tooth: '11',
                patientenangaben: ['Patientin berichtet Belastung durch Pflegefall'],
                klinischeZusatzinfos: ['Antikoagulation mit Apixaban'],
                reasoning: {
                    forensicNotes: ['seit letzter Fuellung an Zahn 36 weiterhin empfindlich'],
                    unresolved: ['Recallintervall festlegen'],
                },
            },
        });

        const context = (facts.documentationContext ?? {
            clinical: [],
            patient: [],
            forensicNotes: [],
            unresolved: [],
        }) as {
            clinical: string[];
            patient: string[];
            forensicNotes: string[];
            unresolved: string[];
        };

        expect(context.clinical).toContain('Antikoagulation mit Apixaban');
        expect(context.patient).toContain('Patientin berichtet Belastung durch Pflegefall');
        expect(context.forensicNotes).toContain('seit letzter Fuellung an Zahn 36 weiterhin empfindlich');
        expect(context.unresolved).toContain('Recallintervall festlegen');
    });
});

