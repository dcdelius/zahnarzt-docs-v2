import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { wsrScenarios } from './scenarios';
import { wsrCombinabilityGoldens } from './combinability';
import { wsrUiContract } from './ui.contract';

export function createWSRPack(): TreatmentPack {
    return {
        id: 'wsr',
        version: '1.0.0',
        meta: {
            label: 'WSR',
            description: 'Wurzelspitzenresektion mit dokumentiertem Zugang und Lokalisation',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('wsr');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return wsrScenarios;
        },

        getCombinabilityGoldens() {
            return wsrCombinabilityGoldens;
        },

        getUiContract() {
            return wsrUiContract;
        },
    };
}
