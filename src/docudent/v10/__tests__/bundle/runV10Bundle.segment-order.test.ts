import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../pipeline/runV10', () => ({
    runV10: vi.fn(),
}));

import { runV10 } from '../../pipeline/runV10';
import { runV10Bundle } from '../../pipeline/runV10Bundle';

const mockRunV10 = vi.mocked(runV10);

function outputResult(fullText: string, billingCodes: string[]) {
    return {
        state: 'output' as const,
        output: {
            fullText,
            billingCodes,
        },
        meta: {
            kbReleaseId: 'kb-test',
        },
    };
}

describe('runV10Bundle output order', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('preserves segment order from bundle input', async () => {
        mockRunV10
            .mockResolvedValueOnce(outputResult('Segment Zahn 37', ['BEMA_13a']) as any)
            .mockResolvedValueOnce(outputResult('Segment Zahn 36', ['BEMA_13a']) as any);

        const result = await runV10Bundle({
            segments: [
                {
                    segmentId: 'seg-37',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    instances: [{ instanceId: 'inst-37', tooth: '37', dictation: 'Fuellung 37' }],
                },
                {
                    segmentId: 'seg-36',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    instances: [{ instanceId: 'inst-36', tooth: '36', dictation: 'Fuellung 36' }],
                },
            ],
        });

        expect(result.state).toBe('output');
        expect(result.output?.segments?.map(segment => segment.segmentId)).toEqual(['seg-37', 'seg-36']);
        expect(result.output?.fullText).toBe('Segment Zahn 37\n\nSegment Zahn 36');
    });

    it('preserves instance order from segment input', async () => {
        mockRunV10
            .mockResolvedValueOnce(outputResult('Instanz Zahn 37', ['BEMA_13a']) as any)
            .mockResolvedValueOnce(outputResult('Instanz Zahn 36', ['BEMA_13a']) as any);

        const result = await runV10Bundle({
            segments: [
                {
                    segmentId: 'seg-fuellung',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    instances: [
                        { instanceId: 'inst-37', tooth: '37', dictation: 'Fuellung 37 zuerst' },
                        { instanceId: 'inst-36', tooth: '36', dictation: 'Fuellung 36 danach' },
                    ],
                },
            ],
        });

        expect(result.state).toBe('output');
        expect(result.output?.segments?.[0]?.instanceOutputs.map(output => output.instanceId)).toEqual([
            'inst-37',
            'inst-36',
        ]);
        expect(result.output?.segments?.[0]?.text).toBe('Instanz Zahn 37\n\nInstanz Zahn 36');
    });
});
