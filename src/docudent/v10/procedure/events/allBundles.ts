import type { ClinicalEventBundle } from './types';
import { commonEventBundles } from './common';
import { crownPrepAskbackBundles, crownPrepBundles } from './crown_prep';
import { endoAskbackBundles, endoBundles, endoStrictEvidenceBundles } from './endo';
import { extractionAskbackBundles, extractionBundles } from './extraction';
import { fissurenversiegelungAskbackBundles, fissurenversiegelungBundles } from './fissurenversiegelung';
import {
    fuellungBaselineBundles,
    fuellungCappingBundles,
    fuellungAskbackBundles,
    fuellungStrictEvidenceBundles,
    fuellungMaterialDetailBundles,
    fuellungTechniqueBundles,
} from './fuellung';
import { kroneAskbackBundles, kroneBundles } from './krone';
import { brueckeAskbackBundles, brueckeBundles } from './bruecke';
import { teilkroneAskbackBundles, teilkroneBundles } from './teilkrone';
import { wsrAskbackBundles, wsrBundles } from './wsr';
import { traumaAskbackBundles, traumaBundles } from './trauma';
import { implantAskbackBundles, implantBundles } from './implant';
import { schieneAskbackBundles, schieneBundles } from './schiene';
import { teilprotheseAskbackBundles, teilprotheseBundles } from './teilprothese';
import { totalprotheseAskbackBundles, totalprotheseBundles } from './totalprothese';
import { parodontologieAskbackBundles, parodontologieBundles } from './parodontologie';
import { pzrAskbackBundles, pzrBundles } from './pzr';
import { roentgenAskbackBundles, roentgenBundles } from './roentgen';
import { untersuchungAskbackBundles, untersuchungBundles } from './untersuchung';
import { uptAskbackBundles, uptBundles } from './upt';
import { ueberkappungAskbackBundles, ueberkappungBundles } from './ueberkappung';

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
    ...kroneBundles,
    ...kroneAskbackBundles,
    ...brueckeBundles,
    ...brueckeAskbackBundles,
    ...teilkroneBundles,
    ...teilkroneAskbackBundles,
    ...wsrBundles,
    ...wsrAskbackBundles,
    ...traumaBundles,
    ...traumaAskbackBundles,
    ...implantBundles,
    ...implantAskbackBundles,
    ...schieneBundles,
    ...schieneAskbackBundles,
    ...teilprotheseBundles,
    ...teilprotheseAskbackBundles,
    ...totalprotheseBundles,
    ...totalprotheseAskbackBundles,
    ...parodontologieBundles,
    ...parodontologieAskbackBundles,
    ...uptBundles,
    ...uptAskbackBundles,
    ...fissurenversiegelungBundles,
    ...fissurenversiegelungAskbackBundles,
    ...ueberkappungBundles,
    ...ueberkappungAskbackBundles,
    ...untersuchungBundles,
    ...untersuchungAskbackBundles,
    ...roentgenBundles,
    ...roentgenAskbackBundles,
];

export const eventBundleIds = new Set(allEventBundles.map(bundle => bundle.id));
