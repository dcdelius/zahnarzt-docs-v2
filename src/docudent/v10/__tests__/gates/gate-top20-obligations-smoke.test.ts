import { describe, expect, it } from 'vitest';

import { UI_SELECTOR_TREATMENT_IDS } from '@/docudent/contracts/treatments.manifest';
import { runV10 } from '@/docudent/v10/pipeline/runV10';
import { TOP20_SMOKE_CASES } from '../helpers/top20SmokeCases';

describe('Gate: top20 obligations smoke coverage', () => {
    it('top20 smoke matrix must equal UI selector treatment list', () => {
        const fromCases = TOP20_SMOKE_CASES.map(testCase => testCase.treatmentId).sort();
        const fromSelector = [...UI_SELECTOR_TREATMENT_IDS].sort();
        expect(fromCases).toEqual(fromSelector);
    });

    it('every top20 treatment yields obligations meta in pipeline', async () => {
        for (const testCase of TOP20_SMOKE_CASES) {
            const result = await runV10({
                dictation: testCase.dictation,
                treatmentId: testCase.treatmentId,
                insuranceType: testCase.insuranceType,
                textLength: 'mittel',
                answers: new Map(),
            });

            expect(result.state).not.toBe('error');
            expect(result.meta.clinicalObligations).toBeDefined();
            expect(
                result.meta.clinicalObligations?.checks.some(
                    check => check.treatmentId === testCase.treatmentId
                )
            ).toBe(true);
        }
    });
});
