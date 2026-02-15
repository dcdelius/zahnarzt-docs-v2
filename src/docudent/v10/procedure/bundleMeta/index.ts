import type { BundleMetaRegistry, EventBundleMeta } from './types';

import commonBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/common.json';
import crownPrepBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/crown_prep.json';
import endoBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/endo.json';
import extractionBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/extraction.json';
import fuellungBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/fuellung.json';
import pzrBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/pzr.json';

type BundleMetaConfig = {
    _meta?: { id?: string; version?: string; treatmentId?: string };
    bundles?: EventBundleMeta[];
};

const commonConfig = commonBundles as BundleMetaConfig;
const treatmentConfigs: Record<string, BundleMetaConfig> = {
    fuellung: fuellungBundles as BundleMetaConfig,
    endo: endoBundles as BundleMetaConfig,
    extraction: extractionBundles as BundleMetaConfig,
    pzr: pzrBundles as BundleMetaConfig,
    crown_prep: crownPrepBundles as BundleMetaConfig,
};

const mergeBundles = (
    base: EventBundleMeta[] | undefined = [],
    overrides: EventBundleMeta[] | undefined = []
): EventBundleMeta[] => {
    const map = new Map((base ?? []).map(bundle => [bundle.id, bundle]));
    for (const bundle of overrides ?? []) {
        map.set(bundle.id, bundle);
    }
    return Array.from(map.values());
};

export function getBundleMetaForTreatment(treatmentId: string): BundleMetaRegistry | undefined {
    const config = treatmentConfigs[treatmentId];
    if (!config) return undefined;
    return {
        treatmentId,
        bundles: mergeBundles(commonConfig.bundles, config.bundles),
    };
}

export function getBundleMetaMap(treatmentId: string): Map<string, EventBundleMeta> | undefined {
    const registry = getBundleMetaForTreatment(treatmentId);
    if (!registry) return undefined;
    return new Map(registry.bundles.map(bundle => [bundle.id, bundle]));
}
