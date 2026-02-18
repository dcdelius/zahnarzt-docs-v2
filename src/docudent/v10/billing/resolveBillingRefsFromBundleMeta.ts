import { resolveSurfaceBilling } from './surfaceBillingResolver';
import { getBillingDbTreatment } from './billingDb';
import { normalizeBillingRefId } from '../../core/billing/billingRefNormalization';

export interface ResolveBillingRefsInput {
    treatmentId: string;
    chipIds: string[];
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    surfaces?: string[];
    tooth?: string;
    mehrkostenConfirmed?: boolean;
}

export function resolveBillingRefsFromBundleMeta(input: ResolveBillingRefsInput): string[] {
    if (!input.chipIds || input.chipIds.length === 0) {
        return [];
    }

    const db = getBillingDbTreatment(input.treatmentId);
    if (!db) return [];

    const codes = new Set<string>();
    const addCode = (code?: string) => {
        if (!code) return;
        codes.add(normalizeBillingRefId(code));
    };
    const surfaceMapped = new Set(db.surfaceMappedChips ?? []);
    const mehrkostenConfirmed = input.mehrkostenConfirmed === true;

    for (const chipId of input.chipIds) {
        if (surfaceMapped.has(chipId)) {
            const surfaceResult = resolveSurfaceBilling(
                db.surfaceMapping,
                { surfaces: input.surfaces ?? [] },
                input.insuranceType
            );
            if (surfaceResult?.billingCode) {
                addCode(surfaceResult.billingCode);
            }
            if (input.insuranceType === 'MKV' && mehrkostenConfirmed && surfaceResult?.addonCode) {
                addCode(surfaceResult.addonCode);
            }
            continue;
        }

        const ref = db.billingRefs?.[chipId];
        if (!ref) continue;

        if (input.insuranceType === 'MKV') {
            if (ref.MKV && mehrkostenConfirmed) {
                addCode(ref.MKV);
            } else if (ref.GKV) {
                addCode(ref.GKV);
            } else if (ref.PKV && mehrkostenConfirmed) {
                addCode(ref.PKV);
            }
            continue;
        }

        const direct = ref[input.insuranceType];
        if (direct) {
            addCode(direct);
        }
    }

    return Array.from(codes);
}
