import { describe, expect, it } from 'vitest';

import { runV10Bundle } from '../../pipeline/runV10Bundle';

describe('runV10Bundle requireLlmExtraction propagation', () => {
    it('returns error when llm extraction is required but unavailable', async () => {
        const result = await runV10Bundle({
            requireLlmExtraction: true,
            segments: [
                {
                    segmentId: 's1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    dictation: 'Zahn 36 okklusal Kompositfüllung.',
                    instances: [{ instanceId: 'i1', tooth: '36' }],
                },
            ],
        });

        expect(result.state).toBe('error');
        expect(result.error).toContain('LLM extraction required');
    });
});

