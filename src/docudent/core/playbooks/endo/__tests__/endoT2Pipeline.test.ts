/**
 * Endo T2 Pipeline End-to-End Tests — 6 Scenarios
 *
 * ═══════════════════════════════════════════════════════════════
 * Tests the full deterministic pipeline:
 * dictation → signals → questions → user answers → final note
 * 
 * Critical: Tests use questionId keys (as UI does) and verify
 * that the answer normalization works correctly.
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { evaluateEndoT2, renderEndoT2Note } from '../endoTextRenderer';
import { parseEndoSignals } from '../endoSignalParser';
import { normalizeAnswersToFields } from '../../../questionEngine/answerNormalization';
import { T2_DEVIATION_QUESTION_IDS } from '../endoPlaybookT2Deviation';
import type { AnswersByQuestionId, IrrigationSolution } from '../../../../contracts/questionEngineTypes';

const QID = T2_DEVIATION_QUESTION_IDS;

describe('Endo T2 Pipeline End-to-End', () => {
    // ═══════════════════════════════════════════════════════════════
    // 1. TARGET DICTATION: Full Pipeline
    // ═══════════════════════════════════════════════════════════════

    describe('1. Target Dictation Full Pipeline', () => {
        const TARGET_DICTATION = `Patient kommt zum zweiten Termin der Wurzelbehandlung. 
Heute eigentlich Med-Wechsel. Meinte, es hatte noch irgendwie gemuckert und seitlich 
wäre zum Fistelgang noch Eiter ausgetreten. Beim Betrachten auffällig, dass tatsächlich 
Fistelgang noch besteht. Daher heute nochmal gründliches Spülen, Medikamentenwechsel. 
Wenn beim nächsten Mal Fistelgang weg, dann hoffentlich Endo abfüllen.`;

        it('yields correct questions from dictation', () => {
            const { questions } = evaluateEndoT2(TARGET_DICTATION);
            const ids = questions.map(q => q.id);

            expect(ids).toContain(QID.DEVIATION_REASON);
            expect(ids).toContain(QID.FISTULA_STATUS);
            expect(ids).toContain(QID.SUPPURATION);
            expect(ids).toContain(QID.IRRIGATION);
            expect(ids).toContain(QID.MEDICATION);
            expect(ids).toContain(QID.TEMP_SEAL);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 2. FULL PIPELINE WITH ANSWERS BY QUESTION ID
    // ═══════════════════════════════════════════════════════════════

    describe('2. Full Pipeline With Answers By QuestionId', () => {
        const TARGET_DICTATION = `Patient kommt zum zweiten Termin der Wurzelbehandlung. 
Heute eigentlich Med-Wechsel. Gemuckert. Fistelgang noch Eiter ausgetreten.`;

        // Answers use CANONICAL CODES (not German strings)
        const ANSWERS_BY_ID: AnswersByQuestionId = {
            [QID.DEVIATION_REASON]: 'FISTULA_EXSUDATE',
            [QID.FISTULA_STATUS]: 'PRESENT',
            [QID.SUPPURATION]: 'PRESENT',
            [QID.IRRIGATION]: ['NAOCL', 'EDTA', 'NACL'],
            [QID.MEDICATION]: 'CAOH2',
            [QID.TEMP_SEAL]: 'PROVISIONAL',
        };

        it('renders note containing "keine Obturation"', () => {
            const { notePreview } = evaluateEndoT2(TARGET_DICTATION, ANSWERS_BY_ID);
            expect(notePreview).toContain('keine Obturation');
        });

        it('renders note containing "Fistel"', () => {
            const { notePreview } = evaluateEndoT2(TARGET_DICTATION, ANSWERS_BY_ID);
            expect(notePreview).toContain('Fistel');
        });

        it('renders note containing "Eiter"', () => {
            const { notePreview } = evaluateEndoT2(TARGET_DICTATION, ANSWERS_BY_ID);
            expect(notePreview).toContain('Eiter');
        });

        it('renders note containing NaOCl and EDTA', () => {
            const { notePreview } = evaluateEndoT2(TARGET_DICTATION, ANSWERS_BY_ID);
            expect(notePreview).toContain('NaOCl');
            expect(notePreview).toContain('EDTA');
        });

        it('renders note containing "Calciumhydroxid"', () => {
            const { notePreview } = evaluateEndoT2(TARGET_DICTATION, ANSWERS_BY_ID);
            expect(notePreview).toContain('Calciumhydroxid');
        });

        it('renders note containing "provisor" (case-insensitive)', () => {
            const { notePreview } = evaluateEndoT2(TARGET_DICTATION, ANSWERS_BY_ID);
            expect(notePreview.toLowerCase()).toContain('provisor');
        });

        it('correctly normalizes answers to fields (CANONICAL CODES)', () => {
            const { fields } = evaluateEndoT2(TARGET_DICTATION, ANSWERS_BY_ID);

            expect(fields['deviationReason']).toBe('FISTULA_EXSUDATE');
            expect(fields['fistulaStatus']).toBe('PRESENT');
            expect(fields['suppurationStatus']).toBe('PRESENT');
            expect(fields['irrigationSolutions']).toEqual(['NAOCL', 'EDTA', 'NACL']);
            expect(fields['medication']).toBe('CAOH2');
            expect(fields['tempSeal']).toBe('PROVISIONAL');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 3. EXTRACTED IRRIGATION SOLUTIONS → RECOMMENDED
    // ═══════════════════════════════════════════════════════════════

    describe('3. Extracted Irrigation Solutions', () => {
        const DICTATION_WITH_IRRIGATION = `Zweiter Termin. Gespült mit NaOCl und EDTA.`;

        it('makes IRRIGATION question recommended when solutions extracted', () => {
            const { questions, signals } = evaluateEndoT2(DICTATION_WITH_IRRIGATION);

            // Verify solutions extracted
            expect(signals.irrigationSolutions).toContain('NaOCl');
            expect(signals.irrigationSolutions).toContain('EDTA');

            // IRRIGATION question should be recommended
            const irrigationQ = questions.find(q => q.id === QID.IRRIGATION);
            expect(irrigationQ?.severity).toBe('recommended');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 4. PLANNED OBTURATION BUT "heute nicht abgefüllt"
    // ═══════════════════════════════════════════════════════════════

    describe('4. Planned Obturation But Not Performed', () => {
        const DEVIATION_OBTURATION = `Dritter Termin. Obturation geplant. Heute nicht abgefüllt wegen Beschwerden.`;

        it('yields DEVIATION_REASON question', () => {
            const { questions, signals } = evaluateEndoT2(DEVIATION_OBTURATION);

            expect(signals.plannedAction).toBe('obturation');
            expect(signals.obturationPerformed).toBe(false);
            expect(questions.some(q => q.id === QID.DEVIATION_REASON)).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 5. NO FISTULA, NO INFECTION → NO DEVIATION QUESTIONS
    // ═══════════════════════════════════════════════════════════════

    describe('5. No Infection, No Deviation Questions', () => {
        const CLEAN_DICTATION = `Zweiter Termin. Beschwerdefrei. Keine Fistel. Kein Eiter. Kanäle trocken.`;

        it('does NOT yield deviation-specific questions', () => {
            const { questions, signals } = evaluateEndoT2(CLEAN_DICTATION);

            expect(signals.fistulaPresent).toBe(false);
            expect(signals.suppurationPresent).toBe(false);
            expect(signals.painPersistent).toBe(false);

            // Should NOT have DEVIATION_REASON
            expect(questions.some(q => q.id === QID.DEVIATION_REASON)).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 6. SAFETY: No Crashes When signals.irrigationSolutions undefined
    // ═══════════════════════════════════════════════════════════════

    describe('6. Safety: Undefined irrigationSolutions', () => {
        it('does not crash when signals.irrigationSolutions is undefined', () => {
            // Manually construct signals with undefined irrigationSolutions
            const signals = parseEndoSignals('Einfacher Test.');

            // Force irrigationSolutions to be undefined (simulate edge case)
            const modifiedSignals = {
                ...signals,
                irrigationSolutions: undefined as unknown as IrrigationSolution[],
            };

            // Should NOT throw
            expect(() => {
                renderEndoT2Note({
                    rawDictation: 'Test',
                    signals: modifiedSignals,
                    fields: {},
                });
            }).not.toThrow();
        });

        it('renders note even with empty fields and minimal signals', () => {
            const { notePreview } = evaluateEndoT2('Termin.');

            // Should produce a basic note without crashing
            expect(notePreview).toContain('Termin');
            expect(typeof notePreview).toBe('string');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 7. ANSWER NORMALIZATION UTILITY DIRECT TESTS
    // ═══════════════════════════════════════════════════════════════

    describe('7. Answer Normalization Utility', () => {
        it('maps questionId answers to fieldName fields', () => {
            const questions = [
                { id: 'ENDO_T2_MEDICATION', fieldsWritten: ['medication'], answerType: 'select' as const },
                { id: 'ENDO_T2_TEMP_SEAL', fieldsWritten: ['tempSeal'], answerType: 'select' as const },
            ];

            const answersById = {
                'ENDO_T2_MEDICATION': 'Calciumhydroxid',
                'ENDO_T2_TEMP_SEAL': 'Provisorischer Verschluss',
            };

            // Cast to EngineQuestion[] for test
            const fields = normalizeAnswersToFields(questions as any, answersById);

            expect(fields['medication']).toBe('Calciumhydroxid');
            expect(fields['tempSeal']).toBe('Provisorischer Verschluss');
        });

        it('skips undefined answers', () => {
            const questions = [
                { id: 'Q1', fieldsWritten: ['field1'], answerType: 'select' as const },
                { id: 'Q2', fieldsWritten: ['field2'], answerType: 'select' as const },
            ];

            const answersById = {
                'Q1': 'value1',
                // Q2 not provided
            };

            const fields = normalizeAnswersToFields(questions as any, answersById);

            expect(fields['field1']).toBe('value1');
            expect(fields['field2']).toBeUndefined();
        });

        it('writes to multiple fields for same question', () => {
            const questions = [
                { id: 'Q1', fieldsWritten: ['fieldA', 'fieldB'], answerType: 'select' as const },
            ];

            const answersById = { 'Q1': 'sharedValue' };

            const fields = normalizeAnswersToFields(questions as any, answersById);

            expect(fields['fieldA']).toBe('sharedValue');
            expect(fields['fieldB']).toBe('sharedValue');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 8. NaCl DEDUPLICATION FIX
    // ═══════════════════════════════════════════════════════════════

    describe('8. NaCl Deduplication Fix', () => {
        const DICTATION = `Zweiter Termin. Fistelgang. Gespült.`;

        it('adds NaCl suffix when NAOCL+EDTA but NOT NACL', () => {
            const { notePreview } = evaluateEndoT2(DICTATION, {
                [QID.DEVIATION_REASON]: 'FISTULA_EXSUDATE',
                [QID.IRRIGATION]: ['NAOCL', 'EDTA'],
            });

            expect(notePreview).toContain('(ggf. abschließend NaCl)');
        });

        it('does NOT add NaCl suffix when NACL already in solutions', () => {
            const { notePreview } = evaluateEndoT2(DICTATION, {
                [QID.DEVIATION_REASON]: 'FISTULA_EXSUDATE',
                [QID.IRRIGATION]: ['NAOCL', 'EDTA', 'NACL'],
            });

            // Should NOT contain the suffix
            expect(notePreview).not.toContain('(ggf. abschließend NaCl)');
            // But should list NaCl in the solutions
            expect(notePreview).toContain('NaCl');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 9. SYMPTOM TONE FIX
    // ═══════════════════════════════════════════════════════════════

    describe('9. Symptom Tone Fix', () => {
        it('uses "persistierende Beschwerden" for pain deviation', () => {
            const PAIN_DICTATION = `Zweiter Termin. Gemuckert. Beschwerden.`;
            const { notePreview } = evaluateEndoT2(PAIN_DICTATION, {
                [QID.DEVIATION_REASON]: 'PAIN',
            });

            expect(notePreview).toContain('persistierende Beschwerden');
        });

        it('uses "anhaltende Symptomatik" for infection-only deviation', () => {
            const INFECTION_DICTATION = `Zweiter Termin. Fistelgang vorhanden. Eiter.`;
            const { notePreview } = evaluateEndoT2(INFECTION_DICTATION, {
                [QID.DEVIATION_REASON]: 'FISTULA_EXSUDATE',
                [QID.FISTULA_STATUS]: 'PRESENT',
                [QID.SUPPURATION]: 'PRESENT',
            });

            // Should use "anhaltende Symptomatik" NOT "persistierende Beschwerden"
            expect(notePreview).toContain('anhaltende Symptomatik');
            expect(notePreview).not.toContain('persistierende Beschwerden');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 10. APEX DEVIATION PIPELINE
    // ═══════════════════════════════════════════════════════════════

    describe('10. Apex Deviation Pipeline', () => {
        const APEX_DICTATION = `Dritter Termin Zahn 26. Obturation geplant.
Leider Stufe im MB Kanal, nicht bis zum Apex gekommen.
Erneut CaOH2. Provisorischer Verschluss.`;

        it('yields NEGOTIATION_STATUS + PLAN_NEXT questions', () => {
            const { questions, signals } = evaluateEndoT2(APEX_DICTATION);

            expect(signals.apexNotReachable).toBe(true);
            expect(questions.some(q => q.id === QID.NEGOTIATION_STATUS)).toBe(true);
            expect(questions.some(q => q.id === QID.PLAN_NEXT)).toBe(true);
        });

        it('renders note with "nicht bis Apex" phrase', () => {
            const { notePreview } = evaluateEndoT2(APEX_DICTATION, {
                [QID.NEGOTIATION_STATUS]: 'NOT_TO_APEX_BLOCKAGE',
                [QID.CANALS_AFFECTED]: ['MB'],
                [QID.PLAN_NEXT]: 'RETRY_NEXT_APPT',
            });

            expect(notePreview).toContain('nicht bis Apex');
        });

        it('renders note with betroffene Kanäle', () => {
            const { notePreview } = evaluateEndoT2(APEX_DICTATION, {
                [QID.NEGOTIATION_STATUS]: 'NOT_TO_APEX_BLOCKAGE',
                [QID.CANALS_AFFECTED]: ['MB', 'ML'],
                [QID.PLAN_NEXT]: 'RETRY_NEXT_APPT',
            });

            expect(notePreview).toContain('Betroffene Kanäle: MB, ML');
        });

        it('renders adapted plan for apex deviation', () => {
            const { notePreview } = evaluateEndoT2(APEX_DICTATION, {
                [QID.NEGOTIATION_STATUS]: 'NOT_TO_APEX_BLOCKAGE',
                [QID.PLAN_NEXT]: 'RETRY_NEXT_APPT',
            });

            expect(notePreview).toContain('Plan: nächster Termin erneuter Versuch der Kanalerweiterung/Längenführung.');
        });

        it('renders obturation plan for partial apex', () => {
            const { notePreview } = evaluateEndoT2(APEX_DICTATION, {
                [QID.NEGOTIATION_STATUS]: 'PARTIAL',
                [QID.PLAN_NEXT]: 'OBTURATE_TO_REACHED_LENGTH',
            });

            expect(notePreview).toContain('Obturation bis zur erreichbaren Länge');
        });
    });
});
