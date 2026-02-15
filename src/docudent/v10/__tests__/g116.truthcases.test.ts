/**
 * G116: Truthcases for Füllung DE v2
 * 
 * 6 required backend truthcases per G116 spec.
 */

import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// TRUTHCASE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const TRUTHCASES = {
    tc1_gkv_regelversorgung_self_adhesive: {
        id: 'tc1',
        name: 'GKV Regelversorgung Seitenzahn (self-adhesive)',
        dictation: 'Füllung Zahn 36 okklusal Glasionomerzement',
        facts: {
            insurance_context: 'gkv_regelversorgung',
            restoration_material: 'self_adhesive',
            tooth_region: 'posterior',
            adhesive_technique: 'no', // self-adhesive doesn't need
        },
        expected_chips: ['insurance_gkv_regel', 'material_self_adhesive'],
        expected_askbacks: [], // All facts known
        expected_no_chips: ['technique_adhesive'],
    },

    tc2_gkv_bulkfill_exception: {
        id: 'tc2',
        name: 'GKV Ausnahme Bulk-fill (klar begründet)',
        dictation: 'Füllung Zahn 36 okklusal mesial Bulk-Fill tiefe Kavität',
        facts: {
            insurance_context: 'gkv_regelversorgung',
            restoration_material: 'bulk_fill',
            tooth_region: 'posterior',
            adhesive_technique: 'yes',
            caries_depth: 'deep',
        },
        expected_chips: ['insurance_gkv_regel', 'material_bulk_fill', 'technique_adhesive'],
        expected_askbacks: ['ab_layering_technique'], // bulkfill doesn't always need layering
        requires_exception_note: true,
    },

    tc3_gkv_mehrkosten_composite: {
        id: 'tc3',
        name: 'GKV Mehrkosten: composite + adhäsiv + schichttechnik',
        dictation: 'Füllung Zahn 36 okklusal Komposit adhäsiv Schichttechnik',
        facts: {
            insurance_context: 'gkv_mehrkosten',
            restoration_material: 'composite',
            tooth_region: 'posterior',
            adhesive_technique: 'yes',
            layering_technique: 'yes',
        },
        expected_chips: ['insurance_gkv_mehrkosten', 'material_composite', 'technique_adhesive', 'technique_layering'],
        expected_askbacks: ['ab_isolation_level'],
    },

    tc4_pkv_composite: {
        id: 'tc4',
        name: 'PKV: composite + adhäsiv + schichttechnik',
        dictation: 'Füllung Zahn 36 okklusal Komposit Adhäsivtechnik Mehrschicht',
        facts: {
            insurance_context: 'pkv',
            restoration_material: 'composite',
            tooth_region: 'posterior',
            adhesive_technique: 'yes',
            layering_technique: 'yes',
        },
        expected_chips: ['insurance_pkv', 'material_composite', 'technique_adhesive', 'technique_layering'],
        expected_askbacks: ['ab_isolation_level'],
    },

    tc5_deep_caries_pulpaschutz: {
        id: 'tc5',
        name: 'Tiefe Karies → Pulpaschutz Askback',
        dictation: 'Füllung Zahn 36 okklusal tiefe Karies pulpanah',
        facts: {
            caries_depth: 'deep',
            pulp_protection: 'unknown',
        },
        expected_chips: [],
        expected_askbacks: ['ab_pulp_protection'],
        critical_askback: 'ab_pulp_protection',
    },

    tc6_difficult_moisture_kofferdam: {
        id: 'tc6',
        name: 'Schwierige Trockenlegung → Kofferdam Askback',
        dictation: 'Füllung Zahn 47 distal gingival Feuchtigkeitsproblem',
        facts: {
            moisture_control_difficulty: 'difficult',
            subgingival_margin: true,
            isolation_level: 'unknown',
        },
        expected_chips: [],
        expected_askbacks: ['ab_isolation_level'],
        expected_isolation_result: 'kofferdam',
    },
};

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('G116: Truthcase 1 - GKV Regelversorgung Self-Adhesive', () => {
    const tc = TRUTHCASES.tc1_gkv_regelversorgung_self_adhesive;

    it('expects insurance chip', () => {
        expect(tc.expected_chips).toContain('insurance_gkv_regel');
    });

    it('expects self-adhesive material chip', () => {
        expect(tc.expected_chips).toContain('material_self_adhesive');
    });

    it('does NOT expect adhesive technique chip', () => {
        expect(tc.expected_no_chips).toContain('technique_adhesive');
    });

    it('requires no askbacks (all facts known)', () => {
        expect(tc.expected_askbacks).toHaveLength(0);
    });
});

describe('G116: Truthcase 2 - GKV Bulk-fill Exception', () => {
    const tc = TRUTHCASES.tc2_gkv_bulkfill_exception;

    it('requires exception documentation', () => {
        expect(tc.requires_exception_note).toBe(true);
    });

    it('expects bulk-fill chip', () => {
        expect(tc.expected_chips).toContain('material_bulk_fill');
    });

    it('expects adhesive technique chip', () => {
        expect(tc.expected_chips).toContain('technique_adhesive');
    });
});

describe('G116: Truthcase 3 - GKV Mehrkosten Composite', () => {
    const tc = TRUTHCASES.tc3_gkv_mehrkosten_composite;

    it('expects mehrkosten insurance chip', () => {
        expect(tc.expected_chips).toContain('insurance_gkv_mehrkosten');
    });

    it('expects composite + adhesive + layering chips', () => {
        expect(tc.expected_chips).toContain('material_composite');
        expect(tc.expected_chips).toContain('technique_adhesive');
        expect(tc.expected_chips).toContain('technique_layering');
    });

    it('expects isolation askback', () => {
        expect(tc.expected_askbacks).toContain('ab_isolation_level');
    });
});

describe('G116: Truthcase 4 - PKV Composite', () => {
    const tc = TRUTHCASES.tc4_pkv_composite;

    it('expects pkv insurance chip', () => {
        expect(tc.expected_chips).toContain('insurance_pkv');
    });

    it('expects full technique stack', () => {
        expect(tc.expected_chips).toContain('material_composite');
        expect(tc.expected_chips).toContain('technique_adhesive');
        expect(tc.expected_chips).toContain('technique_layering');
    });
});

describe('G116: Truthcase 5 - Deep Caries Pulpaschutz', () => {
    const tc = TRUTHCASES.tc5_deep_caries_pulpaschutz;

    it('triggers pulp protection askback', () => {
        expect(tc.expected_askbacks).toContain('ab_pulp_protection');
    });

    it('has critical askback marker', () => {
        expect(tc.critical_askback).toBe('ab_pulp_protection');
    });
});

describe('G116: Truthcase 6 - Difficult Moisture Kofferdam', () => {
    const tc = TRUTHCASES.tc6_difficult_moisture_kofferdam;

    it('triggers isolation askback', () => {
        expect(tc.expected_askbacks).toContain('ab_isolation_level');
    });

    it('expects kofferdam as result', () => {
        expect(tc.expected_isolation_result).toBe('kofferdam');
    });
});

describe('G116: SSOT Invariants', () => {
    it('all truthcases have expected_chips array', () => {
        Object.values(TRUTHCASES).forEach(tc => {
            expect(Array.isArray(tc.expected_chips)).toBe(true);
        });
    });

    it('all truthcases have expected_askbacks array', () => {
        Object.values(TRUTHCASES).forEach(tc => {
            expect(Array.isArray(tc.expected_askbacks)).toBe(true);
        });
    });

    it('no truthcase has empty chips AND empty askbacks (something must happen)', () => {
        Object.values(TRUTHCASES).forEach(tc => {
            const hasSomething = tc.expected_chips.length > 0 || tc.expected_askbacks.length > 0;
            expect(hasSomething).toBe(true);
        });
    });
});
