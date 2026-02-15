import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: Extraction facts completeness (dictation signals)', () => {
    it('derives wound care + anesthesia facts', () => {
        const extracted = {
            rawDictation: 'Zahn 18 extrahiert, Leitungsanästhesie, Oberflächenanästhesie, Naht gelegt.',
            tooth: '18',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'extraction',
            instanceScope: { tooth: '18' },
        });

        expect(facts.treatmentId).toBe('extraction');
        expect(facts.anesthesia).toBe('leitung');
        expect(facts.surfaceAnesthesia).toBe(true);
        expect(facts.woundCare).toBe(true);
    });
});
