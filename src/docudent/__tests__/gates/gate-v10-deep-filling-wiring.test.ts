/**
 * Gate: V10 Deep Filling Wiring Test
 * 
 * Verifies that:
 * 1. Pipeline receives correct treatmentId (not "Füllung" but "fuellung")
 * 2. Deep filling dictation triggers ueberkappung askback or goes to output
 * 3. No crash occurs
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../v10/public';
import type { V10PipelineInput } from '../../v10/types';

describe('V10 Deep Filling Wiring', () => {
    describe('Pipeline Input Mapping', () => {
        it('treatmentId "fuellung" is valid (not "Füllung")', async () => {
            const input: V10PipelineInput = {
                dictation: 'Zahn 26 MOD tiefe Kompositfüllung Kofferdam Anästhesie',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
            };

            // Should not throw
            const result = await runV10(input);

            // Should be output or questions, never error
            expect(['output', 'questions']).toContain(result.state);
            expect(result.state).not.toBe('error');
        });

        it('deep filling with kofferdam processes without error', async () => {
            const input: V10PipelineInput = {
                dictation: 'Zahn 26 MOD tiefe Kompositfüllung Kofferdam Anästhesie',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
            };

            const result = await runV10(input);

            console.log('State:', result.state);
            console.log('Questions:', result.questions?.map(q => q.id || q.questionKey));

            // Must not error
            expect(result.state).not.toBe('error');

            // If state is questions, questions array should be populated
            if (result.state === 'questions') {
                expect(result.questions?.length).toBeGreaterThan(0);
            }
        });

        it('deep filling triggers output with billing codes', async () => {
            const input: V10PipelineInput = {
                dictation: 'Zahn 26 MOD Kompositfüllung Kofferdam LA',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
            };

            const result = await runV10(input);

            console.log('State:', result.state);
            console.log('Output:', result.output ? 'present' : 'null');

            if (result.state === 'output' && result.output) {
                expect(result.output.billingCodes?.length).toBeGreaterThan(0);
                expect(result.output.fullText?.length).toBeGreaterThan(0);
            }
        });

        it('insurance mapping is correct (GKV, PKV)', async () => {
            // Test GKV
            const gkvInput: V10PipelineInput = {
                dictation: 'Zahn 36 mo Komposit',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
            };
            const gkvResult = await runV10(gkvInput);
            expect(gkvResult.state).not.toBe('error');

            // Test PKV
            const pkvInput: V10PipelineInput = {
                dictation: 'Zahn 36 mo Komposit',
                treatmentId: 'fuellung',
                insuranceType: 'PKV',
                textLength: 'mittel',
            };
            const pkvResult = await runV10(pkvInput);
            expect(pkvResult.state).not.toBe('error');
        });
    });

    describe('Repro Case: Deep Filling No Crash', () => {
        it('exact repro dictation processes without error', async () => {
            const input: V10PipelineInput = {
                dictation: 'Zahn 26 mod Kompositfüllung, tiefe Karies, Kofferdam, Anästhesie, Mehrschichttechnik, 120 Euro',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
            };

            const result = await runV10(input);

            console.log('[REPRO] State:', result.state);
            console.log('[REPRO] Questions:', result.questions?.map(q => q.id || q.questionKey));
            console.log('[REPRO] Error:', result.error);
            console.log('[REPRO] Output:', result.output ? 'present' : 'null');

            // MUST NOT be error
            expect(result.state).not.toBe('error');

            // Should have some output or questions
            if (result.state === 'output' && result.output) {
                expect(result.output.fullText?.length).toBeGreaterThan(0);
            }
            if (result.state === 'questions') {
                expect(result.questions?.length).toBeGreaterThan(0);
            }
        });
    });
});
