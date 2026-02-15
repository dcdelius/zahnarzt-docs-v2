/**
 * Endo Signal Parser Tests — Unit Tests for Signal Extraction
 *
 * ═══════════════════════════════════════════════════════════════
 * 12 test vectors covering visit detection, lengths, irrigation,
 * instrumentation, and noise tolerance.
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { parseEndoSignals } from '../endoSignalParser';

describe('Endo Signal Parser', () => {
    // ═══════════════════════════════════════════════════════════════
    // VISIT NUMBER DETECTION
    // ═══════════════════════════════════════════════════════════════

    describe('Visit Number Detection', () => {
        it('detects "Zweiter Termin" as visit 2', () => {
            const result = parseEndoSignals('Zahn 36. Zweiter Termin Wurzelkanalbehandlung.');
            expect(result.visitNumber).toBe(2);
        });

        it('detects "2. Termin" as visit 2', () => {
            const result = parseEndoSignals('Zahn 36. 2. Termin WKB.');
            expect(result.visitNumber).toBe(2);
        });

        it('detects "Erster Termin" as visit 1', () => {
            const result = parseEndoSignals('Erster Termin Wurzelbehandlung Zahn 46.');
            expect(result.visitNumber).toBe(1);
        });

        it('detects "Dritter Termin" as visit 3', () => {
            const result = parseEndoSignals('Dritter Termin, Wurzelfüllung geplant.');
            expect(result.visitNumber).toBe(3);
        });

        it('returns null when no visit mentioned', () => {
            const result = parseEndoSignals('Zahn 36 Wurzelbehandlung.');
            expect(result.visitNumber).toBe(null);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // WORKING LENGTHS DETECTION
    // ═══════════════════════════════════════════════════════════════

    describe('Working Lengths Detection', () => {
        it('detects "Arbeitslängen überprüft" as checked but missing values', () => {
            const result = parseEndoSignals('Arbeitslängen überprüft. Kanäle erneut aufbereitet.');
            expect(result.workingLengthsChecked).toBe(true);
            expect(result.workingLengthsByCanal).toBe(null);
        });

        it('detects per-canal lengths "MB 19, ML 18, D 20"', () => {
            const result = parseEndoSignals('Apex Locator, MB 19, ML 18, D 20.');
            expect(result.workingLengthsByCanal).toEqual({
                MB: 19,
                ML: 18,
                D: 20,
            });
        });

        it('detects per-canal lengths with colons "MB: 19, ML: 18"', () => {
            const result = parseEndoSignals('Arbeitslängen: MB: 19, ML: 18.');
            expect(result.workingLengthsByCanal).toEqual({
                MB: 19,
                ML: 18,
            });
        });

        it('detects apex locator method', () => {
            const result = parseEndoSignals('Arbeitslängen mit Apexlokator bestimmt.');
            expect(result.workingLengthMethod).toBe('apex_locator');
        });

        it('detects X-ray method', () => {
            const result = parseEndoSignals('Längenbestimmung per Röntgenkontrolle.');
            expect(result.workingLengthMethod).toBe('xray');
        });

        it('detects both methods when both mentioned', () => {
            const result = parseEndoSignals('Apex Locator und Röntgenkontrolle.');
            expect(result.workingLengthMethod).toBe('both');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // IRRIGATION DETECTION
    // ═══════════════════════════════════════════════════════════════

    describe('Irrigation Detection', () => {
        it('returns empty array when only "gespült" mentioned', () => {
            const result = parseEndoSignals('Kanäle gespült.');
            expect(result.irrigationSolutions).toEqual([]);
        });

        it('detects NaOCl and EDTA', () => {
            const result = parseEndoSignals('Gespült mit NaOCl und EDTA.');
            expect(result.irrigationSolutions).toContain('NaOCl');
            expect(result.irrigationSolutions).toContain('EDTA');
        });

        it('detects CHX', () => {
            const result = parseEndoSignals('Abschlussspülung mit Chlorhexidin.');
            expect(result.irrigationSolutions).toContain('CHX');
        });

        it('detects Natriumhypochlorit full word', () => {
            const result = parseEndoSignals('Spülung mit Natriumhypochlorit 3%.');
            expect(result.irrigationSolutions).toContain('NaOCl');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // INSTRUMENTATION MODE DETECTION
    // ═══════════════════════════════════════════════════════════════

    describe('Instrumentation Mode Detection', () => {
        it('detects "maschinell aufbereitet" as rotary', () => {
            const result = parseEndoSignals('Kanäle maschinell aufbereitet.');
            expect(result.instrumentationMode).toBe('rotary');
        });

        it('detects ProTaper as rotary', () => {
            const result = parseEndoSignals('Aufbereitung mit ProTaper Gold.');
            expect(result.instrumentationMode).toBe('rotary');
        });

        it('detects "manuell" as manual', () => {
            const result = parseEndoSignals('Manuelle Aufbereitung mit K-Feilen.');
            expect(result.instrumentationMode).toBe('manual');
        });

        it('returns null when not mentioned', () => {
            const result = parseEndoSignals('Kanäle aufbereitet und gespült.');
            expect(result.instrumentationMode).toBe(null);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // MEDICAMENT DETECTION
    // ═══════════════════════════════════════════════════════════════

    describe('Medicament Detection', () => {
        it('detects Kalziumhydroxid', () => {
            const result = parseEndoSignals('Neue medikamentöse Einlage mit Kalziumhydroxid.');
            expect(result.medicament).toBe('CaOH2');
        });

        it('detects Calciumhydroxid', () => {
            const result = parseEndoSignals('Einlage: Calciumhydroxid.');
            expect(result.medicament).toBe('CaOH2');
        });

        it('detects Ca(OH)2', () => {
            const result = parseEndoSignals('Einlage Ca(OH)2.');
            expect(result.medicament).toBe('CaOH2');
        });

        it('detects Ledermix', () => {
            const result = parseEndoSignals('Einlage mit Ledermix.');
            expect(result.medicament).toBe('Ledermix');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // BASELINE DICTATION
    // ═══════════════════════════════════════════════════════════════

    describe('Baseline Dictation', () => {
        const BASELINE = `Zahn 36. Zweiter Termin Wurzelkanalbehandlung. Kofferdam angelegt. 
Alte medikamentöse Einlage entfernt. Kanäle erneut aufbereitet und gespült. 
Arbeitslängen überprüft. Keine Beschwerden. 
Neue medikamentöse Einlage mit Kalziumhydroxid. Provisorischer Verschluss.`;

        it('parses baseline dictation correctly', () => {
            const result = parseEndoSignals(BASELINE);

            expect(result.tooth).toBe('36');
            expect(result.visitNumber).toBe(2);
            expect(result.kofferdam).toBe(true);
            expect(result.medicament).toBe('CaOH2');
            expect(result.workingLengthsChecked).toBe(true);
            expect(result.workingLengthsByCanal).toBe(null); // Not specified
            expect(result.irrigationSolutions).toEqual([]); // Only "gespült", no specific solutions
            expect(result.instrumentationMode).toBe(null); // Not specified
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // NOISE TOLERANCE
    // ═══════════════════════════════════════════════════════════════

    describe('Noise Tolerance', () => {
        it('handles punctuation and abbreviations', () => {
            const result = parseEndoSignals('Z. 36, 2. Termin WKB; Kofferdam.');
            expect(result.tooth).toBe('36');
            expect(result.visitNumber).toBe(2);
            expect(result.kofferdam).toBe(true);
        });

        it('handles mixed case', () => {
            const result = parseEndoSignals('NAOCL und edta Spülung.');
            expect(result.irrigationSolutions).toContain('NaOCl');
            expect(result.irrigationSolutions).toContain('EDTA');
        });
    });
});
