import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: Teilkrone facts completeness (dictation signals)', () => {
    it('derives teilkrone type and placement from dictation', () => {
        const extracted = {
            rawDictation: 'Teilkronenversorgung an Zahn 16, Teilkrone definitiv eingegliedert.',
            tooth: '16',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'teilkrone',
            instanceScope: { tooth: '16' },
        });

        expect(facts.treatmentId).toBe('teilkrone');
        expect(facts.tooth).toBe('16');
        expect(facts.teilkrone?.type).toBe('teilkrone');
        expect(facts.teilkrone?.placement).toBe('definitiv');
    });
});
