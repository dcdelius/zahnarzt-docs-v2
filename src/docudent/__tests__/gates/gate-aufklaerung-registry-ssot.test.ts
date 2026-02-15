/**
 * Gate Test: Aufklärung Registry SSOT Compliance
 * 
 * Ensures that aufklaerungRegistry.ts only uses CANONICAL_CHIP_IDS
 * and does not contain raw chip string violations.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CANONICAL_CHIP_IDS } from '../../contracts/canonicalIds';
import {
    FUELLUNG_AUFKLAERUNG_CLAUSES,
    evaluateAufklaerungClauses,
    buildAufklaerungFromClauses,
} from '../../core/billing/knowledgeBase/registry/aufklaerungRegistry';

describe('Gate: Aufklärung Registry SSOT Compliance', () => {
    // ════════════════════════════════════════════════════════════════
    // Clause IDs must be unique
    // ════════════════════════════════════════════════════════════════
    it('should have unique clause IDs', () => {
        const ids = FUELLUNG_AUFKLAERUNG_CLAUSES.map(c => c.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    // ════════════════════════════════════════════════════════════════
    // All chip references must come from CANONICAL_CHIP_IDS
    // ════════════════════════════════════════════════════════════════
    it('should only reference CANONICAL_CHIP_IDS in clauses', () => {
        const canonicalValues = new Set<string>(Object.values(CANONICAL_CHIP_IDS));

        for (const clause of FUELLUNG_AUFKLAERUNG_CLAUSES) {
            if (clause.when.anyChips) {
                for (const chipId of clause.when.anyChips) {
                    expect(
                        canonicalValues.has(chipId as string),
                        `Clause "${clause.id}" references non-canonical chip: "${chipId}"`
                    ).toBe(true);
                }
            }
        }
    });

    // ════════════════════════════════════════════════════════════════
    // No raw chip strings in source file
    // ════════════════════════════════════════════════════════════════
    it('should not contain raw chip string literals (source scan)', () => {
        const filePath = join(__dirname, '../../core/billing/knowledgeBase/registry/aufklaerungRegistry.ts');
        const content = readFileSync(filePath, 'utf-8');

        // Known chip string patterns that should NOT appear as literals
        const FORBIDDEN_RAW_STRINGS = [
            "'la_infiltr'",
            "'la_leitung'",
            "'kofferdam'",
            "'rel_trocken'",
            "'mehrschicht'",
            "'adhasiv'",
            "'komposit_basic'",
            "'cp'",
            '"la_infiltr"',
            '"la_leitung"',
            '"kofferdam"',
        ];

        for (const rawString of FORBIDDEN_RAW_STRINGS) {
            const lines = content.split('\n');
            const violations = lines
                .filter(line => !line.includes('CANONICAL_CHIP_IDS'))
                .filter(line => line.includes(rawString));

            expect(
                violations.length,
                `Found ${violations.length} raw chip string: ${rawString}`
            ).toBe(0);
        }
    });

    // ════════════════════════════════════════════════════════════════
    // Each clause must have all verbosity variants
    // ════════════════════════════════════════════════════════════════
    it('should have kurz/mittel/lang text for each clause', () => {
        for (const clause of FUELLUNG_AUFKLAERUNG_CLAUSES) {
            expect(clause.text.kurz, `${clause.id} missing kurz`).toBeDefined();
            expect(clause.text.mittel, `${clause.id} missing mittel`).toBeDefined();
            expect(clause.text.lang, `${clause.id} missing lang`).toBeDefined();

            // kurz should be shortest
            expect(
                clause.text.kurz.length <= clause.text.mittel.length,
                `${clause.id}: kurz should be <= mittel`
            ).toBe(true);
            expect(
                clause.text.mittel.length <= clause.text.lang.length,
                `${clause.id}: mittel should be <= lang`
            ).toBe(true);
        }
    });

    // ════════════════════════════════════════════════════════════════
    // Evaluation function works correctly
    // ════════════════════════════════════════════════════════════════
    it('should return endo_risk_deep clause when cavityDepth=tief', () => {
        const context = {
            activeChips: [],
            answers: new Map(),
            extracted: { cavityDepth: 'tief' },
        };

        const result = evaluateAufklaerungClauses(FUELLUNG_AUFKLAERUNG_CLAUSES, context);
        expect(result.some(c => c.id === 'endo_risk_deep')).toBe(true);
    });

    it('should return anesthesia_risks clause when LA chip active', () => {
        const context = {
            activeChips: [CANONICAL_CHIP_IDS.LA_LEITUNG],
            answers: new Map(),
            extracted: {},
        };

        const result = evaluateAufklaerungClauses(FUELLUNG_AUFKLAERUNG_CLAUSES, context);
        expect(result.some(c => c.id === 'anesthesia_risks')).toBe(true);
    });

    it('should return mkv_explanation when mehrschicht/adhasiv chips active', () => {
        const context = {
            activeChips: [CANONICAL_CHIP_IDS.MEHRSCHICHT],
            answers: new Map(),
            extracted: {},
        };

        const result = evaluateAufklaerungClauses(FUELLUNG_AUFKLAERUNG_CLAUSES, context);
        expect(result.some(c => c.id === 'mkv_explanation')).toBe(true);
    });

    // ════════════════════════════════════════════════════════════════
    // Build function returns text by verbosity
    // ════════════════════════════════════════════════════════════════
    it('should build text with correct verbosity', () => {
        const context = {
            activeChips: [CANONICAL_CHIP_IDS.LA_LEITUNG],
            answers: new Map(),
            extracted: {},
        };

        const kurz = buildAufklaerungFromClauses(FUELLUNG_AUFKLAERUNG_CLAUSES, context, 'kurz');
        const lang = buildAufklaerungFromClauses(FUELLUNG_AUFKLAERUNG_CLAUSES, context, 'lang');

        expect(kurz.text.length).toBeLessThan(lang.text.length);
        expect(kurz.clauseIds).toEqual(lang.clauseIds);
    });
});
