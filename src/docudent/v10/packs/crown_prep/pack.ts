/**
 * Crown prep Treatment Pack (minimal).
 */

import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { crownPrepScenarios } from './scenarios';
import { crownPrepCombinabilityGoldens } from './combinability';
import { crownPrepUiContract } from './ui.contract';

export function createCrownPrepPack(): TreatmentPack {
    return {
        id: 'crown_prep',
        version: '1.0.0',
        meta: {
            label: 'Kronenpr\u00e4paration',
            description: 'Pr\u00e4paration, Abformung, Provisorium',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('crown_prep');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return crownPrepScenarios;
        },

        getCombinabilityGoldens() {
            return crownPrepCombinabilityGoldens;
        },

        getUiContract() {
            return crownPrepUiContract;
        },
    };
}
