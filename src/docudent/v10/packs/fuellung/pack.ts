/**
 * M18: Fuellung Treatment Pack
 *
 * Bundles all assets for composite filling (Fuellung) treatment.
 */

import type { TreatmentPack } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

import { buildFuellungFacts, applyFuellungAnswersToFacts } from './facts';
import { fuellungScenarios } from './scenarios';
import { fuellungCombinabilityGoldens } from './combinability';
import { fuellungExtractionHints } from './extraction';
import { fuellungCoverageConfig } from './coverage';
import { fuellungUiContract } from './ui.contract';

/**
 * Create the Fuellung treatment pack.
 */
export function createFuellungPack(): TreatmentPack {
    return {
        id: 'fuellung',
        version: '1.0.0',
        meta: {
            label: 'Füllung',
            description: 'Composite filling treatment',
        },

        getTreatmentKb(): TreatmentKb | null {
            return jsonTreatmentKbProvider.getTreatmentKb('fuellung');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return fuellungScenarios;
        },

        getCombinabilityGoldens() {
            return fuellungCombinabilityGoldens;
        },

        getExtractionHints() {
            return fuellungExtractionHints;
        },

        buildFactsFromExtraction(params) {
            return buildFuellungFacts(params);
        },

        applyAnswersToFacts(facts, answers) {
            return applyFuellungAnswersToFacts(facts, answers);
        },

        getCoverageConfig() {
            return fuellungCoverageConfig;
        },

        getUiContract() {
            return fuellungUiContract;
        },
    };
}
