import { describe, expect, it } from 'vitest';
import { MIXED_INTENT_FIXTURES } from '@/docudent/v10/__tests__/preanalysis/fixtures/mixedIntentFixtures';

describe('gate-v10-preanalysis-fixture-coverage', () => {
    it('covers every active treatment pack in fallback fixtures', () => {
        const treatmentIds = new Set(
            MIXED_INTENT_FIXTURES.flatMap(f => f.expected.intentChecks.map(check => check.treatmentId))
        );

        expect(treatmentIds.has('fuellung')).toBe(true);
        expect(treatmentIds.has('endo')).toBe(true);
        expect(treatmentIds.has('extraction')).toBe(true);
        expect(treatmentIds.has('crown_prep')).toBe(true);
    });

    it('contains at least one explicit uncertainty confirmation path', () => {
        const hasConfirmationFixture = MIXED_INTENT_FIXTURES.some(f => f.expected.needsConfirmation);
        expect(hasConfirmationFixture).toBe(true);
    });

    it('covers inferred and missing tooth uncertainty guardrails', () => {
        const uncertaintyChecks = MIXED_INTENT_FIXTURES.flatMap(f =>
            f.expected.intentChecks.map(check => check.uncertainty).filter(Boolean)
        );
        expect(uncertaintyChecks).toContain('inferred_tooth_from_context');
        expect(uncertaintyChecks).toContain('missing_tooth_reference');
        expect(uncertaintyChecks).toContain('llm_ambiguous_mapping');
    });

    it('includes at least one deterministic triple-overlap fixture', () => {
        const tripleOverlap = MIXED_INTENT_FIXTURES.find(f => f.id === 'crown-build-extraction-triple');
        expect(tripleOverlap).toBeDefined();
        expect(tripleOverlap?.expected.intentCount).toBeGreaterThanOrEqual(3);
        expect(tripleOverlap?.expected.needsConfirmation).toBe(false);
    });

    it('includes explicit cross-clause ambiguous tooth-context coverage', () => {
        const crossClauseAmbiguous = MIXED_INTENT_FIXTURES.find(f => f.id === 'cross-clause-ambiguous-tooth-context');
        expect(crossClauseAmbiguous).toBeDefined();
        expect(crossClauseAmbiguous?.expected.needsConfirmation).toBe(true);
    });
});
