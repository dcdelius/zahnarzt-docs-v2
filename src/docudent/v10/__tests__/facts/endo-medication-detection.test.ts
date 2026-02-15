import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('endo medication detection', () => {
    it('detects Ledermix as explicit endo medication from dictation', () => {
        const facts = buildFactsFromExtraction({
            extracted: {
                tooth: '36',
                treatmentId: 'endo',
                rawDictation: 'Endo 36. Trepanation. Medikamentöse Einlage Ledermix. Kofferdam.',
                mentioned: { material: 'Ledermix' },
            },
            treatmentId: 'endo',
        });

        expect(facts.endo?.medication).toBe('Ledermix');
    });
});
