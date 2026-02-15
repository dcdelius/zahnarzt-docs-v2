/**
 * Gate: P14 Multi-Treatment SSOT and Billing Scope
 * 
 * Tests P14.1-P14.3 invariants:
 * - Segment answer isolation
 * - SSOT aggregatedCopyText determinism
 * - Scope-aware billing aggregation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
    MultiTreatmentPlan,
    TreatmentSegment,
    CrossTreatmentContext,
    BillingCode,
} from '../../v7/multitreatment/types';

// Mock the pipeline module
vi.mock('../../v7/pipeline', () => ({
    run: vi.fn(),
}));

import { runMultiTreatment } from '../../v7/multitreatment/orchestrator';
import { run as mockRun } from '../../v7/pipeline';

describe('GATE: P14 Multi-Treatment SSOT + Billing Scope', () => {
    // Fixtures: Two fillings on two different teeth (P14.3 core scenario)
    const fuellung16Segment: TreatmentSegment = {
        id: 'seg-fuellung-16',
        treatmentId: 'fuellung',
        dictationSlice: 'Zahn 16 mod',
        extracted: {
            tooth: '16',
            surfaces: ['m', 'o', 'd'],
            diagnosis: 'Karies',
            mentioned: {},
        },
        answers: new Map([['isolation', 'kofferdam']]),
        toothScope: ['16'],
    };

    const fuellung15Segment: TreatmentSegment = {
        id: 'seg-fuellung-15',
        treatmentId: 'fuellung',
        dictationSlice: 'Zahn 15 mo',
        extracted: {
            tooth: '15',
            surfaces: ['m', 'o'],
            diagnosis: 'Karies',
            mentioned: {},
        },
        answers: new Map([['isolation', 'relativ']]),
        toothScope: ['15'],
    };

    const context: CrossTreatmentContext = {
        sessionId: 'test-p14-session',
        insuranceType: 'GKV',
        textLength: 'mittel',
        hasMKV: false,
    };

    // Mock results with TOOTH-scoped codes (BEMA_13c) and SESSION-scoped codes (BEMA_40)
    const mockFuellungResult = (tooth: string) => ({
        state: 'output' as const,
        questions: [],
        questionBundle: { required: [], optionalVisible: [], optionalHidden: [], metadata: { id: 'mock', treatmentId: 'fuellung', version: '1' } },
        output: {
            sections: [{ id: 'behandlung', label: 'Behandlung', content: `Füllung Zahn ${tooth}`, lines: [`Füllung Zahn ${tooth}`], format: 'prose' as const }],
            fullText: `[Behandlung]\nFüllung Zahn ${tooth}`,
            billingCodes: ['BEMA_13c', 'BEMA_40'], // 13c is per-tooth, 40 is per-session
            warnings: [],
        },
        warnings: [],
    });

    beforeEach(() => {
        vi.clearAllMocks();
        (mockRun as ReturnType<typeof vi.fn>).mockImplementation(async (input) => {
            // Return mock based on dictation content
            if (input.dictation?.includes('16')) {
                return mockFuellungResult('16');
            }
            return mockFuellungResult('15');
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ═══════════════════════════════════════════════════════════════
    // P14.2: SSOT aggregatedCopyText
    // ═══════════════════════════════════════════════════════════════

    describe('P14.2: SSOT aggregatedCopyText', () => {
        it('aggregatedCopyText uses deterministic separator', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [fuellung16Segment, fuellung15Segment],
                executionOrder: 'sequential',
                context,
            };

            const result = await runMultiTreatment(plan);

            // SSOT: aggregatedCopyText must contain separator
            expect(result.aggregatedCopyText).toContain('\n\n---\n\n');
        });

        it('aggregatedCopyText includes both treatment outputs', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [fuellung16Segment, fuellung15Segment],
                executionOrder: 'sequential',
                context,
            };

            const result = await runMultiTreatment(plan);

            // SSOT: aggregatedCopyText must include content from both
            expect(result.aggregatedCopyText).toContain('Zahn 16');
            expect(result.aggregatedCopyText).toContain('Zahn 15');
        });

        it('determinism: same input produces identical output', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [fuellung16Segment, fuellung15Segment],
                executionOrder: 'sequential',
                context,
            };

            const result1 = await runMultiTreatment(plan);
            const result2 = await runMultiTreatment(plan);

            expect(result1.aggregatedCopyText).toBe(result2.aggregatedCopyText);
            expect(result1.billingCodes.map(c => c.code)).toEqual(result2.billingCodes.map(c => c.code));
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // P14.3: Billing Scope Aggregation
    // ═══════════════════════════════════════════════════════════════

    describe('P14.3: Billing Scope Aggregation', () => {
        it('TOOTH-scoped codes (BEMA_13c) are kept for different teeth', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [fuellung16Segment, fuellung15Segment],
                executionOrder: 'sequential',
                context,
            };

            const result = await runMultiTreatment(plan);

            // TOOTH-scoped: BEMA_13c should appear twice (different teeth)
            const bema13cCodes = result.billingCodes.filter(bc => bc.code === 'BEMA_13c');
            expect(bema13cCodes.length).toBe(2);

            // Verify they have different teeth
            const teeth = bema13cCodes.map(bc => bc.tooth).filter(Boolean);
            expect(teeth).toContain('16');
            expect(teeth).toContain('15');
        });

        it('SESSION-scoped codes (BEMA_40) are deduped to one', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [fuellung16Segment, fuellung15Segment],
                executionOrder: 'sequential',
                context,
            };

            const result = await runMultiTreatment(plan);

            // SESSION-scoped: BEMA_40 should appear only once
            const bema40Codes = result.billingCodes.filter(bc => bc.code === 'BEMA_40');
            expect(bema40Codes.length).toBe(1);
        });

        it('billing codes include tooth and scope metadata', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [fuellung16Segment],
                executionOrder: 'sequential',
                context,
            };

            const result = await runMultiTreatment(plan);

            // Check that billing codes have P14.3 metadata
            const bema13c = result.billingCodes.find(bc => bc.code === 'BEMA_13c');
            expect(bema13c).toBeDefined();
            expect(bema13c?.tooth).toBe('16');
            expect(bema13c?.scope).toBe('TOOTH');

            const bema40 = result.billingCodes.find(bc => bc.code === 'BEMA_40');
            expect(bema40).toBeDefined();
            expect(bema40?.scope).toBe('SESSION');
        });

        it('aggregatedState is output when all segments complete', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [fuellung16Segment, fuellung15Segment],
                executionOrder: 'sequential',
                context,
            };

            const result = await runMultiTreatment(plan);

            expect(result.aggregatedState).toBe('output');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // P14.1: Segment Answer Isolation
    // ═══════════════════════════════════════════════════════════════

    describe('P14.1: Segment Answer Isolation', () => {
        it('each segment receives its own answers map in pipeline input', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [fuellung16Segment, fuellung15Segment],
                executionOrder: 'sequential',
                context,
            };

            await runMultiTreatment(plan);

            // Verify pipeline was called twice with different answers
            const calls = (mockRun as ReturnType<typeof vi.fn>).mock.calls;
            expect(calls.length).toBe(2);

            // First call should have seg-fuellung-16's answers
            const call1Answers = calls[0][0].answers;
            expect(call1Answers.get('isolation')).toBe('kofferdam');

            // Second call should have seg-fuellung-15's answers
            const call2Answers = calls[1][0].answers;
            expect(call2Answers.get('isolation')).toBe('relativ');
        });

        it('perTreatmentBundles contains bundles keyed by segment ID', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [fuellung16Segment, fuellung15Segment],
                executionOrder: 'sequential',
                context,
            };

            const result = await runMultiTreatment(plan);

            // Should have bundles for both segments
            expect(result.perTreatmentBundles['seg-fuellung-16']).toBeDefined();
            expect(result.perTreatmentBundles['seg-fuellung-15']).toBeDefined();
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // P14.3: Cross-segment conflict detection
    // ═══════════════════════════════════════════════════════════════

    describe('P14.3: Conflict Detection', () => {
        it('SESSION duplicates across segments are flagged as conflicts', async () => {
            const plan: MultiTreatmentPlan = {
                segments: [fuellung16Segment, fuellung15Segment],
                executionOrder: 'sequential',
                context,
            };

            const result = await runMultiTreatment(plan);

            // BEMA_40 appears in both segments → should flag conflict
            const bema40Conflict = result.conflicts.find(
                c => c.codes.includes('BEMA_40') && c.type === 'duplicate'
            );
            expect(bema40Conflict).toBeDefined();
            expect(bema40Conflict?.segments).toContain('seg-fuellung-16');
            expect(bema40Conflict?.segments).toContain('seg-fuellung-15');
        });
    });
});
