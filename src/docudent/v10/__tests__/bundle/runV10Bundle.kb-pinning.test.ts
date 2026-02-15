import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../pipeline/runV10', () => ({
    runV10: vi.fn(),
}));

import { runV10 } from '../../pipeline/runV10';
import { runV10Bundle } from '../../pipeline/runV10Bundle';

function makeOutput(kbReleaseId?: string) {
    return {
        state: 'output' as const,
        output: {
            fullText: 'ok',
            billingCodes: ['BEMA_13'],
        },
        meta: {
            engineUsed: 'v10' as const,
            instanceCount: 1,
            multiInstance: false,
            kbReleaseId,
        },
        review: {
            instances: [
                {
                    instanceId: 'inst',
                    treatmentId: 'fuellung',
                    tooth: '36',
                    teeth: ['36'],
                    facts: {},
                    extractedSummary: { tooth: '36', surfaces: ['o'], diagnosis: null },
                    standardChipIds: [],
                    factSources: { surfaces: 'dictation' },
                },
            ],
        },
        trace: {
            instances: [],
            allRuleHits: [],
            allChips: [],
            finalBillingCodes: ['BEMA_13'],
        },
    };
}

describe('pipeline runV10Bundle KB pinning', () => {
    beforeEach(() => {
        vi.mocked(runV10).mockReset();
    });

    it('pins later instance calls to first resolved kbReleaseId', async () => {
        vi.mocked(runV10)
            .mockResolvedValueOnce(makeOutput('kb-first') as any)
            .mockResolvedValueOnce(makeOutput('kb-first') as any);

        await runV10Bundle({
            dictation: 'test',
            segments: [
                {
                    segmentId: 'seg-1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'kurz',
                    instances: [{ instanceId: 'inst-1', tooth: '36' }],
                },
                {
                    segmentId: 'seg-2',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'kurz',
                    instances: [{ instanceId: 'inst-2', tooth: '37' }],
                },
            ],
        });

        const firstArg = vi.mocked(runV10).mock.calls[0]?.[0] as any;
        const secondArg = vi.mocked(runV10).mock.calls[1]?.[0] as any;

        expect(firstArg.kbReleaseId).toBeUndefined();
        expect(secondArg.kbReleaseId).toBe('kb-first');
    });

    it('respects explicit kbReleaseId on all calls', async () => {
        vi.mocked(runV10)
            .mockResolvedValueOnce(makeOutput('kb-explicit') as any)
            .mockResolvedValueOnce(makeOutput('kb-explicit') as any);

        await runV10Bundle({
            dictation: 'test',
            kbReleaseId: 'kb-explicit',
            segments: [
                {
                    segmentId: 'seg-1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'kurz',
                    instances: [{ instanceId: 'inst-1', tooth: '36' }],
                },
                {
                    segmentId: 'seg-2',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'kurz',
                    instances: [{ instanceId: 'inst-2', tooth: '37' }],
                },
            ],
        });

        const callArgs = vi.mocked(runV10).mock.calls.map(call => (call[0] as any).kbReleaseId);
        expect(callArgs).toEqual(['kb-explicit', 'kb-explicit']);
    });
});
