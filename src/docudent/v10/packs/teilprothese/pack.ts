import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { teilprotheseScenarios } from './scenarios';
import { teilprotheseCombinabilityGoldens } from './combinability';
import { teilprotheseUiContract } from './ui.contract';

export function createTeilprothesePack(): TreatmentPack {
    return {
        id: 'teilprothese',
        version: '1.0.0',
        meta: {
            label: 'Teilprothese',
            description: 'Interimsteilprothese oder Modellgussprothese',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('teilprothese');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return teilprotheseScenarios;
        },

        getCombinabilityGoldens() {
            return teilprotheseCombinabilityGoldens;
        },

        getUiContract() {
            return teilprotheseUiContract;
        },
    };
}
