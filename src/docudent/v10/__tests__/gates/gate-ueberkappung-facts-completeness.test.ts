import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: Ueberkappung facts completeness (dictation signals)', () => {
    it('derives capping type, material and pulpaOpened from dictation', () => {
        const extracted = {
            rawDictation: 'Direkte Ueberkappung mit MTA bei Pulpaeroeffnung an Zahn 36 unter Infiltrationsanaesthesie.',
            tooth: '36',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'ueberkappung',
            instanceScope: { tooth: '36' },
        });

        expect(facts.treatmentId).toBe('ueberkappung');
        expect(facts.tooth).toBe('36');
        expect(facts.capping.performed).toBe('yes');
        expect(String(facts.capping.material ?? '').toLowerCase()).toContain('mta');
        expect(facts.pulpaOpened).toBe(true);
    });
});
