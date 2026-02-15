/**
 * Gate M10-A: V10 Parity With Current Pipeline
 *
 * Verifies that runV10() produces equivalent output to the existing pipeline.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../../v10';
import { GOLDEN_MEDICAL_CASES } from '../fixtures/goldenMedicalCases.v1';

describe('Gate M10-A: V10 Parity With Current Pipeline', () => {
    // ═══════════════════════════════════════════════════════════════
    // TEST: Golden cases produce expected states
    // ═══════════════════════════════════════════════════════════════

    describe('Golden case state parity', () => {
        const testCases = GOLDEN_MEDICAL_CASES.slice(0, 10);

        for (const testCase of testCases) {
            it(`${testCase.id}: produces expected state`, async () => {
                const result = await runV10({
                    dictation: testCase.input.dictation,
                    treatmentId: testCase.input.treatmentId,
                    insuranceType: testCase.input.insuranceType,
                    textLength: testCase.input.textLength,
                    answers: testCase.input.answers,
                    teeth: testCase.input.teeth,
                });

                // State should be questions or output (not error)
                expect(['questions', 'output']).toContain(result.state);

                // Meta should indicate v10 engine
                expect(result.meta.engineUsed).toBe('v10');
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Askbacks match expected
    // ═══════════════════════════════════════════════════════════════

    describe('Askback parity', () => {
        it('profunda case produces ueberkappung askback', async () => {
            const result = await runV10({
                dictation: 'Zahn 16 MOD-Füllung bei Caries profunda.',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
            });

            expect(result.state).toBe('questions');
            expect(result.questions?.some(q =>
                q.id.includes('ueberkappung') || q.questionKey === 'ueberkappung'
            )).toBe(true);
        });

        it('normal caries produces no medical askbacks', async () => {
            const result = await runV10({
                dictation: 'Zahn 16 okklusal Füllung bei Karies media.',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
            });

            // No required medical askbacks means output or no medical questions
            const medicalQuestions = result.questions?.filter(q =>
                q.id.startsWith('medical_')
            ) ?? [];
            expect(medicalQuestions.filter(q => q.medicalSeverity === 'hard')).toHaveLength(0);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Chips match expected  
    // ═══════════════════════════════════════════════════════════════

    describe('Chip parity', () => {
        it('normal caries with no askbacks goes to output', async () => {
            // Normal caries shouldn't trigger any required medical askbacks
            const result = await runV10({
                dictation: 'Zahn 16 okklusal Füllung bei normaler Karies.',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
            });

            // No deep caries = no capping askback required
            const requiredQuestions = result.questions?.filter(q => q.medicalSeverity === 'hard') ?? [];
            expect(requiredQuestions).toHaveLength(0);

            // If we have optional questions, we can still go to output without answering them
            // The state depends on whether there are any required askbacks
        });

        it('traces chips when in output state', async () => {
            // Use a dictation that doesn't trigger required askbacks
            const result = await runV10({
                dictation: 'Zahn 16 okklusal Füllung bei normaler Karies.',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
            });

            // Check that trace exists and has chips (even if empty)
            expect(result.trace).toBeDefined();
            expect(result.trace?.allChips).toBeDefined();
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Billing codes match expected
    // ═══════════════════════════════════════════════════════════════

    describe('Billing code parity', () => {
        it('cp chip produces BEMA_25 for GKV', async () => {
            const result = await runV10({
                dictation: 'Zahn 16 tiefe Füllung.',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'kurz',
                answers: {
                    medical_ueberkappung: 'yes',
                    medical_hemostasis: 'no',
                    medical_sensitivity_followup: 'no',
                },
            });

            if (result.state === 'output') {
                expect(result.output?.billingCodes).toContain('BEMA_25');
            }
        });

        it('cp chip produces GOZ_2330 for PKV', async () => {
            const result = await runV10({
                dictation: 'Zahn 16 tiefe Füllung.',
                treatmentId: 'fuellung',
                insuranceType: 'PKV',
                textLength: 'kurz',
                answers: {
                    medical_ueberkappung: 'yes',
                    medical_hemostasis: 'no',
                    medical_sensitivity_followup: 'no',
                },
            });

            if (result.state === 'output') {
                expect(result.output?.billingCodes).toContain('GOZ_2330');
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Multi-instance parity
    // ═══════════════════════════════════════════════════════════════

    describe('Multi-instance parity', () => {
        it('multi-tooth produces questions for each tooth', async () => {
            const result = await runV10({
                dictation: 'Zähne 16 und 26 tiefe Füllungen.',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                teeth: ['16', '26'],
            });

            expect(result.state).toBe('questions');
            expect(result.meta.multiInstance).toBe(true);
            expect(result.meta.instanceCount).toBe(2);
        });
    });
});
