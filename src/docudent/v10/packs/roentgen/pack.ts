import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { roentgenScenarios } from './scenarios';
import { roentgenCombinabilityGoldens } from './combinability';
import { roentgenUiContract } from './ui.contract';

export function createRoentgenPack(): TreatmentPack {
    return {
        id: 'roentgen',
        version: '1.0.0',
        meta: {
            label: 'Roentgen',
            description: 'Roentgenaufnahmen (Einzelzahn/OPG)',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('roentgen');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return roentgenScenarios;
        },

        getCombinabilityGoldens() {
            return roentgenCombinabilityGoldens;
        },

        getUiContract() {
            return roentgenUiContract;
        },
    };
}
