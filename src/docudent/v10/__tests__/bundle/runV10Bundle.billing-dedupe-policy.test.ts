import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../pipeline/runV10', () => ({
    runV10: vi.fn(),
}));

vi.mock('../../renderer', () => ({
    renderFromKbChips: vi.fn(() => ''),
    getChipFromKb: vi.fn((_treatmentId: string, chipId: string) => {
        if (chipId === 'BEMA_40') {
            return { phase: 'anaesthesie' };
        }
        return null;
    }),
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

describe('runV10Bundle billing dedupe policy', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('keeps same-tooth billing code when emitted by two different instances', async () => {
        mockRunV10
            .mockResolvedValueOnce(outputResult('Inst A', ['BEMA_13a']) as any)
            .mockResolvedValueOnce(outputResult('Inst B', ['BEMA_13a']) as any);

        const result = await runV10Bundle({
            segments: [
                {
                    segmentId: 'seg-f-36',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    instances: [
                        { instanceId: 'inst-a', tooth: '36', dictation: 'Fuellung 36 erster Schritt' },
                        { instanceId: 'inst-b', tooth: '36', dictation: 'Fuellung 36 zweiter Schritt' },
                    ],
                },
            ],
        });

        expect(result.state).toBe('output');
        const billed = result.output?.billingCodes.filter(code => code.code === 'BEMA_13a') ?? [];
        expect(billed).toHaveLength(2);
        expect(billed.map(item => item.instanceId).sort()).toEqual(['inst-a', 'inst-b']);
    });

    it('still dedupes session-scoped codes across instances', async () => {
        mockRunV10
            .mockResolvedValueOnce(outputResult('Inst A', ['BEMA_40']) as any)
            .mockResolvedValueOnce(outputResult('Inst B', ['BEMA_40']) as any);

        const result = await runV10Bundle({
            segments: [
                {
                    segmentId: 'seg-f-36-37',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    instances: [
                        { instanceId: 'inst-a', tooth: '36', dictation: 'Fuellung 36' },
                        { instanceId: 'inst-b', tooth: '37', dictation: 'Fuellung 37' },
                    ],
                },
            ],
        });

        expect(result.state).toBe('output');
        const billed = result.output?.billingCodes.filter(code => code.code === 'BEMA_40') ?? [];
        expect(billed).toHaveLength(1);
        expect(billed[0].scope).toBe('SESSION');
    });
});
