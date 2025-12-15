/**
 * Gate 8: Multi-Treatment Contract Tests
 * 
 * Verifies the orchestrator contract:
 * - Pipeline called N times for N segments
 * - Each run preserves segmentId + treatmentId
 * - Input maps not mutated
 * - Structural dedupe works
 * - Merged output includes all segments
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
    MultiTreatmentPlan,
    TreatmentSegment,
    CrossTreatmentContext,
} from '../../v7/multitreatment/types';

// Mock the pipeline module
vi.mock('../../v7/pipeline', () => ({
    run: vi.fn(),
}));

import { runMultiTreatment } from '../../v7/multitreatment/orchestrator';
import { run as mockRun } from '../../v7/pipeline';

describe('Gate 8: Multi-Treatment Contract', () => {
    // Fixtures
    const endoSegment: TreatmentSegment = {
        id: 'seg-endo-1',
        treatmentId: 'endo',
        dictationSlice: 'Endo 36 3 Kanäle',
        extracted: {
            tooth: '36',
            surfaces: [],
            diagnosis: 'Pulpitis',
            mentioned: { kanalzahl: 3 },
        },
        answers: new Map([
            ['kanalzahl', '3'],
            ['spuelung', 'naocl'],
        ]),
        toothScope: ['36'],
    };

    const fuellungSegment: TreatmentSegment = {
        id: 'seg-fuellung-1',
        treatmentId: 'fuellung',
        dictationSlice: '37 mod tief',
        extracted: {
            tooth: '37',
            surfaces: ['m', 'o', 'd'],
            diagnosis: 'Caries profunda',
            mentioned: { tiefe: 'tief' },
        },
        answers: new Map([
            ['isolation', 'kofferdam'],
            ['tiefe', 'tief'],
        ]),
        toothScope: ['37'],
    };

    const context: CrossTreatmentContext = {
        sessionId: 'test-session-1',
        insuranceType: 'GKV',
        textLength: 'mittel',
        hasMKV: false,
    };

    const mockPipelineResult = (segmentId: string, treatmentId: string) => ({
        state: 'output' as const,
        questions: [],
        output: {
            sections: [
                { id: `${treatmentId}-doc`, label: 'Dokumentation', content: `${treatmentId} content` },
            ],
            fullText: `${treatmentId} full text`,
            billingCodes: [
                { code: treatmentId === 'endo' ? 'BEMA_32' : 'BEMA_13c', type: 'BEMA' },
                { code: 'BEMA_12', type: 'BEMA' }, // Shared code for dedupe test
            ],
            warnings: [],
        },
        warnings: [],
        _debug: {
            activeChipIds: treatmentId === 'endo'
                ? ['kanalaufbereitung_3', 'spuelung_naocl']
                : ['exkavation', 'kofferdam', 'cp'],
        },
    });

    beforeEach(() => {
        vi.clearAllMocks();
        (mockRun as ReturnType<typeof vi.fn>).mockImplementation(async (input) => {
            // Return mock result based on treatmentId
            return mockPipelineResult('mock-seg', input.treatmentId || 'fuellung');
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('A) Pipeline called exactly N times for N segments', () => {
        it('should call pipeline.run exactly 2 times for 2 segments', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [endoSegment, fuellungSegment],
                executionOrder: 'sequential',
                context,
            };

            await runMultiTreatment(plan);

            expect(mockRun).toHaveBeenCalledTimes(2);
        });

        it('should call pipeline.run exactly 1 time for 1 segment', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [endoSegment],
                executionOrder: 'sequential',
                context,
            };

            await runMultiTreatment(plan);

            expect(mockRun).toHaveBeenCalledTimes(1);
        });
    });

    describe('B) Each run preserves segmentId + treatmentId', () => {
        it('should preserve segmentId in each run result', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [endoSegment, fuellungSegment],
                executionOrder: 'sequential',
                context,
            };

            const result = await runMultiTreatment(plan);

            expect(result.runs).toHaveLength(2);
            expect(result.runs[0].segmentId).toBe('seg-endo-1');
            expect(result.runs[1].segmentId).toBe('seg-fuellung-1');
        });

        it('should preserve treatmentId in each run result', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [endoSegment, fuellungSegment],
                executionOrder: 'sequential',
                context,
            };

            const result = await runMultiTreatment(plan);

            expect(result.runs[0].treatmentId).toBe('endo');
            expect(result.runs[1].treatmentId).toBe('fuellung');
        });
    });

    describe('C) Orchestrator does NOT mutate input answer maps', () => {
        it('should not mutate segment answer maps', async () => {
            const originalEndoAnswers = new Map(endoSegment.answers);
            const originalFuellungAnswers = new Map(fuellungSegment.answers);

            const plan: MultiTreatmentPlan = {
                segments: [endoSegment, fuellungSegment],
                executionOrder: 'sequential',
                context,
            };

            await runMultiTreatment(plan);

            // Verify maps unchanged
            expect(endoSegment.answers).toEqual(originalEndoAnswers);
            expect(fuellungSegment.answers).toEqual(originalFuellungAnswers);
        });
    });

    describe('D) Dedupe removes exact duplicate billing codes', () => {
        it('should remove duplicate BEMA_12 that appears in both runs', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [endoSegment, fuellungSegment],
                executionOrder: 'sequential',
                context,
            };

            const result = await runMultiTreatment(plan);

            // BEMA_12 appears in both mock results but should be deduped
            const bema12Count = result.billingCodes.filter(bc => bc.code === 'BEMA_12').length;
            expect(bema12Count).toBe(1);
        });

        it('should keep distinct codes from different runs', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [endoSegment, fuellungSegment],
                executionOrder: 'sequential',
                context,
            };

            const result = await runMultiTreatment(plan);

            const codes = result.billingCodes.map(bc => bc.code);
            expect(codes).toContain('BEMA_32'); // endo-specific
            expect(codes).toContain('BEMA_13c'); // fuellung-specific
        });
    });

    describe('E) mergedOutput includes all segment outputs', () => {
        it('should include sections from all runs', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [endoSegment, fuellungSegment],
                executionOrder: 'sequential',
                context,
            };

            const result = await runMultiTreatment(plan);

            // Should have segment markers + content sections
            expect(result.mergedOutput.sections.length).toBeGreaterThanOrEqual(2);
        });

        it('should have non-empty fullText', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [endoSegment, fuellungSegment],
                executionOrder: 'sequential',
                context,
            };

            const result = await runMultiTreatment(plan);

            expect(result.mergedOutput.fullText).toBeDefined();
            expect(result.mergedOutput.fullText.length).toBeGreaterThan(0);
        });
    });
});
