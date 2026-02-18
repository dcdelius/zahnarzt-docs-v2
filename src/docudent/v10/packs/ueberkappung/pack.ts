import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { ueberkappungScenarios } from './scenarios';
import { ueberkappungCombinabilityGoldens } from './combinability';
import { ueberkappungUiContract } from './ui.contract';

export function createUeberkappungPack(): TreatmentPack {
    return {
        id: 'ueberkappung',
        version: '1.0.0',
        meta: {
            label: 'Ueberkappung',
            description: 'Direkte/indirekte Ueberkappung mit Materialdokumentation',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('ueberkappung');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return ueberkappungScenarios;
        },

        getCombinabilityGoldens() {
            return ueberkappungCombinabilityGoldens;
        },

        getUiContract() {
            return ueberkappungUiContract;
        },
    };
}
