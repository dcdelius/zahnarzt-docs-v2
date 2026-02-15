import { describe, expect, it } from 'vitest';
import { runV10Bundle } from '../../pipeline/runV10Bundle';

describe('runV10Bundle output hash determinism', () => {
    it('returns the same outputHash for identical inputs', async () => {
        const input = {
            dictation: 'Fuellung 36 okklusal mit Komposit unter Kofferdam, Okklusion kontrolliert.',
            segments: [
                {
                    segmentId: 'seg-1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV' as const,
                    textLength: 'mittel' as const,
                    dictation: 'Fuellung 36 okklusal mit Komposit unter Kofferdam, Okklusion kontrolliert.',
                    instances: [{ instanceId: 'inst-36', tooth: '36' }],
                },
            ],
        };

        const a = await runV10Bundle(input);
        const b = await runV10Bundle(input);

        expect(a.state).toBe('output');
        expect(b.state).toBe('output');
        expect(a.meta.outputHash).toBeTruthy();
        expect(a.meta.outputHash).toBe(b.meta.outputHash);
    });
});
