import type { ClinicalEventBundle } from './types';
import { commonEventBundles } from './common';
import { crownPrepAskbackBundles, crownPrepBundles } from './crown_prep';
import { endoAskbackBundles, endoBundles, endoStrictEvidenceBundles } from './endo';
import { extractionAskbackBundles, extractionBundles } from './extraction';
import {
    fuellungBaselineBundles,
    fuellungCappingBundles,
    fuellungAskbackBundles,
    fuellungStrictEvidenceBundles,
    fuellungMaterialDetailBundles,
    fuellungTechniqueBundles,
} from './fuellung';
import { pzrAskbackBundles, pzrBundles } from './pzr';

export const allEventBundles: ClinicalEventBundle[] = [
    ...commonEventBundles,
    ...fuellungBaselineBundles,
    ...fuellungMaterialDetailBundles,
    ...fuellungTechniqueBundles,
    ...fuellungCappingBundles,
    ...fuellungAskbackBundles,
    ...fuellungStrictEvidenceBundles,
    ...endoBundles,
    ...endoAskbackBundles,
    ...endoStrictEvidenceBundles,
    ...extractionBundles,
    ...extractionAskbackBundles,
    ...pzrBundles,
    ...pzrAskbackBundles,
    ...crownPrepBundles,
    ...crownPrepAskbackBundles,
];

export const eventBundleIds = new Set(allEventBundles.map(bundle => bundle.id));
