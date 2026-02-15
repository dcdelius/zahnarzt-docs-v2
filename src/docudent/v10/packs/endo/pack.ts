/**
 * M18: Endo Treatment Pack
 *
 * Bundles all assets for endodontic (Endo) treatment.
 */

import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { buildEndoFacts, applyEndoAnswersToFacts } from './facts';
import { endoScenarios } from './scenarios';
import { endoCombinabilityGoldens } from './combinability';
import { endoExtractionHints } from './extraction';
import { endoCoverageConfig } from './coverage';
import { endoUiContract } from './ui.contract';

/**
 * Create the Endo treatment pack.
 */
export function createEndoPack(): TreatmentPack {
    return {
        id: 'endo',
        version: '1.0.0',
        meta: {
            label: 'Endo',
            description: 'Root canal treatment',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('endo');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return endoScenarios;
        },

        getCombinabilityGoldens() {
            return endoCombinabilityGoldens;
        },

        getExtractionHints() {
            return endoExtractionHints;
        },

        buildFactsFromExtraction(params) {
            return buildEndoFacts(params);
        },

        applyAnswersToFacts(facts, answers) {
            return applyEndoAnswersToFacts(facts, answers);
        },

        getCoverageConfig() {
            return endoCoverageConfig;
        },

        getUiContract() {
            return endoUiContract;
        },
    };
}
