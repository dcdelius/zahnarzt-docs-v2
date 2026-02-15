/**
 * Gate Test: Endo Output Verbosity
 * 
 * Verifies that Endo Aufklärung clauses produce different lengths
 * for kurz/mittel/lang verbosity levels.
 */

import { describe, it, expect } from 'vitest';
import {
    ENDO_AUFKLAERUNG_CLAUSES,
    buildAufklaerungFromClauses,
    type VerbosityLevel,
} from '../../core/billing/knowledgeBase/registry/aufklaerungRegistry';
import { CANONICAL_CHIP_IDS } from '../../contracts/canonicalIds';

describe('Gate: Endo Output Verbosity', () => {
    // ════════════════════════════════════════════════════════════════
    // Verbosity produces different lengths
    // ════════════════════════════════════════════════════════════════
    describe('Aufklärung text length varies by verbosity', () => {
        const testCases = [
            {
                name: 'general endo context',
                context: {
                    activeChips: [],
                    answers: new Map(),
                    extracted: {},
                },
            },
            {
                name: 'endo start step',
                context: {
                    activeChips: [],
                    answers: new Map([['endo_step', 'start']]),
                    extracted: {},
                },
            },
            {
                name: 'with kofferdam',
                context: {
                    activeChips: [CANONICAL_CHIP_IDS.KOFFERDAM],
                    answers: new Map(),
                    extracted: {},
                },
            },
            {
                name: 'with mikroskop',
                context: {
                    activeChips: [],
                    answers: new Map(),
                    extracted: { mikroskop: true },
                },
            },
        ];

        for (const { name, context } of testCases) {
            it(`should produce kurz <= mittel <= lang for ${name}`, () => {
                const kurz = buildAufklaerungFromClauses(ENDO_AUFKLAERUNG_CLAUSES, context, 'kurz');
                const mittel = buildAufklaerungFromClauses(ENDO_AUFKLAERUNG_CLAUSES, context, 'mittel');
                const lang = buildAufklaerungFromClauses(ENDO_AUFKLAERUNG_CLAUSES, context, 'lang');

                // Skip if no clauses apply
                if (kurz.clauseIds.length === 0) return;

                expect(
                    kurz.text.length,
                    `kurz should be <= mittel for ${name}`
                ).toBeLessThanOrEqual(mittel.text.length);

                expect(
                    mittel.text.length,
                    `mittel should be <= lang for ${name}`
                ).toBeLessThanOrEqual(lang.text.length);
            });
        }
    });

    // ════════════════════════════════════════════════════════════════
    // Kurz uses abbreviations
    // ════════════════════════════════════════════════════════════════
    describe('Kurz output uses abbreviations', () => {
        it('should use "Endo-Risiken" in kurz for general risks', () => {
            const context = {
                activeChips: [],
                answers: new Map(),
                extracted: {},
            };

            const kurz = buildAufklaerungFromClauses(ENDO_AUFKLAERUNG_CLAUSES, context, 'kurz');
            expect(kurz.text).toContain('Endo-Risiken');
        });

        it('should use abbreviated form in kurz for flare-up', () => {
            const context = {
                activeChips: [],
                answers: new Map(),
                extracted: {},
            };

            const kurz = buildAufklaerungFromClauses(ENDO_AUFKLAERUNG_CLAUSES, context, 'kurz');
            expect(kurz.text).toContain('Postop.');
        });
    });

    // ════════════════════════════════════════════════════════════════
    // Lang uses expanded phrasing
    // ════════════════════════════════════════════════════════════════
    describe('Lang output uses expanded phrasing', () => {
        it('should include "Wurzelkanalbehandlung" spelled out in lang', () => {
            const context = {
                activeChips: [],
                answers: new Map(),
                extracted: {},
            };

            const lang = buildAufklaerungFromClauses(ENDO_AUFKLAERUNG_CLAUSES, context, 'lang');
            expect(lang.text).toContain('Wurzelkanalbehandlung');
        });

        it('should include detailed extraction alternative in lang', () => {
            const context = {
                activeChips: [],
                answers: new Map(),
                extracted: {},
            };

            const lang = buildAufklaerungFromClauses(ENDO_AUFKLAERUNG_CLAUSES, context, 'lang');
            expect(lang.text).toContain('Extraktion des Zahns');
        });
    });

    // ════════════════════════════════════════════════════════════════
    // Clause conditions work correctly
    // ════════════════════════════════════════════════════════════════
    describe('Conditional clauses', () => {
        it('should include mikroskop clause when extracted.mikroskop=true', () => {
            const context = {
                activeChips: [],
                answers: new Map(),
                extracted: { mikroskop: true },
            };

            const result = buildAufklaerungFromClauses(ENDO_AUFKLAERUNG_CLAUSES, context, 'mittel');
            expect(result.clauseIds).toContain('endo_mikroskop_note');
        });

        it('should NOT include mikroskop clause when mikroskop not set', () => {
            const context = {
                activeChips: [],
                answers: new Map(),
                extracted: {},
            };

            const result = buildAufklaerungFromClauses(ENDO_AUFKLAERUNG_CLAUSES, context, 'mittel');
            expect(result.clauseIds).not.toContain('endo_mikroskop_note');
        });

        it('should include instrument fracture clause for endo_step=start', () => {
            const context = {
                activeChips: [],
                answers: new Map([['endo_step', 'start']]),
                extracted: {},
            };

            const result = buildAufklaerungFromClauses(ENDO_AUFKLAERUNG_CLAUSES, context, 'mittel');
            expect(result.clauseIds).toContain('endo_instrument_fracture');
        });

        it('should include kofferdam clause when chip present', () => {
            const context = {
                activeChips: [CANONICAL_CHIP_IDS.KOFFERDAM],
                answers: new Map(),
                extracted: {},
            };

            const result = buildAufklaerungFromClauses(ENDO_AUFKLAERUNG_CLAUSES, context, 'mittel');
            expect(result.clauseIds).toContain('endo_kofferdam_note');
        });
    });

    // ════════════════════════════════════════════════════════════════
    // All clauses have valid structure
    // ════════════════════════════════════════════════════════════════
    it('should have all required fields for each clause', () => {
        for (const clause of ENDO_AUFKLAERUNG_CLAUSES) {
            expect(clause.id).toBeDefined();
            expect(clause.description).toBeDefined();
            expect(clause.text.kurz).toBeDefined();
            expect(clause.text.mittel).toBeDefined();
            expect(clause.text.lang).toBeDefined();
            expect(typeof clause.priority).toBe('number');
        }
    });

    it('should have unique clause IDs', () => {
        const ids = ENDO_AUFKLAERUNG_CLAUSES.map(c => c.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });
});
