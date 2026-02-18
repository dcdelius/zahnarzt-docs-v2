import { describe, expect, it } from 'vitest';

import { runV10WithAutoAnswers } from '../helpers/runV10WithAutoAnswers';

describe('Gate: roentgen treatment emits radiology billing codes', () => {
    it('GKV roentgen flow emits at least one radiology code', async () => {
        const result = await runV10WithAutoAnswers({
            dictation: 'OPG zur Diagnostik erstellt, Befund dokumentiert.',
            treatmentId: 'roentgen',
            insuranceType: 'GKV',
            textLength: 'kurz',
            answers: new Map(),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const codes = result.output.billingCodes.map(code => code.toUpperCase());
        expect(codes.length).toBeGreaterThan(0);
        expect(
            codes.some(code =>
                code === 'BEMA_Ä925A'
                || code === 'BEMA_Ä935D'
                || code === 'GOZ_5000'
                || code === 'GOZ_5004'
            )
        ).toBe(true);
    });
});
