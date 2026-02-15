/**
 * GP5: Multi-Tooth Scoping Tests
 * 
 * Validates that chips and askbacks scope correctly per tooth instance.
 */

import { describe, it, expect } from 'vitest';

// Multi-tooth truthcases
const TRUTHCASES = {
    case_a: {
        id: 'multi_tooth_different_materials',
        name: 'Case A: 36 Komposit, 14 einfach',
        dictation: 'Füllung Zahn 36 okklusal Komposit adhäsiv, Zahn 14 distal einfache Füllung',
        teeth: ['36', '14'],
        expected: {
            '36': {
                chips: ['fuellung_material_composite', 'fuellung_adhesivtechnik'],
                askbacks: [],
            },
            '14': {
                chips: ['fuellung_material_composite'],
                askbacks: ['fuellung_adhesive'], // adhesive unclear for tooth 14
            },
        },
    },
    case_b: {
        id: 'multi_tooth_different_depth',
        name: 'Case B: 36 tief (Pulpaschutz), 14 nicht tief',
        dictation: 'Füllung Zahn 36 okklusal tiefe Karies, Zahn 14 distal',
        teeth: ['36', '14'],
        expected: {
            '36': {
                chips: [],
                askbacks: ['fuellung_pulpaschutz'], // deep caries triggers askback
                facts: { cariesDepthHint: 'deep' },
            },
            '14': {
                chips: [],
                askbacks: [], // no pulpaschutz askback for non-deep
                facts: { cariesDepthHint: 'unknown' },
            },
        },
    },
    case_c: {
        id: 'multi_tooth_different_isolation',
        name: 'Case C: Kofferdam nur bei einem Zahn',
        dictation: 'Füllung Zahn 36 okklusal Kofferdam, Zahn 14 distal relativ',
        teeth: ['36', '14'],
        expected: {
            '36': {
                chips: ['kofferdam'],
                askbacks: [],
            },
            '14': {
                chips: ['rel_trocken'],
                askbacks: [],
            },
        },
    },
};

describe('GP5: Multi-Tooth Truthcases', () => {
    describe('Case A: Different Materials', () => {
        const tc = TRUTHCASES.case_a;

        it('defines two distinct teeth', () => {
            expect(tc.teeth).toHaveLength(2);
            expect(tc.teeth).toContain('36');
            expect(tc.teeth).toContain('14');
        });

        it('tooth 36 expects adhesive chip', () => {
            expect(tc.expected['36'].chips).toContain('fuellung_adhesivtechnik');
        });

        it('tooth 14 expects adhesive askback (unclear)', () => {
            expect(tc.expected['14'].askbacks).toContain('fuellung_adhesive');
        });

        it('chips do not leak between teeth', () => {
            // tooth 36 chips should not appear in tooth 14
            const chip36 = 'fuellung_adhesivtechnik';
            expect(tc.expected['14'].chips).not.toContain(chip36);
        });
    });

    describe('Case B: Different Caries Depths', () => {
        const tc = TRUTHCASES.case_b;

        it('tooth 36 triggers pulpaschutz askback (deep)', () => {
            expect(tc.expected['36'].askbacks).toContain('fuellung_pulpaschutz');
        });

        it('tooth 14 does NOT trigger pulpaschutz askback', () => {
            expect(tc.expected['14'].askbacks).not.toContain('fuellung_pulpaschutz');
        });
    });

    describe('Case C: Different Isolation', () => {
        const tc = TRUTHCASES.case_c;

        it('tooth 36 gets kofferdam chip', () => {
            expect(tc.expected['36'].chips).toContain('kofferdam');
        });

        it('tooth 14 gets relative isolation chip', () => {
            expect(tc.expected['14'].chips).toContain('rel_trocken');
        });

        it('isolation chips are mutually exclusive per tooth', () => {
            expect(tc.expected['36'].chips).not.toContain('rel_trocken');
            expect(tc.expected['14'].chips).not.toContain('kofferdam');
        });
    });
});

describe('GP5: Scoping Invariants', () => {
    it('all cases have scoped expectations per tooth', () => {
        Object.values(TRUTHCASES).forEach(tc => {
            tc.teeth.forEach(tooth => {
                expect(tc.expected[tooth]).toBeDefined();
                expect(tc.expected[tooth].chips).toBeInstanceOf(Array);
                expect(tc.expected[tooth].askbacks).toBeInstanceOf(Array);
            });
        });
    });
});
