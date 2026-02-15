/**
 * Fuellung facts mapping (defaults to core implementation).
 */

import type { BuildFactsParams, TreatmentFacts } from '../../facts';
import { buildFactsFromExtraction, applyAnswersToFacts } from '../../facts';

export function buildFuellungFacts(params: BuildFactsParams): TreatmentFacts {
    return buildFactsFromExtraction(params);
}

export function applyFuellungAnswersToFacts(
    facts: TreatmentFacts,
    answers: Map<string, unknown> | Record<string, unknown>
): TreatmentFacts {
    return applyAnswersToFacts(facts, answers);
}
