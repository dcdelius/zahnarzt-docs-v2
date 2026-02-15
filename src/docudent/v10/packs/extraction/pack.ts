/**
 * Extraction Treatment Pack (minimal).
 */

import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { extractionScenarios } from './scenarios';
import { extractionCombinabilityGoldens } from './combinability';
import { extractionUiContract } from './ui.contract';

export function createExtractionPack(): TreatmentPack {
    return {
        id: 'extraction',
        version: '1.0.0',
        meta: {
            label: 'Zahnextraktion',
            description: 'Zahnextraktion (einfach)',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('extraction');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return extractionScenarios;
        },

        getCombinabilityGoldens() {
            return extractionCombinabilityGoldens;
        },

        getUiContract() {
            return extractionUiContract;
        },
    };
}
