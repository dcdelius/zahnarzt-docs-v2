/**
 * Gate 9: Multi-Treatment Isolation Tests
 * 
 * Verifies that treatment runs are isolated:
 * - Order doesn't affect per-run results
 * - No cross-run leakage in debug metadata
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

describe('Gate 9: Multi-Treatment Isolation', () => {
    // Fixtures with deterministic debug info
    const endoSegment: TreatmentSegment = {
        id: 'seg-endo-1',
        treatmentId: 'endo',
        dictationSlice: 'Endo 36',
        extracted: {
            tooth: '36',
            surfaces: [],
            diagnosis: 'Pulpitis',
            mentioned: {},
        },
        answers: new Map([['kanalzahl', '3']]),
        toothScope: ['36'],
    };

    const fuellungSegment: TreatmentSegment = {
        id: 'seg-fuellung-1',
        treatmentId: 'fuellung',
        dictationSlice: '37 mod',
        extracted: {
            tooth: '37',
            surfaces: ['m', 'o', 'd'],
            diagnosis: 'Karies',
            mentioned: {},
        },
        answers: new Map([['isolation', 'kofferdam']]),
        toothScope: ['37'],
    };

    const context: CrossTreatmentContext = {
        sessionId: 'test-session-1',
        insuranceType: 'GKV',
        textLength: 'mittel',
        hasMKV: false,
    };

    // Deterministic mock results
    const endoMockResult = {
        state: 'output' as const,
        questions: [],
        output: {
            sections: [{ id: 'endo-doc', label: 'Endo', content: 'Endo content' }],
            fullText: 'Endo full text',
            billingCodes: [{ code: 'BEMA_32', type: 'BEMA' }],
            warnings: [],
        },
        warnings: [],
        _debug: {
            activeChipIds: ['kanalaufbereitung_3', 'spuelung_naocl'],
            translatedAnswers: { kanalzahl: '3' },
        },
    };

    const fuellungMockResult = {
        state: 'output' as const,
        questions: [],
        output: {
            sections: [{ id: 'fuellung-doc', label: 'Fuellung', content: 'Fuellung content' }],
            fullText: 'Fuellung full text',
            billingCodes: [{ code: 'BEMA_13c', type: 'BEMA' }],
            warnings: [],
        },
        warnings: [],
        _debug: {
            activeChipIds: ['exkavation', 'kofferdam', 'komposit_basic'],
            translatedAnswers: { kofferdam: 'yes' },
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (mockRun as ReturnType<typeof vi.fn>).mockImplementation(async (input) => {
            // Return deterministic result based on treatmentId
            if (input.treatmentId === 'endo') {
                return { ...endoMockResult };
            }
            return { ...fuellungMockResult };
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('A) Segment order does not affect per-run results', () => {
        it('should produce same activeChipIds for endo regardless of order', async () => {
            // Run with endo first
            const planEndoFirst: MultiTreatmentPlan = {
                segments: [endoSegment, fuellungSegment],
                executionOrder: 'sequential',
                context,
            };
            const resultEndoFirst = await runMultiTreatment(planEndoFirst);

            // Run with fuellung first
            const planFuellungFirst: MultiTreatmentPlan = {
                segments: [fuellungSegment, endoSegment],
                executionOrder: 'sequential',
                context,
            };
            const resultFuellungFirst = await runMultiTreatment(planFuellungFirst);

            // Find endo run in each
            const endoRunFirst = resultEndoFirst.runs.find(r => r.treatmentId === 'endo');
            const endoRunSecond = resultFuellungFirst.runs.find(r => r.treatmentId === 'endo');

            // activeChipIds should be identical
            expect(endoRunFirst?.result._debug?.activeChipIds).toEqual(
                endoRunSecond?.result._debug?.activeChipIds
            );
        });

        it('should produce same activeChipIds for fuellung regardless of order', async () => {
            const planEndoFirst: MultiTreatmentPlan = {
                segments: [endoSegment, fuellungSegment],
                executionOrder: 'sequential',
                context,
            };
            const resultEndoFirst = await runMultiTreatment(planEndoFirst);

            const planFuellungFirst: MultiTreatmentPlan = {
                segments: [fuellungSegment, endoSegment],
                executionOrder: 'sequential',
                context,
            };
            const resultFuellungFirst = await runMultiTreatment(planFuellungFirst);

            const fuellungRunFirst = resultEndoFirst.runs.find(r => r.treatmentId === 'fuellung');
            const fuellungRunSecond = resultFuellungFirst.runs.find(r => r.treatmentId === 'fuellung');

            expect(fuellungRunFirst?.result._debug?.activeChipIds).toEqual(
                fuellungRunSecond?.result._debug?.activeChipIds
            );
        });
    });

    describe('B) No cross-run leakage in metadata', () => {
        it('endo run should not contain fuellung chips', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [endoSegment, fuellungSegment],
                executionOrder: 'sequential',
                context,
            };

            const result = await runMultiTreatment(plan);
            const endoRun = result.runs.find(r => r.treatmentId === 'endo');

            const endoChips = endoRun?.result._debug?.activeChipIds || [];
            expect(endoChips).not.toContain('exkavation');
            expect(endoChips).not.toContain('kofferdam');
            expect(endoChips).not.toContain('komposit_basic');
        });

        it('fuellung run should not contain endo chips', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [endoSegment, fuellungSegment],
                executionOrder: 'sequential',
                context,
            };

            const result = await runMultiTreatment(plan);
            const fuellungRun = result.runs.find(r => r.treatmentId === 'fuellung');

            const fuellungChips = fuellungRun?.result._debug?.activeChipIds || [];
            expect(fuellungChips).not.toContain('kanalaufbereitung_3');
            expect(fuellungChips).not.toContain('spuelung_naocl');
        });

        it('each run should have its own translatedAnswers', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [endoSegment, fuellungSegment],
                executionOrder: 'sequential',
                context,
            };

            const result = await runMultiTreatment(plan);

            const endoRun = result.runs.find(r => r.treatmentId === 'endo');
            const fuellungRun = result.runs.find(r => r.treatmentId === 'fuellung');

            // Endo should have kanalzahl, not kofferdam
            expect(endoRun?.result._debug?.translatedAnswers).toHaveProperty('kanalzahl');
            expect(endoRun?.result._debug?.translatedAnswers).not.toHaveProperty('kofferdam');

            // Fuellung should have kofferdam, not kanalzahl
            expect(fuellungRun?.result._debug?.translatedAnswers).toHaveProperty('kofferdam');
            expect(fuellungRun?.result._debug?.translatedAnswers).not.toHaveProperty('kanalzahl');
        });
    });
});
