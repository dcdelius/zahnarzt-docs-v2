import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: Schiene facts completeness (dictation signals)', () => {
    it('derives schiene type and phase from dictation', () => {
        const extracted = {
            rawDictation: 'Protrusionsschiene eingegliedert und Nachkontrolle dokumentiert.',
            tooth: '16',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'schiene',
            instanceScope: { tooth: '16' },
        });

        expect(facts.treatmentId).toBe('schiene');
        expect(facts.tooth).toBe('16');
        expect(facts.schiene?.type).toBe('protrusionsschiene');
        expect(facts.schiene?.phase).toBe('kontrolle');
    });
});
