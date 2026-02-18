import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { teilkroneScenarios } from './scenarios';
import { teilkroneCombinabilityGoldens } from './combinability';
import { teilkroneUiContract } from './ui.contract';

export function createTeilkronePack(): TreatmentPack {
    return {
        id: 'teilkrone',
        version: '1.0.0',
        meta: {
            label: 'Teilkrone',
            description: 'Definitive oder provisorische Teilkronenversorgung',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('teilkrone');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return teilkroneScenarios;
        },

        getCombinabilityGoldens() {
            return teilkroneCombinabilityGoldens;
        },

        getUiContract() {
            return teilkroneUiContract;
        },
    };
}
