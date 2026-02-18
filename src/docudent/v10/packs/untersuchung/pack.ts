import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { untersuchungScenarios } from './scenarios';
import { untersuchungCombinabilityGoldens } from './combinability';
import { untersuchungUiContract } from './ui.contract';

export function createUntersuchungPack(): TreatmentPack {
    return {
        id: 'untersuchung',
        version: '1.0.0',
        meta: {
            label: 'Untersuchung',
            description: 'Eingehende Untersuchung und Befunddokumentation',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('untersuchung');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return untersuchungScenarios;
        },

        getCombinabilityGoldens() {
            return untersuchungCombinabilityGoldens;
        },

        getUiContract() {
            return untersuchungUiContract;
        },
    };
}
