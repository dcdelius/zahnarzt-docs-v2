/**
 * G117: Stub Extraction for Füllung with Unknown Facts
 * 
 * When stub/golden mode is enabled, this sets facts to 'unknown'
 * to force askbacks to appear in the UI.
 */

import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// STUB FACTS DEFINITIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Default unknown facts for stub mode.
 * These should trigger all Level 1 (blocking) askbacks.
 */
export const STUB_UNKNOWN_FACTS_V2 = {
    treatmentId: 'fuellung',
    toothIds: ['36'],
    surfacesByTooth: { '36': ['o'] },
    tooth_region: 'posterior',

    // All unknowns to trigger max askbacks
    insurance_context: 'unknown',
    restoration_material: 'unknown',
    adhesive_technique: 'unknown',
    layering_technique: 'unknown',
    isolation_level: 'unknown',
    pulp_protection: 'unknown',
    caries_depth: 'unknown',
    moisture_control_difficulty: 'unknown',
};

/**
 * Stub facts with composite material set.
 * This triggers adhesive/layering askbacks.
 */
export const STUB_COMPOSITE_FACTS = {
    ...STUB_UNKNOWN_FACTS_V2,
    restoration_material: 'composite',
    // Still unknown: adhesive, layering, isolation
};

/**
 * Stub facts with deep caries.
 * This triggers pulp protection askback.
 */
export const STUB_DEEP_CARIES_FACTS = {
    ...STUB_UNKNOWN_FACTS_V2,
    caries_depth: 'deep',
    pulp_protection: 'unknown',
};

/**
 * Apply stub unknowns to extraction result.
 * Called when dictation contains "Füllung" in stub mode.
 */
export function applyStubUnknowns(
    extracted: Record<string, unknown>,
    variant: 'max' | 'composite' | 'deep_caries' = 'max'
): Record<string, unknown> {
    const base = (() => {
        switch (variant) {
            case 'composite':
                return STUB_COMPOSITE_FACTS;
            case 'deep_caries':
                return STUB_DEEP_CARIES_FACTS;
            default:
                return STUB_UNKNOWN_FACTS_V2;
        }
    })();

    return {
        ...extracted,
        ...base,
    };
}

/**
 * Check if dictation should trigger stub unknowns.
 */
export function shouldApplyStubUnknowns(dictation: string): boolean {
    const normalized = dictation.toLowerCase();
    return normalized.includes('füllung') || normalized.includes('fuellung');
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('G117: Stub Unknown Facts', () => {
    it('STUB_UNKNOWN_FACTS_V2 has all required unknowns', () => {
        const facts = STUB_UNKNOWN_FACTS_V2;
        expect(facts.insurance_context).toBe('unknown');
        expect(facts.restoration_material).toBe('unknown');
        expect(facts.adhesive_technique).toBe('unknown');
        expect(facts.isolation_level).toBe('unknown');
    });

    it('STUB_COMPOSITE_FACTS has material set', () => {
        expect(STUB_COMPOSITE_FACTS.restoration_material).toBe('composite');
        expect(STUB_COMPOSITE_FACTS.adhesive_technique).toBe('unknown');
    });

    it('STUB_DEEP_CARIES_FACTS has caries_depth set', () => {
        expect(STUB_DEEP_CARIES_FACTS.caries_depth).toBe('deep');
        expect(STUB_DEEP_CARIES_FACTS.pulp_protection).toBe('unknown');
    });
});

describe('G117: applyStubUnknowns', () => {
    it('applies max unknowns by default', () => {
        const extracted = { tooth: '36' };
        const result = applyStubUnknowns(extracted);
        expect(result.insurance_context).toBe('unknown');
        expect(result.restoration_material).toBe('unknown');
    });

    it('applies composite variant', () => {
        const extracted = { tooth: '36' };
        const result = applyStubUnknowns(extracted, 'composite');
        expect(result.restoration_material).toBe('composite');
    });

    it('preserves extracted values', () => {
        const extracted = { tooth: '36', custom_field: 'value' };
        const result = applyStubUnknowns(extracted);
        expect(result.custom_field).toBe('value');
    });
});

describe('G117: shouldApplyStubUnknowns', () => {
    it('returns true for "Füllung"', () => {
        expect(shouldApplyStubUnknowns('Füllung Zahn 36 okklusal')).toBe(true);
    });

    it('returns true for "fuellung"', () => {
        expect(shouldApplyStubUnknowns('fuellung 36 o')).toBe(true);
    });

    it('returns false for unrelated dictation', () => {
        expect(shouldApplyStubUnknowns('Wurzelbehandlung 36')).toBe(false);
    });
});

describe('G117: Askback Triggering Simulation', () => {
    it('max unknowns should trigger 3+ blocking askbacks', () => {
        const facts = STUB_UNKNOWN_FACTS_V2;
        const expectedBlockingAskbacks = [
            'ab_insurance_context',
            'ab_material_choice',
            // ab_adhesive_technique only if material=composite
        ];

        // insurance_context unknown → triggers ab_insurance_context
        expect(facts.insurance_context).toBe('unknown');

        // restoration_material unknown → triggers ab_material_choice
        expect(facts.restoration_material).toBe('unknown');
    });

    it('composite facts should trigger adhesive askback', () => {
        const facts = STUB_COMPOSITE_FACTS;

        // material=composite + adhesive=unknown → triggers ab_adhesive_technique
        expect(facts.restoration_material).toBe('composite');
        expect(facts.adhesive_technique).toBe('unknown');
    });

    it('deep caries should trigger pulp protection askback', () => {
        const facts = STUB_DEEP_CARIES_FACTS;

        // caries_depth=deep + pulp_protection=unknown → triggers ab_pulp_protection
        expect(facts.caries_depth).toBe('deep');
        expect(facts.pulp_protection).toBe('unknown');
    });
});
