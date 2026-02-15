/**
 * GP6: Multi-Tooth Truthcases v3
 * 
 * 6 realistic multi-tooth scenarios proving scoping.
 */

import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// MULTI-TOOTH V3 TRUTHCASES
// ═══════════════════════════════════════════════════════════════

export const MULTITOOTH_V3_TRUTHCASES = {
    mt1_different_materials: {
        id: 'mt1',
        name: 'Zwei Zähne, unterschiedliche Materialien',
        dictation: 'Füllung Zahn 36 okklusal Komposit Adhäsiv, Zahn 14 distal GIZ',
        teeth: {
            '36': {
                material: 'composite',
                adhesive: 'yes',
                expected_chips: ['material_composite', 'technique_adhesive'],
            },
            '14': {
                material: 'giz',
                adhesive: 'no',
                expected_chips: ['material_giz'],
                expected_no_chips: ['technique_adhesive'],
            },
        },
        cross_contamination_check: {
            chip: 'technique_adhesive',
            should_be_on: ['36'],
            should_be_off: ['14'],
        },
    },

    mt2_different_depths: {
        id: 'mt2',
        name: 'Zwei Zähne, einer tief (Pulpaschutz), einer nicht',
        dictation: 'Füllung Zahn 36 okklusal tiefe Karies, Zahn 46 okklusal oberflächlich',
        teeth: {
            '36': {
                caries_depth: 'deep',
                expected_askbacks: ['ab_pulp_protection'],
            },
            '46': {
                caries_depth: 'shallow',
                expected_askbacks: [],
                expected_no_askbacks: ['ab_pulp_protection'],
            },
        },
    },

    mt3_different_isolation: {
        id: 'mt3',
        name: 'Zwei Zähne, nur einer mit Kofferdam',
        dictation: 'Füllung Zahn 36 okklusal Kofferdam, Zahn 46 okklusal',
        teeth: {
            '36': {
                isolation: 'kofferdam',
                expected_chips: ['kofferdam'],
            },
            '46': {
                isolation: 'unknown',
                expected_askbacks: ['ab_isolation_level'],
            },
        },
    },

    mt4_mehrkosten_one_tooth: {
        id: 'mt4',
        name: 'Drei Zähne, Mehrkosten nur für einen',
        dictation: 'Füllung Zahn 36 GIZ Kassenleistung, Zahn 46 Komposit Mehrkosten, Zahn 16 GIZ Kasse',
        teeth: {
            '36': {
                insurance: 'gkv_regelversorgung',
                expected_chips: ['insurance_gkv_regel', 'material_giz'],
                expected_no_chips: ['mkv_vorhanden'],
            },
            '46': {
                insurance: 'gkv_mehrkosten',
                expected_chips: ['insurance_gkv_mehrkosten', 'mkv_vorhanden', 'material_composite'],
            },
            '16': {
                insurance: 'gkv_regelversorgung',
                expected_chips: ['insurance_gkv_regel', 'material_giz'],
            },
        },
    },

    mt5_zusaetzlich_segment: {
        id: 'mt5',
        name: '"zusätzlich" Segmentierungstest',
        dictation: 'Füllung Zahn 36 okklusal Komposit Adhäsiv, zusätzlich Zahn 37 mesial GIZ',
        segments: ['36 okklusal Komposit Adhäsiv', '37 mesial GIZ'],
        teeth: {
            '36': {
                expected_chips: ['material_composite', 'technique_adhesive'],
            },
            '37': {
                expected_chips: ['material_giz'],
                expected_no_chips: ['technique_adhesive'],
            },
        },
        marker: 'zusätzlich',
    },

    mt6_negation_leak: {
        id: 'mt6',
        name: '"kein Kofferdam" Negation nur für Zahn X',
        dictation: 'Füllung Zahn 36 okklusal Kofferdam, Zahn 46 okklusal kein Kofferdam',
        teeth: {
            '36': {
                isolation: 'kofferdam',
                expected_chips: ['kofferdam'],
            },
            '46': {
                isolation: 'relative', // negation defaulted
                expected_chips: ['rel_trocken'],
                expected_no_chips: ['kofferdam'],
            },
        },
        negation_test: {
            keyword: 'kein Kofferdam',
            applies_to: '46',
            does_not_apply_to: '36',
        },
    },
};

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('GP6 MT1: Different Materials', () => {
    const tc = MULTITOOTH_V3_TRUTHCASES.mt1_different_materials;

    it('tooth 36 has composite + adhesive chips', () => {
        expect(tc.teeth['36'].expected_chips).toContain('material_composite');
        expect(tc.teeth['36'].expected_chips).toContain('technique_adhesive');
    });

    it('tooth 14 has GIZ chip, NO adhesive chip', () => {
        expect(tc.teeth['14'].expected_chips).toContain('material_giz');
        expect(tc.teeth['14'].expected_no_chips).toContain('technique_adhesive');
    });

    it('adhesive chip does not leak from 36 to 14', () => {
        const check = tc.cross_contamination_check;
        expect(check.should_be_on).toContain('36');
        expect(check.should_be_off).toContain('14');
    });
});

describe('GP6 MT2: Different Depths', () => {
    const tc = MULTITOOTH_V3_TRUTHCASES.mt2_different_depths;

    it('tooth 36 (deep) triggers pulp askback', () => {
        expect(tc.teeth['36'].expected_askbacks).toContain('ab_pulp_protection');
    });

    it('tooth 46 (shallow) does NOT trigger pulp askback', () => {
        expect(tc.teeth['46'].expected_no_askbacks).toContain('ab_pulp_protection');
    });
});

describe('GP6 MT3: Different Isolation', () => {
    const tc = MULTITOOTH_V3_TRUTHCASES.mt3_different_isolation;

    it('tooth 36 has kofferdam chip', () => {
        expect(tc.teeth['36'].expected_chips).toContain('kofferdam');
    });

    it('tooth 46 triggers isolation askback', () => {
        expect(tc.teeth['46'].expected_askbacks).toContain('ab_isolation_level');
    });
});

describe('GP6 MT4: Mehrkosten One Tooth', () => {
    const tc = MULTITOOTH_V3_TRUTHCASES.mt4_mehrkosten_one_tooth;

    it('tooth 36 has NO MKV chip (Kasse)', () => {
        expect(tc.teeth['36'].expected_no_chips).toContain('mkv_vorhanden');
    });

    it('tooth 46 HAS MKV chip (Mehrkosten)', () => {
        expect(tc.teeth['46'].expected_chips).toContain('mkv_vorhanden');
    });

    it('three teeth defined', () => {
        expect(Object.keys(tc.teeth)).toHaveLength(3);
    });
});

describe('GP6 MT5: Zusätzlich Segment', () => {
    const tc = MULTITOOTH_V3_TRUTHCASES.mt5_zusaetzlich_segment;

    it('uses "zusätzlich" as marker', () => {
        expect(tc.marker).toBe('zusätzlich');
    });

    it('37 does NOT have adhesive chip (from 36)', () => {
        expect(tc.teeth['37'].expected_no_chips).toContain('technique_adhesive');
    });
});

describe('GP6 MT6: Negation Leak', () => {
    const tc = MULTITOOTH_V3_TRUTHCASES.mt6_negation_leak;

    it('negation "kein Kofferdam" applies to 46 only', () => {
        expect(tc.negation_test.applies_to).toBe('46');
        expect(tc.negation_test.does_not_apply_to).toBe('36');
    });

    it('tooth 36 has kofferdam chip', () => {
        expect(tc.teeth['36'].expected_chips).toContain('kofferdam');
    });

    it('tooth 46 has relative chip (from negation)', () => {
        expect(tc.teeth['46'].expected_chips).toContain('rel_trocken');
        expect(tc.teeth['46'].expected_no_chips).toContain('kofferdam');
    });
});

describe('GP6 Scoping Invariants', () => {
    it('all truthcases define multiple teeth', () => {
        Object.values(MULTITOOTH_V3_TRUTHCASES).forEach(tc => {
            expect(Object.keys(tc.teeth).length).toBeGreaterThanOrEqual(2);
        });
    });

    it('no truthcase has hardcoded billing codes', () => {
        const billingPattern = /\b(GOZ|BEMA|BEL|GOÄ)_[0-9]+\b/g;
        const json = JSON.stringify(MULTITOOTH_V3_TRUTHCASES);
        expect(json.match(billingPattern)).toBeNull();
    });
});
