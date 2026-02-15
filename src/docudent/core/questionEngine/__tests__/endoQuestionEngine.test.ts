/**
 * Endo Question Engine Tests — Golden Test Vectors
 *
 * ═══════════════════════════════════════════════════════════════
 * 10+ golden cases verifying deterministic question generation.
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { evaluateQuestions, evaluateQuestionsFromDictation } from '../questionEngine';
import { parseEndoSignals } from '../../playbooks/endo/endoSignalParser';
import type { EngineInput } from '../../../contracts/questionEngineTypes';

// ═══════════════════════════════════════════════════════════════
// BASELINE DICTATION (from requirements)
// ═══════════════════════════════════════════════════════════════

const BASELINE_DICTATION = `Zahn 36. Zweiter Termin Wurzelkanalbehandlung. Kofferdam angelegt. 
Alte medikamentöse Einlage entfernt. Kanäle erneut aufbereitet und gespült. 
Arbeitslängen überprüft. Keine Beschwerden. 
Neue medikamentöse Einlage mit Kalziumhydroxid. Provisorischer Verschluss.`;

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTION
// ═══════════════════════════════════════════════════════════════

function createInput(dictation: string, settings: Record<string, unknown> = {}): EngineInput {
    const signals = parseEndoSignals(dictation);
    const phase = signals.phase || 't2';

    return {
        treatmentId: 'endo',
        visit: { number: 2, phase },
        dictationText: dictation,
        extracted: signals,
        settings,
    };
}

// ═══════════════════════════════════════════════════════════════
// GOLDEN TEST CASES
// ═══════════════════════════════════════════════════════════════

describe('Endo Question Engine', () => {
    describe('Baseline Dictation', () => {
        it('generates expected questions for baseline dictation', () => {
            const output = evaluateQuestionsFromDictation(BASELINE_DICTATION, 't2');

            const questionIds = output.questions.map(q => q.id);

            // Expected questions
            expect(questionIds).toContain('ENDO_T2_WORKING_LENGTH_METHOD');
            expect(questionIds).toContain('ENDO_T2_WORKING_LENGTHS');
            expect(questionIds).toContain('ENDO_T2_IRRIGATION');
            expect(questionIds).toContain('ENDO_T2_INSTRUMENTATION_MODE');

            // Verify order is stable
            const methodIdx = questionIds.indexOf('ENDO_T2_WORKING_LENGTH_METHOD');
            const lengthsIdx = questionIds.indexOf('ENDO_T2_WORKING_LENGTHS');
            const irrigationIdx = questionIds.indexOf('ENDO_T2_IRRIGATION');
            const modeIdx = questionIds.indexOf('ENDO_T2_INSTRUMENTATION_MODE');

            expect(methodIdx).toBeLessThan(lengthsIdx);
            expect(lengthsIdx).toBeLessThan(irrigationIdx);
            expect(irrigationIdx).toBeLessThan(modeIdx);
        });

        it('detects expected facts from baseline dictation', () => {
            const output = evaluateQuestionsFromDictation(BASELINE_DICTATION, 't2');

            const detectedFields = output.detected.map(d => d.field);

            expect(detectedFields).toContain('tooth');
            expect(detectedFields).toContain('visitNumber');
            expect(detectedFields).toContain('kofferdam');
            expect(detectedFields).toContain('medicament');
        });

        it('returns version info for reproducibility', () => {
            const output = evaluateQuestionsFromDictation(BASELINE_DICTATION, 't2');

            expect(output.version.playbookVersionId).toBe('endo-playbook-v1');
            expect(output.version.engineVersion).toBe('1.0.0');
        });
    });

    describe('T2 with missing lengths', () => {
        it('asks ENDO_T2_WORKING_LENGTHS when "Arbeitslängen überprüft" but no values', () => {
            const output = evaluateQuestionsFromDictation(
                'Zweiter Termin. Arbeitslängen überprüft.',
                't2'
            );

            expect(output.questions.map(q => q.id)).toContain('ENDO_T2_WORKING_LENGTHS');
            expect(output.questions.find(q => q.id === 'ENDO_T2_WORKING_LENGTHS')?.severity).toBe('required');
        });
    });

    describe('T2 with working lengths present', () => {
        it('does NOT ask ENDO_T2_WORKING_LENGTHS when values provided', () => {
            const output = evaluateQuestionsFromDictation(
                'Zweiter Termin. Apex Locator, MB 19, ML 18, D 20.',
                't2'
            );

            // Should NOT contain ENDO_T2_WORKING_LENGTHS since values are provided
            expect(output.questions.map(q => q.id)).not.toContain('ENDO_T2_WORKING_LENGTHS');

            // Should detect the lengths
            const lengthsFact = output.detected.find(d => d.field === 'workingLengthsByCanal');
            expect(lengthsFact).toBeDefined();
        });
    });

    describe('T2 irrigation detection', () => {
        it('asks ENDO_T2_IRRIGATION when only "gespült" mentioned', () => {
            const output = evaluateQuestionsFromDictation(
                'Zweiter Termin. Kanäle gespült.',
                't2'
            );

            expect(output.questions.map(q => q.id)).toContain('ENDO_T2_IRRIGATION');
        });

        it('does NOT ask ENDO_T2_IRRIGATION when NaOCl/EDTA mentioned', () => {
            const output = evaluateQuestionsFromDictation(
                'Zweiter Termin. Spülung mit NaOCl und EDTA.',
                't2'
            );

            expect(output.questions.map(q => q.id)).not.toContain('ENDO_T2_IRRIGATION');

            // Should detect irrigation solutions
            const irrigationFact = output.detected.find(d => d.field === 'irrigationSolutions');
            expect(irrigationFact).toBeDefined();
            expect(irrigationFact?.value).toContain('NaOCl');
            expect(irrigationFact?.value).toContain('EDTA');
        });
    });

    describe('T2 instrumentation mode', () => {
        it('asks ENDO_T2_INSTRUMENTATION_MODE when not mentioned (recommended)', () => {
            const output = evaluateQuestionsFromDictation(
                'Zweiter Termin. Kanäle aufbereitet.',
                't2'
            );

            const instrumentationQ = output.questions.find(q => q.id === 'ENDO_T2_INSTRUMENTATION_MODE');
            expect(instrumentationQ).toBeDefined();
            expect(instrumentationQ?.severity).toBe('recommended');
        });

        it('does NOT ask when "maschinell aufbereitet" mentioned', () => {
            const output = evaluateQuestionsFromDictation(
                'Zweiter Termin. Kanäle maschinell aufbereitet.',
                't2'
            );

            expect(output.questions.map(q => q.id)).not.toContain('ENDO_T2_INSTRUMENTATION_MODE');
        });
    });

    describe('Ordering stability', () => {
        it('questions appear in deterministic order based on order field', () => {
            const output = evaluateQuestionsFromDictation(BASELINE_DICTATION, 't2');

            // Verify questions are sorted by order
            for (let i = 1; i < output.questions.length; i++) {
                expect(output.questions[i].order).toBeGreaterThanOrEqual(output.questions[i - 1].order);
            }
        });
    });

    describe('Settings-based skip', () => {
        it('skips irrigation question when settings have default spuelprotokoll', () => {
            const input = createInput('Zweiter Termin. Kanäle gespült.', {
                endo: {
                    defaults: {
                        spuelprotokoll: 'naocl_edta', // Default set, not 'fragen'
                    },
                },
            });

            const output = evaluateQuestions(input);

            expect(output.questions.map(q => q.id)).not.toContain('ENDO_T2_IRRIGATION');
        });

        it('asks irrigation question when settings have spuelprotokoll=fragen', () => {
            const input = createInput('Zweiter Termin. Kanäle gespült.', {
                endo: {
                    defaults: {
                        spuelprotokoll: 'fragen',
                    },
                },
            });

            const output = evaluateQuestions(input);

            expect(output.questions.map(q => q.id)).toContain('ENDO_T2_IRRIGATION');
        });
    });

    describe('Determinism', () => {
        it('produces identical output for identical input', () => {
            const output1 = evaluateQuestionsFromDictation(BASELINE_DICTATION, 't2');
            const output2 = evaluateQuestionsFromDictation(BASELINE_DICTATION, 't2');

            expect(output1.questions.map(q => q.id)).toEqual(output2.questions.map(q => q.id));
            expect(output1.detected.map(d => d.field)).toEqual(output2.detected.map(d => d.field));
            expect(output1.version).toEqual(output2.version);
        });
    });

    describe('No overkill questions', () => {
        it('does NOT ask about file brand, rpm, or concentrations', () => {
            const output = evaluateQuestionsFromDictation(BASELINE_DICTATION, 't2');

            const questionIds = output.questions.map(q => q.id);

            // Verify no overkill questions
            expect(questionIds).not.toContain('ENDO_T2_FILE_BRAND');
            expect(questionIds).not.toContain('ENDO_T2_RPM');
            expect(questionIds).not.toContain('ENDO_T2_NAOCL_CONCENTRATION');
            expect(questionIds).not.toContain('ENDO_T2_IRRIGATION_TIME');
        });
    });

    describe('Missing fields tracking', () => {
        it('tracks missing fields with severity', () => {
            const output = evaluateQuestionsFromDictation(BASELINE_DICTATION, 't2');

            expect(output.missing.length).toBeGreaterThan(0);

            const irrigationMissing = output.missing.find(m => m.field === 'irrigation');
            expect(irrigationMissing?.severity).toBe('required');

            const modeMissing = output.missing.find(m => m.field === 'instrumentationMode');
            expect(modeMissing?.severity).toBe('recommended');
        });
    });
});
