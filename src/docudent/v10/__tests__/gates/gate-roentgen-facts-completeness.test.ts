import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: Roentgen facts completeness (dictation signals)', () => {
    it('derives radiology indication/type/timing/findings from dictation', () => {
        const extracted = {
            rawDictation: 'OPG zur Therapieplanung praeoperativ angefertigt, apikale Auffaelligkeit regio 36 dokumentiert.',
            tooth: '36',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'roentgen',
            instanceScope: { tooth: '36' },
        });

        expect(facts.treatmentId).toBe('roentgen');
        expect(facts.tooth).toBe('36');
        expect(facts.radiology?.indication).toBe('planung');
        expect(facts.radiology?.type).toBe('opg');
        expect(facts.radiology?.timing).toBe('praeoperativ');
        expect(facts.radiology?.findings).toBe('apikale_auffaelligkeit');
    });
});
