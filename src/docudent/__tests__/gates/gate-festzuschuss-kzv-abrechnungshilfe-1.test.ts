/**
 * Gate: Festzuschuss KZV-Berlin Abrechnungshilfe 1 (2025)
 * 
 * Validates the extracted Festzuschuss amounts fixture from the official
 * KZV-Berlin PDF against spot-check values. This fixture covers BK4-7 only.
 * 
 * Source PDF:
 * https://www.kzv-berlin.de/fileadmin/user_upload/Abrechnung/PDF-Dateien/Abrechnungshilfe_1_2025.pdf
 */
import { describe, it, expect } from 'vitest';
import fixtureData from '../../__fixtures__/festzuschuss_amounts_kzv_berlin_2025_abrechnungshilfe_1.json';

// Canonical source URL (must match exactly)
const CANONICAL_PDF_URL =
    'https://www.kzv-berlin.de/fileadmin/user_upload/Abrechnung/PDF-Dateien/Abrechnungshilfe_1_2025.pdf';

describe('GATE: Festzuschuss KZV-Berlin Abrechnungshilfe 1 (2025)', () => {
    // ═══════════════════════════════════════════════════════════════
    // META VALIDATION
    // ═══════════════════════════════════════════════════════════════

    describe('Meta Validation', () => {
        it('sourcePdf matches canonical URL exactly', () => {
            expect(fixtureData._meta.sourcePdf).toBe(CANONICAL_PDF_URL);
        });

        it('year is 2025', () => {
            expect(fixtureData._meta.year).toBe(2025);
        });

        it('publisher is KZV-Berlin / KZBV', () => {
            expect(fixtureData._meta.publisher).toBe('KZV-Berlin / KZBV');
        });

        it('lastVerified is a valid ISO date string', () => {
            expect(fixtureData._meta.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('pdfEvidence.page_1_indexed is 4', () => {
            expect(fixtureData._meta.pdfEvidence.page_1_indexed).toBe(4);
        });

        it('coverage includes Befundklassen 4, 5, 6, 7', () => {
            expect(fixtureData._meta.coverage.befundklassen).toEqual(['4', '5', '6', '7']);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // SPOT-CHECK VALUES (5+ exact matches from PDF)
    // ═══════════════════════════════════════════════════════════════

    describe('Spot-Check Values', () => {
        const amounts = fixtureData.festzuschuss_amounts;

        it('FZ_4.8 bonus_60 = 354.77', () => {
            expect(amounts['FZ_4.8'].bonus_60).toBeCloseTo(354.77, 2);
        });

        it('FZ_5.4 bonus_75 = 573.21', () => {
            expect(amounts['FZ_5.4'].bonus_75).toBeCloseTo(573.21, 2);
        });

        it('FZ_6.10 bonus_60 = 270.11', () => {
            expect(amounts['FZ_6.10'].bonus_60).toBeCloseTo(270.11, 2);
        });

        it('FZ_6.10 bonus_100 = 450.19', () => {
            expect(amounts['FZ_6.10'].bonus_100).toBeCloseTo(450.19, 2);
        });

        it('FZ_7.1 bonus_60 = 228.75', () => {
            expect(amounts['FZ_7.1'].bonus_60).toBeCloseTo(228.75, 2);
        });

        it('FZ_7.5 bonus_100 = 930.51', () => {
            expect(amounts['FZ_7.5'].bonus_100).toBeCloseTo(930.51, 2);
        });

        it('FZ_7.7 bonus_70 = 93.30', () => {
            expect(amounts['FZ_7.7'].bonus_70).toBeCloseTo(93.30, 2);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // DATA STRUCTURE VALIDATION
    // ═══════════════════════════════════════════════════════════════

    describe('Data Structure Validation', () => {
        const amounts = fixtureData.festzuschuss_amounts;
        const fzCodes = Object.keys(amounts);

        it('has exactly 27 FZ codes', () => {
            expect(fzCodes).toHaveLength(27);
        });

        it('all FZ codes have 4 bonus columns', () => {
            for (const code of fzCodes) {
                const entry = amounts[code as keyof typeof amounts];
                expect(entry).toHaveProperty('bonus_60');
                expect(entry).toHaveProperty('bonus_70');
                expect(entry).toHaveProperty('bonus_75');
                expect(entry).toHaveProperty('bonus_100');
            }
        });

        it('all amounts are positive numbers', () => {
            for (const code of fzCodes) {
                const entry = amounts[code as keyof typeof amounts];
                expect(entry.bonus_60).toBeGreaterThan(0);
                expect(entry.bonus_70).toBeGreaterThan(0);
                expect(entry.bonus_75).toBeGreaterThan(0);
                expect(entry.bonus_100).toBeGreaterThan(0);
            }
        });

        it('bonus_100 (Härtefall) is always highest for each code', () => {
            for (const code of fzCodes) {
                const entry = amounts[code as keyof typeof amounts];
                expect(entry.bonus_100).toBeGreaterThan(entry.bonus_75);
                expect(entry.bonus_75).toBeGreaterThan(entry.bonus_70);
                expect(entry.bonus_70).toBeGreaterThan(entry.bonus_60);
            }
        });

        it('FZ codes start with expected prefixes', () => {
            const prefixes = ['FZ_4.', 'FZ_5.', 'FZ_6.', 'FZ_7.'];
            for (const code of fzCodes) {
                const hasValidPrefix = prefixes.some(p => code.startsWith(p));
                expect(hasValidPrefix, `${code} should start with FZ_4., FZ_5., FZ_6., or FZ_7.`).toBe(true);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // BONUS RATIO SANITY CHECKS
    // ═══════════════════════════════════════════════════════════════

    describe('Bonus Ratio Sanity Checks', () => {
        const amounts = fixtureData.festzuschuss_amounts;

        it('bonus_70 ≈ bonus_60 * (70/60) within 1%', () => {
            const entry = amounts['FZ_6.10'];
            const expectedRatio = 70 / 60; // ≈ 1.1667
            const actualRatio = entry.bonus_70 / entry.bonus_60;
            expect(actualRatio).toBeCloseTo(expectedRatio, 1);
        });

        it('bonus_100 ≈ bonus_60 * (100/60) within 1%', () => {
            const entry = amounts['FZ_7.5'];
            const expectedRatio = 100 / 60; // ≈ 1.6667
            const actualRatio = entry.bonus_100 / entry.bonus_60;
            expect(actualRatio).toBeCloseTo(expectedRatio, 1);
        });
    });
});
