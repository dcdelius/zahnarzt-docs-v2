import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: Fuellung facts completeness (dictation signals)', () => {
    it('derives core facts from dictation', () => {
        const extracted = {
            rawDictation: 'Zahn 36 MOD pulpanah, indirekte Überkappung mit Ca(OH)2, Kofferdam, Leitungsanästhesie, Oberflächenanästhesie, Exkavation, Politur, Kompositfüllung in Mehrschichttechnik, Matrize, Adhäsiv, Ätzgel, Flowable, Bulkfill',
            tooth: '36',
            surfaces: ['m', 'o', 'd'],
            diagnosis: 'Caries profunda',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'fuellung',
            instanceScope: { tooth: '36' },
        });

        expect(facts.materialMentioned).toBe('komposit');
        expect(facts.adhesiveTechnique).toBe(true);
        expect(facts.adhesiveMentioned).toBe(true);
        expect(facts.etchMentioned).toBe(true);
        expect(facts.flowableMentioned).toBe(true);
        expect(facts.bulkMentioned).toBe(true);
        expect(facts.layeringMentioned).toBe('yes');
        expect(facts.matrixMentioned).toBe(true);
        expect(facts.kofferdamUsed).toBe(true);
        expect(facts.anesthesia).toBe('leitung');
        expect(facts.surfaceAnesthesia).toBe(true);
        expect(facts.exkavationPerformed).toBe(true);
        expect(facts.finishingPerformed).toBe(true);
        expect(facts.capping.performed).toBe('yes');
        expect(facts.pulpaOpened).toBe(false);
        expect(facts.cariesDepth).toBe('profunda');
        expect(facts.cavityExtentHint).toBe('large');
    });
});
