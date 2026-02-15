// Deprecated: This file is a stub for backwards compatibility
// Real chip logic is now in behandlungen/_shared/engine.ts

export interface StandardApplicationResult {
    dataPatches: Record<string, any>;
    billingItems: any[];
}

/**
 * @deprecated Use resolveChipStates from behandlungen/_shared/engine.ts instead
 * This is a stub that returns empty results for backwards compatibility
 */
export function applyStandards({
    activeStandards,
    treatmentType,
    insuranceType = 'GKV'
}: {
    activeStandards: string[];
    treatmentType?: string;
    insuranceType?: string;
}): StandardApplicationResult {
    // Return empty - real logic is in behandlungen engine
    return {
        dataPatches: {},
        billingItems: []
    };
}
