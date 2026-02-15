import type { SurfaceMapping } from './surfaceBillingResolver';

import billingDbJson from '@/docudent/core/billing/billing_db/billing_db.v1.json';

export type BillingRef = { GKV?: string; PKV?: string; MKV?: string };

export interface BillingDbTreatment {
    billingRefs: Record<string, BillingRef>;
    surfaceMappedChips: string[];
    surfaceMapping?: SurfaceMapping;
}

interface BillingDbConfig {
    _meta?: {
        id?: string;
        version?: string;
        source?: string;
    };
    treatments?: Record<string, BillingDbTreatment>;
}

const billingDb = billingDbJson as BillingDbConfig;

export const BILLING_DB: Record<string, BillingDbTreatment> = billingDb.treatments ?? {};

export function getBillingDbTreatment(treatmentId: string): BillingDbTreatment | undefined {
    return BILLING_DB[treatmentId];
}
