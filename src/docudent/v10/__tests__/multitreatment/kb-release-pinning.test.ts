import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../pipeline/runV10', () => ({
    runV10: vi.fn(),
}));

import { runV10 } from '../../pipeline/runV10';
import { runV10Bundle } from '../../multitreatment/runV10Bundle';

function makeQuestionResult(kbReleaseId?: string) {
    const question = {
        id: 'q1',
        questionKey: 'q1',
        category: 'forensic',
        question: 'Frage?',
        type: 'single',
        options: [{ id: 'ja', label: 'Ja', dataValue: 'ja' }],
        medicalSeverity: 'hard',
    };
    return {
        state: 'questions' as const,
        questions: [question],
        questionsBundle: {
            required: [question],
            optionalVisible: [],
            optionalHidden: [],
            optionalTotal: 0,
            docMode: 'balanced',
        },
        meta: {
            engineUsed: 'v10' as const,
            instanceCount: 1,
            multiInstance: false,
            kbReleaseId,
        },
    };
}

describe('Multi-treatment KB release pinning', () => {
    beforeEach(() => {
        vi.mocked(runV10).mockReset();
    });

    it('pins subsequent segment calls to first resolved release when not explicitly passed', async () => {
        vi.mocked(runV10)
            .mockResolvedValueOnce(makeQuestionResult('kb-auto-1') as any)
            .mockResolvedValueOnce(makeQuestionResult('kb-auto-1') as any);

        await runV10Bundle({
            dictation: 'Test',
            segments: [
                {
                    segmentId: 's1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'kurz',
                    instances: [{ instanceId: 'i1', tooth: '16' }],
                },
                {
                    segmentId: 's2',
                    treatmentId: 'endo',
                    insuranceType: 'GKV',
                    textLength: 'kurz',
                    instances: [{ instanceId: 'i2', tooth: '26' }],
                },
            ],
        });

        const firstArg = vi.mocked(runV10).mock.calls[0]?.[0] as any;
        const secondArg = vi.mocked(runV10).mock.calls[1]?.[0] as any;

        expect(firstArg.kbReleaseId).toBeUndefined();
        expect(secondArg.kbReleaseId).toBe('kb-auto-1');
    });

    it('uses explicit bundle kbReleaseId for all segment calls', async () => {
        vi.mocked(runV10)
            .mockResolvedValueOnce(makeQuestionResult('kb-explicit-7') as any)
            .mockResolvedValueOnce(makeQuestionResult('kb-explicit-7') as any);

        await runV10Bundle({
            dictation: 'Test',
            kbReleaseId: 'kb-explicit-7',
            segments: [
                {
                    segmentId: 's1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'kurz',
                    instances: [{ instanceId: 'i1', tooth: '16' }],
                },
                {
                    segmentId: 's2',
                    treatmentId: 'endo',
                    insuranceType: 'GKV',
                    textLength: 'kurz',
                    instances: [{ instanceId: 'i2', tooth: '26' }],
                },
            ],
        });

        const callArgs = vi.mocked(runV10).mock.calls.map(call => (call[0] as any).kbReleaseId);
        expect(callArgs).toEqual(['kb-explicit-7', 'kb-explicit-7']);
    });
});
