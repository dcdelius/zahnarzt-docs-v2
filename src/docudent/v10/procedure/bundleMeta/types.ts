export interface EventBundleMeta {
    id: string;
    chipIds?: string[];
    chipsFromContractKey?: string;
    textRefIds?: string[];
    billingRefIds?: string[];
    disclosureIds?: string[];
}

export interface BundleMetaRegistry {
    treatmentId: string;
    bundles: EventBundleMeta[];
}
