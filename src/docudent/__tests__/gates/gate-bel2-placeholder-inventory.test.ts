/**
 * Gate: BEL2 Placeholder Inventory
 * 
 * Validates that the BEL2 placeholder audit produces a deterministic
 * inventory of all belNr usages in ZE/HKP/lab generation code.
 * 
 * This gate proves that:
 * 1. Audit function runs without error
 * 2. Output is deterministic (2 runs identical except timestamp)
 * 3. At least one belNr placeholder is found
 * 4. countsByBelNrLiteral keys are sorted
 */
import { describe, it, expect } from 'vitest';
import { generateBel2PlaceholderReport } from '../../../../scripts/audit_bel2_placeholders';

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('GATE: BEL2 Placeholder Inventory', () => {
    // ═══════════════════════════════════════════════════════════
    // A) REPORT GENERATION
    // ═══════════════════════════════════════════════════════════

    describe('A) Report Generation', () => {
        it('generates a report without error', () => {
            expect(() => {
                generateBel2PlaceholderReport(process.cwd());
            }).not.toThrow();
        });

        it('report has required structure', () => {
            const report = generateBel2PlaceholderReport(process.cwd());

            expect(report).toHaveProperty('generatedAt');
            expect(report).toHaveProperty('items');
            expect(report).toHaveProperty('countsByBelNrLiteral');
            expect(report).toHaveProperty('countsByCandidate');
            expect(Array.isArray(report.items)).toBe(true);
        });

        it('finds at least one belNr placeholder', () => {
            const report = generateBel2PlaceholderReport(process.cwd());

            // We know hkpGenerator.ts has at least one: rawBelNr = '001'
            expect(report.items.length).toBeGreaterThan(0);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // B) ITEM STRUCTURE
    // ═══════════════════════════════════════════════════════════

    describe('B) Item Structure', () => {
        it('each item has required fields', () => {
            const report = generateBel2PlaceholderReport(process.cwd());

            for (const item of report.items) {
                expect(item).toHaveProperty('file');
                expect(item).toHaveProperty('line');
                expect(item).toHaveProperty('context');
                expect(item).toHaveProperty('belNrLiteral');
                expect(item).toHaveProperty('snippet');
                expect(item).toHaveProperty('candidate');
            }
        });

        it('line numbers are positive integers', () => {
            const report = generateBel2PlaceholderReport(process.cwd());

            for (const item of report.items) {
                expect(item.line).toBeGreaterThan(0);
                expect(Number.isInteger(item.line)).toBe(true);
            }
        });

        it('snippets are max 140 chars', () => {
            const report = generateBel2PlaceholderReport(process.cwd());

            for (const item of report.items) {
                expect(item.snippet.length).toBeLessThanOrEqual(140);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // C) DETERMINISM
    // ═══════════════════════════════════════════════════════════

    describe('C) Determinism', () => {
        it('two runs produce identical items (excluding timestamp)', () => {
            const report1 = generateBel2PlaceholderReport(process.cwd());
            const report2 = generateBel2PlaceholderReport(process.cwd());

            // Compare items (excluding generatedAt)
            expect(report1.items).toEqual(report2.items);
            expect(report1.countsByBelNrLiteral).toEqual(report2.countsByBelNrLiteral);
            expect(report1.countsByCandidate).toEqual(report2.countsByCandidate);
        });

        it('items are sorted by file, line, belNrLiteral', () => {
            const report = generateBel2PlaceholderReport(process.cwd());

            for (let i = 1; i < report.items.length; i++) {
                const prev = report.items[i - 1];
                const curr = report.items[i];

                const cmp = prev.file.localeCompare(curr.file) ||
                    (prev.line - curr.line) ||
                    prev.belNrLiteral.localeCompare(curr.belNrLiteral);

                expect(cmp).toBeLessThanOrEqual(0);
            }
        });

        it('countsByBelNrLiteral keys are sorted', () => {
            const report = generateBel2PlaceholderReport(process.cwd());
            const keys = Object.keys(report.countsByBelNrLiteral);
            const sortedKeys = [...keys].sort();

            expect(keys).toEqual(sortedKeys);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // D) CANDIDATE VALIDATION
    // ═══════════════════════════════════════════════════════════

    describe('D) Candidate Validation', () => {
        it('candidate is null for short/ambiguous codes', () => {
            const report = generateBel2PlaceholderReport(process.cwd());

            // Find items with 1-3 digit literals
            const shortItems = report.items.filter(
                item => /^\d{1,3}$/.test(item.belNrLiteral)
            );

            // Short codes should have null candidates (too ambiguous)
            for (const item of shortItems) {
                expect(item.candidate).toBeNull();
            }
        });

        it('4-digit candidates have normalized BEL_XXXX format', () => {
            const report = generateBel2PlaceholderReport(process.cwd());

            for (const item of report.items) {
                if (item.candidate) {
                    expect(item.candidate.normalized).toMatch(/^BEL_\d{4}$/);
                    expect(typeof item.candidate.existsInCatalog).toBe('boolean');
                }
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // E) VALID BEL CODE SPOT-CHECK
    // ═══════════════════════════════════════════════════════════

    describe('E) Valid BEL Code Spot-Check', () => {
        it('finds the BEL_1021 code in hkpGenerator.ts', () => {
            const report = generateBel2PlaceholderReport(process.cwd());

            const hkpItems = report.items.filter(
                item => item.file.includes('hkpGenerator.ts')
            );

            expect(hkpItems.length).toBeGreaterThan(0);
            expect(hkpItems.some(item => item.belNrLiteral === '1021')).toBe(true);
        });

        it('BEL_1021 has a valid candidate that exists in catalog', () => {
            const report = generateBel2PlaceholderReport(process.cwd());

            const item1021 = report.items.find(item => item.belNrLiteral === '1021');
            expect(item1021).toBeDefined();
            expect(item1021?.candidate).not.toBeNull();
            expect(item1021?.candidate?.normalized).toBe('BEL_1021');
            expect(item1021?.candidate?.existsInCatalog).toBe(true);
        });

        it('no placeholder "001" remains in runtime code', () => {
            const report = generateBel2PlaceholderReport(process.cwd());

            const item001 = report.items.find(item => item.belNrLiteral === '001');
            // Placeholder has been eliminated - should not exist
            expect(item001).toBeUndefined();
        });
    });
});
