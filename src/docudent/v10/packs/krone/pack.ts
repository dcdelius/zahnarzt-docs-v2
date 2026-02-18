import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { kroneScenarios } from './scenarios';
import { kroneCombinabilityGoldens } from './combinability';
import { kroneUiContract } from './ui.contract';

export function createKronePack(): TreatmentPack {
    return {
        id: 'krone',
        version: '1.0.0',
        meta: {
            label: 'Krone',
            description: 'Definitive oder provisorische Kronenversorgung',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('krone');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return kroneScenarios;
        },

        getCombinabilityGoldens() {
            return kroneCombinabilityGoldens;
        },

        getUiContract() {
            return kroneUiContract;
        },
    };
}
