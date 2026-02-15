/**
 * Endo Text Renderer Tests — 6+ Scenarios
 *
 * ═══════════════════════════════════════════════════════════════
 * Tests for deterministic German text output.
 * Focus on target dictation scenario and edge cases.
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { renderEndoT2Note, evaluateEndoT2 } from '../endoTextRenderer';
import { parseEndoSignals } from '../endoSignalParser';
import type { EndoExtractedSignals } from '../../../../contracts/questionEngineTypes';

describe('Endo Text Renderer', () => {
    // ═══════════════════════════════════════════════════════════════
    // TARGET DICTATION SCENARIO
    // ═══════════════════════════════════════════════════════════════

    describe('Target Dictation Scenario', () => {
        const TARGET_DICTATION = `Patient kommt zum zweiten Termin der Wurzelbehandlung. 
Heute eigentlich Med-Wechsel. Meinte, es hatte noch irgendwie gemuckert und seitlich 
wäre zum Fistelgang noch Eiter ausgetreten. Beim Betrachten auffällig, dass tatsächlich 
Fistelgang noch besteht. Daher heute nochmal gründliches Spülen, Medikamentenwechsel. 
Wenn beim nächsten Mal Fistelgang weg, dann hoffentlich Endo abfüllen.`;

        // Answers use CANONICAL CODES (not German strings)
        const TARGET_ANSWERS = {
            deviationReason: 'FISTULA_EXSUDATE',
            fistulaStatus: 'PRESENT',
            suppurationStatus: 'PRESENT',
            irrigationSolutions: ['NAOCL', 'EDTA'],
            medication: 'CAOH2',
            tempSeal: 'PROVISIONAL',
        };

        it('contains "2. Termin"', () => {
            const signals = parseEndoSignals(TARGET_DICTATION);
            const note = renderEndoT2Note({
                rawDictation: TARGET_DICTATION,
                tooth: '36',
                signals,
                fields: TARGET_ANSWERS,
            });

            expect(note).toContain('2. Termin');
        });

        it('contains "Fistel"', () => {
            const signals = parseEndoSignals(TARGET_DICTATION);
            const note = renderEndoT2Note({
                rawDictation: TARGET_DICTATION,
                tooth: '36',
                signals,
                fields: TARGET_ANSWERS,
            });

            expect(note).toContain('Fistel');
        });

        it('contains "keine Obturation"', () => {
            const signals = parseEndoSignals(TARGET_DICTATION);
            const note = renderEndoT2Note({
                rawDictation: TARGET_DICTATION,
                tooth: '36',
                signals,
                fields: TARGET_ANSWERS,
            });

            expect(note).toContain('keine Obturation');
        });

        it('contains NaOCl and EDTA', () => {
            const signals = parseEndoSignals(TARGET_DICTATION);
            const note = renderEndoT2Note({
                rawDictation: TARGET_DICTATION,
                signals,
                fields: TARGET_ANSWERS,
            });

            expect(note).toContain('NaOCl');
            expect(note).toContain('EDTA');
        });

        it('contains "Calciumhydroxid"', () => {
            const signals = parseEndoSignals(TARGET_DICTATION);
            const note = renderEndoT2Note({
                rawDictation: TARGET_DICTATION,
                tooth: '36',
                signals,
                fields: TARGET_ANSWERS,
            });

            expect(note).toContain('Calciumhydroxid');
        });

        it('contains "provisor" for temp seal', () => {
            const signals = parseEndoSignals(TARGET_DICTATION);
            const note = renderEndoT2Note({
                rawDictation: TARGET_DICTATION,
                tooth: '36',
                signals,
                fields: TARGET_ANSWERS,
            });

            expect(note.toLowerCase()).toContain('provisor');
        });

        it('contains the Plan sentence', () => {
            const signals = parseEndoSignals(TARGET_DICTATION);
            const note = renderEndoT2Note({
                rawDictation: TARGET_DICTATION,
                tooth: '36',
                signals,
                fields: TARGET_ANSWERS,
            });

            expect(note).toContain('Plan:');
            expect(note).toContain('fistelfrei');
            expect(note).toContain('Obturation');
        });

        it('produces expected full note structure', () => {
            const signals = parseEndoSignals(TARGET_DICTATION);
            const note = renderEndoT2Note({
                rawDictation: TARGET_DICTATION,
                tooth: '36',
                signals,
                fields: TARGET_ANSWERS,
            });

            // Header
            expect(note).toContain('Endodontie – 2. Termin (Zahn 36)');
            // Planned action
            expect(note).toContain('geplant: Medikamentenwechsel');
            // Symptoms
            expect(note).toContain('persistierende Beschwerden');
            // Plan
            expect(note).toContain('erneute Medikation/Revision');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // EVALUATEENDOT2 INTEGRATION
    // ═══════════════════════════════════════════════════════════════

    describe('evaluateEndoT2 Integration', () => {
        const TARGET_DICTATION = `Patient kommt zum zweiten Termin. 
Heute eigentlich Med-Wechsel. Es hat gemuckert. 
Fistelgang noch da. Eiter ausgetreten.`;

        it('returns signals with correct plannedAction', () => {
            const result = evaluateEndoT2(TARGET_DICTATION);
            expect(result.signals.plannedAction).toBe('medChange');
        });

        it('returns signals with fistulaPresent=true', () => {
            const result = evaluateEndoT2(TARGET_DICTATION);
            expect(result.signals.fistulaPresent).toBe(true);
        });

        it('returns signals with suppurationPresent=true', () => {
            const result = evaluateEndoT2(TARGET_DICTATION);
            expect(result.signals.suppurationPresent).toBe(true);
        });

        it('returns signals with painPersistent=true', () => {
            const result = evaluateEndoT2(TARGET_DICTATION);
            expect(result.signals.painPersistent).toBe(true);
        });

        it('returns questions including DEVIATION_REASON', () => {
            const result = evaluateEndoT2(TARGET_DICTATION);
            expect(result.questions.some(q => q.id === 'ENDO_T2_DEVIATION_REASON')).toBe(true);
        });

        it('returns questions including FISTULA_STATUS', () => {
            const result = evaluateEndoT2(TARGET_DICTATION);
            expect(result.questions.some(q => q.id === 'ENDO_T2_FISTULA_STATUS')).toBe(true);
        });

        it('returns questions including SUPPURATION', () => {
            const result = evaluateEndoT2(TARGET_DICTATION);
            expect(result.questions.some(q => q.id === 'ENDO_T2_SUPPURATION')).toBe(true);
        });

        it('returns a draft note preview', () => {
            const result = evaluateEndoT2(TARGET_DICTATION);
            expect(result.notePreview).toContain('Endodontie');
            expect(result.notePreview).toContain('2. Termin');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // EDGE CASES
    // ═══════════════════════════════════════════════════════════════

    describe('Edge Cases', () => {
        it('renders without tooth number', () => {
            const signals: EndoExtractedSignals = {
                tooth: null,
                visitNumber: 2,
                phase: 't2',
                kofferdam: false,
                medicament: null,
                irrigationSolutions: [],
                workingLengthsChecked: false,
                workingLengthMethod: null,
                workingLengthsByCanal: null,
                instrumentationMode: null,
                plannedAction: 'medChange',
                fistulaPresent: null,
                suppurationPresent: null,
                painPersistent: null,
                obturationPerformed: null,
                irrigationMentioned: false,
                instrumentationMentioned: false,
                workingLengthMentioned: false,
            };

            const note = renderEndoT2Note({
                rawDictation: 'Test',
                signals,
                fields: {},
            });

            expect(note).toContain('Endodontie – 2. Termin');
            expect(note).not.toContain('Zahn');
        });

        it('renders without fistula/suppuration when not present', () => {
            const signals: EndoExtractedSignals = {
                tooth: '36',
                visitNumber: 2,
                phase: 't2',
                kofferdam: true,
                medicament: 'CaOH2',
                irrigationSolutions: ['NaOCl'],
                workingLengthsChecked: false,
                workingLengthMethod: null,
                workingLengthsByCanal: null,
                instrumentationMode: null,
                plannedAction: null,
                fistulaPresent: false,
                suppurationPresent: false,
                painPersistent: false,
                obturationPerformed: null,
                irrigationMentioned: true,
                instrumentationMentioned: false,
                workingLengthMentioned: false,
            };

            const note = renderEndoT2Note({
                rawDictation: 'Standard T2',
                signals,
                fields: {},
            });

            expect(note).not.toContain('Fistel');
            expect(note).not.toContain('Exsudat');
        });

        it('uses default planned action sentence when null', () => {
            const signals: EndoExtractedSignals = {
                tooth: '36',
                visitNumber: 2,
                phase: 't2',
                kofferdam: false,
                medicament: null,
                irrigationSolutions: [],
                workingLengthsChecked: false,
                workingLengthMethod: null,
                workingLengthsByCanal: null,
                instrumentationMode: null,
                plannedAction: null,
                fistulaPresent: null,
                suppurationPresent: null,
                painPersistent: null,
                obturationPerformed: null,
                irrigationMentioned: false,
                instrumentationMentioned: false,
                workingLengthMentioned: false,
            };

            const note = renderEndoT2Note({
                rawDictation: 'Routine T2',
                signals,
                fields: {},
            });

            // Should not have "geplant:" in parens
            expect(note).not.toContain('(geplant:');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // DETERMINISM
    // ═══════════════════════════════════════════════════════════════

    describe('Determinism', () => {
        it('produces identical output for identical input', () => {
            const dictation = 'Zweiter Termin. Heute eigentlich Med-Wechsel. Fistelgang.';
            const signals = parseEndoSignals(dictation);
            const fields = { medication: 'Calciumhydroxid', tempSeal: 'Provisorischer Verschluss' };

            const note1 = renderEndoT2Note({ rawDictation: dictation, signals, fields });
            const note2 = renderEndoT2Note({ rawDictation: dictation, signals, fields });

            expect(note1).toBe(note2);
        });
    });
});
