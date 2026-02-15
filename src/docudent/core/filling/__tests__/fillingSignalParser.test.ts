/**
 * Filling Signal Parser Tests — Regex/Keyword Extraction
 *
 * ═══════════════════════════════════════════════════════════════
 * Tests for deterministic signal extraction from filling dictations.
 * Includes "flapsige Umgangssprache" (colloquial German).
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { parseFillingSignals } from '../fillingSignalParser';

describe('Filling Signal Parser', () => {
    // ═══════════════════════════════════════════════════════════
    // TOOTH EXTRACTION
    // ═══════════════════════════════════════════════════════════

    describe('Tooth Extraction', () => {
        it('extracts FDI notation "36"', () => {
            const result = parseFillingSignals('Füllung am 36');
            expect(result.tooth).toBe('36');
        });

        it('extracts "Zahn 46"', () => {
            const result = parseFillingSignals('Zahn 46 MOD Komposit');
            expect(result.tooth).toBe('46');
        });

        it('extracts "der 26"', () => {
            const result = parseFillingSignals('Am der 26 eine Füllung');
            expect(result.tooth).toBe('26');
        });
    });

    // ═══════════════════════════════════════════════════════════
    // SURFACE EXTRACTION
    // ═══════════════════════════════════════════════════════════

    describe('Surface Extraction', () => {
        it('extracts MOD compound', () => {
            const result = parseFillingSignals('MOD-Füllung');
            expect(result.surfaces).toContain('MOD');
        });

        it('extracts m-o-d with spaces', () => {
            const result = parseFillingSignals('m o d Füllung');
            expect(result.surfaces).toContain('MOD');
        });

        it('extracts okklusal', () => {
            const result = parseFillingSignals('okklusale Füllung');
            expect(result.surfaces).toContain('O');
        });

        it('extracts mesial and distal separately', () => {
            const result = parseFillingSignals('mesial und distal');
            expect(result.surfaces).toContain('M');
            expect(result.surfaces).toContain('D');
        });

        it('extracts from approximal context "zwischen 36/37"', () => {
            const result = parseFillingSignals('Karies zwischen 36/37');
            expect(result.surfaces).not.toBeNull();
        });
    });

    // ═══════════════════════════════════════════════════════════
    // MATERIAL EXTRACTION
    // ═══════════════════════════════════════════════════════════

    describe('Material Extraction', () => {
        it('detects composite', () => {
            const result = parseFillingSignals('Kompositfüllung');
            expect(result.compositeHint).toBe(true);
        });

        it('detects "Kunststoff"', () => {
            const result = parseFillingSignals('Kunststoff-Füllung');
            expect(result.compositeHint).toBe(true);
        });

        it('detects "weiße Füllung" (colloquial)', () => {
            const result = parseFillingSignals('weiße Füllung machen');
            expect(result.compositeHint).toBe(true);
        });

        it('detects glasionomer', () => {
            const result = parseFillingSignals('GIZ Füllung');
            expect(result.glasionomerHint).toBe(true);
        });

        it('detects amalgam', () => {
            const result = parseFillingSignals('Amalgamfüllung');
            expect(result.amalgamHint).toBe(true);
        });

        it('detects temporary', () => {
            const result = parseFillingSignals('provisorische Füllung');
            expect(result.temporaryHint).toBe(true);
        });

        it('detects "erstmal nur" temporary', () => {
            const result = parseFillingSignals('nur erstmal was reinmachen');
            expect(result.temporaryHint).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // ANESTHESIA EXTRACTION
    // ═══════════════════════════════════════════════════════════

    describe('Anesthesia Extraction', () => {
        it('detects Infiltrationsanästhesie', () => {
            const result = parseFillingSignals('Infiltrationsanästhesie gegeben');
            expect(result.anesthesiaHint).toBe('INFILTRATION');
        });

        it('detects colloquial "Pieks" (casual for injection)', () => {
            const result = parseFillingSignals('kurz nen Pieks und dann füllen');
            expect(result.anesthesiaHint).toBe('INFILTRATION');
        });

        it('detects "Spritze"', () => {
            const result = parseFillingSignals('eine Spritze gegeben');
            expect(result.anesthesiaHint).toBe('INFILTRATION');
        });

        it('detects "betäubt"', () => {
            const result = parseFillingSignals('hab ich betäubt');
            expect(result.anesthesiaHint).toBe('INFILTRATION');
        });

        it('detects Leitungsanästhesie', () => {
            const result = parseFillingSignals('Leitungsanästhesie gesetzt');
            expect(result.anesthesiaHint).toBe('CONDUCTION');
        });

        it('detects "ohne Anästhesie"', () => {
            const result = parseFillingSignals('ohne Anästhesie gemacht');
            expect(result.anesthesiaHint).toBe('NONE');
        });

        it('returns null when not mentioned', () => {
            const result = parseFillingSignals('Füllung am 36');
            expect(result.anesthesiaHint).toBeNull();
        });
    });

    // ═══════════════════════════════════════════════════════════
    // ISOLATION EXTRACTION
    // ═══════════════════════════════════════════════════════════

    describe('Isolation Extraction', () => {
        it('detects Kofferdam', () => {
            const result = parseFillingSignals('Kofferdam angelegt');
            expect(result.rubberDamHint).toBe(true);
        });

        it('detects "absolute Trockenlegung"', () => {
            const result = parseFillingSignals('absolute Trockenlegung');
            expect(result.rubberDamHint).toBe(true);
        });

        it('detects "relative Trockenlegung"', () => {
            const result = parseFillingSignals('relative Trockenlegung');
            expect(result.rubberDamHint).toBe(false);
        });

        it('returns null when not mentioned', () => {
            const result = parseFillingSignals('Füllung gemacht');
            expect(result.rubberDamHint).toBeNull();
        });
    });

    // ═══════════════════════════════════════════════════════════
    // CARIES DEPTH EXTRACTION
    // ═══════════════════════════════════════════════════════════

    describe('Caries Depth Extraction', () => {
        it('detects "tiefe Karies"', () => {
            const result = parseFillingSignals('tiefe Karies am 36');
            expect(result.cariesDeepHint).toBe(true);
        });

        it('detects "tiefe Dentinkaries"', () => {
            const result = parseFillingSignals('tiefe Dentinkaries');
            expect(result.cariesDeepHint).toBe(true);
        });

        it('detects "pulpanah"', () => {
            const result = parseFillingSignals('pulpanahe Karies');
            expect(result.pulpProximalHint).toBe(true);
        });

        it('detects "fast an der Pulpa"', () => {
            const result = parseFillingSignals('fast an der Pulpa');
            expect(result.pulpProximalHint).toBe(true);
        });

        it('detects "haarscharf vor" (colloquial)', () => {
            const result = parseFillingSignals('haarscharf an der Pulpa');
            expect(result.pulpProximalHint).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // BILLING EXTRACTION
    // ═══════════════════════════════════════════════════════════

    describe('Billing Extraction', () => {
        it('detects "Mehrkosten"', () => {
            const result = parseFillingSignals('Mehrkosten vereinbart');
            expect(result.mehrkostenHint).toBe(true);
        });

        it('detects "Zuzahlung"', () => {
            const result = parseFillingSignals('mit Zuzahlung');
            expect(result.mehrkostenHint).toBe(true);
        });

        it('detects "hab ich privat gemacht" (colloquial)', () => {
            const result = parseFillingSignals('hab ich privat gemacht');
            expect(result.mehrkostenHint).toBe(true);
        });

        it('detects "Patient zahlt"', () => {
            const result = parseFillingSignals('Patient zahlt selbst');
            expect(result.mehrkostenHint).toBe(true);
        });

        it('detects "Privatpatient"', () => {
            const result = parseFillingSignals('ist Privatpatient');
            expect(result.privateHint).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // DEVIATION EXTRACTION
    // ═══════════════════════════════════════════════════════════

    describe('Deviation Extraction', () => {
        it('detects "eigentlich wollten"', () => {
            const result = parseFillingSignals('eigentlich wollten wir Komposit');
            expect(result.deviationHint).toBe(true);
        });

        it('detects "stattdessen"', () => {
            const result = parseFillingSignals('stattdessen provisorisch');
            expect(result.deviationHint).toBe(true);
        });

        it('detects "leider nur"', () => {
            const result = parseFillingSignals('leider nur provisorisch');
            expect(result.deviationHint).toBe(true);
        });
    });
});
