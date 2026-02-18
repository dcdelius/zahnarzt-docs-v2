import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: Krone facts completeness (dictation signals)', () => {
    it('derives crown type and placement from dictation', () => {
        const extracted = {
            rawDictation: 'Vollkrone an Zahn 16 definitiv eingegliedert und okklusal kontrolliert.',
            tooth: '16',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'krone',
            instanceScope: { tooth: '16' },
        });

        expect(facts.treatmentId).toBe('krone');
        expect(facts.tooth).toBe('16');
        expect(facts.krone?.type).toBe('vollkrone');
        expect(facts.krone?.placement).toBe('definitiv');
    });
});
