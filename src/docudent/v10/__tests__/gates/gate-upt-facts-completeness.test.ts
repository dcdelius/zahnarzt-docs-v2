import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: UPT facts completeness (dictation signals)', () => {
    it('derives grade and interval from dictation', () => {
        const extracted = {
            rawDictation: 'UPT Grad B an Zahn 36 mit Recallintervall 6 Monate durchgefuehrt.',
            tooth: '36',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'upt',
            instanceScope: { tooth: '36' },
        });

        expect(facts.treatmentId).toBe('upt');
        expect(facts.tooth).toBe('36');
        expect(facts.upt?.grade).toBe('b');
        expect(facts.upt?.interval).toBe('6_monate');
    });
});
