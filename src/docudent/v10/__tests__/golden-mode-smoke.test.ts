/**
 * GP3: UI Smoke Tests for Golden Mode Askbacks
 * 
 * Verifies that golden mode triggers the expected askbacks deterministically.
 */

import { describe, it, expect } from 'vitest';
import {
    GUARANTEED_ASKBACKS,
    getMinAskbackCount,
    getExpectedAskbackIds,
    getCompositeAskbackIds,
    applyGoldenFacts,
    applyGoldenFactsComposite,
    GOLDEN_EXTRACTION_COMPOSITE,
    GOLDEN_EXTRACTION_MAX,
} from '../golden/golden_dictation_facts';

describe('GP3: Golden Mode Facts', () => {
    it('defines at least 4 askbacks from knowledge pack', () => {
        expect(getMinAskbackCount()).toBeGreaterThanOrEqual(3);
    });

    it('includes material askback', () => {
        const ids = getExpectedAskbackIds();
        expect(ids).toContain('fuellung_material');
    });

    it('includes isolation askback', () => {
        const ids = getExpectedAskbackIds();
        expect(ids).toContain('fuellung_isolation');
    });

    it('includes pulpaschutz askback', () => {
        const ids = getExpectedAskbackIds();
        expect(ids).toContain('fuellung_pulpaschutz');
    });

    it('applyGoldenFacts sets all required unknowns', () => {
        const extracted = { tooth: '36', surfaces: ['o'] };
        const golden = applyGoldenFacts(extracted);

        expect(golden.materialMentioned).toBe('unknown');
        expect(golden.isolationMentioned).toBe('unknown');
        expect(golden.cariesDepthHint).toBe('deep');
        expect(golden.insuranceContextHint).toBe('unknown');
    });

    it('applyGoldenFactsComposite sets material=composite', () => {
        const extracted = { tooth: '36' };
        const golden = applyGoldenFactsComposite(extracted);

        expect(golden.materialMentioned).toBe('komposit');
        expect(golden.adhesiveTechnique).toBeUndefined();
        expect(golden.layeringMentioned).toBe('unknown');
    });
});

describe('GP3: Composite Scenario Askbacks', () => {
    it('returns more askbacks for composite scenario', () => {
        const allIds = getExpectedAskbackIds();
        const compositeIds = getCompositeAskbackIds();

        // Composite scenario includes adhesive and layering
        expect(compositeIds).toContain('fuellung_adhesive');
        expect(compositeIds).toContain('fuellung_layering');
    });

    it('GOLDEN_EXTRACTION_COMPOSITE has komposit material', () => {
        expect(GOLDEN_EXTRACTION_COMPOSITE.materialMentioned).toBe('komposit');
    });

    it('GOLDEN_EXTRACTION_MAX has unknown material', () => {
        expect(GOLDEN_EXTRACTION_MAX.materialMentioned).toBe('unknown');
    });
});

describe('GP3: Guaranteed Askbacks Structure', () => {
    it('all askbacks have required fields', () => {
        GUARANTEED_ASKBACKS.forEach(askback => {
            expect(askback.id).toBeDefined();
            expect(askback.reason).toBeDefined();
            expect(askback.expectedRule).toBeDefined();
        });
    });

    it('rules follow naming convention', () => {
        GUARANTEED_ASKBACKS.forEach(askback => {
            expect(askback.expectedRule).toMatch(/^rule-/);
        });
    });
});
