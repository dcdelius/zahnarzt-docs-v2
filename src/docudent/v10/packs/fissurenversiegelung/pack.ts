import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { fissurenversiegelungScenarios } from './scenarios';
import { fissurenversiegelungCombinabilityGoldens } from './combinability';
import { fissurenversiegelungUiContract } from './ui.contract';

export function createFissurenversiegelungPack(): TreatmentPack {
    return {
        id: 'fissurenversiegelung',
        version: '1.0.0',
        meta: {
            label: 'Fissurenversiegelung',
            description: 'Versiegelung kariesfreier Fissuren',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('fissurenversiegelung');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return fissurenversiegelungScenarios;
        },

        getCombinabilityGoldens() {
            return fissurenversiegelungCombinabilityGoldens;
        },

        getUiContract() {
            return fissurenversiegelungUiContract;
        },
    };
}
