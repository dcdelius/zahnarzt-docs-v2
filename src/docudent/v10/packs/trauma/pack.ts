import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { traumaScenarios } from './scenarios';
import { traumaCombinabilityGoldens } from './combinability';
import { traumaUiContract } from './ui.contract';

export function createTraumaPack(): TreatmentPack {
    return {
        id: 'trauma',
        version: '1.0.0',
        meta: {
            label: 'Trauma',
            description: 'Akutversorgung von Zahntrauma mit Schienungsdokumentation',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('trauma');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return traumaScenarios;
        },

        getCombinabilityGoldens() {
            return traumaCombinabilityGoldens;
        },

        getUiContract() {
            return traumaUiContract;
        },
    };
}
