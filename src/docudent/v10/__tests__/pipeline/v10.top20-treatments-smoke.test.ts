import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';
import { TOP20_SMOKE_CASES } from '../helpers/top20SmokeCases';

describe('V10 top-20 treatment smoke', () => {
    it.each(TOP20_SMOKE_CASES)('$treatmentId: pipeline runs with obligations meta', async (testCase) => {
        const result = await runV10({
            dictation: testCase.dictation,
            treatmentId: testCase.treatmentId,
            insuranceType: testCase.insuranceType,
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).not.toBe('error');
        expect(result.meta.clinicalObligations).toBeDefined();
        expect(result.meta.clinicalObligations?.checks.length).toBeGreaterThan(0);
        expect(
            result.meta.clinicalObligations?.checks.some(
                check => check.treatmentId === testCase.treatmentId
            )
        ).toBe(true);
    });
});
