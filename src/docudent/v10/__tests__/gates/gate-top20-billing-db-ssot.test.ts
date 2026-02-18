import { describe, expect, it } from 'vitest';

import billingDbJson from '@/docudent/core/billing/billing_db/billing_db.v1.json';
import { normalizeBillingRefId } from '@/docudent/core/billing/billingRefNormalization';
import { runV10WithAutoAnswers } from '../helpers/runV10WithAutoAnswers';
import { TOP20_SMOKE_CASES } from '../helpers/top20SmokeCases';

type BillingDbShape = {
    treatments?: Record<string, {
        billingRefs?: Record<string, { GKV?: string; PKV?: string; MKV?: string; MKV_addon?: string }>;
        surfaceMapping?: Record<string, { GKV?: string; PKV?: string; MKV?: string; MKV_addon?: string }>;
    }>;
};

function collectBillingDbCodes(db: BillingDbShape): Set<string> {
    const codes = new Set<string>();

    for (const treatment of Object.values(db.treatments ?? {})) {
        for (const branches of Object.values(treatment.billingRefs ?? {})) {
            for (const rawCode of Object.values(branches ?? {})) {
                if (!rawCode) continue;
                codes.add(normalizeBillingRefId(rawCode));
            }
        }

        for (const branches of Object.values(treatment.surfaceMapping ?? {})) {
            for (const rawCode of Object.values(branches ?? {})) {
                if (!rawCode) continue;
                codes.add(normalizeBillingRefId(rawCode));
            }
        }
    }

    return codes;
}

describe('Gate: top20 output billing must be billing_db-backed', () => {
    const billingDb = billingDbJson as BillingDbShape;
    const allowedCodes = collectBillingDbCodes(billingDb);

    it('top20 outputs only billing codes present in billing_db refs', async () => {
        const unknown: Array<{ treatmentId: string; code: string }> = [];

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
                if (!allowedCodes.has(code)) {
                    unknown.push({ treatmentId: testCase.treatmentId, code });
                }
            }
        }

        expect(unknown).toEqual([]);
    });
});
