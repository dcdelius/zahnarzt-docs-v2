import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { brueckeScenarios } from './scenarios';
import { brueckeCombinabilityGoldens } from './combinability';
import { brueckeUiContract } from './ui.contract';

export function createBrueckePack(): TreatmentPack {
    return {
        id: 'bruecke',
        version: '1.0.0',
        meta: {
            label: 'Bruecke',
            description: 'Definitive oder provisorische Brueckenversorgung',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('bruecke');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return brueckeScenarios;
        },

        getCombinabilityGoldens() {
            return brueckeCombinabilityGoldens;
        },

        getUiContract() {
            return brueckeUiContract;
        },
    };
}
