import { describe, expect, it } from 'vitest';

import { runV10WithAutoAnswers } from '../helpers/runV10WithAutoAnswers';
import { TOP20_SMOKE_CASES } from '../helpers/top20SmokeCases';
import { hasBillingCatalogEntry } from '@/docudent/v10/billing/billingCatalog';
import { normalizeBillingRefId } from '@/docudent/core/billing/billingRefNormalization';

describe('Gate: top20 output billing codes must resolve in catalog', () => {
    it('top20 outputs only catalog-resolvable billing codes', async () => {
        const unresolved: Array<{ treatmentId: string; code: string }> = [];

        for (const testCase of TOP20_SMOKE_CASES) {
            const result = await runV10WithAutoAnswers({
                dictation: testCase.dictation,
                treatmentId: testCase.treatmentId,
                insuranceType: testCase.insuranceType,
                textLength: 'mittel',
                answers: new Map(),
            });

            if (result.state !== 'output') continue;

            for (const rawCode of result.output.billingCodes) {
                const code = normalizeBillingRefId(rawCode);
                if (!hasBillingCatalogEntry(code)) {
                    unresolved.push({ treatmentId: testCase.treatmentId, code });
                }
            }
        }

        expect(unresolved).toEqual([]);
    });
});
