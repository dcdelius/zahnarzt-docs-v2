import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: PZR facts completeness (dictation signals)', () => {
    it('derives zahnstein removal + fluoridation + anesthesia', () => {
        const extracted = {
            rawDictation: 'PZR: supragingivales Scaling mit Ultraschall, Fluoridlack, Infiltrationsanästhesie, Oberflächenanästhesie.',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'pzr',
        });

        expect(facts.treatmentId).toBe('pzr');
        expect(facts.pzr?.zahnsteinEntfernung).toBe(true);
        expect(facts.pzr?.fluoridation).toBe(true);
        expect(facts.anesthesia).toBe('infiltr');
        expect(facts.surfaceAnesthesia).toBe(true);
    });
});
