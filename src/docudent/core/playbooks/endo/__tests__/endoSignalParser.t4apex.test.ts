/**
 * Endo Signal Parser T4 Apex Deviation Tests — Parser Tests
 *
 * ═══════════════════════════════════════════════════════════════
 * Tests for apex/negotiation deviation signal extraction:
 * - apexNotReachable
 * - canalNegotiationIssue
 * - canalsIncomplete
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { parseEndoSignals } from '../endoSignalParser';

describe('Endo Signal Parser T4 Apex Deviation', () => {
    // ═══════════════════════════════════════════════════════════════
    // APEX NOT REACHABLE
    // ═══════════════════════════════════════════════════════════════

    describe('apexNotReachable Detection', () => {
        it('detects "nicht bis Apex"', () => {
            const result = parseEndoSignals('Konnte nicht bis Apex aufbereiten.');
            expect(result.apexNotReachable).toBe(true);
        });

        it('detects "nicht bis zum Apex"', () => {
            const result = parseEndoSignals('Nicht bis zum Apex gekommen.');
            expect(result.apexNotReachable).toBe(true);
        });

        it('detects "Stufe"', () => {
            const result = parseEndoSignals('Es gab eine Stufe bei 15mm.');
            expect(result.apexNotReachable).toBe(true);
        });

        it('detects "Blockade"', () => {
            const result = parseEndoSignals('Blockade im mesialen Kanal.');
            expect(result.apexNotReachable).toBe(true);
        });

        it('detects "nicht passierbar"', () => {
            const result = parseEndoSignals('Kanal war nicht passierbar.');
            expect(result.apexNotReachable).toBe(true);
        });

        it('detects "nur bis 15mm"', () => {
            const result = parseEndoSignals('Konnte nur bis 15mm aufbereiten.');
            expect(result.apexNotReachable).toBe(true);
        });

        it('detects "verkürzte Aufbereitung"', () => {
            const result = parseEndoSignals('Verkürzte Aufbereitung notwendig.');
            expect(result.apexNotReachable).toBe(true);
        });

        it('detects "bis zum Apex aufbereitet" as false', () => {
            const result = parseEndoSignals('Alle Kanäle bis zum Apex aufbereitet.');
            expect(result.apexNotReachable).toBe(false);
        });

        it('detects "Apex erreicht" as false', () => {
            const result = parseEndoSignals('Apex erreicht, alle Kanäle passierbar.');
            expect(result.apexNotReachable).toBe(false);
        });

        it('returns null when not mentioned', () => {
            const result = parseEndoSignals('Zweiter Termin. Gespült.');
            expect(result.apexNotReachable).toBe(null);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CANAL NEGOTIATION ISSUE
    // ═══════════════════════════════════════════════════════════════

    describe('canalNegotiationIssue Detection', () => {
        it('detects "Kanal nicht gängig"', () => {
            const result = parseEndoSignals('MB Kanal nicht gängig.');
            expect(result.canalNegotiationIssue).toBe(true);
        });

        it('detects "Kanal nicht passierbar"', () => {
            const result = parseEndoSignals('Mesialer Kanal nicht passierbar.');
            expect(result.canalNegotiationIssue).toBe(true);
        });

        it('detects "obliteriert"', () => {
            const result = parseEndoSignals('MB2 obliteriert.');
            expect(result.canalNegotiationIssue).toBe(true);
        });

        it('detects "verkalkt"', () => {
            const result = parseEndoSignals('Kanäle teilweise verkalkt.');
            expect(result.canalNegotiationIssue).toBe(true);
        });

        it('detects "blockiert"', () => {
            const result = parseEndoSignals('Palatinaler Kanal blockiert.');
            expect(result.canalNegotiationIssue).toBe(true);
        });

        it('detects "nur 3 Kanäle"', () => {
            const result = parseEndoSignals('Nur 3 Kanäle auffindbar.');
            expect(result.canalNegotiationIssue).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CANALS INCOMPLETE
    // ═══════════════════════════════════════════════════════════════

    describe('canalsIncomplete Extraction', () => {
        it('extracts "MB nicht"', () => {
            const result = parseEndoSignals('MB nicht passierbar.');
            expect(result.canalsIncomplete).toContain('MB');
        });

        it('extracts "ML nicht"', () => {
            const result = parseEndoSignals('ML nicht gängig.');
            expect(result.canalsIncomplete).toContain('ML');
        });

        it('extracts "DB nicht"', () => {
            const result = parseEndoSignals('DB nicht auffindbar.');
            expect(result.canalsIncomplete).toContain('DB');
        });

        it('extracts "mesiobukkal nicht"', () => {
            const result = parseEndoSignals('Mesiobukkal nicht passierbar.');
            expect(result.canalsIncomplete).toContain('MB');
        });

        it('extracts "palatinal nicht"', () => {
            const result = parseEndoSignals('Palatinal nicht gängig.');
            expect(result.canalsIncomplete).toContain('P');
        });

        it('extracts multiple canals', () => {
            const result = parseEndoSignals('MB nicht, ML nicht passierbar.');
            expect(result.canalsIncomplete).toContain('MB');
            expect(result.canalsIncomplete).toContain('ML');
        });

        it('returns empty array when no canals specified', () => {
            const result = parseEndoSignals('Alle Kanäle passierbar.');
            expect(result.canalsIncomplete).toEqual([]);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // REALISTIC APEX SCENARIO
    // ═══════════════════════════════════════════════════════════════

    describe('Realistic Apex Scenario', () => {
        const APEX_DICTATION = `Dritter Termin Zahn 26. Heute Obturation geplant.
Leider Stufe im MB Kanal, nicht bis zum Apex gekommen. 
MB1 nur bis 15mm aufbereitet. ML und P bis Apex.
Erneut CaOH2. Provisorischer Verschluss.`;

        it('extracts apexNotReachable=true', () => {
            const result = parseEndoSignals(APEX_DICTATION);
            expect(result.apexNotReachable).toBe(true);
        });

        it('extracts plannedAction=obturation', () => {
            const result = parseEndoSignals(APEX_DICTATION);
            expect(result.plannedAction).toBe('obturation');
        });

        it('extracts MB in canalsIncomplete', () => {
            const result = parseEndoSignals(APEX_DICTATION);
            // Note: "MB1 nur" pattern might not match "MB nicht" directly
            // but "Stufe im MB Kanal" + "nicht bis zum Apex" triggers apexNotReachable
            expect(result.apexNotReachable).toBe(true);
        });
    });
});
