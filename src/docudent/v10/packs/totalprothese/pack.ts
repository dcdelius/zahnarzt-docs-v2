import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { totalprotheseScenarios } from './scenarios';
import { totalprotheseCombinabilityGoldens } from './combinability';
import { totalprotheseUiContract } from './ui.contract';

export function createTotalprothesePack(): TreatmentPack {
    return {
        id: 'totalprothese',
        version: '1.0.0',
        meta: {
            label: 'Totalprothese',
            description: 'Konventionelle oder Immediat-Totalprothese',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('totalprothese');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return totalprotheseScenarios;
        },

        getCombinabilityGoldens() {
            return totalprotheseCombinabilityGoldens;
        },

        getUiContract() {
            return totalprotheseUiContract;
        },
    };
}
