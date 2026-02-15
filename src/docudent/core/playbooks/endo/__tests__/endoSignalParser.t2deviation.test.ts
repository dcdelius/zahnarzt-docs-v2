/**
 * Endo Signal Parser T2 Deviation Tests — 12+ Test Vectors
 *
 * ═══════════════════════════════════════════════════════════════
 * Tests for T2 deviation signal extraction:
 * - plannedAction (medChange/obturation)
 * - fistulaPresent (true/false)
 * - suppurationPresent (true/false)
 * - painPersistent (true/false via "muckert")
 * - obturationPerformed (true/false)
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { parseEndoSignals } from '../endoSignalParser';

describe('Endo Signal Parser T2 Deviation Fields', () => {
    // ═══════════════════════════════════════════════════════════════
    // PLANNED ACTION
    // ═══════════════════════════════════════════════════════════════

    describe('plannedAction Detection', () => {
        it('detects "heute eigentlich Med-Wechsel"', () => {
            const result = parseEndoSignals('Patient kommt. Heute eigentlich Med-Wechsel.');
            expect(result.plannedAction).toBe('medChange');
        });

        it('detects "geplant: Medikamentenwechsel"', () => {
            const result = parseEndoSignals('2. Termin. Geplant: Medikamentenwechsel.');
            expect(result.plannedAction).toBe('medChange');
        });

        it('detects "heute eigentlich abfüllen"', () => {
            const result = parseEndoSignals('Heute eigentlich abfüllen.');
            expect(result.plannedAction).toBe('obturation');
        });

        it('detects "geplant: Obturation"', () => {
            const result = parseEndoSignals('Dritter Termin. Geplant: Obturation.');
            expect(result.plannedAction).toBe('obturation');
        });

        it('detects "Obturation geplant"', () => {
            const result = parseEndoSignals('Termin 3. Obturation geplant, Patient beschwerdefrei.');
            expect(result.plannedAction).toBe('obturation');
        });

        it('returns null when no plan mentioned', () => {
            const result = parseEndoSignals('Patient kommt zum zweiten Termin.');
            expect(result.plannedAction).toBe(null);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // FISTULA
    // ═══════════════════════════════════════════════════════════════

    describe('fistulaPresent Detection', () => {
        it('detects "Fistelgang" as true', () => {
            const result = parseEndoSignals('Klinisch Fistelgang vorhanden.');
            expect(result.fistulaPresent).toBe(true);
        });

        it('detects "Fistel" as true', () => {
            const result = parseEndoSignals('Seitlich eine Fistel sichtbar.');
            expect(result.fistulaPresent).toBe(true);
        });

        it('detects "fistelfrei" as false', () => {
            const result = parseEndoSignals('Patient fistelfrei. Bereit zur Obturation.');
            expect(result.fistulaPresent).toBe(false);
        });

        it('detects "keine Fistel" as false', () => {
            const result = parseEndoSignals('Klinisch keine Fistel.');
            expect(result.fistulaPresent).toBe(false);
        });

        it('detects "Fistel weg" as false', () => {
            const result = parseEndoSignals('Kontrolle: Fistel weg.');
            expect(result.fistulaPresent).toBe(false);
        });

        it('returns null when not mentioned', () => {
            const result = parseEndoSignals('Patient kommt. Kofferdam.');
            expect(result.fistulaPresent).toBe(null);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // SUPPURATION / EXUDATE
    // ═══════════════════════════════════════════════════════════════

    describe('suppurationPresent Detection', () => {
        it('detects "Eiter ausgetreten" as true', () => {
            const result = parseEndoSignals('Zum Fistelgang noch Eiter ausgetreten.');
            expect(result.suppurationPresent).toBe(true);
        });

        it('detects "Exsudat" as true', () => {
            const result = parseEndoSignals('Exsudat bei Eröffnung.');
            expect(result.suppurationPresent).toBe(true);
        });

        it('detects "Eiteraustritt" as true', () => {
            const result = parseEndoSignals('Eiteraustritt bei Sondierung.');
            expect(result.suppurationPresent).toBe(true);
        });

        it('detects "kein Eiter" as false', () => {
            const result = parseEndoSignals('Kanäle trocken, kein Eiter.');
            expect(result.suppurationPresent).toBe(false);
        });

        it('detects "Kanäle trocken" as false', () => {
            const result = parseEndoSignals('Kanäle trocken.');
            expect(result.suppurationPresent).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // PAIN PERSISTENT ("muckert")
    // ═══════════════════════════════════════════════════════════════

    describe('painPersistent Detection', () => {
        it('detects "gemuckert" as true', () => {
            const result = parseEndoSignals('Meinte, es hatte noch irgendwie gemuckert.');
            expect(result.painPersistent).toBe(true);
        });

        it('detects "muckert" as true', () => {
            const result = parseEndoSignals('Patient sagt es muckert noch.');
            expect(result.painPersistent).toBe(true);
        });

        it('detects "weiterhin Beschwerden" as true', () => {
            const result = parseEndoSignals('Patient hat weiterhin Beschwerden.');
            expect(result.painPersistent).toBe(true);
        });

        it('detects "persistierende Beschwerden" as true', () => {
            const result = parseEndoSignals('Persistierende Beschwerden.');
            expect(result.painPersistent).toBe(true);
        });

        it('detects "druckdolent" as true', () => {
            const result = parseEndoSignals('Zahn druckdolent.');
            expect(result.painPersistent).toBe(true);
        });

        it('detects "beschwerdefrei" as false', () => {
            const result = parseEndoSignals('Patient beschwerdefrei.');
            expect(result.painPersistent).toBe(false);
        });

        it('detects "keine Beschwerden" as false', () => {
            const result = parseEndoSignals('Keine Beschwerden angegeben.');
            expect(result.painPersistent).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // OBTURATION PERFORMED
    // ═══════════════════════════════════════════════════════════════

    describe('obturationPerformed Detection', () => {
        it('detects "abgefüllt" as true', () => {
            const result = parseEndoSignals('Alle Kanäle abgefüllt.');
            expect(result.obturationPerformed).toBe(true);
        });

        it('detects "obturiert" as true', () => {
            const result = parseEndoSignals('Wurzelkanäle obturiert.');
            expect(result.obturationPerformed).toBe(true);
        });

        it('detects "Wurzelfüllung eingebracht" as true', () => {
            const result = parseEndoSignals('Wurzelfüllung komplett eingebracht.');
            expect(result.obturationPerformed).toBe(true);
        });

        it('detects "keine Obturation" as false', () => {
            const result = parseEndoSignals('Heute keine Obturation möglich.');
            expect(result.obturationPerformed).toBe(false);
        });

        it('detects "nicht abgefüllt" as false', () => {
            const result = parseEndoSignals('Kanäle nicht abgefüllt.');
            expect(result.obturationPerformed).toBe(false);
        });

        it('detects "heute nicht gefüllt" as false', () => {
            const result = parseEndoSignals('Heute nicht gefüllt wegen Beschwerden.');
            expect(result.obturationPerformed).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // MENTION FLAGS
    // ═══════════════════════════════════════════════════════════════

    describe('Mention Flags', () => {
        it('detects irrigationMentioned with "gespült"', () => {
            const result = parseEndoSignals('Gründlich gespült.');
            expect(result.irrigationMentioned).toBe(true);
        });

        it('detects irrigationMentioned with "Spülung"', () => {
            const result = parseEndoSignals('Spülung mit NaOCl.');
            expect(result.irrigationMentioned).toBe(true);
        });

        it('detects instrumentationMentioned with "aufbereitet"', () => {
            const result = parseEndoSignals('Maschinell aufbereitet.');
            expect(result.instrumentationMentioned).toBe(true);
        });

        it('detects workingLengthMentioned with "Arbeitslänge"', () => {
            const result = parseEndoSignals('Arbeitslänge bestimmt.');
            expect(result.workingLengthMentioned).toBe(true);
        });

        it('detects workingLengthMentioned with "Apexlokator"', () => {
            const result = parseEndoSignals('Apexlokator verwendet.');
            expect(result.workingLengthMentioned).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TARGET DICTATION SCENARIO
    // ═══════════════════════════════════════════════════════════════

    describe('Target Dictation Scenario', () => {
        const TARGET_DICTATION = `Patient kommt zum zweiten Termin der Wurzelbehandlung. 
Heute eigentlich Med-Wechsel. Meinte, es hatte noch irgendwie gemuckert und seitlich 
wäre zum Fistelgang noch Eiter ausgetreten. Beim Betrachten auffällig, dass tatsächlich 
Fistelgang noch besteht. Daher heute nochmal gründliches Spülen, Medikamentenwechsel. 
Wenn beim nächsten Mal Fistelgang weg, dann hoffentlich Endo abfüllen.`;

        it('extracts visitNumber=2', () => {
            const result = parseEndoSignals(TARGET_DICTATION);
            expect(result.visitNumber).toBe(2);
        });

        it('extracts plannedAction=medChange', () => {
            const result = parseEndoSignals(TARGET_DICTATION);
            expect(result.plannedAction).toBe('medChange');
        });

        it('extracts painPersistent=true (gemuckert)', () => {
            const result = parseEndoSignals(TARGET_DICTATION);
            expect(result.painPersistent).toBe(true);
        });

        it('extracts fistulaPresent=true', () => {
            const result = parseEndoSignals(TARGET_DICTATION);
            expect(result.fistulaPresent).toBe(true);
        });

        it('extracts suppurationPresent=true (Eiter)', () => {
            const result = parseEndoSignals(TARGET_DICTATION);
            expect(result.suppurationPresent).toBe(true);
        });

        it('extracts irrigationMentioned=true', () => {
            const result = parseEndoSignals(TARGET_DICTATION);
            expect(result.irrigationMentioned).toBe(true);
        });

        it('does not extract obturationPerformed (not mentioned)', () => {
            const result = parseEndoSignals(TARGET_DICTATION);
            // No explicit "nicht abgefüllt" or "abgefüllt"
            expect(result.obturationPerformed).toBe(null);
        });
    });
});
