/**
 * Gate 7: Stage Emission E2E Test
 * 
 * This test verifies the REAL pipeline emits all 6 trace stages
 * using the in-memory stageLog (deterministic, no timing dependencies).
 * 
 * This catches:
 * - Missing trace() calls in pipeline
 * - Wrong stage order
 * - Stages that don't fire due to early return
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import SSOT
import { V7_TRACE_STAGES } from '../../v7/pipeline/traceStages';
import {
    enableStageLogging,
    disableStageLogging,
    resetStageLog,
    getStageNames,
} from '../../v7/pipeline/trace';
import { run } from '../../v7/pipeline/index';

describe('GATE7: Stage Emission E2E', () => {
    beforeEach(() => {
        enableStageLogging();
        resetStageLog();
    });

    afterEach(() => {
        disableStageLogging();
        resetStageLog();
    });

    it('should emit all 6 stages for a complete pipeline run (with answers)', async () => {
        // Complete input with all answers to reach output state
        const completeInput = {
            dictation: 'Zahn 36 dreiflächige Füllung mod tief mit Infiltration Kofferdam',
            answers: new Map<string, unknown>([
                ['vitality', 'pos'],
                ['percussion', 'neg'],
                ['isolation', 'kofferdam'],
                ['tiefe', 'normal'],
            ]),
            insuranceType: 'GKV' as const,
            textLength: 'mittel' as const,
            hasMKV: false,
            treatmentId: 'fuellung',
        };

        // Run the pipeline
        let result = await run(completeInput);

        // If stuck at questions, add missing answers and re-run
        if (result.state === 'questions') {
            const questionIds = result.questions?.map((q: any) => q.id) || [];
            for (const qid of questionIds) {
                if (!completeInput.answers.has(qid)) {
                    completeInput.answers.set(qid, 'default');
                }
            }
            resetStageLog();
            result = await run(completeInput);
        }

        expect(result.state).toBe('output');

        // Get captured stages
        const capturedStages = getStageNames();

        // Should have captured at least 6 stages
        expect(capturedStages.length).toBeGreaterThanOrEqual(6);

        // First stage should be PIPELINE_INPUT
        expect(capturedStages[0]).toBe('PIPELINE_INPUT');

        // Should contain all stages
        for (const stage of V7_TRACE_STAGES) {
            expect(capturedStages).toContain(stage);
        }
    }, 15000); // 15s timeout for this test

    it('should emit PIPELINE_INPUT, EXTRACTED, QUESTIONS for partial input', async () => {
        resetStageLog();

        // Input with NO answers → should return at questions step
        const partialInput = {
            dictation: 'Zahn 36 dreiflächige Füllung mod',
            answers: new Map<string, unknown>(),  // Empty answers
            insuranceType: 'GKV' as const,
            textLength: 'mittel' as const,
            hasMKV: false,
            treatmentId: 'fuellung',
        };

        const result = await run(partialInput);

        // Should be in 'questions' state (needs answers)
        expect(result.state).toBe('questions');

        const capturedStages = getStageNames();

        // Should have emitted first 3 stages
        expect(capturedStages).toContain('PIPELINE_INPUT');
        expect(capturedStages).toContain('EXTRACTED');
        expect(capturedStages).toContain('QUESTIONS');
    }, 10000);

    it('stages should be emitted in strict order', async () => {
        resetStageLog();

        const input = {
            dictation: 'Zahn 36 mod tief',
            answers: new Map<string, unknown>([
                ['vitality', 'pos'],
                ['percussion', 'neg'],
                ['isolation', 'kofferdam'],
                ['tiefe', 'tief'],
            ]),
            insuranceType: 'GKV' as const,
            textLength: 'mittel' as const,
            hasMKV: false,
            treatmentId: 'fuellung',
        };

        let result = await run(input);

        // Add missing answers if needed
        if (result.state === 'questions') {
            const questionIds = result.questions?.map((q: any) => q.id) || [];
            for (const qid of questionIds) {
                if (!input.answers.has(qid)) {
                    input.answers.set(qid, 'default');
                }
            }
            resetStageLog();
            result = await run(input);
        }

        const capturedStages = getStageNames();

        // Verify order: each stage must come after its predecessor in V7_TRACE_STAGES
        let lastIdx = -1;
        for (const stage of capturedStages) {
            const currentIdx = V7_TRACE_STAGES.indexOf(stage as any);
            if (currentIdx !== -1) {
                expect(currentIdx).toBeGreaterThanOrEqual(lastIdx);
                lastIdx = currentIdx;
            }
        }
    }, 15000);

    it('should emit all 6 stages for ENDO treatment', async () => {
        resetStageLog();

        // ENDO input with all answers
        const endoInput = {
            dictation: 'Zahn 46 Wurzelbehandlung 3 Kanäle',
            answers: new Map<string, unknown>([
                ['vitality', 'neg'],
                ['percussion', 'pos'],
                ['kanalzahl', '3'],
                ['spuelung', 'naocl'],
                ['medikament', 'caoh2'],
            ]),
            insuranceType: 'GKV' as const,
            textLength: 'mittel' as const,
            hasMKV: false,
            treatmentId: 'endo',
        };

        let result = await run(endoInput);

        // If stuck at questions, add missing answers
        if (result.state === 'questions') {
            const questionIds = result.questions?.map((q: any) => q.id) || [];
            for (const qid of questionIds) {
                if (!endoInput.answers.has(qid)) {
                    endoInput.answers.set(qid, 'default');
                }
            }
            resetStageLog();
            result = await run(endoInput);
        }

        expect(result.state).toBe('output');

        const capturedStages = getStageNames();

        // Should have captured all 6 stages
        expect(capturedStages.length).toBeGreaterThanOrEqual(6);

        // First stage should be PIPELINE_INPUT
        expect(capturedStages[0]).toBe('PIPELINE_INPUT');

        // Should contain all stages
        for (const stage of V7_TRACE_STAGES) {
            expect(capturedStages).toContain(stage);
        }
    }, 15000);
});
