import { describe, it, expect } from 'vitest';
import { getBundleMetaForTreatment } from '../../procedure/bundleMeta';
import { getBillingDbTreatment } from '../../billing/billingDb';

const getBundleBillingIds = (treatmentId: string): Set<string> => {
    const meta = getBundleMetaForTreatment(treatmentId);
    const ids = new Set<string>();
    for (const bundle of meta?.bundles ?? []) {
        for (const id of bundle.billingRefIds ?? []) {
            if (id) ids.add(String(id));
        }
    }
    return ids;
};

describe('Bundle meta billing coverage', () => {
    const treatments = ['fuellung', 'endo', 'extraction', 'pzr', 'crown_prep'];

    it('covers all BillingDB billing chips per treatment', () => {
        for (const treatmentId of treatments) {
            const billingDb = getBillingDbTreatment(treatmentId);
            const billingChipIds = new Set<string>([
                ...Object.keys(billingDb?.billingRefs ?? {}),
                ...(billingDb?.surfaceMappedChips ?? []),
            ]);
            const bundleBillingIds = getBundleBillingIds(treatmentId);
            const missing = Array.from(billingChipIds).filter(id => !bundleBillingIds.has(id));
            if (missing.length > 0) {
                console.log(`[AUDIT] ${treatmentId} missing billingRefIds:`, missing);
            }
            expect(missing).toEqual([]);
        }
    });
});
