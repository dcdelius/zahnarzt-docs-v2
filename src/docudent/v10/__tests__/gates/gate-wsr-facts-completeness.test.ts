import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: WSR facts completeness (dictation signals)', () => {
    it('derives zugang and lokalisation from dictation', () => {
        const extracted = {
            rawDictation: 'Wurzelspitzenresektion an Zahn 36 durch Osteotomie im Molarenbereich durchgefuehrt.',
            tooth: '36',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'wsr',
            instanceScope: { tooth: '36' },
        });

        expect(facts.treatmentId).toBe('wsr');
        expect(facts.tooth).toBe('36');
        expect(facts.wsr?.zugang).toBe('osteotomie');
        expect(facts.wsr?.lokalisation).toBe('molar');
    });
});
