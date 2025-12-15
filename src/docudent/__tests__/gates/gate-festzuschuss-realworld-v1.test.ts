/**
 * Gate: Festzuschuss Real-World Cases v1
 * 
 * Tests 10 verified Festzuschuss cases against the SSOT mapper.
 * Each case has evidence pointers to KZV-Berlin primary sources.
 * 
 * Coverage: Befundklasse 1–3, multiple bonus statuses
 * Year: 2025
 */
import { describe, it, expect } from 'vitest';
import { berechneFestzuschuss } from '../../core/billing/knowledgeBase/logic/index';
import {
    FESTZUSCHUSS_CASES_V1,
    CASE_PACK_META,
    type FestzuschussFixture
} from '../../__fixtures__/festzuschuss_cases_v1';

describe('GATE: Festzuschuss Real-World Cases v1', () => {
    // ═══════════════════════════════════════════════════════════════
    // META VALIDATION
    // ═══════════════════════════════════════════════════════════════

    describe('Fixture Pack Validation', () => {
        it('should have exactly 10 fixtures', () => {
            expect(FESTZUSCHUSS_CASES_V1).toHaveLength(10);
            expect(CASE_PACK_META.count).toBe(10);
        });

        it('should have unique IDs for all fixtures', () => {
            const ids = FESTZUSCHUSS_CASES_V1.map(f => f.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('should cover Befundklasse 1, 2, and 3', () => {
            const fzCodes = FESTZUSCHUSS_CASES_V1.flatMap(f => f.fzCodes);

            expect(fzCodes.some(c => c.startsWith('FZ_1.'))).toBe(true);
            expect(fzCodes.some(c => c.startsWith('FZ_2.'))).toBe(true);
            expect(fzCodes.some(c => c.startsWith('FZ_3.'))).toBe(true);
        });

        it('should have evidence for every fixture', () => {
            for (const fixture of FESTZUSCHUSS_CASES_V1) {
                const hasEvidence = fixture.evidence.pdf || fixture.evidence.htmlRules;
                expect(hasEvidence, `${fixture.id} should have evidence`).toBeTruthy();
            }
        });

        it('should cover multiple bonus statuses', () => {
            const statuses = new Set(FESTZUSCHUSS_CASES_V1.map(f => f.bonusStatus));

            // Minimum: ohne + one other
            expect(statuses.has('ohne')).toBe(true);
            expect(statuses.size).toBeGreaterThanOrEqual(2);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // REAL-WORLD CASE ASSERTIONS
    // ═══════════════════════════════════════════════════════════════

    describe('Real-World Cases', () => {
        // Parameterized test for all fixtures
        it.each(FESTZUSCHUSS_CASES_V1.map(f => [f.id, f]))(
            '%s: gesamtbetrag matches expected',
            (_id: string, fixture: FestzuschussFixture) => {
                const result = berechneFestzuschuss(fixture.fzCodes, fixture.bonusStatus);

                // Assert gesamtbetrag (2 decimal precision)
                expect(result.gesamtbetrag).toBeCloseTo(
                    fixture.expected.gesamtbetrag,
                    2
                );
            }
        );

        it.each(FESTZUSCHUSS_CASES_V1.map(f => [f.id, f]))(
            '%s: einzelbetraege match expected (order-independent)',
            (_id: string, fixture: FestzuschussFixture) => {
                const result = berechneFestzuschuss(fixture.fzCodes, fixture.bonusStatus);

                // Assert einzelbetraege count matches
                expect(result.einzelbetraege).toHaveLength(
                    fixture.expected.einzelbetraege.length
                );

                // Assert each expected einzelbetrag is present (order-independent)
                for (const expected of fixture.expected.einzelbetraege) {
                    const found = result.einzelbetraege.find(
                        e => e.befund === expected.befund
                    );

                    expect(
                        found,
                        `${_id}: should contain einzelbetrag for ${expected.befund}`
                    ).toBeDefined();

                    expect(found!.betrag).toBeCloseTo(expected.betrag, 2);
                }
            }
        );
    });

    // ═══════════════════════════════════════════════════════════════
    // EVIDENCE INTEGRITY CHECKS
    // ═══════════════════════════════════════════════════════════════

    describe('Evidence Integrity', () => {
        it('PDF evidence should have valid structure', () => {
            for (const fixture of FESTZUSCHUSS_CASES_V1) {
                if (fixture.evidence.pdf) {
                    const { pdf } = fixture.evidence;

                    expect(pdf.url).toMatch(/^https?:\/\//);
                    expect(pdf.page).toBeGreaterThan(0);
                    expect(pdf.tableHint).toBeTruthy();
                    expect(pdf.excerpt).toBeTruthy();
                }
            }
        });

        it('HTML evidence should have valid structure', () => {
            for (const fixture of FESTZUSCHUSS_CASES_V1) {
                if (fixture.evidence.htmlRules) {
                    for (const html of fixture.evidence.htmlRules) {
                        expect(html.url).toMatch(/^https?:\/\//);
                        expect(html.excerpt).toBeTruthy();
                    }
                }
            }
        });

        it('All evidence URLs should point to KZV-Berlin domain', () => {
            for (const fixture of FESTZUSCHUSS_CASES_V1) {
                if (fixture.evidence.pdf) {
                    expect(fixture.evidence.pdf.url).toContain('kzv-berlin.de');
                }
                if (fixture.evidence.htmlRules) {
                    for (const html of fixture.evidence.htmlRules) {
                        expect(html.url).toContain('kzv-berlin.de');
                    }
                }
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // SPECIFIC CASE DEEP DIVES
    // ═══════════════════════════════════════════════════════════════

    describe('Specific Case Deep Dives', () => {
        it('FZ_1.1 ohne: 229.25 (Einzelkrone base amount)', () => {
            const result = berechneFestzuschuss(['FZ_1.1'], 'ohne');

            expect(result.gesamtbetrag).toBe(229.25);
            expect(result.regelversorgung).toContain('krone');
        });

        it('FZ_1.1 10_jahre: 286.57 (75% bonus applied)', () => {
            const result = berechneFestzuschuss(['FZ_1.1'], '10_jahre');

            expect(result.gesamtbetrag).toBe(286.57);
            expect(result.bonusStatus).toBe('10_jahre');
        });

        it('FZ_2.1 haertefall: 856.50 (100% full coverage)', () => {
            const result = berechneFestzuschuss(['FZ_2.1'], 'haertefall');

            expect(result.gesamtbetrag).toBe(856.50);
            expect(result.bonusStatus).toBe('haertefall');
        });

        it('FZ_3.2a ohne: 482.46 (Teleskopkrone, max 2x rule)', () => {
            const result = berechneFestzuschuss(['FZ_3.2a'], 'ohne');

            expect(result.gesamtbetrag).toBe(482.46);
            // Note: max 2x per Kiefer constraint is documented in evidence
        });
    });
});
