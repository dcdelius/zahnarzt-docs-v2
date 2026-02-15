/**
 * Gate: Festzuschuss Evidence Guard
 * 
 * Prevents "looks plausible but fake" evidence from creeping into fixtures.
 * All assertions are static — NO network calls.
 * 
 * Guards:
 * 1) PDF URL must equal the canonical Abrechnungshilfe_1_2025.pdf URL
 * 2) HTML URLs must start with the canonical prefix
 * 3) PDF page must be in expected range per Befundklasse
 * 4) Excerpt must contain the FZ short code
 */
import { describe, it, expect } from 'vitest';
import {
    FESTZUSCHUSS_CASES_V1,
    CASE_PACK_META,
    CANONICAL_PDF_URL,
    CANONICAL_HTML_PREFIX,
    PDF_PAGE_RANGES,
} from '../../__fixtures__/festzuschuss_cases_v1';

describe('GATE: Festzuschuss Evidence Guard', () => {
    // ═══════════════════════════════════════════════════════════════
    // 1) PDF URL EQUALITY
    // ═══════════════════════════════════════════════════════════════

    describe('1) PDF URL must equal canonical source', () => {
        it('CASE_PACK_META.sourcePdf equals CANONICAL_PDF_URL', () => {
            expect(CASE_PACK_META.sourcePdf).toBe(CANONICAL_PDF_URL);
        });

        it.each(FESTZUSCHUSS_CASES_V1.map(f => [f.id, f]))(
            '%s: pdf.url equals CANONICAL_PDF_URL',
            (_id, fixture) => {
                if (fixture.evidence.pdf) {
                    expect(fixture.evidence.pdf.url).toBe(CANONICAL_PDF_URL);
                }
            }
        );

        it('All fixtures have PDF evidence', () => {
            for (const fixture of FESTZUSCHUSS_CASES_V1) {
                expect(
                    fixture.evidence.pdf,
                    `${fixture.id} must have PDF evidence`
                ).toBeDefined();
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 2) HTML URL PREFIX
    // ═══════════════════════════════════════════════════════════════

    describe('2) HTML URLs must start with canonical prefix', () => {
        it('CASE_PACK_META.sourceHtmlPrefix equals CANONICAL_HTML_PREFIX', () => {
            expect(CASE_PACK_META.sourceHtmlPrefix).toBe(CANONICAL_HTML_PREFIX);
        });

        it.each(FESTZUSCHUSS_CASES_V1.map(f => [f.id, f]))(
            '%s: all htmlRules URLs start with CANONICAL_HTML_PREFIX',
            (_id, fixture) => {
                if (fixture.evidence.htmlRules) {
                    for (const html of fixture.evidence.htmlRules) {
                        expect(html.url.startsWith(CANONICAL_HTML_PREFIX)).toBe(true);
                    }
                }
            }
        );
    });

    // ═══════════════════════════════════════════════════════════════
    // 3) PDF PAGE RANGES PER BEFUNDKLASSE
    // ═══════════════════════════════════════════════════════════════

    describe('3) PDF page must be in expected range per Befundklasse', () => {
        /**
         * Extract Befundklasse number from FZ code
         * FZ_1.1 → "1", FZ_2.6 → "2", FZ_3.2a → "3"
         */
        function getBefundklasse(fzCode: string): string {
            const match = fzCode.match(/FZ_(\d)/);
            return match ? match[1] : '';
        }

        it.each(FESTZUSCHUSS_CASES_V1.map(f => [f.id, f]))(
            '%s: pdf.page is within expected range for Befundklasse',
            (_id, fixture) => {
                if (!fixture.evidence.pdf) return;

                // Get the first FZ code's Befundklasse
                const fzCode = fixture.fzCodes[0];
                const bk = getBefundklasse(fzCode) as keyof typeof PDF_PAGE_RANGES;

                expect(
                    PDF_PAGE_RANGES[bk],
                    `Unknown Befundklasse for ${fzCode}`
                ).toBeDefined();

                const allowedPages = PDF_PAGE_RANGES[bk];
                const actualPage = fixture.evidence.pdf.page;

                expect(
                    allowedPages.includes(actualPage),
                    `${fixture.id}: page ${actualPage} not in allowed [${allowedPages.join(', ')}] for BK${bk}`
                ).toBe(true);
            }
        );

        it('PDF_PAGE_RANGES matches expected structure', () => {
            expect(PDF_PAGE_RANGES['1']).toContain(13);
            expect(PDF_PAGE_RANGES['2']).toContain(14);
            expect(PDF_PAGE_RANGES['2']).toContain(15);
            expect(PDF_PAGE_RANGES['3']).toContain(15);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 4) EXCERPT CONTAINS FZ SHORT CODE
    // ═══════════════════════════════════════════════════════════════

    describe('4) Excerpt must contain FZ short code', () => {
        /**
         * Extract short code from FZ code
         * FZ_1.1 → "1.1", FZ_3.2a → "3.2"
         */
        function getShortCode(fzCode: string): string {
            // FZ_1.1 → "1.1", FZ_3.2a → "3.2" (strip letter suffix)
            const match = fzCode.match(/FZ_(\d+\.\d+)/);
            return match ? match[1] : '';
        }

        it.each(FESTZUSCHUSS_CASES_V1.map(f => [f.id, f]))(
            '%s: pdf.excerpt contains FZ short code',
            (_id, fixture) => {
                if (!fixture.evidence.pdf) return;

                const fzCode = fixture.fzCodes[0];
                const shortCode = getShortCode(fzCode);

                expect(
                    fixture.evidence.pdf.excerpt.includes(shortCode),
                    `${fixture.id}: excerpt "${fixture.evidence.pdf.excerpt}" must contain "${shortCode}"`
                ).toBe(true);
            }
        );
    });

    // ═══════════════════════════════════════════════════════════════
    // ADDITIONAL INTEGRITY CHECKS
    // ═══════════════════════════════════════════════════════════════

    describe('Additional Integrity Checks', () => {
        it('CASE_PACK_META.lastVerified is a valid ISO date string', () => {
            expect(CASE_PACK_META.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('No fixture uses a different PDF URL', () => {
            const uniqueUrls = new Set(
                FESTZUSCHUSS_CASES_V1
                    .filter(f => f.evidence.pdf)
                    .map(f => f.evidence.pdf!.url)
            );

            expect(uniqueUrls.size).toBe(1);
            expect([...uniqueUrls][0]).toBe(CANONICAL_PDF_URL);
        });

        it('All HTML URLs use kzv-berlin.de domain', () => {
            for (const fixture of FESTZUSCHUSS_CASES_V1) {
                if (fixture.evidence.htmlRules) {
                    for (const html of fixture.evidence.htmlRules) {
                        expect(html.url).toContain('kzv-berlin.de');
                    }
                }
            }
        });

        it('Canonial PDF URL points to kzv-berlin.de', () => {
            expect(CANONICAL_PDF_URL).toContain('kzv-berlin.de');
            expect(CANONICAL_PDF_URL).toContain('Abrechnungshilfe_1_2025.pdf');
        });

        it('Canonical HTML prefix points to kzv-berlin.de festzuschuesse path', () => {
            expect(CANONICAL_HTML_PREFIX).toContain('kzv-berlin.de');
            expect(CANONICAL_HTML_PREFIX).toContain('festzuschuesse');
        });
    });
});
