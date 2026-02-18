import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: Totalprothese facts completeness (dictation signals)', () => {
    it('derives totalprothese type and phase from dictation', () => {
        const extracted = {
            rawDictation: 'Konventionelle Totalprothese im Oberkiefer eingegliedert und Druckstellenkontrolle dokumentiert.',
            tooth: '16',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'totalprothese',
            instanceScope: { tooth: '16' },
        });

        expect(facts.treatmentId).toBe('totalprothese');
        expect(facts.tooth).toBe('16');
        expect(facts.totalprothese?.type).toBe('konventionell');
        expect(facts.totalprothese?.phase).toBe('kontrolle');
    });
});
