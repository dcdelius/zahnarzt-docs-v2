/**
 * Gate: BEL II Catalog SSOT
 * 
 * Validates the BEL II (Bundeseinheitliches Leistungsverzeichnis) catalog
 * integrity as a single-source-of-truth for zahntechnische Laborleistungen.
 * 
 * Source PDF:
 * BEL_II_01_01_2022.pdf (Stand 01.01.2022)
 * 
 * Test Categories:
 * A) File Existence & Meta Validation
 * B) Entry Count & Structure
 * C) Code Format & Uniqueness
 * D) Page Range Validation (Evidence Guard)
 * E) Spot-Check Known Codes
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';
import {
    loadBel2Catalog,
    getBel2Meta,
    getBel2Entries,
    lookupBel2,
    normalizeBel2Code,
    hasBel2Code,
} from '../../core/billing/knowledgeBase/logic/bel2Catalog';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const EXPECTED_SOURCE_FILE = 'BEL_II_01_01_2022.pdf';
const EXPECTED_SOURCE_PAGES = 135;
const MIN_EXPECTED_ENTRIES = 150; // Actual: ~175

// Known codes for spot-checking (verified from PDF)
const SPOT_CHECK_CODES = [
    { code: 'BEL_0010', kurztext: 'Modell' },
    { code: 'BEL_0202', kurztext: 'Basis für Konstruktionsbiss' },
    { code: 'BEL_1021', kurztext: 'Vollkrone/Metall' },
    { code: 'BEL_1100', kurztext: 'Brückenglied' },
    { code: 'BEL_1620', kurztext: 'Vestibuläre Verblendung Keramik' },
];

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('GATE: BEL II Catalog SSOT', () => {
    // ═══════════════════════════════════════════════════════════
    // A) FILE EXISTENCE & META VALIDATION
    // ═══════════════════════════════════════════════════════════

    describe('A) File Existence & Meta Validation', () => {
        it('JSON catalog file exists', () => {
            const catalogPath = resolve(
                __dirname,
                '../../core/billing/knowledgeBase/kataloge/bel2_2022.json'
            );
            expect(existsSync(catalogPath)).toBe(true);
        });

        it('meta.source.file matches expected PDF filename', () => {
            const meta = getBel2Meta();
            expect(meta.source.file).toBe(EXPECTED_SOURCE_FILE);
        });

        it('meta.source.pages matches expected page count', () => {
            const meta = getBel2Meta();
            expect(meta.source.pages).toBe(EXPECTED_SOURCE_PAGES);
        });

        it('meta.source.publisher is GKV-Spitzenverband', () => {
            const meta = getBel2Meta();
            expect(meta.source.publisher).toBe('GKV-Spitzenverband');
        });

        it('meta.schema is docudent.bel2.v1', () => {
            const meta = getBel2Meta();
            expect(meta.schema).toBe('docudent.bel2.v1');
        });
    });

    // ═══════════════════════════════════════════════════════════
    // B) ENTRY COUNT & STRUCTURE
    // ═══════════════════════════════════════════════════════════

    describe('B) Entry Count & Structure', () => {
        it(`has at least ${MIN_EXPECTED_ENTRIES} entries`, () => {
            const entries = getBel2Entries();
            expect(entries.length).toBeGreaterThanOrEqual(MIN_EXPECTED_ENTRIES);
        });

        it('meta.counts.entries matches actual entry count', () => {
            const meta = getBel2Meta();
            const entries = getBel2Entries();
            expect(meta.counts.entries).toBe(entries.length);
        });

        it('all entries have required fields', () => {
            const entries = getBel2Entries();
            for (const entry of entries) {
                expect(entry.code).toBeTruthy();
                expect(entry.codeId).toBeTruthy();
                expect(entry.page).toBeDefined();
                expect(entry.page.start).toBeDefined();
                expect(entry.leistungsinhalt).toBeTruthy();
                expect(entry.kurztext).toBeTruthy();
            }
        });

        it('catalog loads as Record keyed by codeId', () => {
            const catalog = loadBel2Catalog();
            expect(typeof catalog).toBe('object');
            expect(Object.keys(catalog).length).toBeGreaterThanOrEqual(MIN_EXPECTED_ENTRIES);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // C) CODE FORMAT & UNIQUENESS
    // ═══════════════════════════════════════════════════════════

    describe('C) Code Format & Uniqueness', () => {
        it('all codes follow 4-digit format /^\\d{4}$/', () => {
            const entries = getBel2Entries();
            for (const entry of entries) {
                expect(entry.code).toMatch(/^\d{4}$/);
            }
        });

        it('all codeIds follow BEL_XXXX format', () => {
            const entries = getBel2Entries();
            for (const entry of entries) {
                expect(entry.codeId).toMatch(/^BEL_\d{4}$/);
            }
        });

        it('all codeIds are unique', () => {
            const entries = getBel2Entries();
            const codeIds = entries.map((e) => e.codeId);
            const uniqueIds = new Set(codeIds);
            expect(uniqueIds.size).toBe(codeIds.length);
        });

        it('codeId matches BEL_{code} format', () => {
            const entries = getBel2Entries();
            for (const entry of entries) {
                expect(entry.codeId).toBe(`BEL_${entry.code}`);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // D) PAGE RANGE VALIDATION (Evidence Guard)
    // ═══════════════════════════════════════════════════════════

    describe('D) Page Range Validation (Evidence Guard)', () => {
        it(`all page.start values are between 1 and ${EXPECTED_SOURCE_PAGES}`, () => {
            const entries = getBel2Entries();
            for (const entry of entries) {
                expect(entry.page.start).toBeGreaterThanOrEqual(1);
                expect(entry.page.start).toBeLessThanOrEqual(EXPECTED_SOURCE_PAGES);
            }
        });

        it('page.end >= page.start for all entries', () => {
            const entries = getBel2Entries();
            for (const entry of entries) {
                expect(entry.page.end).toBeGreaterThanOrEqual(entry.page.start);
            }
        });

        it('page references are within valid PDF range', () => {
            const entries = getBel2Entries();
            for (const entry of entries) {
                expect(entry.page.end).toBeLessThanOrEqual(EXPECTED_SOURCE_PAGES);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // E) SPOT-CHECK KNOWN CODES
    // ═══════════════════════════════════════════════════════════

    describe('E) Spot-Check Known Codes', () => {
        it.each(SPOT_CHECK_CODES)(
            '$code exists and has correct kurztext',
            ({ code, kurztext }) => {
                const entry = lookupBel2(code);
                expect(entry).not.toBeNull();
                expect(entry!.kurztext).toBe(kurztext);
            }
        );

        it('spot-checked entries have non-empty leistungsinhalt', () => {
            for (const { code } of SPOT_CHECK_CODES) {
                const entry = lookupBel2(code);
                expect(entry!.leistungsinhalt.length).toBeGreaterThan(5);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // F) LOOKUP API VALIDATION
    // ═══════════════════════════════════════════════════════════

    describe('F) Lookup API Validation', () => {
        it('lookupBel2 accepts BEL_XXXX format', () => {
            const entry = lookupBel2('BEL_0010');
            expect(entry).not.toBeNull();
            expect(entry!.code).toBe('0010');
        });

        it('lookupBel2 accepts raw XXXX format', () => {
            const entry = lookupBel2('0010');
            expect(entry).not.toBeNull();
            expect(entry!.code).toBe('0010');
        });

        it('lookupBel2 returns null for non-existent code', () => {
            const entry = lookupBel2('9999');
            expect(entry).toBeNull();
        });

        it('normalizeBel2Code converts raw to BEL_ format', () => {
            expect(normalizeBel2Code('0202')).toBe('BEL_0202');
        });

        it('normalizeBel2Code preserves BEL_ format', () => {
            expect(normalizeBel2Code('BEL_0202')).toBe('BEL_0202');
        });

        it('hasBel2Code returns true for existing codes', () => {
            expect(hasBel2Code('BEL_0010')).toBe(true);
            expect(hasBel2Code('0010')).toBe(true);
        });

        it('hasBel2Code returns false for non-existent codes', () => {
            expect(hasBel2Code('BEL_9999')).toBe(false);
            expect(hasBel2Code('9999')).toBe(false);
        });
    });
});
