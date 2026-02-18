import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { schieneScenarios } from './scenarios';
import { schieneCombinabilityGoldens } from './combinability';
import { schieneUiContract } from './ui.contract';

export function createSchienePack(): TreatmentPack {
    return {
        id: 'schiene',
        version: '1.0.0',
        meta: {
            label: 'Schiene',
            description: 'Okklusions- und Protrusionsschienen mit Verlaufskontrolle',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('schiene');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return schieneScenarios;
        },

        getCombinabilityGoldens() {
            return schieneCombinabilityGoldens;
        },

        getUiContract() {
            return schieneUiContract;
        },
    };
}
