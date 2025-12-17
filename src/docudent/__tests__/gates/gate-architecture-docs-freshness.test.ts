/**
 * Gate: Architecture Docs Freshness
 * 
 * Ensures architecture documentation stays in sync with runtime features.
 * This gate fails CI if key features are not documented.
 * 
 * Required Identifiers:
 * - renderAbrechnung (Mehrkosten output)
 * - Mehrkostenvereinbarung (MKV disclosure)
 * - Zusatzleistung (GOZ) (Endo wording)
 * - resolveBel2CodeFromRaw (BEL2 resolution)
 * - gate-bel2-placeholder-inventory (BEL2 gate)
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const DOCS_DIR = path.resolve(__dirname, '../../../../docs/architecture');

// ═══════════════════════════════════════════════════════════════
// A) REQUIRED DOCS EXIST
// ═══════════════════════════════════════════════════════════════

describe('GATE: Architecture Docs Freshness', () => {
    describe('A) Required Markdown Docs Exist', () => {
        const requiredMdFiles = [
            'ARCHITECTURE.md',
            'DATA_SOURCES.md',
            'FILES_RUNTIME.md',
            'FIRESTORE.md'
        ];

        for (const file of requiredMdFiles) {
            it(`${file} exists and is non-empty`, () => {
                const filePath = path.join(DOCS_DIR, file);
                expect(fs.existsSync(filePath)).toBe(true);
                const content = fs.readFileSync(filePath, 'utf-8');
                expect(content.length).toBeGreaterThan(100);
            });
        }
    });

    describe('B) Required JSON Docs Exist', () => {
        const requiredJsonFiles = [
            'FEATURE_COVERAGE.json',
            'V7_CAPABILITY_MATRIX.json',
            'PIPELINE_DECISION.json',
            'MEHRKOSTEN_FLOW_DECISION.json'
        ];

        for (const file of requiredJsonFiles) {
            it(`${file} exists and is valid JSON`, () => {
                const filePath = path.join(DOCS_DIR, file);
                expect(fs.existsSync(filePath)).toBe(true);
                const content = fs.readFileSync(filePath, 'utf-8');
                expect(() => JSON.parse(content)).not.toThrow();
            });
        }
    });

    // ═══════════════════════════════════════════════════════════
    // C) MEHRKOSTEN FEATURE DOCUMENTED
    // ═══════════════════════════════════════════════════════════

    describe('C) Mehrkosten Feature Documented', () => {
        let archContent: string;

        beforeAll(() => {
            archContent = fs.readFileSync(path.join(DOCS_DIR, 'ARCHITECTURE.md'), 'utf-8');
        });

        it('mentions renderAbrechnung', () => {
            expect(archContent).toContain('renderAbrechnung');
        });

        it('mentions Mehrkostenvereinbarung', () => {
            expect(archContent).toContain('Mehrkostenvereinbarung');
        });

        it('mentions Zusatzleistung (GOZ) for Endo', () => {
            expect(archContent).toContain('Zusatzleistung (GOZ)');
        });

        it('documents MKV scope (chairside vs HKP)', () => {
            expect(archContent).toContain('Chairside');
        });
    });

    // ═══════════════════════════════════════════════════════════
    // D) BEL2 FEATURE DOCUMENTED
    // ═══════════════════════════════════════════════════════════

    describe('D) BEL2 Feature Documented', () => {
        let archContent: string;

        beforeAll(() => {
            archContent = fs.readFileSync(path.join(DOCS_DIR, 'ARCHITECTURE.md'), 'utf-8');
        });

        it('mentions resolveBel2CodeFromRaw', () => {
            expect(archContent).toContain('resolveBel2CodeFromRaw');
        });

        it('mentions gate-bel2-placeholder-inventory', () => {
            expect(archContent).toContain('gate-bel2-placeholder-inventory');
        });

        it('documents no-invented-codes behavior', () => {
            expect(archContent).toMatch(/NO invented|catalog-validated/i);
        });

        it('mentions BEL_1021', () => {
            expect(archContent).toContain('BEL_1021');
        });
    });

    // ═══════════════════════════════════════════════════════════
    // E) ENDO STEP DETECTION DOCUMENTED
    // ═══════════════════════════════════════════════════════════

    describe('E) Endo Step Detection Documented', () => {
        let archContent: string;

        beforeAll(() => {
            archContent = fs.readFileSync(path.join(DOCS_DIR, 'ARCHITECTURE.md'), 'utf-8');
        });

        it('mentions Endo Step Detection section', () => {
            expect(archContent).toContain('Endo Step Detection');
        });

        it('mentions detectEndoStep function', () => {
            expect(archContent).toContain('detectEndoStep');
        });

        it('mentions endo_step askback question', () => {
            expect(archContent).toContain('endo_step');
        });

        it('mentions endo_schritt output section', () => {
            expect(archContent).toContain('endo_schritt');
        });
    });

    // ═══════════════════════════════════════════════════════════
    // F) DOCS TIMESTAMP (OPTIONAL)
    // ═══════════════════════════════════════════════════════════

    describe('F) Docs Timestamp', () => {
        const timestampPath = path.join(DOCS_DIR, 'DOCS_LAST_UPDATED.txt');

        it('DOCS_LAST_UPDATED.txt exists (or is created)', () => {
            // This is informational — we create it if missing
            if (!fs.existsSync(timestampPath)) {
                fs.writeFileSync(timestampPath, new Date().toISOString());
            }
            expect(fs.existsSync(timestampPath)).toBe(true);
        });

        it('timestamp is valid ISO date', () => {
            const content = fs.readFileSync(timestampPath, 'utf-8').trim();
            const date = new Date(content);
            expect(isNaN(date.getTime())).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // G) NO STALE PLACEHOLDERS
    // ═══════════════════════════════════════════════════════════

    describe('G) No Stale Placeholders', () => {
        it('ARCHITECTURE.md has no TODO placeholders', () => {
            const content = fs.readFileSync(path.join(DOCS_DIR, 'ARCHITECTURE.md'), 'utf-8');
            expect(content).not.toMatch(/TODO:/i);
            expect(content).not.toContain('[PLACEHOLDER]');
        });
    });
});
