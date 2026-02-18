import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { uptScenarios } from './scenarios';
import { uptCombinabilityGoldens } from './combinability';
import { uptUiContract } from './ui.contract';

export function createUptPack(): TreatmentPack {
    return {
        id: 'upt',
        version: '1.0.0',
        meta: {
            label: 'UPT',
            description: 'Unterstuetzende Parodontitistherapie',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('upt');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return uptScenarios;
        },

        getCombinabilityGoldens() {
            return uptCombinabilityGoldens;
        },

        getUiContract() {
            return uptUiContract;
        },
    };
}
