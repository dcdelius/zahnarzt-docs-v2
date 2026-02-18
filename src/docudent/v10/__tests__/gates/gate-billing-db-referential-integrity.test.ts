import { describe, expect, it } from 'vitest';

import billingDbJson from '@/docudent/core/billing/billing_db/billing_db.v1.json';
import { normalizeBillingRefId } from '@/docudent/core/billing/billingRefNormalization';
import { hasBillingCatalogEntry } from '@/docudent/v10/billing/billingCatalog';

type BillingDbShape = {
    treatments?: Record<string, {
        billingRefs?: Record<string, { GKV?: string; PKV?: string; MKV?: string; MKV_addon?: string }>;
        surfaceMapping?: Record<string, { GKV?: string; PKV?: string; MKV?: string; MKV_addon?: string }>;
    }>;
};

describe('Gate: billing DB referential integrity', () => {
    const billingDb = billingDbJson as BillingDbShape;

    it('all billing_db code refs resolve in catalog lookup', () => {
        const unresolved: Array<{ treatmentId: string; location: string; code: string }> = [];

        for (const [treatmentId, treatment] of Object.entries(billingDb.treatments ?? {})) {
            for (const [chipId, branches] of Object.entries(treatment.billingRefs ?? {})) {
                for (const [branch, rawCode] of Object.entries(branches ?? {})) {
                    if (!rawCode) continue;
                    const code = normalizeBillingRefId(rawCode);
                    if (!hasBillingCatalogEntry(code)) {
                        unresolved.push({ treatmentId, location: `billingRefs.${chipId}.${branch}`, code });
                    }
                }
            }

            for (const [surfaceKey, branches] of Object.entries(treatment.surfaceMapping ?? {})) {
                for (const [branch, rawCode] of Object.entries(branches ?? {})) {
                    if (!rawCode) continue;
                    const code = normalizeBillingRefId(rawCode);
                    if (!hasBillingCatalogEntry(code)) {
                        unresolved.push({ treatmentId, location: `surfaceMapping.${surfaceKey}.${branch}`, code });
                    }
                }
            }
        }

        expect(unresolved).toEqual([]);
    });
});
