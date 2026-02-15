/**
 * Gate: V10 Pipeline Output Shape Contract
 * 
 * Per Phase 5 requirement E: Test that fails if pipeline output schema changes.
 * Verifies the critical paths: questions/output/trace exist on the result.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../v10/public';
import type { V10PipelineOutput } from '../../v10/types';

describe('gate-v10-output-shape-contract', () => {
    describe('V10PipelineOutput shape', () => {
        it('questions state has expected shape', async () => {
            // Use dictation that triggers questions
            const result = await runV10({
                dictation: 'Zahn 26 mod tiefe Kompositfüllung Kofferdam Anästhesie',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
            });

            // SHAPE CONTRACT: These keys must exist
            expect(result).toHaveProperty('state');
            expect(result).toHaveProperty('meta');
            expect(['questions', 'output', 'error']).toContain(result.state);

            if (result.state === 'questions') {
                // questions path must exist
                expect(result).toHaveProperty('questions');
                expect(Array.isArray(result.questions)).toBe(true);

                // Each question must have id or questionKey
                for (const q of result.questions || []) {
                    expect(q.id || q.questionKey).toBeTruthy();
                }
            }
        });

        it('output state has expected shape', async () => {
            // Use simple dictation that goes to output
            const result = await runV10({
                dictation: 'Zahn 36 mo Komposit',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
            });

            // SHAPE CONTRACT: These keys must exist
            expect(result).toHaveProperty('state');
            expect(result).toHaveProperty('meta');

            if (result.state === 'output') {
                expect(result).toHaveProperty('output');
                expect(result.output).toHaveProperty('fullText');
                expect(result.output).toHaveProperty('billingCodes');
                expect(typeof result.output?.fullText).toBe('string');
                expect(Array.isArray(result.output?.billingCodes)).toBe(true);
            }
        });

        it('meta has expected shape', async () => {
            const result = await runV10({
                dictation: 'Zahn 46 d Komposit',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
            });

            // SHAPE CONTRACT: meta must have engineUsed
            expect(result.meta).toHaveProperty('engineUsed');
            expect(result.meta.engineUsed).toBe('v10');
        });

        it('trace contains instance data when present', async () => {
            const result = await runV10({
                dictation: 'Zahn 26 mod Komposit',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
            });

            // SHAPE CONTRACT: trace is optional but if present has expected structure
            if (result.trace) {
                expect(result.trace).toHaveProperty('instances');
                expect(Array.isArray(result.trace.instances)).toBe(true);
            }
        });
    });

    describe('Determinism sanity', () => {
        it('same input produces same state', async () => {
            const input = {
                dictation: 'Zahn 26 mod Komposit',
                treatmentId: 'fuellung',
                insuranceType: 'GKV' as const,
                textLength: 'mittel' as const,
            };

            const result1 = await runV10(input);
            const result2 = await runV10(input);

            // State should be deterministic
            expect(result1.state).toBe(result2.state);

            // Question IDs should match if questions state
            if (result1.state === 'questions' && result2.state === 'questions') {
                const ids1 = result1.questions?.map(q => q.id || q.questionKey).sort();
                const ids2 = result2.questions?.map(q => q.id || q.questionKey).sort();
                expect(ids1).toEqual(ids2);
            }
        });
    });
});
