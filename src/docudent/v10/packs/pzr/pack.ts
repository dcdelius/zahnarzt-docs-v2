/**
 * PZR Treatment Pack (minimal).
 */

import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { pzrScenarios } from './scenarios';
import { pzrCombinabilityGoldens } from './combinability';
import { pzrUiContract } from './ui.contract';

export function createPzrPack(): TreatmentPack {
    return {
        id: 'pzr',
        version: '1.0.0',
        meta: {
            label: 'PZR',
            description: 'Professionelle Zahnreinigung',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('pzr');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return pzrScenarios;
        },

        getCombinabilityGoldens() {
            return pzrCombinabilityGoldens;
        },

        getUiContract() {
            return pzrUiContract;
        },
    };
}
