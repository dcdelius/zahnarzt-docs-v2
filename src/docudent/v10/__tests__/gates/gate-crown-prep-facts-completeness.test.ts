import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: Crown prep facts completeness (dictation signals)', () => {
    it('derives preparation + impression + provisional', () => {
        const extracted = {
            rawDictation: 'Zahn 21 Kronenpräparation, Abformung und Provisorium eingesetzt.',
            tooth: '21',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'crown_prep',
            instanceScope: { tooth: '21' },
        });

        expect(facts.treatmentId).toBe('crown_prep');
        expect(facts.crownPrep?.preparation).toBe(true);
        expect(facts.crownPrep?.impression).toBe(true);
        expect(facts.crownPrep?.provisional).toBe(true);
    });
});
