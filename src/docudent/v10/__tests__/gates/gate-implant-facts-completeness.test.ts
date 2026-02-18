import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: Implant facts completeness (dictation signals)', () => {
    it('derives implant phase and nachsorge from dictation', () => {
        const extracted = {
            rawDictation: 'Implantatinsertion regio 36 durchgefuehrt, postoperative Nachsorge und Kontrolltermin dokumentiert.',
            tooth: '36',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'implant',
            instanceScope: { tooth: '36' },
        });

        expect(facts.treatmentId).toBe('implant');
        expect(facts.tooth).toBe('36');
        expect(facts.implant?.phase).toBe('insertion');
        expect(facts.implant?.nachsorge).toBe('ja');
    });
});
