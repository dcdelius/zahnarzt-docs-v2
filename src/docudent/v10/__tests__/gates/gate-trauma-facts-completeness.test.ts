import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: Trauma facts completeness (dictation signals)', () => {
    it('derives trauma art, schienung and kontrolle from dictation', () => {
        const extracted = {
            rawDictation: 'Zahntrauma an Zahn 11 nach Luxation, semipermanente Schienung angelegt und Verlaufskontrolle geplant.',
            tooth: '11',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'trauma',
            instanceScope: { tooth: '11' },
        });

        expect(facts.treatmentId).toBe('trauma');
        expect(facts.tooth).toBe('11');
        expect(facts.trauma?.art).toBe('luxation');
        expect(facts.trauma?.schienung).toBe('ja');
        expect(facts.trauma?.kontrolle).toBe('ja');
    });
});
