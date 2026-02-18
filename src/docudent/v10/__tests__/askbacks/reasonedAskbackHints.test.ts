import { describe, expect, it } from 'vitest';

import { deriveReasonedAskbackHints, orderAskbacksDeterministically } from '../../askbacks/reasonedAskbackHints';
import type { TreatmentFacts } from '../../facts';

function buildFacts(overrides?: Partial<TreatmentFacts>): TreatmentFacts {
    return {
        treatmentId: 'endo',
        cariesDepth: 'unknown',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        ...overrides,
    };
}

describe('reasonedAskbackHints', () => {
    it('promotes inferred/uncertain hints to required askbacks', () => {
        const facts = buildFacts();
        const extracted = {
            reasoning: {
                version: 'v1',
                factHints: [
                    {
                        key: 'wf_technique',
                        value: 'warm',
                        confidence: 0.92,
                        basis: 'inferred',
                        evidence: ['warm vertikal angedeutet'],
                    },
                    {
                        key: 'irrigation_solutions',
                        value: ['NaOCl', 'EDTA'],
                        confidence: 0.68,
                        basis: 'explicit',
                        evidence: ['gespuelt'],
                    },
                ],
                unresolved: [
                    'Arbeitslaengen-Methode unklar dokumentiert',
                ],
            },
        };

        const result = deriveReasonedAskbackHints(extracted, facts);

        expect(result.required).toEqual(expect.arrayContaining(['wf_technique', 'irrigation', 'wl_method']));
        expect(result.optional).toEqual([]);
        expect(result.provenance.some(entry => entry.ruleId.startsWith('reasoned:fact_hint:'))).toBe(true);
        expect(result.provenance.some(entry => entry.ruleId.startsWith('reasoned:unresolved:'))).toBe(true);
    });

    it('skips askbacks whose facts are already known', () => {
        const facts = buildFacts({
            endo: {
                wfTechnique: 'warm',
            },
        });
        const extracted = {
            reasoning: {
                version: 'v1',
                factHints: [
                    {
                        key: 'wf_technique',
                        value: 'warm',
                        confidence: 0.2,
                        basis: 'inferred',
                        evidence: ['unsicher'],
                    },
                ],
            },
        };

        const result = deriveReasonedAskbackHints(extracted, facts);
        expect(result.required).toEqual([]);
        expect(result.optional).toEqual([]);
    });

    it('orders askbacks deterministically by priority then normalized id', () => {
        const priorities = new Map<string, number>([
            ['wl_method', 0],
            ['wf_technique', 0],
            ['irrigation', 1],
        ]);
        const ordered = orderAskbacksDeterministically(
            ['irrigation', 'wf_technique', 'wl_method'],
            priorities
        );

        expect(ordered).toEqual(['wf_technique', 'wl_method', 'irrigation']);
    });

    it('derives askbacks from documentationContext unresolved hints when reasoning payload is missing', () => {
        const facts = buildFacts();
        const extracted = {
            documentationContext: {
                version: 'v1',
                clinical: [],
                patient: [],
                administrative: [],
                forensicNotes: [],
                unresolved: [
                    'Arbeitslaengen-Methode fehlt',
                    'Spuelprotokoll NaOCl/EDTA unklar',
                ],
            },
        };

        const result = deriveReasonedAskbackHints(extracted, facts);
        expect(result.required).toEqual(expect.arrayContaining(['wl_method', 'irrigation']));
        expect(result.provenance.some(entry => entry.ruleId.startsWith('reasoned:context_unresolved:'))).toBe(true);
    });
});
