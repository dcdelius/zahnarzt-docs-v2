import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: Bruecke facts completeness (dictation signals)', () => {
    it('derives bruecke type and phase from dictation', () => {
        const extracted = {
            rawDictation: 'Definitive Bruecke regio 36 eingegliedert und Okklusionskontrolle dokumentiert.',
            tooth: '36',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'bruecke',
            instanceScope: { tooth: '36' },
        });

        expect(facts.treatmentId).toBe('bruecke');
        expect(facts.tooth).toBe('36');
        expect(facts.bruecke?.type).toBe('definitiv');
        expect(facts.bruecke?.phase).toBe('kontrolle');
    });
});
