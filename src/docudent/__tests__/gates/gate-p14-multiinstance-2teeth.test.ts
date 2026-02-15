/**
 * Gate Test: P14.X1 — MultiInstance 2-Teeth Filling
 * 
 * Verifies that running fuellung treatment on 2 different teeth (16 + 15)
 * produces correct scope-aware billing and SSOT aggregated copy text.
 * 
 * Critical behavior:
 * - TOOTH-scoped codes (BEMA_13c) appear twice (different teeth)
 * - SESSION-scoped codes (BEMA_40) dedupe to once
 * - aggregatedCopyText === join(perInstance.copyText, separator)
 * - Deterministic: same input → identical output
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runMultiTreatment } from '../../v7/multitreatment/orchestrator';
import type { MultiTreatmentPlan, TreatmentInstance, TreatmentSegment } from '../../v7/multitreatment/types';

// Mock pipeline.run to return predictable outputs
vi.mock('../../v7/pipeline', () => ({
    run: vi.fn(),
}));

import { run as runPipeline } from '../../v7/pipeline';
const mockRunPipeline = vi.mocked(runPipeline);

/**
 * Create a mock pipeline result for a filling on a specific tooth.
 */
function createMockFillingResult(tooth: string): ReturnType<typeof runPipeline> {
    return Promise.resolve({
        state: 'output' as const,
        output: {
            sections: [{ id: 's1', label: 'Füllung', content: `Füllung Zahn ${tooth}`, lines: [`Füllung Zahn ${tooth}`], format: 'text' }],
            fullText: `Füllung Zahn ${tooth} dokumentiert.`,
            copyText: `Füllung Zahn ${tooth} dokumentiert.`, // SSOT copyText
            billingCodes: ['BEMA_13c', 'BEMA_40'], // TOOTH-scoped + SESSION-scoped
            warnings: [],
        },
        warnings: [],
        questionBundle: undefined,
        questions: undefined,
    });
}

/**
 * Create a segment with 2 instances for tooth 16 and 15.
 */
function createTwoTeethSegment(): TreatmentSegment {
    const instance16: TreatmentInstance = {
        instanceId: 'fuellung-16',
        tooth: '16',
        dictationSlice: 'Zahn 16 mod Karies',
        extracted: {
            tooth: '16',
            surfaces: ['mod'],
            diagnosis: 'Karies',
            mentioned: {},
        },
        answers: new Map(),
    };

    const instance15: TreatmentInstance = {
        instanceId: 'fuellung-15',
        tooth: '15',
        dictationSlice: 'Zahn 15 mo Karies',
        extracted: {
            tooth: '15',
            surfaces: ['mo'],
            diagnosis: 'Karies',
            mentioned: {},
        },
        answers: new Map(),
    };

    return {
        id: 'seg-fuellung-multi',
        treatmentId: 'fuellung',
        dictationSlice: 'Zahn 16 mod Karies, Zahn 15 mo Karies',
        extracted: {
            tooth: null, // Multiple teeth
            surfaces: ['mod', 'mo'],
            diagnosis: 'Karies',
            mentioned: {},
        },
        answers: new Map(),
        toothScope: ['16', '15'],
        instances: [instance16, instance15],
    };
}

/**
 * Create a multi-treatment plan with 2 instances.
 */
function createTwoTeethPlan(): MultiTreatmentPlan {
    return {
        segments: [createTwoTeethSegment()],
        context: {
            sessionId: 'test-session-2teeth',
            insuranceType: 'GKV',
            textLength: 'mittel',
            hasMKV: false,
        },
    };
}

describe('P14.X1: MultiInstance 2-Teeth Filling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Instance Execution', () => {
        it('should execute pipeline twice for 2 instances', async () => {
            mockRunPipeline
                .mockImplementationOnce(() => createMockFillingResult('16'))
                .mockImplementationOnce(() => createMockFillingResult('15'));

            const result = await runMultiTreatment(createTwoTeethPlan());

            // Pipeline called twice (once per instance)
            expect(mockRunPipeline).toHaveBeenCalledTimes(2);

            // 2 runs recorded
            expect(result.runs).toHaveLength(2);

            // Each run has correct instanceId
            expect(result.runs[0].instanceId).toBe('fuellung-16');
            expect(result.runs[1].instanceId).toBe('fuellung-15');
        });

        it('should collect question bundles per instanceId', async () => {
            // Return questions for first instance, output for second
            mockRunPipeline
                .mockImplementationOnce(() => Promise.resolve({
                    state: 'questions' as const,
                    output: null,
                    warnings: [],
                    questionBundle: {
                        treatmentType: 'fuellung',
                        questions: [{ questionId: 'q1', label: 'Flächen?', type: 'chips' as const, options: ['mod', 'do'], value: null }],
                    },
                    questions: [{ questionId: 'q1', label: 'Flächen?', type: 'chips' as const, options: ['mod', 'do'], value: null }],
                }))
                .mockImplementationOnce(() => createMockFillingResult('15'));

            const result = await runMultiTreatment(createTwoTeethPlan());

            // perInstanceBundles should have the bundle for first instance
            expect(result.perInstanceBundles).toBeDefined();
            expect(result.perInstanceBundles!['fuellung-16']).toBeDefined();
            expect(result.perInstanceBundles!['fuellung-16'].questions).toHaveLength(1);
        });
    });

    describe('Billing Scope Aggregation', () => {
        it('should keep TOOTH-scoped codes for different teeth (no dedupe)', async () => {
            mockRunPipeline
                .mockImplementationOnce(() => createMockFillingResult('16'))
                .mockImplementationOnce(() => createMockFillingResult('15'));

            const result = await runMultiTreatment(createTwoTeethPlan());

            // Find BEMA_13c codes
            const bema13c = result.billingCodes.filter(bc => bc.code === 'BEMA_13c');

            // TOOTH-scoped: should have 2 items (different teeth)
            expect(bema13c.length).toBe(2);
            expect(bema13c.map(bc => bc.tooth).sort()).toEqual(['15', '16']);
            expect(bema13c.every(bc => bc.scope === 'TOOTH')).toBe(true);
        });

        it('should dedupe SESSION-scoped codes (BEMA_40)', async () => {
            mockRunPipeline
                .mockImplementationOnce(() => createMockFillingResult('16'))
                .mockImplementationOnce(() => createMockFillingResult('15'));

            const result = await runMultiTreatment(createTwoTeethPlan());

            // Find BEMA_40 codes
            const bema40 = result.billingCodes.filter(bc => bc.code === 'BEMA_40');

            // SESSION-scoped: should be deduped to 1 item
            expect(bema40.length).toBe(1);
            expect(bema40[0].scope).toBe('SESSION');
        });

        it('should include instanceId in billing codes', async () => {
            mockRunPipeline
                .mockImplementationOnce(() => createMockFillingResult('16'))
                .mockImplementationOnce(() => createMockFillingResult('15'));

            const result = await runMultiTreatment(createTwoTeethPlan());

            // Each billing code should have instanceId
            const bema13c = result.billingCodes.filter(bc => bc.code === 'BEMA_13c');
            expect(bema13c[0].instanceId).toBe('fuellung-16');
            expect(bema13c[1].instanceId).toBe('fuellung-15');
        });
    });

    describe('SSOT Aggregated Copy Text', () => {
        it('should aggregate copyText with deterministic separator', async () => {
            mockRunPipeline
                .mockImplementationOnce(() => createMockFillingResult('16'))
                .mockImplementationOnce(() => createMockFillingResult('15'));

            const result = await runMultiTreatment(createTwoTeethPlan());

            const expected = [
                'Füllung Zahn 16 dokumentiert.',
                'Füllung Zahn 15 dokumentiert.',
            ].join('\n\n---\n\n');

            expect(result.aggregatedCopyText).toBe(expected);
        });

        it('should produce identical output on repeated runs (determinism)', async () => {
            // Run 1
            mockRunPipeline
                .mockImplementationOnce(() => createMockFillingResult('16'))
                .mockImplementationOnce(() => createMockFillingResult('15'));
            const result1 = await runMultiTreatment(createTwoTeethPlan());

            // Run 2
            mockRunPipeline
                .mockImplementationOnce(() => createMockFillingResult('16'))
                .mockImplementationOnce(() => createMockFillingResult('15'));
            const result2 = await runMultiTreatment(createTwoTeethPlan());

            // Identical aggregatedCopyText
            expect(result1.aggregatedCopyText).toBe(result2.aggregatedCopyText);

            // Identical billing order
            const codes1 = result1.billingCodes.map(bc => `${bc.code}-${bc.tooth}`);
            const codes2 = result2.billingCodes.map(bc => `${bc.code}-${bc.tooth}`);
            expect(codes1).toEqual(codes2);
        });
    });

    describe('Aggregated State', () => {
        it('should return output if all instances complete', async () => {
            mockRunPipeline
                .mockImplementationOnce(() => createMockFillingResult('16'))
                .mockImplementationOnce(() => createMockFillingResult('15'));

            const result = await runMultiTreatment(createTwoTeethPlan());

            expect(result.aggregatedState).toBe('output');
        });

        it('should return questions if any instance needs questions', async () => {
            mockRunPipeline
                .mockImplementationOnce(() => Promise.resolve({
                    state: 'questions' as const,
                    output: null,
                    warnings: [],
                    questionBundle: { treatmentType: 'fuellung', questions: [] },
                    questions: [],
                }))
                .mockImplementationOnce(() => createMockFillingResult('15'));

            const result = await runMultiTreatment(createTwoTeethPlan());

            expect(result.aggregatedState).toBe('questions');
        });

        it('should return error if any instance errors', async () => {
            mockRunPipeline
                .mockImplementationOnce(() => Promise.resolve({
                    state: 'error' as const,
                    output: null,
                    warnings: [],
                    questionBundle: undefined,
                    questions: undefined,
                }))
                .mockImplementationOnce(() => createMockFillingResult('15'));

            const result = await runMultiTreatment(createTwoTeethPlan());

            expect(result.aggregatedState).toBe('error');
        });
    });
});
