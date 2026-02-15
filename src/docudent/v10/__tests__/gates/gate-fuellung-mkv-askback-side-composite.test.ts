import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

describe('Gate: MKV askback for side-tooth composite (GKV)', () => {
    it('does not hard-error and stays GKV (no MKV askback)', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 MO Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o'],
                    materialMentioned: 'komposit',
                    cariesDepth: 'normal',
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        expect(result.output.billingCodes.some(code => code.startsWith('GOZ_'))).toBe(false);
    });
});
