/**
 * Gate M13.1: Trace Includes KB Lines
 *
 * GATE DEFINITION:
 * V10 pipeline trace must include:
 * - kb_medical:source=...;version=...;hash=...
 * - kb_treatment:source=...;treatment=...;version=...;hash=...
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../../v10/public';
import type { V10PipelineInput } from '../../../v10/types';

describe('Gate M13.1: V10 Trace Includes KB Lines', () => {
    it('trace includes kb_medical line', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 Karies Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        };

        const result = await runV10(input);

        expect(result.meta.traceLines).toBeDefined();
        const kbMedicalLine = result.meta.traceLines?.find(l => l.startsWith('kb_medical:'));

        expect(kbMedicalLine).toBeDefined();
        expect(kbMedicalLine).toContain('source=json');
        expect(kbMedicalLine).toContain('version=');
        expect(kbMedicalLine).toContain('hash=');
    });

    it('trace includes kb_treatment line', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 Karies',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        };

        const result = await runV10(input);

        expect(result.meta.traceLines).toBeDefined();
        const kbTreatmentLine = result.meta.traceLines?.find(l => l.startsWith('kb_treatment:'));

        expect(kbTreatmentLine).toBeDefined();
        expect(kbTreatmentLine).toContain('source=json');
        expect(kbTreatmentLine).toContain('treatment=fuellung');
        expect(kbTreatmentLine).toContain('version=');
        expect(kbTreatmentLine).toContain('hash=');
    });

    it('trace includes kb_treatment for endo', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 36 Wurzelbehandlung',
            treatmentId: 'endo',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        };

        const result = await runV10(input);

        const kbTreatmentLine = result.meta.traceLines?.find(l => l.startsWith('kb_treatment:'));

        expect(kbTreatmentLine).toBeDefined();
        expect(kbTreatmentLine).toContain('treatment=endo');
    });

    it('kb_medical line appears before kb_treatment in trace order', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        };

        const result = await runV10(input);

        const traceLines = result.meta.traceLines ?? [];
        const medicalIndex = traceLines.findIndex(l => l.startsWith('kb_medical:'));
        const treatmentIndex = traceLines.findIndex(l => l.startsWith('kb_treatment:'));

        expect(medicalIndex).toBeGreaterThanOrEqual(0);
        expect(treatmentIndex).toBeGreaterThanOrEqual(0);
        expect(medicalIndex).toBeLessThan(treatmentIndex);
    });

    it('kb lines come early in trace (after input)', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 Karies',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        };

        const result = await runV10(input);

        const traceLines = result.meta.traceLines ?? [];
        const inputIndex = traceLines.findIndex(l => l.startsWith('input:'));
        const medicalIndex = traceLines.findIndex(l => l.startsWith('kb_medical:'));

        expect(inputIndex).toBeGreaterThanOrEqual(0);
        expect(medicalIndex).toBeGreaterThan(inputIndex);
        // KB should be within first 5 lines
        expect(medicalIndex).toBeLessThan(5);
    });
});
