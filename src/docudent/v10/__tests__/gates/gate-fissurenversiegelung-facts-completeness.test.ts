import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: Fissurenversiegelung facts completeness (dictation signals)', () => {
    it('derives indication and material from dictation', () => {
        const extracted = {
            rawDictation: 'Fissurenversiegelung zur Kariesprophylaxe mit Kunststoff an Zahn 16 durchgefuehrt.',
            tooth: '16',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'fissurenversiegelung',
            instanceScope: { tooth: '16' },
        });

        expect(facts.treatmentId).toBe('fissurenversiegelung');
        expect(facts.tooth).toBe('16');
        expect(facts.fissurenversiegelung?.indication).toBe('kariesprophylaxe');
        expect(facts.fissurenversiegelung?.material).toBe('kunststoff');
    });
});
