import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: Teilprothese facts completeness (dictation signals)', () => {
    it('derives teilprothese type and phase from dictation', () => {
        const extracted = {
            rawDictation: 'Modellgussprothese im Unterkiefer eingesetzt und Druckstellenkontrolle dokumentiert.',
            tooth: '36',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'teilprothese',
            instanceScope: { tooth: '36' },
        });

        expect(facts.treatmentId).toBe('teilprothese');
        expect(facts.tooth).toBe('36');
        expect(facts.teilprothese?.type).toBe('modellguss');
        expect(facts.teilprothese?.phase).toBe('kontrolle');
    });
});
