/**
 * Gate M12.2: Trace Format Parity Smoke Test
 *
 * GATE DEFINITION:
 * V10 must emit the same trace "stage:detail" format that V7 tests expect.
 * This is a smoke test for basic trace marker presence.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../../v10';
import type { V10PipelineInput } from '../../../v10/types';

describe('Gate M12.2: Trace Format Parity Smoke', () => {
    describe('Single treatment trace markers', () => {
        it('emits input trace marker', async () => {
            const input: V10PipelineInput = {
                dictation: 'Zahn 16 Karies MOD Kompositfüllung',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map(),
            };

            const result = await runV10(input);

            // Check trace lines exist
            expect(result.meta.traceLines).toBeDefined();
            expect(Array.isArray(result.meta.traceLines)).toBe(true);

            // Check for input marker
            const hasInputMarker = result.meta.traceLines!.some(
                line => line.startsWith('input:') && line.includes('treatment=fuellung')
            );
            expect(hasInputMarker).toBe(true);
        });

        it('emits extract trace marker with engine', async () => {
            const input: V10PipelineInput = {
                dictation: 'Zahn 16 Karies',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map(),
            };

            const result = await runV10(input);

            // Check for extract marker
            const hasExtractMarker = result.meta.traceLines!.some(
                line => line.startsWith('extract:') && line.includes('engine=')
            );
            expect(hasExtractMarker).toBe(true);
        });

        it('emits questions or gate trace marker', async () => {
            const input: V10PipelineInput = {
                dictation: 'Zahn 16 Karies',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map(),
            };

            const result = await runV10(input);

            // Should have either questions marker (if asking) or gate marker
            const hasQuestionsOrGate = result.meta.traceLines!.some(
                line => line.startsWith('questions:') || line.startsWith('gate:')
            );
            expect(hasQuestionsOrGate).toBe(true);
        });

        it('emits medical_summary trace marker', async () => {
            const input: V10PipelineInput = {
                dictation: 'Zahn 16 Karies',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map(),
            };

            const result = await runV10(input);

            const hasMedicalSummary = result.meta.traceLines!.some(
                line => line.startsWith('medical_summary:')
            );
            expect(hasMedicalSummary).toBe(true);
        });
    });

    describe('Output state trace markers', () => {
        it('emits billing_inputs and billing_result when in output state', async () => {
            // Use input with all questions answered (via pre-populated answers)
            const input: V10PipelineInput = {
                dictation: 'Zahn 16 schöne MOD Kompositfüllung',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map([
                    ['medical_anesthesia', 'nein'],
                    ['medical_vitality', 'positiv'],
                    ['medical_percussion', 'negativ'],
                ]),
            };

            const result = await runV10(input);

            // If in output state, check billing markers
            if (result.state === 'output') {
                const hasBillingInputs = result.meta.traceLines!.some(
                    line => line.startsWith('billing_inputs:')
                );
                const hasBillingResult = result.meta.traceLines!.some(
                    line => line.startsWith('billing_result:')
                );
                const hasRender = result.meta.traceLines!.some(
                    line => line.startsWith('render:')
                );

                expect(hasBillingInputs).toBe(true);
                expect(hasBillingResult).toBe(true);
                expect(hasRender).toBe(true);
            }
        });
    });

    describe('Trace marker ordering', () => {
        it('trace markers are in correct order', async () => {
            const input: V10PipelineInput = {
                dictation: 'Zahn 16 Karies',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map(),
            };

            const result = await runV10(input);
            const lines = result.meta.traceLines!;

            // Find indices
            const inputIdx = lines.findIndex(l => l.startsWith('input:'));
            const extractIdx = lines.findIndex(l => l.startsWith('extract:'));
            const medicalIdx = lines.findIndex(l => l.startsWith('medical_summary:'));

            // Input should be first
            expect(inputIdx).toBe(0);

            // Extract should be after input
            expect(extractIdx).toBeGreaterThan(inputIdx);

            // Medical summary should be after extract
            expect(medicalIdx).toBeGreaterThan(extractIdx);
        });
    });
});
