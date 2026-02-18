import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';

describe('Gate: Untersuchung facts completeness (dictation signals)', () => {
    it('derives reason/findings/assessment from dictation', () => {
        const extracted = {
            rawDictation: 'Eingehende Kontrolluntersuchung, Befunde unauffaellig, derzeit kein Therapiebedarf.',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'untersuchung',
        });

        expect(facts.treatmentId).toBe('untersuchung');
        expect(facts.untersuchung?.reason).toBe('kontrolle');
        expect(facts.untersuchung?.findings).toBe('unauffaellig');
        expect(facts.untersuchung?.assessment).toBe('ohne_therapiebedarf');
    });

    it('does not flip negated variants like "kein akuter Therapiebedarf" to positive need', () => {
        const extracted = {
            rawDictation: 'Eingehende Kontrolle, Befunde unauffaellig, aktuell kein akuter Therapiebedarf.',
        };

        const facts = buildFactsFromExtraction({
            extracted,
            treatmentId: 'untersuchung',
        });

        expect(facts.untersuchung?.assessment).toBe('ohne_therapiebedarf');
    });
});
