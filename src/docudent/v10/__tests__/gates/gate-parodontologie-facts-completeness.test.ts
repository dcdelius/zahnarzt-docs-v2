import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: Parodontologie facts completeness (dictation signals)', () => {
    it('derives PAR phase from dictation', () => {
        const extracted = {
            rawDictation: 'Geschlossene antiinfektioese Parodontaltherapie an 36 und 37 durchgefuehrt.',
            tooth: '36',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'parodontologie',
            instanceScope: { tooth: '36' },
        });

        expect(facts.treatmentId).toBe('parodontologie');
        expect(facts.tooth).toBe('36');
        expect(facts.parodontologie?.phase).toBe('ait');
    });
});
