/**
 * Endo Signal Parser Deviation Tests — 12+ Deviation Scenarios
 *
 * ═══════════════════════════════════════════════════════════════
 * Tests for deviation mode: pain persists, partial negotiability,
 * plan vs outcome mismatch, canal-specific limitations.
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { parseDeviationSignals } from '../endoSignalParser';

describe('Endo Signal Parser Deviation Mode', () => {
    // ═══════════════════════════════════════════════════════════════
    // PAIN PERSISTENT
    // ═══════════════════════════════════════════════════════════════

    describe('Pain Persistent Detection', () => {
        it('detects "noch schmerzhaft"', () => {
            const result = parseDeviationSignals('Zahn 36. Kofferdam. Patient noch schmerzhaft. Einlage erneuert.');
            expect(result.deviationMode).toBe(true);
            expect(result.deviationFlags.some(f => f.type === 'PAIN_PERSISTENT')).toBe(true);
        });

        it('detects "druckdolent"', () => {
            const result = parseDeviationSignals('Zahn 16. Druckdolent auf Perkussion. CaOH2 Einlage.');
            expect(result.deviationFlags.some(f => f.type === 'PAIN_PERSISTENT')).toBe(true);
        });

        it('detects "weiterhin Schmerzen"', () => {
            const result = parseDeviationSignals('Patient hat weiterhin Schmerzen. Erneute Einlage.');
            expect(result.deviationFlags.some(f => f.type === 'PAIN_PERSISTENT')).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // PARTIAL NEGOTIABILITY
    // ═══════════════════════════════════════════════════════════════

    describe('Partial Negotiability Detection', () => {
        it('detects "nicht bis apex"', () => {
            const result = parseDeviationSignals('MB nicht bis apex erreichbar. Stufe bei 15mm.');
            expect(result.deviationMode).toBe(true);
            expect(result.deviationFlags.some(f => f.type === 'PARTIAL_NEGOTIABILITY')).toBe(true);
        });

        it('detects "obliteriert"', () => {
            const result = parseDeviationSignals('Mesiobukkal-Kanal obliteriert.');
            expect(result.deviationFlags.some(f => f.type === 'PARTIAL_NEGOTIABILITY')).toBe(true);
        });

        it('detects "nicht passierbar"', () => {
            const result = parseDeviationSignals('DB nicht passierbar. Starke Krümmung.');
            expect(result.deviationFlags.some(f => f.type === 'PARTIAL_NEGOTIABILITY')).toBe(true);
        });

        it('detects "kalzifiziert"', () => {
            const result = parseDeviationSignals('MB2 kalzifiziert, nicht sondierbar.');
            expect(result.deviationFlags.some(f => f.type === 'PARTIAL_NEGOTIABILITY')).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CANAL-SPECIFIC STATE EXTRACTION
    // ═══════════════════════════════════════════════════════════════

    describe('Canal-Specific State Extraction', () => {
        it('extracts MB not negotiable with limitation reason', () => {
            const result = parseDeviationSignals('MB nicht bis apex, Stufe. P bis WL 21mm.');

            const mbState = result.canalStates.get('MB');
            expect(mbState?.negotiableToApex).toBe(false);
            expect(mbState?.limitationReason).toBe('calcified');

            const pState = result.canalStates.get('P');
            expect(pState?.negotiableToApex).toBe(true);
            expect(pState?.workingLengthMm).toBe(21);
        });

        it('extracts ledge limitation', () => {
            const result = parseDeviationSignals('DB Stufe bei 12mm. ML bis apex.');

            const dbState = result.canalStates.get('DB');
            expect(dbState?.negotiableToApex).toBe(false);
            expect(dbState?.limitationReason).toBe('ledge');
        });

        it('extracts positive negotiability from "bis WL"', () => {
            const result = parseDeviationSignals('P bis WL, MB bis apex.');

            expect(result.canalStates.get('P')?.negotiableToApex).toBe(true);
            expect(result.canalStates.get('MB')?.negotiableToApex).toBe(true);
        });

        it('extracts WL values per canal', () => {
            const result = parseDeviationSignals('P 21mm, MB 19mm, DB 18mm.');

            expect(result.canalStates.get('P')?.workingLengthMm).toBe(21);
            expect(result.canalStates.get('MB')?.workingLengthMm).toBe(19);
            expect(result.canalStates.get('DB')?.workingLengthMm).toBe(18);
        });

        it('extracts ISO per canal', () => {
            const result = parseDeviationSignals('P ISO 30, MB ISO 25.');

            expect(result.canalStates.get('P')?.fileIso).toBe(30);
            expect(result.canalStates.get('MB')?.fileIso).toBe(25);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // INTENT VS OUTCOME MISMATCH
    // ═══════════════════════════════════════════════════════════════

    describe('Intent vs Outcome Detection', () => {
        it('detects planned obturation but performed medication', () => {
            const result = parseDeviationSignals(
                'Heute abfüllen geplant. Patient noch Schmerzen. Erneut CaOH2 Einlage gelegt.'
            );

            expect(result.intent?.plannedStep).toBe('obturation');
            expect(result.outcome?.performedSteps.has('medication')).toBe(true);
            expect(result.outcome?.performedSteps.has('obturationComplete')).toBe(false);
        });

        it('detects re-medication flag', () => {
            const result = parseDeviationSignals('Erneut CaOH2 eingebracht. Temp. Verschluss.');

            expect(result.deviationFlags.some(f => f.type === 'RE_MEDICATION')).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // THE KEY SCENARIO: TOOTH 26, PARTIAL NEGOTIABILITY
    // ═══════════════════════════════════════════════════════════════

    describe('Key Scenario: Tooth 26 Partial Negotiability', () => {
        const TOOTH_26_SCENARIO = `Zahn 26. Zwischensitzung. Kofferdam.
Alte Einlage entfernt. P 21mm ISO 30.
MB nicht bis Apex erreichbar, kalzifiziert ca. 15mm.
Gespült mit NaOCl und EDTA.
CaOH2 Einlage. Provisorischer Verschluss.
Nächster Termin: erneuter Versuch MB oder partielle WF.`;

        it('triggers deviation mode', () => {
            const result = parseDeviationSignals(TOOTH_26_SCENARIO);
            expect(result.deviationMode).toBe(true);
        });

        it('detects partial negotiability flag', () => {
            const result = parseDeviationSignals(TOOTH_26_SCENARIO);
            expect(result.deviationFlags.some(f => f.type === 'PARTIAL_NEGOTIABILITY')).toBe(true);
        });

        it('correctly identifies P as negotiable with WL and ISO', () => {
            const result = parseDeviationSignals(TOOTH_26_SCENARIO);

            const pState = result.canalStates.get('P');
            expect(pState?.negotiableToApex).toBe(true);
            expect(pState?.workingLengthMm).toBe(21);
            expect(pState?.fileIso).toBe(30);
        });

        it('correctly identifies MB as not negotiable with limitation', () => {
            const result = parseDeviationSignals(TOOTH_26_SCENARIO);

            const mbState = result.canalStates.get('MB');
            expect(mbState?.negotiableToApex).toBe(false);
            expect(mbState?.limitationReason).toBe('calcified');
        });

        it('detects both canals', () => {
            const result = parseDeviationSignals(TOOTH_26_SCENARIO);
            expect(result.detectedCanals).toContain('P');
            expect(result.detectedCanals).toContain('MB');
        });

        it('detects performed steps', () => {
            const result = parseDeviationSignals(TOOTH_26_SCENARIO);

            expect(result.outcome?.performedSteps.has('kofferdam')).toBe(true);
            expect(result.outcome?.performedSteps.has('removalMed')).toBe(true);
            expect(result.outcome?.performedSteps.has('irrigation')).toBe(true);
            expect(result.outcome?.performedSteps.has('medication')).toBe(true);
            expect(result.outcome?.performedSteps.has('tempSeal')).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // RETREATMENT / REVISION
    // ═══════════════════════════════════════════════════════════════

    describe('Retreatment Detection', () => {
        it('detects "Revision"', () => {
            const result = parseDeviationSignals('Endo-Revision Zahn 16. Alte WF entfernt.');
            expect(result.deviationFlags.some(f => f.type === 'RETREATMENT')).toBe(true);
        });

        it('detects "Wiederbehandlung"', () => {
            const result = parseDeviationSignals('Wiederbehandlung nach 5 Jahren.');
            expect(result.deviationFlags.some(f => f.type === 'RETREATMENT')).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // NO DEVIATION (Standard Flow)
    // ═══════════════════════════════════════════════════════════════

    describe('Standard Flow (No Deviation)', () => {
        // Standard T2 with all canals negotiable and complete information
        const STANDARD_T2 = `Zahn 36. Zweiter Termin. Kofferdam.
Alle Kanäle gut passierbar. MB 19mm, ML 18mm, D 20mm.
ISO 30 alle Kanäle. Maschinell aufbereitet.
Gespült mit NaOCl und EDTA. CaOH2 Einlage gelegt. Provisorischer Verschluss.`;

        it('does NOT trigger deviation mode for standard T2', () => {
            const result = parseDeviationSignals(STANDARD_T2);
            // Should have no deviation flags
            expect(result.deviationFlags).toHaveLength(0);
            // All detected canals should be negotiable (not false)
            for (const [, state] of result.canalStates) {
                expect(state.negotiableToApex).not.toBe(false);
            }
            expect(result.deviationMode).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // EXUDATE / PUS
    // ═══════════════════════════════════════════════════════════════

    describe('Exudate Detection', () => {
        it('detects "Exsudat" present', () => {
            const result = parseDeviationSignals('Exsudat aus Kanal. Erneut gespült. Einlage.');
            expect(result.deviationFlags.some(f => f.type === 'EXUDATE_PRESENT')).toBe(true);
        });

        it('detects "Pus"', () => {
            const result = parseDeviationSignals('Pus bei Eröffnung. Kein Verschluss.');
            expect(result.deviationFlags.some(f => f.type === 'EXUDATE_PRESENT')).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // INSTRUMENT SEPARATION
    // ═══════════════════════════════════════════════════════════════

    describe('Instrument Separation Detection', () => {
        it('detects "Feile frakturiert"', () => {
            const result = parseDeviationSignals('Feile frakturiert im MB-Kanal.');
            expect(result.deviationFlags.some(f => f.type === 'INSTRUMENT_SEPARATION')).toBe(true);
        });
    });
});
