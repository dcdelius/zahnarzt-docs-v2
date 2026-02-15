import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../pipeline/runV10', () => ({
    runV10: vi.fn(),
}));

import { runV10 } from '../../pipeline/runV10';
import { runV10Bundle } from '../../multitreatment/runV10Bundle';

describe('Gate: multi-treatment aggregation is deterministic', () => {
    beforeEach(() => {
        vi.mocked(runV10).mockReset();
        vi.mocked(runV10).mockImplementation(async (input: any) => {
            const tooth = input.treatmentId === 'fuellung' ? '16' : '26';
            const code = input.treatmentId === 'fuellung' ? 'BEMA_13a' : 'BEMA_31';
            const instanceId = `${input.treatmentId}-${tooth}-1`;
            return {
                state: 'output',
                output: {
                    fullText: `[Dokumentation]\n${input.treatmentId} auf ${tooth}`,
                    billingCodes: [code],
                    perInstance: {
                        [instanceId]: {
                            instanceId,
                            teeth: [tooth],
                            text: `${input.treatmentId} auf ${tooth}`,
                            billingRefs: [code],
                            chips: [],
                        },
                    },
                    sections: [
                        {
                            id: 'dokumentation',
                            label: 'Dokumentation',
                            content: `${input.treatmentId} auf ${tooth}`,
                        },
                    ],
                },
                meta: {
                    engineUsed: 'v10',
                    instanceCount: 1,
                    multiInstance: false,
                },
            } as any;
        });
    });

    it('produces identical merged output for identical input (5 runs)', async () => {
        const input = {
            dictation: 'Test',
            segments: [
                {
                    segmentId: 's1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV' as const,
                    textLength: 'kurz' as const,
                    instances: [{ instanceId: 'i1', tooth: '16' }],
                },
                {
                    segmentId: 's2',
                    treatmentId: 'endo',
                    insuranceType: 'GKV' as const,
                    textLength: 'kurz' as const,
                    instances: [{ instanceId: 'i2', tooth: '26' }],
                },
            ],
        };

        const snapshots: string[] = [];
        for (let i = 0; i < 5; i += 1) {
            const result = await runV10Bundle(input);
            snapshots.push(JSON.stringify(result));
        }

        expect(new Set(snapshots).size).toBe(1);
    });
});
