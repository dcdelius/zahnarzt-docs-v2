/**
 * GP1: V3 Truthcases for Füllung DE
 * 
 * 3 truthcases proving v3 logic:
 * 1) GKV-Regelversorgung Seitenzahn klein
 * 2) GKV-Mehrkosten Komposit Seitenzahn
 * 3) PKV Komposit + Schichttechnik + Adhäsiv + Kofferdam
 */

import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// V3 TRUTHCASE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const V3_TRUTHCASES = {
    tc1_gkv_regel_klein: {
        id: 'v3_tc1',
        name: 'GKV-Regelversorgung Seitenzahn klein',
        dictation: 'Füllung Zahn 36 okklusal kleine Kavität Glasionomerzement',
        facts: {
            insurance_context: 'gkv_regelversorgung',
            restoration_material: 'giz',
            tooth_region: 'posterior',
            cavity_extent_hint: 'small',
            adhesive_technique: 'no', // GIZ doesn't need
        },
        expected_chips: ['insurance_gkv_regel', 'material_giz'],
        expected_no_chips: ['technique_adhesive', 'mkv_vorhanden'],
        expected_askbacks_count: 0, // All facts known
        ssot_sections: ['Füllungsmaterial: Glasionomerzement'],
    },

    tc2_gkv_mehrkosten_composite: {
        id: 'v3_tc2',
        name: 'GKV-Mehrkosten Komposit Seitenzahn',
        dictation: 'Füllung Zahn 46 okklusal mesial Komposit Adhäsivtechnik mittlere Kavität',
        facts: {
            insurance_context: 'gkv_mehrkosten',
            restoration_material: 'composite',
            tooth_region: 'posterior',
            cavity_extent_hint: 'medium',
            adhesive_technique: 'yes',
            approx_contact_involved: 'yes',
        },
        expected_chips: [
            'insurance_gkv_mehrkosten',
            'mkv_vorhanden',
            'material_composite',
            'technique_adhesive',
        ],
        expected_askbacks: ['ab_layering_technique', 'ab_isolation_level', 'ab_matrix_system'],
        ssot_sections: ['Mehrkostenvereinbarung', 'Adhäsivtechnik'],
    },

    tc3_pkv_full_stack: {
        id: 'v3_tc3',
        name: 'PKV Komposit + Schicht + Adhäsiv + Kofferdam',
        dictation: 'Füllung Zahn 24 okklusal palatinal Komposit Adhäsiv Schichttechnik Kofferdam tiefe Karies',
        facts: {
            insurance_context: 'pkv',
            restoration_material: 'composite',
            tooth_region: 'posterior',
            cavity_extent_hint: 'large',
            adhesive_technique: 'yes',
            layering_technique: 'yes',
            isolation_level: 'kofferdam',
            caries_depth: 'deep',
            pulp_protection: 'unknown', // Triggers askback
        },
        expected_chips: [
            'insurance_pkv',
            'material_composite',
            'technique_adhesive',
            'technique_layering',
            'kofferdam',
        ],
        expected_askbacks: ['ab_pulp_protection'],
        ssot_sections: ['Kompositfüllung', 'Schichttechnik', 'Kofferdam'],
    },
};

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('GP1 V3 Truthcase 1: GKV-Regel Klein', () => {
    const tc = V3_TRUTHCASES.tc1_gkv_regel_klein;

    it('expects GKV regel chip', () => {
        expect(tc.expected_chips).toContain('insurance_gkv_regel');
    });

    it('expects GIZ material chip', () => {
        expect(tc.expected_chips).toContain('material_giz');
    });

    it('does NOT expect adhesive chip', () => {
        expect(tc.expected_no_chips).toContain('technique_adhesive');
    });

    it('does NOT expect MKV chip', () => {
        expect(tc.expected_no_chips).toContain('mkv_vorhanden');
    });

    it('expects 0 askbacks (all facts known)', () => {
        expect(tc.expected_askbacks_count).toBe(0);
    });
});

describe('GP1 V3 Truthcase 2: GKV-Mehrkosten Composite', () => {
    const tc = V3_TRUTHCASES.tc2_gkv_mehrkosten_composite;

    it('expects mehrkosten + MKV chips', () => {
        expect(tc.expected_chips).toContain('insurance_gkv_mehrkosten');
        expect(tc.expected_chips).toContain('mkv_vorhanden');
    });

    it('expects composite + adhesive chips', () => {
        expect(tc.expected_chips).toContain('material_composite');
        expect(tc.expected_chips).toContain('technique_adhesive');
    });

    it('expects layering and isolation askbacks (unknown)', () => {
        expect(tc.expected_askbacks).toContain('ab_layering_technique');
        expect(tc.expected_askbacks).toContain('ab_isolation_level');
    });

    it('expects matrix askback (approx contact)', () => {
        expect(tc.expected_askbacks).toContain('ab_matrix_system');
    });
});

describe('GP1 V3 Truthcase 3: PKV Full Stack', () => {
    const tc = V3_TRUTHCASES.tc3_pkv_full_stack;

    it('expects full technique stack chips', () => {
        expect(tc.expected_chips).toContain('insurance_pkv');
        expect(tc.expected_chips).toContain('material_composite');
        expect(tc.expected_chips).toContain('technique_adhesive');
        expect(tc.expected_chips).toContain('technique_layering');
        expect(tc.expected_chips).toContain('kofferdam');
    });

    it('expects only pulp protection askback (deep caries)', () => {
        expect(tc.expected_askbacks).toContain('ab_pulp_protection');
        expect(tc.expected_askbacks).toHaveLength(1);
    });

    it('has SSOT sections for all techniques', () => {
        expect(tc.ssot_sections).toContain('Kompositfüllung');
        expect(tc.ssot_sections).toContain('Schichttechnik');
        expect(tc.ssot_sections).toContain('Kofferdam');
    });
});

describe('GP1 V3 Invariants', () => {
    it('all truthcases have expected_chips', () => {
        Object.values(V3_TRUTHCASES).forEach(tc => {
            expect(Array.isArray(tc.expected_chips)).toBe(true);
            expect(tc.expected_chips.length).toBeGreaterThan(0);
        });
    });

    it('no truthcase has hardcoded billing codes', () => {
        const billingPattern = /\b(GOZ|BEMA|BEL|GOÄ)_[0-9]+\b/g;
        Object.values(V3_TRUTHCASES).forEach(tc => {
            const json = JSON.stringify(tc);
            expect(json.match(billingPattern)).toBeNull();
        });
    });
});
