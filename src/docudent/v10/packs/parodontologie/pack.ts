import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { parodontologieScenarios } from './scenarios';
import { parodontologieCombinabilityGoldens } from './combinability';
import { parodontologieUiContract } from './ui.contract';

export function createParodontologiePack(): TreatmentPack {
    return {
        id: 'parodontologie',
        version: '1.0.0',
        meta: {
            label: 'Parodontologie',
            description: 'Parodontalstatus, AIT und UPT-Dokumentation',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('parodontologie');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return parodontologieScenarios;
        },

        getCombinabilityGoldens() {
            return parodontologieCombinabilityGoldens;
        },

        getUiContract() {
            return parodontologieUiContract;
        },
    };
}
