import type { BundleMetaRegistry, EventBundleMeta } from './types';

import commonBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/common.json';
import crownPrepBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/crown_prep.json';
import endoBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/endo.json';
import extractionBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/extraction.json';
import fissurenversiegelungBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/fissurenversiegelung.json';
import fuellungBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/fuellung.json';
import kroneBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/krone.json';
import brueckeBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/bruecke.json';
import teilkroneBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/teilkrone.json';
import wsrBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/wsr.json';
import traumaBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/trauma.json';
import implantBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/implant.json';
import schieneBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/schiene.json';
import teilprotheseBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/teilprothese.json';
import totalprotheseBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/totalprothese.json';
import parodontologieBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/parodontologie.json';
import pzrBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/pzr.json';
import roentgenBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/roentgen.json';
import uptBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/upt.json';
import untersuchungBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/untersuchung.json';
import ueberkappungBundles from '@/docudent/core/billing/knowledgeBase/event_bundles/ueberkappung.json';

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
    krone: kroneBundles as BundleMetaConfig,
    bruecke: brueckeBundles as BundleMetaConfig,
    teilkrone: teilkroneBundles as BundleMetaConfig,
    wsr: wsrBundles as BundleMetaConfig,
    trauma: traumaBundles as BundleMetaConfig,
    implant: implantBundles as BundleMetaConfig,
    schiene: schieneBundles as BundleMetaConfig,
    teilprothese: teilprotheseBundles as BundleMetaConfig,
    totalprothese: totalprotheseBundles as BundleMetaConfig,
    parodontologie: parodontologieBundles as BundleMetaConfig,
    upt: uptBundles as BundleMetaConfig,
    fissurenversiegelung: fissurenversiegelungBundles as BundleMetaConfig,
    ueberkappung: ueberkappungBundles as BundleMetaConfig,
    untersuchung: untersuchungBundles as BundleMetaConfig,
    roentgen: roentgenBundles as BundleMetaConfig,
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
