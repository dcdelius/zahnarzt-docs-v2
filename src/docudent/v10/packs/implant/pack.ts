import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { implantScenarios } from './scenarios';
import { implantCombinabilityGoldens } from './combinability';
import { implantUiContract } from './ui.contract';

export function createImplantPack(): TreatmentPack {
    return {
        id: 'implant',
        version: '1.0.0',
        meta: {
            label: 'Implant',
            description: 'Implantatinsertion/Freilegung mit strukturierter Nachsorge',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('implant');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return implantScenarios;
        },

        getCombinabilityGoldens() {
            return implantCombinabilityGoldens;
        },

        getUiContract() {
            return implantUiContract;
        },
    };
}
