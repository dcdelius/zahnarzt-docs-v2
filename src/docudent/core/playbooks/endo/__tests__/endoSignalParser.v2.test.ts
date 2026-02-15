/**
 * Endo Signal Parser V2 Tests — 30+ Test Vectors
 *
 * ═══════════════════════════════════════════════════════════════
 * Tests for ISO detection, taper parsing, canal labels, German
 * synonyms, decimal comma, hash symbol, "er" suffix.
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { parseEndoSignals } from '../endoSignalParser';

describe('Endo Signal Parser V2', () => {
    // ═══════════════════════════════════════════════════════════════
    // ISO SIZE DETECTION
    // ═══════════════════════════════════════════════════════════════

    describe('ISO Size Detection', () => {
        it('detects "ISO 25"', () => {
            const result = parseEndoSignals('Aufbereitung bis ISO 25.');
            expect(result.apicalSizes).toBeDefined();
            expect(result.apicalSizes?.some(s => s.iso === 25)).toBe(true);
        });

        it('detects "ISO25" without space', () => {
            const result = parseEndoSignals('Aufbereitung ISO25.');
            expect(result.apicalSizes?.some(s => s.iso === 25)).toBe(true);
        });

        it('detects "#25"', () => {
            const result = parseEndoSignals('Finale Größe #25.');
            expect(result.apicalSizes?.some(s => s.iso === 25)).toBe(true);
        });

        it('detects "# 25" with space', () => {
            const result = parseEndoSignals('Finale Größe # 25.');
            expect(result.apicalSizes?.some(s => s.iso === 25)).toBe(true);
        });

        it('detects "25er" German suffix', () => {
            const result = parseEndoSignals('Aufbereitung mit 25er Feile.');
            expect(result.apicalSizes?.some(s => s.iso === 25)).toBe(true);
        });

        it('detects "30er" German suffix', () => {
            const result = parseEndoSignals('Finale Aufbereitung 30er.');
            expect(result.apicalSizes?.some(s => s.iso === 30)).toBe(true);
        });

        it('detects "25er feile" with suffix', () => {
            const result = parseEndoSignals('Aufbereitung mit 35er feile abgeschlossen.');
            expect(result.apicalSizes?.some(s => s.iso === 35)).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TAPER DETECTION
    // ═══════════════════════════════════════════════════════════════

    describe('Taper Detection', () => {
        it('detects "30/.04" size with taper', () => {
            const result = parseEndoSignals('Aufbereitung 30/.04.');
            expect(result.apicalSizes?.some(s => s.iso === 30 && s.taper === '.04')).toBe(true);
        });

        it('detects "25/.06" size with taper', () => {
            const result = parseEndoSignals('Finale Größe 25/.06.');
            expect(result.apicalSizes?.some(s => s.iso === 25 && s.taper === '.06')).toBe(true);
        });

        it('detects "35/.04" with space', () => {
            const result = parseEndoSignals('Aufbereitung 35 / .04.');
            expect(result.apicalSizes?.some(s => s.iso === 35 && s.taper === '.04')).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CANAL LABELS (German synonyms)
    // ═══════════════════════════════════════════════════════════════

    describe('Canal Label Detection', () => {
        it('detects "MB" canal', () => {
            const result = parseEndoSignals('Kanal MB aufbereitet.');
            expect(result.canalLabels).toContain('MB');
        });

        it('detects "mesiobukkal" German synonym', () => {
            const result = parseEndoSignals('Mesiobukkal-Kanal erweitert.');
            expect(result.canalLabels).toContain('MB');
        });

        it('detects "ML" canal', () => {
            const result = parseEndoSignals('ML-Kanal: ISO 25.');
            expect(result.canalLabels).toContain('ML');
        });

        it('detects "mesiolingual" German synonym', () => {
            const result = parseEndoSignals('Mesiolingual aufbereitet.');
            expect(result.canalLabels).toContain('ML');
        });

        it('detects "DB" canal', () => {
            const result = parseEndoSignals('DB-Kanal enge Anatomie.');
            expect(result.canalLabels).toContain('DB');
        });

        it('detects "distobukkal" German synonym', () => {
            const result = parseEndoSignals('Distobukkal gut erreichbar.');
            expect(result.canalLabels).toContain('DB');
        });

        it('detects "P" palatal canal', () => {
            const result = parseEndoSignals('Palatinal-Kanal ISO 30.');
            expect(result.canalLabels).toContain('P');
        });

        it('detects "D" distal canal', () => {
            const result = parseEndoSignals('Distal-Kanal erweitert.');
            expect(result.canalLabels).toContain('D');
        });

        it('detects generic "K1/K2/K3" labels', () => {
            const result = parseEndoSignals('K1 19mm, K2 18mm, K3 17mm.');
            expect(result.canalLabels).toContain('K1');
            expect(result.canalLabels).toContain('K2');
            expect(result.canalLabels).toContain('K3');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // DECIMAL COMMA + EDGE CASES
    // ═══════════════════════════════════════════════════════════════

    describe('Decimal Comma Handling', () => {
        it('parses "19,5 mm" with German decimal comma', () => {
            const result = parseEndoSignals('MB 19,5 mm.');
            expect(result.workingLengthsByCanal?.MB).toBe(19.5);
        });

        it('parses "18,0mm" with comma', () => {
            const result = parseEndoSignals('ML 18,0mm.');
            expect(result.workingLengthsByCanal?.ML).toBe(18);
        });
    });

    describe('Multiple Teeth Detection', () => {
        it('picks last explicitly treated tooth when multiple mentioned', () => {
            const result = parseEndoSignals('Zahn 36 zuvor behandelt. Heute Zahn 46 WKB.');
            expect(result.tooth).toBe('46');
        });
    });

    describe('Revision Detection', () => {
        it('"Revision" implies visit 2', () => {
            const result = parseEndoSignals('Endo Revision Zahn 16.');
            expect(result.visitNumber).toBe(2);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // KOFFERDAM EDGE CASES
    // ═══════════════════════════════════════════════════════════════

    describe('Kofferdam Edge Cases', () => {
        it('"kein Kofferdam möglich" sets kofferdamNotPossible', () => {
            const result = parseEndoSignals('Kein Kofferdam möglich wegen Kronenrand.');
            expect(result.kofferdam).toBe(false);
            expect(result.kofferdamNotPossible).toBe(true);
        });

        it('"keine Kofferdam" sets kofferdamNotPossible', () => {
            const result = parseEndoSignals('Keine Kofferdam angelegt.');
            expect(result.kofferdam).toBe(false);
            expect(result.kofferdamNotPossible).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // OBTURATION TECHNIQUE DETECTION
    // ═══════════════════════════════════════════════════════════════

    describe('Obturation Technique Detection', () => {
        it('detects "warm vertikal"', () => {
            const result = parseEndoSignals('Obturation warm vertikal.');
            expect(result.obturationTechnique).toBe('warm_vertical');
        });

        it('detects "laterale Kondensation"', () => {
            const result = parseEndoSignals('Wurzelfüllung mit lateraler Kondensation.');
            expect(result.obturationTechnique).toBe('lateral');
        });

        it('detects "GuttaCore"', () => {
            const result = parseEndoSignals('Füllung mit GuttaCore.');
            expect(result.obturationTechnique).toBe('carrier');
        });

        it('detects "Single Cone"', () => {
            const result = parseEndoSignals('Single Cone Technik.');
            expect(result.obturationTechnique).toBe('single_cone');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // SEALER TYPE DETECTION
    // ═══════════════════════════════════════════════════════════════

    describe('Sealer Type Detection', () => {
        it('detects "AH Plus" as resin', () => {
            const result = parseEndoSignals('Sealer AH Plus.');
            expect(result.sealerTypeClass).toBe('resin');
        });

        it('detects "Bioceramic" sealer', () => {
            const result = parseEndoSignals('Bioceramic Sealer verwendet.');
            expect(result.sealerTypeClass).toBe('bioceramic');
        });

        it('detects "TotalFill" as bioceramic', () => {
            const result = parseEndoSignals('Sealer TotalFill BC.');
            expect(result.sealerTypeClass).toBe('bioceramic');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // WORKING LENGTH METHOD (V2 additions)
    // ═══════════════════════════════════════════════════════════════

    describe('Working Length Method V2', () => {
        it('detects "EAL" as apex locator', () => {
            const result = parseEndoSignals('Arbeitslängen mit EAL bestimmt.');
            expect(result.workingLengthMethod).toBe('apex_locator');
        });

        it('detects "Messaufnahme" as xray', () => {
            const result = parseEndoSignals('Messaufnahme zur Längenbestimmung.');
            expect(result.workingLengthMethod).toBe('xray');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // T3/OBTURATION PHASE DETECTION
    // ═══════════════════════════════════════════════════════════════

    describe('Phase Detection V2', () => {
        it('detects t3 phase from "wurzelfüllung"', () => {
            const result = parseEndoSignals('Wurzelfüllung heute abgeschlossen.');
            expect(result.phase).toBe('t3');
        });

        it('detects t3 phase from "guttapercha"', () => {
            const result = parseEndoSignals('Guttapercha-Füllung eingebracht.');
            expect(result.phase).toBe('t3');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CANAL-SPECIFIC ISO DETECTION
    // ═══════════════════════════════════════════════════════════════

    describe('Canal-Specific ISO Detection', () => {
        it('detects "MB ISO 25"', () => {
            const result = parseEndoSignals('MB ISO 25, ML ISO 30.');
            expect(result.apicalSizes?.some(s => s.canal === 'MB' && s.iso === 25)).toBe(true);
            expect(result.apicalSizes?.some(s => s.canal === 'ML' && s.iso === 30)).toBe(true);
        });

        it('detects "D: 30" as canal with ISO', () => {
            const result = parseEndoSignals('D: 30, P: 35.');
            expect(result.apicalSizes?.some(s => s.canal === 'D' && s.iso === 30)).toBe(true);
            expect(result.apicalSizes?.some(s => s.canal === 'P' && s.iso === 35)).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // BASELINE T2 DICTATION (V2)
    // ═══════════════════════════════════════════════════════════════

    describe('Baseline Dictation V2', () => {
        const BASELINE_V2 = `Zahn 36. Zweiter Termin Wurzelkanalbehandlung. Kofferdam angelegt.
Alte medikamentöse Einlage entfernt. Kanäle maschinell aufbereitet mit Reciproc.
MB 19mm, ML 18,5mm, D 20mm. Apikale Größen: MB ISO 25, ML ISO 30, D ISO 35.
Gespült mit NaOCl und EDTA. Neue Einlage mit Kalziumhydroxid. Provisorischer Verschluss.`;

        it('parses complete T2 dictation', () => {
            const result = parseEndoSignals(BASELINE_V2);

            // Basic
            expect(result.tooth).toBe('36');
            expect(result.visitNumber).toBe(2);
            expect(result.kofferdam).toBe(true);
            expect(result.instrumentationMode).toBe('rotary');
            expect(result.medicament).toBe('CaOH2');

            // Working lengths
            expect(result.workingLengthsByCanal?.MB).toBe(19);
            expect(result.workingLengthsByCanal?.ML).toBe(18.5);
            expect(result.workingLengthsByCanal?.D).toBe(20);

            // ISO sizes
            expect(result.apicalSizes?.some(s => s.canal === 'MB' && s.iso === 25)).toBe(true);
            expect(result.apicalSizes?.some(s => s.canal === 'ML' && s.iso === 30)).toBe(true);
            expect(result.apicalSizes?.some(s => s.canal === 'D' && s.iso === 35)).toBe(true);

            // Irrigation
            expect(result.irrigationSolutions).toContain('NaOCl');
            expect(result.irrigationSolutions).toContain('EDTA');
        });
    });
});
