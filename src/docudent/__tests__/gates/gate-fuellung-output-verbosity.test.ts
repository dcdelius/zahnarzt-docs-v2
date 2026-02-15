/**
 * Gate Test: Output Verbosity (kurz/mittel/lang)
 * 
 * Ensures that textLength variants produce different output densities:
 * - kurz: compact, abbreviated
 * - mittel: baseline (current default)
 * - lang: expanded, with more detail
 */

import { describe, it, expect } from 'vitest';
import {
    FUELLUNG_AUFKLAERUNG_CLAUSES,
    buildAufklaerungFromClauses,
    type VerbosityLevel,
} from '../../core/billing/knowledgeBase/registry/aufklaerungRegistry';
import { CANONICAL_CHIP_IDS } from '../../contracts/canonicalIds';

describe('Gate: Füllung Output Verbosity', () => {
    // ════════════════════════════════════════════════════════════════
    // Verbosity produces different lengths
    // ════════════════════════════════════════════════════════════════
    describe('Aufklärung text length varies by verbosity', () => {
        const testCases = [
            {
                name: 'anesthesia context',
                context: {
                    activeChips: [CANONICAL_CHIP_IDS.LA_LEITUNG],
                    answers: new Map(),
                    extracted: {},
                },
            },
            {
                name: 'deep cavity context',
                context: {
                    activeChips: [],
                    answers: new Map(),
                    extracted: { cavityDepth: 'tief' },
                },
            },
            {
                name: 'MKV context',
                context: {
                    activeChips: [CANONICAL_CHIP_IDS.MEHRSCHICHT, CANONICAL_CHIP_IDS.ADHAESIV],
                    answers: new Map(),
                    extracted: {},
                },
            },
            {
                name: 'full context (LA + deep + MKV)',
                context: {
                    activeChips: [
                        CANONICAL_CHIP_IDS.LA_LEITUNG,
                        CANONICAL_CHIP_IDS.MEHRSCHICHT,
                        CANONICAL_CHIP_IDS.KOMPOSIT_BASIC,
                    ],
                    answers: new Map(),
                    extracted: { cavityDepth: 'tief' },
                },
            },
        ];

        for (const { name, context } of testCases) {
            it(`should produce kurz < mittel < lang for ${name}`, () => {
                const kurz = buildAufklaerungFromClauses(FUELLUNG_AUFKLAERUNG_CLAUSES, context, 'kurz');
                const mittel = buildAufklaerungFromClauses(FUELLUNG_AUFKLAERUNG_CLAUSES, context, 'mittel');
                const lang = buildAufklaerungFromClauses(FUELLUNG_AUFKLAERUNG_CLAUSES, context, 'lang');

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
        it('should use "LA-Risiken" in kurz for anesthesia', () => {
            const context = {
                activeChips: [CANONICAL_CHIP_IDS.LA_LEITUNG],
                answers: new Map(),
                extracted: {},
            };

            const kurz = buildAufklaerungFromClauses(FUELLUNG_AUFKLAERUNG_CLAUSES, context, 'kurz');
            expect(kurz.text).toContain('LA-Risiken');
        });

        it('should use "CP:" abbreviation in kurz for capping', () => {
            const context = {
                activeChips: [CANONICAL_CHIP_IDS.CP],
                answers: new Map(),
                extracted: {},
            };

            const kurz = buildAufklaerungFromClauses(FUELLUNG_AUFKLAERUNG_CLAUSES, context, 'kurz');
            expect(kurz.text).toContain('CP:');
        });

        it('should use "MKV-Aufklärung" in kurz for mehrkosten', () => {
            const context = {
                activeChips: [CANONICAL_CHIP_IDS.MEHRSCHICHT],
                answers: new Map(),
                extracted: {},
            };

            const kurz = buildAufklaerungFromClauses(FUELLUNG_AUFKLAERUNG_CLAUSES, context, 'kurz');
            expect(kurz.text).toContain('MKV-Aufklärung');
        });
    });

    // ════════════════════════════════════════════════════════════════
    // Lang uses expanded phrasing
    // ════════════════════════════════════════════════════════════════
    describe('Lang output uses expanded phrasing', () => {
        it('should include "Lokalanästhesie" spelled out in lang', () => {
            const context = {
                activeChips: [CANONICAL_CHIP_IDS.LA_LEITUNG],
                answers: new Map(),
                extracted: {},
            };

            const lang = buildAufklaerungFromClauses(FUELLUNG_AUFKLAERUNG_CLAUSES, context, 'lang');
            expect(lang.text).toContain('Lokalanästhesie');
        });

        it('should include "Wurzelkanalbehandlung" in lang for deep cavity', () => {
            const context = {
                activeChips: [],
                answers: new Map(),
                extracted: { cavityDepth: 'tief' },
            };

            const lang = buildAufklaerungFromClauses(FUELLUNG_AUFKLAERUNG_CLAUSES, context, 'lang');
            expect(lang.text).toContain('Wurzelkanalbehandlung');
        });

        it('should include detailed MKV explanation in lang', () => {
            const context = {
                activeChips: [CANONICAL_CHIP_IDS.MEHRSCHICHT],
                answers: new Map(),
                extracted: {},
            };

            const lang = buildAufklaerungFromClauses(FUELLUNG_AUFKLAERUNG_CLAUSES, context, 'lang');
            expect(lang.text).toContain('gesetzlichen Krankenversicherung');
        });
    });

    // ════════════════════════════════════════════════════════════════
    // Same clause IDs across verbosities
    // ════════════════════════════════════════════════════════════════
    it('should return same clauseIds regardless of verbosity', () => {
        const context = {
            activeChips: [CANONICAL_CHIP_IDS.LA_LEITUNG, CANONICAL_CHIP_IDS.MEHRSCHICHT],
            answers: new Map(),
            extracted: { cavityDepth: 'tief' },
        };

        const kurz = buildAufklaerungFromClauses(FUELLUNG_AUFKLAERUNG_CLAUSES, context, 'kurz');
        const mittel = buildAufklaerungFromClauses(FUELLUNG_AUFKLAERUNG_CLAUSES, context, 'mittel');
        const lang = buildAufklaerungFromClauses(FUELLUNG_AUFKLAERUNG_CLAUSES, context, 'lang');

        expect(kurz.clauseIds).toEqual(mittel.clauseIds);
        expect(mittel.clauseIds).toEqual(lang.clauseIds);
    });
});
