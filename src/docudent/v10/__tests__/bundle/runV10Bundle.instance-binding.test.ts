import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../pipeline/runV10', () => ({
    runV10: vi.fn(),
}));

vi.mock('../../renderer', () => ({
    renderFromKbChips: vi.fn(() => ''),
    getChipFromKb: vi.fn(() => null),
}));

import { runV10 } from '../../pipeline/runV10';
import { runV10Bundle } from '../../pipeline/runV10Bundle';

const mockRunV10 = vi.mocked(runV10);

describe('runV10Bundle instance binding', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rebinds question instance ids to bundle instance ids and filters foreign-tooth questions', async () => {
        mockRunV10.mockResolvedValueOnce({
            state: 'questions',
            questions: [
                {
                    id: 'wound_care::tooth:16',
                    questionKey: 'wound_care',
                    question: 'Wundversorgung durchgeführt?',
                    medicalSeverity: 'hard',
                    type: 'single',
                    options: [{ id: 'ja', label: 'Ja' }],
                    instanceId: 'extraction-16-2',
                },
                {
                    id: 'wound_care::tooth:28',
                    questionKey: 'wound_care',
                    question: 'Wundversorgung durchgeführt?',
                    medicalSeverity: 'hard',
                    type: 'single',
                    options: [{ id: 'ja', label: 'Ja' }],
                    instanceId: 'extraction-28-1',
                },
            ],
            questionsBundle: {
                required: [
                    {
                        id: 'wound_care::tooth:16',
                        questionKey: 'wound_care',
                        question: 'Wundversorgung durchgeführt?',
                        medicalSeverity: 'hard',
                        type: 'single',
                        options: [{ id: 'ja', label: 'Ja' }],
                    },
                    {
                        id: 'wound_care::tooth:28',
                        questionKey: 'wound_care',
                        question: 'Wundversorgung durchgeführt?',
                        medicalSeverity: 'hard',
                        type: 'single',
                        options: [{ id: 'ja', label: 'Ja' }],
                    },
                ],
                optionalVisible: [],
                optionalHidden: [],
                optionalTotal: 0,
                docMode: 'balanced',
            },
            meta: {
                engineUsed: 'v10',
                instanceCount: 2,
                multiInstance: true,
                durations: { total: 0 },
            },
            trace: {
                runId: 't-1',
                steps: [],
                instances: [
                    {
                        tooth: '16',
                        extractedSummary: { tooth: '16', surfaces: [], diagnosis: null },
                        facts: {},
                        ruleHits: [],
                        askbacks: { required: [], optional: [] },
                        chips: [],
                        renderedChipIds: [],
                    },
                    {
                        tooth: '28',
                        extractedSummary: { tooth: '28', surfaces: [], diagnosis: null },
                        facts: {},
                        ruleHits: [],
                        askbacks: { required: [], optional: [] },
                        chips: [],
                        renderedChipIds: [],
                    },
                ],
                allChips: [],
                warnings: [],
            },
        } as any);

        const result = await runV10Bundle({
            dictation: 'Extraktion 28, Füllung 16',
            segments: [
                {
                    segmentId: 'seg-ext-28',
                    treatmentId: 'extraction',
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    instances: [{ instanceId: 'intent-ext-28', tooth: '28' }],
                },
            ],
        });
        expect(result.state).toBe('questions');
        expect(result.questions).toHaveLength(1);
        expect(result.questions?.[0]?.id).toBe('wound_care::tooth:28');
        expect(result.questions?.[0]?.instanceId).toBe('intent-ext-28');
    });

    it('uses per-instance output/billing for the requested bundle instance', async () => {
        mockRunV10.mockResolvedValueOnce({
            state: 'output',
            output: {
                fullText: 'Zahn 16 und Zahn 28 kombiniert',
                billingCodes: ['BEMA_43', 'BEMA_13a'],
                perInstance: {
                    'extraction-16-2': {
                        instanceId: 'extraction-16-2',
                        teeth: ['16'],
                        text: 'Zahn 16 Extraktion',
                        billingRefs: ['BEMA_13a'],
                        chips: ['chip-16'],
                    },
                    'extraction-28-1': {
                        instanceId: 'extraction-28-1',
                        teeth: ['28'],
                        text: 'Zahn 28 Extraktion',
                        billingRefs: ['BEMA_43'],
                        chips: ['chip-28'],
                    },
                },
            },
            meta: {
                engineUsed: 'v10',
                instanceCount: 2,
                multiInstance: true,
                durations: { total: 0 },
            },
            trace: {
                runId: 't-2',
                steps: [],
                instances: [],
                allChips: [],
                warnings: [],
            },
        } as any);

        const result = await runV10Bundle({
            dictation: 'Extraktion 28',
            segments: [
                {
                    segmentId: 'seg-ext-28',
                    treatmentId: 'extraction',
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    instances: [{ instanceId: 'intent-ext-28', tooth: '28' }],
                },
            ],
        });

        expect(result.state).toBe('output');
        expect(result.output?.segments?.[0]?.text).toContain('Zahn 28');
        expect(result.output?.segments?.[0]?.text).not.toContain('Zahn 16');
        const billed = result.output?.billingCodes ?? [];
        expect(billed).toHaveLength(1);
        expect(billed[0]).toMatchObject({
            code: 'BEMA_43',
            instanceId: 'intent-ext-28',
            tooth: '28',
        });
    });
});
