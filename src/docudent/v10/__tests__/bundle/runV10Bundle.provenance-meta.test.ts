import { describe, expect, it } from 'vitest';
import { runV10Bundle } from '../../pipeline/runV10Bundle';

describe('runV10Bundle provenance meta', () => {
    it('always emits provenance envelope on non-error bundle results', async () => {
        const result = await runV10Bundle({
            dictation: 'Fuellung Zahn 36 okklusal mit Komposit unter Kofferdam.',
            segments: [
                {
                    segmentId: 'seg-1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    dictation: 'Fuellung Zahn 36 okklusal mit Komposit unter Kofferdam.',
                    instances: [{ instanceId: 'inst-36', tooth: '36' }],
                },
            ],
        });

        expect(result.state).not.toBe('error');
        expect(result.meta.provenance).toBeDefined();
        expect(Array.isArray(result.meta.provenance?.factSources)).toBe(true);
        if (result.state === 'output') {
            for (const code of result.output.billingCodes) {
                expect(code.instanceId).toBeTruthy();
            }
        }
    });
});
