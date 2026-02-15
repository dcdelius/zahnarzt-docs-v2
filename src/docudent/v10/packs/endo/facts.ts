/**
 * Endo facts mapping (defaults to core implementation).
 */

import type { BuildFactsParams, TreatmentFacts } from '../../facts';
import { buildFactsFromExtraction, applyAnswersToFacts } from '../../facts';

export function buildEndoFacts(params: BuildFactsParams): TreatmentFacts {
    return buildFactsFromExtraction(params);
}

export function applyEndoAnswersToFacts(
    facts: TreatmentFacts,
    answers: Map<string, unknown> | Record<string, unknown>
): TreatmentFacts {
    return applyAnswersToFacts(facts, answers);
}
