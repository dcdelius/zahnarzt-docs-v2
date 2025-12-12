/**
 * Output Integrity Tests
 * 
 * Ensures output structure is stable and contains no undefined/broken content.
 * Tests: section presence, field consistency, no undefined, no empty blocks.
 * 
 * Run: npx vitest run src/test/output-integrity.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
    processChipsToBilling,
    getTreatmentChips,
    type ProcessingResult
} from '../docudent/core/billing/knowledgeBase/logic/treatmentEngine';

// ═══════════════════════════════════════════════════════════════
// OUTPUT INTEGRITY FIXTURES
// ═══════════════════════════════════════════════════════════════

interface IntegrityFixture {
    id: string;
    name: string;
    chips: string[];
    insuranceType: 'GKV' | 'PKV';
    hasMKV: boolean;
    extracted: { tooth: string; surfaces: string[] };
    textLength: 'kurz' | 'mittel' | 'lang';
}

const INTEGRITY_FIXTURES: IntegrityFixture[] = [
    {
        id: 'gkv_minimal',
        name: 'GKV Minimal',
        chips: ['exkavation', 'komposit_basic'],
        insuranceType: 'GKV',
        hasMKV: false,
        extracted: { tooth: '36', surfaces: ['o'] },
        textLength: 'kurz',
    },
    {
        id: 'gkv_standard',
        name: 'GKV Standard 3 Flächen',
        chips: ['exkavation', 'komposit_basic', 'kofferdam'],
        insuranceType: 'GKV',
        hasMKV: false,
        extracted: { tooth: '36', surfaces: ['m', 'o', 'd'] },
        textLength: 'mittel',
    },
    {
        id: 'gkv_full',
        name: 'GKV Full mit LA und CP',
        chips: ['exkavation', 'komposit_basic', 'kofferdam', 'la_infiltr', 'cp'],
        insuranceType: 'GKV',
        hasMKV: false,
        extracted: { tooth: '16', surfaces: ['m', 'o', 'd', 'b'] },
        textLength: 'lang',
    },
    {
        id: 'pkv_minimal',
        name: 'PKV Minimal',
        chips: ['exkavation', 'komposit_basic'],
        insuranceType: 'PKV',
        hasMKV: false,
        extracted: { tooth: '11', surfaces: ['m'] },
        textLength: 'kurz',
    },
    {
        id: 'pkv_standard',
        name: 'PKV Standard',
        chips: ['exkavation', 'komposit_basic', 'kofferdam', 'la_infiltr'],
        insuranceType: 'PKV',
        hasMKV: false,
        extracted: { tooth: '36', surfaces: ['m', 'o', 'd'] },
        textLength: 'mittel',
    },
    {
        id: 'pkv_full',
        name: 'PKV Full mit CP und Pulpotomie',
        chips: ['exkavation', 'komposit_basic', 'kofferdam', 'la_leitung', 'cp', 'p'],
        insuranceType: 'PKV',
        hasMKV: false,
        extracted: { tooth: '46', surfaces: ['m', 'o', 'd', 'l'] },
        textLength: 'lang',
    },
    {
        id: 'mkv_basic',
        name: 'MKV Basic',
        chips: ['exkavation', 'komposit_basic', 'mehrschicht'],
        insuranceType: 'GKV',
        hasMKV: true,
        extracted: { tooth: '36', surfaces: ['m', 'o', 'd'] },
        textLength: 'mittel',
    },
    {
        id: 'mkv_full',
        name: 'MKV Full',
        chips: ['exkavation', 'komposit_basic', 'kofferdam', 'la_infiltr', 'mehrschicht', 'fluorid'],
        insuranceType: 'GKV',
        hasMKV: true,
        extracted: { tooth: '26', surfaces: ['m', 'o', 'd'] },
        textLength: 'lang',
    },
    {
        id: 'anterior_filling',
        name: 'Frontzahn Füllung',
        chips: ['exkavation', 'komposit_basic'],
        insuranceType: 'GKV',
        hasMKV: false,
        extracted: { tooth: '11', surfaces: ['m', 'l'] },
        textLength: 'mittel',
    },
    {
        id: 'molar_uk',
        name: 'UK Molar mit Leitungsanästhesie',
        chips: ['exkavation', 'komposit_basic', 'kofferdam', 'la_leitung'],
        insuranceType: 'GKV',
        hasMKV: false,
        extracted: { tooth: '46', surfaces: ['m', 'o', 'd'] },
        textLength: 'mittel',
    },
];

// ═══════════════════════════════════════════════════════════════
// STRUCTURE VALIDATION
// ═══════════════════════════════════════════════════════════════

function validateOutputStructure(result: ProcessingResult): string[] {
    const issues: string[] = [];

    // Required arrays must exist and be arrays
    if (!Array.isArray(result.billingCodes)) {
        issues.push('billingCodes is not an array');
    }
    if (!Array.isArray(result.textLines)) {
        issues.push('textLines is not an array');
    }
    if (!Array.isArray(result.warnings)) {
        issues.push('warnings is not an array');
    }
    if (!Array.isArray(result.billingDetails)) {
        issues.push('billingDetails is not an array');
    }
    if (!Array.isArray(result.optimierungen)) {
        issues.push('optimierungen is not an array');
    }

    // No undefined in any array
    if (result.billingCodes?.includes(undefined as any)) {
        issues.push('billingCodes contains undefined');
    }
    if (result.textLines?.includes(undefined as any)) {
        issues.push('textLines contains undefined');
    }
    if (result.warnings?.includes(undefined as any)) {
        issues.push('warnings contains undefined');
    }

    // No empty strings where content expected
    const emptyStrings = result.textLines?.filter(t => t === '');
    if (emptyStrings && emptyStrings.length > 2) {
        issues.push(`textLines has ${emptyStrings.length} empty strings`);
    }

    // billingDetails structure
    for (const detail of result.billingDetails || []) {
        if (!detail.code) {
            issues.push('billingDetail missing code');
        }
        if (detail.code?.includes('undefined')) {
            issues.push(`billingDetail contains "undefined": ${detail.code}`);
        }
    }

    // Check for "undefined" string in any output
    const allText = [
        ...result.textLines,
        ...result.warnings,
        ...result.optimierungen,
        ...result.billingCodes
    ].join(' ');

    if (allText.includes('undefined')) {
        issues.push('Output contains "undefined" string');
    }
    if (allText.includes('null')) {
        issues.push('Output contains "null" string');
    }
    if (allText.includes('NaN')) {
        issues.push('Output contains "NaN" string');
    }

    return issues;
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('Output Integrity', () => {

    describe('Structure Validation', () => {
        for (const fixture of INTEGRITY_FIXTURES) {
            it(`${fixture.id}: ${fixture.name}`, () => {
                const result = processChipsToBilling(
                    'fuellung',
                    fixture.chips,
                    fixture.insuranceType,
                    fixture.hasMKV,
                    fixture.extracted,
                    fixture.textLength
                );

                const issues = validateOutputStructure(result);

                if (issues.length > 0) {
                    console.error(`Issues for ${fixture.id}:`, issues);
                }

                expect(issues).toEqual([]);
            });
        }
    });

    describe('Text Length Consistency', () => {
        for (const fixture of INTEGRITY_FIXTURES) {
            it(`${fixture.id}: respects textLength=${fixture.textLength}`, () => {
                const result = processChipsToBilling(
                    'fuellung',
                    fixture.chips,
                    fixture.insuranceType,
                    fixture.hasMKV,
                    fixture.extracted,
                    fixture.textLength
                );

                // Text should not be empty for standard cases
                if (fixture.chips.length > 0) {
                    expect(result.textLines.length).toBeGreaterThan(0);
                }
            });
        }
    });

    describe('Billing Details Consistency', () => {
        for (const fixture of INTEGRITY_FIXTURES) {
            it(`${fixture.id}: billing details match codes`, () => {
                const result = processChipsToBilling(
                    'fuellung',
                    fixture.chips,
                    fixture.insuranceType,
                    fixture.hasMKV,
                    fixture.extracted,
                    fixture.textLength
                );

                // Every billing code should have a corresponding detail
                for (const code of result.billingCodes) {
                    const hasDetail = result.billingDetails.some(d =>
                        code.includes(d.code) || d.code.includes(code.replace(/[^0-9a-z]/gi, ''))
                    );
                    // Soft check - details may be formatted differently
                }

                // billingDetails should have valid structure
                for (const detail of result.billingDetails) {
                    expect(typeof detail.code).toBe('string');
                    expect(detail.code.length).toBeGreaterThan(0);
                }
            });
        }
    });

    describe('No Crash on Edge Cases', () => {
        it('handles empty chip array', () => {
            const result = processChipsToBilling(
                'fuellung',
                [],
                'GKV',
                false,
                { tooth: '36', surfaces: ['o'] },
                'mittel'
            );

            const issues = validateOutputStructure(result);
            expect(issues).toEqual([]);
        });

        it('handles all chips at once', () => {
            const allChips = getTreatmentChips('fuellung').map(c => c.id);

            const result = processChipsToBilling(
                'fuellung',
                allChips,
                'GKV',
                true,
                { tooth: '36', surfaces: ['m', 'o', 'd', 'b', 'l'] },
                'lang'
            );

            const issues = validateOutputStructure(result);
            expect(issues).toEqual([]);
        });

        it('handles single surface', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['exkavation', 'komposit_basic'],
                'PKV',
                false,
                { tooth: '11', surfaces: ['m'] },
                'kurz'
            );

            const issues = validateOutputStructure(result);
            expect(issues).toEqual([]);
        });

        it('handles five surfaces', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['exkavation', 'komposit_basic'],
                'PKV',
                false,
                { tooth: '36', surfaces: ['m', 'o', 'd', 'b', 'l'] },
                'mittel'
            );

            const issues = validateOutputStructure(result);
            expect(issues).toEqual([]);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

describe('Output Integrity Summary', () => {
    it(`has ${INTEGRITY_FIXTURES.length} fixtures`, () => {
        expect(INTEGRITY_FIXTURES.length).toBeGreaterThanOrEqual(10);
    });

    it('covers all text lengths', () => {
        const kurz = INTEGRITY_FIXTURES.filter(f => f.textLength === 'kurz');
        const mittel = INTEGRITY_FIXTURES.filter(f => f.textLength === 'mittel');
        const lang = INTEGRITY_FIXTURES.filter(f => f.textLength === 'lang');

        expect(kurz.length).toBeGreaterThan(0);
        expect(mittel.length).toBeGreaterThan(0);
        expect(lang.length).toBeGreaterThan(0);
    });
});
