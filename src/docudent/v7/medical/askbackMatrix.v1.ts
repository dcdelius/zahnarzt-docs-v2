/**
 * V7 Medical Layer — Askback Matrix
 *
 * Evaluates which questions need to be asked based on current facts.
 * Uses KB question keys as SSOT.
 */

import type { TreatmentFacts, AskbackBundle, AskbackQuestion } from './types';
import { MEDICAL_QUESTION_IDS } from './types';

/**
 * Evaluate which askbacks (questions) are required based on facts
 *
 * Rules (Deep Filling Flow v1):
 * - If treatmentId === 'fuellung' AND cariesDepth in ['profunda', 'pulp_near']:
 *   - REQUIRED: ueberkappung (if not already answered)
 *   - OPTIONAL: ueberkappung_material (if ueberkappung === 'yes')
 */
export function evaluateAskbacks(facts: TreatmentFacts): AskbackBundle {
    const required: AskbackQuestion[] = [];
    const optional: AskbackQuestion[] = [];

    // Only for fuellung treatment with deep/pulp-near caries
    if (facts.treatmentId !== 'fuellung') {
        return { required, optional };
    }

    const isDeep = facts.cariesDepth === 'profunda' || facts.cariesDepth === 'pulp_near';

    if (isDeep) {
        // If capping not yet determined, ask about it
        if (facts.capping.performed === 'unknown') {
            required.push({
                id: MEDICAL_QUESTION_IDS.UEBERKAPPUNG,
                required: true,
                questionKey: 'ueberkappung', // KB canonical key
            });
        }

        // If capping is yes but no material, ask for material
        if (facts.capping.performed === 'yes' && !facts.capping.material) {
            required.push({
                id: MEDICAL_QUESTION_IDS.UEBERKAPPUNG_MATERIAL,
                required: true,
                questionKey: 'ueberkappung_material',
            });
        }

        // Counseling is optional (text-only, no billing impact)
        // Note: This is informational only - no chip in KB for counseling
        // We only add it if explicitly needed for documentation purposes
        // For now, we skip this as there's no KB entry for it
    }

    return { required, optional };
}

/**
 * Check if all required askbacks have been answered
 */
export function hasUnansweredRequired(
    bundle: AskbackBundle,
    answers: Map<string, unknown> | Record<string, unknown>
): boolean {
    const answerMap = answers instanceof Map ? answers : new Map(Object.entries(answers));

    for (const q of bundle.required) {
        // Check for answer by medical ID or KB key
        const hasAnswer = answerMap.has(q.id) || answerMap.has(q.questionKey);
        if (!hasAnswer) {
            return true;
        }
    }

    return false;
}

/**
 * Get list of unanswered required question IDs
 */
export function getUnansweredRequired(
    bundle: AskbackBundle,
    answers: Map<string, unknown> | Record<string, unknown>
): string[] {
    const answerMap = answers instanceof Map ? answers : new Map(Object.entries(answers));
    const unanswered: string[] = [];

    for (const q of bundle.required) {
        const hasAnswer = answerMap.has(q.id) || answerMap.has(q.questionKey);
        if (!hasAnswer) {
            unanswered.push(q.id);
        }
    }

    return unanswered;
}
