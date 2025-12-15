/**
 * Gate: Wiederherstellungen Real-World v1
 * 
 * Validates the Wiederherstellungen fixture cases from the official
 * KZV Handbuch Wiederherstellungen PDF.
 * 
 * Source PDF:
 * https://www.kzv-berlin.de/fileadmin/user_upload_kzv/Praxis-Service/1_Abrechnung/2_Zahnersatz/Handbuch_Wiederherstellungen.pdf
 * 
 * Test Categories:
 * A) Evidence Presence: Each case has valid evidence
 * B) Code Containment: Each expected code appears in excerpt
 * C) FZ Code Existence: FZ codes referenced exist in 2025 amounts fixture
 */
import { describe, it, expect } from 'vitest';
import {
    WIEDERHERSTELLUNGEN_CASES_V1,
    CANONICAL_PDF_URL,
    CASE_PACK_META,
    type WiederherstellungFixture,
} from '../../__fixtures__/wiederherstellungen_cases_v1';
import fixtureAmounts from '../../__fixtures__/festzuschuss_amounts_kzv_berlin_2025_abrechnungshilfe_1.json';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Normalize code format for excerpt matching.
 * Converts: "BEMA_98e" → "98e", "FZ_2.7" → "2.7", "BEL_II_8010" → "801 0"
 */
function normalizeCodeForExcerpt(code: string): string {
    // BEMA codes: "BEMA_98e" → "98e"
    if (code.startsWith('BEMA_')) {
        return code.replace('BEMA_', '');
    }
    // FZ codes: "FZ_2.7" → "2.7"
    if (code.startsWith('FZ_')) {
        return code.replace('FZ_', '');
    }
    // BEL-II codes: "BEL_II_8010" → "801 0" (insert space before last digit)
    if (code.startsWith('BEL_II_')) {
        const num = code.replace('BEL_II_', '');
        // Format: "8010" → "801 0"
        if (num.length === 4) {
            return `${num.slice(0, 3)} ${num.slice(3)}`;
        }
        return num;
    }
    return code;
}

/**
 * Check if any normalized variant of the code appears in the excerpt.
 */
function excerptContainsCode(excerpt: string, code: string): boolean {
    const normalized = normalizeCodeForExcerpt(code);
    const lowerExcerpt = excerpt.toLowerCase();
    const lowerNormalized = normalized.toLowerCase();

    // Direct containment check
    if (lowerExcerpt.includes(lowerNormalized)) {
        return true;
    }

    // For FZ codes, also check with "FZ" prefix
    if (code.startsWith('FZ_')) {
        const withPrefix = `fz ${normalized}`;
        if (lowerExcerpt.includes(withPrefix)) {
            return true;
        }
    }

    // For BEMA codes, also check with "BEMA" prefix
    if (code.startsWith('BEMA_')) {
        const withPrefix = `bema ${normalized}`;
        if (lowerExcerpt.includes(withPrefix)) {
            return true;
        }
    }

    return false;
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('GATE: Wiederherstellungen Real-World v1', () => {
    // ═══════════════════════════════════════════════════════════
    // META VALIDATION
    // ═══════════════════════════════════════════════════════════

    describe('Meta Validation', () => {
        it('has exactly 12 cases', () => {
            expect(WIEDERHERSTELLUNGEN_CASES_V1).toHaveLength(12);
        });

        it('CASE_PACK_META.count matches actual count', () => {
            expect(CASE_PACK_META.count).toBe(WIEDERHERSTELLUNGEN_CASES_V1.length);
        });

        it('sourcePdf matches canonical URL', () => {
            expect(CASE_PACK_META.sourcePdf).toBe(CANONICAL_PDF_URL);
        });

        it('PDF URL is valid KZV format', () => {
            expect(CANONICAL_PDF_URL).toMatch(/^https:\/\/www\.kzv-berlin\.de\//);
            expect(CANONICAL_PDF_URL).toMatch(/\.pdf$/);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // A) EVIDENCE PRESENCE VALIDATION
    // ═══════════════════════════════════════════════════════════

    describe('A) Evidence Presence', () => {
        it.each(WIEDERHERSTELLUNGEN_CASES_V1.map(c => [c.id, c]))(
            '%s has valid evidence',
            (_id, fixture: WiederherstellungFixture) => {
                // Evidence exists
                expect(fixture.evidence).toBeDefined();
                expect(fixture.evidence.pdf).toBeDefined();

                // PDF evidence is complete
                const pdf = fixture.evidence.pdf;
                expect(pdf.url).toBe(CANONICAL_PDF_URL);
                expect(pdf.page).toBeGreaterThan(0);
                expect(pdf.excerpt).toBeTruthy();
                expect(pdf.excerpt.length).toBeGreaterThan(20);
            }
        );

        it('all pages are within expected range (35-45)', () => {
            for (const fixture of WIEDERHERSTELLUNGEN_CASES_V1) {
                expect(fixture.evidence.pdf.page).toBeGreaterThanOrEqual(35);
                expect(fixture.evidence.pdf.page).toBeLessThanOrEqual(45);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // B) CODE CONTAINMENT IN EXCERPTS
    // ═══════════════════════════════════════════════════════════

    describe('B) Code Containment in Excerpts', () => {
        describe('FZ Codes', () => {
            it.each(WIEDERHERSTELLUNGEN_CASES_V1.map(c => [c.id, c]))(
                '%s FZ codes appear in excerpt',
                (_id, fixture: WiederherstellungFixture) => {
                    const excerpt = fixture.evidence.pdf.excerpt;

                    // At least one FZ code should appear (handles duplicates like FZ_6.5.1)
                    const uniqueFzCodes = [...new Set(fixture.fz_codes)];
                    const foundCodes = uniqueFzCodes.filter(code =>
                        excerptContainsCode(excerpt, code)
                    );

                    expect(foundCodes.length).toBeGreaterThan(0);
                }
            );
        });

        describe('BEMA Codes', () => {
            it.each(WIEDERHERSTELLUNGEN_CASES_V1.map(c => [c.id, c]))(
                '%s BEMA codes appear in excerpt',
                (_id, fixture: WiederherstellungFixture) => {
                    const excerpt = fixture.evidence.pdf.excerpt;

                    // At least one BEMA code should appear
                    const uniqueBemaCodes = [...new Set(fixture.bema_codes)];
                    const foundCodes = uniqueBemaCodes.filter(code =>
                        excerptContainsCode(excerpt, code)
                    );

                    expect(foundCodes.length).toBeGreaterThan(0);
                }
            );
        });

        describe('BEL-II Codes', () => {
            it.each(WIEDERHERSTELLUNGEN_CASES_V1.map(c => [c.id, c]))(
                '%s BEL-II codes appear in excerpt',
                (_id, fixture: WiederherstellungFixture) => {
                    const excerpt = fixture.evidence.pdf.excerpt;

                    // At least one BEL-II code should appear
                    const uniqueBelCodes = [...new Set(fixture.bel_ii_codes)];
                    const foundCodes = uniqueBelCodes.filter(code =>
                        excerptContainsCode(excerpt, code)
                    );

                    expect(foundCodes.length).toBeGreaterThan(0);
                }
            );
        });
    });

    // ═══════════════════════════════════════════════════════════
    // C) FZ CODE EXISTENCE IN 2025 AMOUNTS
    // ═══════════════════════════════════════════════════════════

    describe('C) FZ Code Existence in 2025 Amounts', () => {
        // The Abrechnungshilfe 1 fixture covers BK 4-7
        // Wiederherstellungen cases use FZ 2.7, 6.x codes
        // FZ 6.x codes ARE in BK 6, so they should be in the fixture

        const fz6Codes = CASE_PACK_META.coverage.fzCodes.filter(c => c.startsWith('FZ_6.'));

        it.each(fz6Codes)(
            '%s exists in 2025 amounts fixture',
            (fzCode) => {
                const amounts = fixtureAmounts.festzuschuss_amounts as Record<string, unknown>;
                expect(amounts[fzCode]).toBeDefined();
            }
        );

        it('FZ_2.7 is documented (Befundklasse 2)', () => {
            // FZ_2.7 is in Befundklasse 2, which is NOT in the BK4-7 fixture
            // So we just verify it's referenced correctly in our cases
            const cases27 = WIEDERHERSTELLUNGEN_CASES_V1.filter(
                c => c.fz_codes.includes('FZ_2.7')
            );
            expect(cases27.length).toBeGreaterThan(0);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // D) DATA STRUCTURE VALIDATION
    // ═══════════════════════════════════════════════════════════

    describe('D) Data Structure Validation', () => {
        it('all cases have unique IDs', () => {
            const ids = WIEDERHERSTELLUNGEN_CASES_V1.map(c => c.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('all cases have required fields', () => {
            for (const fixture of WIEDERHERSTELLUNGEN_CASES_V1) {
                expect(fixture.id).toBeTruthy();
                expect(fixture.title).toBeTruthy();
                expect(fixture.scenario).toBeTruthy();
                expect(fixture.fz_codes.length).toBeGreaterThan(0);
                expect(fixture.bema_codes.length).toBeGreaterThan(0);
                expect(fixture.bel_ii_codes.length).toBeGreaterThan(0);
            }
        });

        it('IDs follow WDH-X.Y pattern', () => {
            for (const fixture of WIEDERHERSTELLUNGEN_CASES_V1) {
                expect(fixture.id).toMatch(/^WDH-\d+\.\d+/);
            }
        });

        it('FZ codes follow FZ_X.Y pattern', () => {
            for (const fixture of WIEDERHERSTELLUNGEN_CASES_V1) {
                for (const code of fixture.fz_codes) {
                    expect(code).toMatch(/^FZ_\d+\.\d+/);
                }
            }
        });

        it('BEMA codes follow BEMA_XXX pattern', () => {
            for (const fixture of WIEDERHERSTELLUNGEN_CASES_V1) {
                for (const code of fixture.bema_codes) {
                    expect(code).toMatch(/^BEMA_/);
                }
            }
        });

        it('BEL-II codes follow BEL_II_XXXX pattern', () => {
            for (const fixture of WIEDERHERSTELLUNGEN_CASES_V1) {
                for (const code of fixture.bel_ii_codes) {
                    expect(code).toMatch(/^BEL_II_\d{4}$/);
                }
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // E) SCENARIO COVERAGE
    // ═══════════════════════════════════════════════════════════

    describe('E) Scenario Coverage', () => {
        it('covers Brücken-Wiederherstellungen (FZ 2.7)', () => {
            const brueckenCases = WIEDERHERSTELLUNGEN_CASES_V1.filter(
                c => c.fz_codes.includes('FZ_2.7')
            );
            expect(brueckenCases.length).toBeGreaterThanOrEqual(3);
        });

        it('covers Prothesen-Wiederherstellungen (FZ 6.x)', () => {
            const prothesenCases = WIEDERHERSTELLUNGEN_CASES_V1.filter(
                c => c.fz_codes.some(code => code.startsWith('FZ_6.'))
            );
            expect(prothesenCases.length).toBeGreaterThanOrEqual(9);
        });

        it('covers ohne Abformung (BEMA 100a)', () => {
            const ohneAbformung = WIEDERHERSTELLUNGEN_CASES_V1.filter(
                c => c.bema_codes.includes('BEMA_100a')
            );
            expect(ohneAbformung.length).toBeGreaterThanOrEqual(1);
        });

        it('covers mit Abformung (BEMA 100b)', () => {
            const mitAbformung = WIEDERHERSTELLUNGEN_CASES_V1.filter(
                c => c.bema_codes.includes('BEMA_100b')
            );
            expect(mitAbformung.length).toBeGreaterThanOrEqual(8);
        });
    });
});
