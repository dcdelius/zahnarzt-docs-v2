/**
 * Generic Minimal Answers Helper
 * 
 * Auto-generates minimal valid answers for any question set.
 * Used by gate tests to prove step gating works.
 * 
 * Rules:
 * - single/choice -> options[0].dataValue ?? options[0].id
 * - multi -> [options[0].dataValue ?? options[0].id]
 * - number -> min ?? defaultValue ?? 1
 * - boolean (single with Ja/Nein) -> true
 * - text -> "ok"
 */

import type { DynamicQuestion } from '../../../contracts/questions';

export type AnswerOverrides = Record<string, unknown>;

/**
 * Preferred option IDs for specific Endo questions.
 * These match valid option.id values from endo/question_bank.json
 */
const ENDO_QUESTION_PREFERENCES: Record<string, string> = {
    // endo_step: prefer T1/Trepanation as it's the most common starting point
    'endo_step': 'endo_start',
    // kanalzahl: prefer 3 canals (common for OK molars)
    'kanalzahl': 'canal_3',
};

/**
 * Generate minimal valid answers for a set of questions
 * 
 * @param questions - Questions from pipeline result
 * @param overrides - Optional manual overrides for specific question IDs
 * @returns Map of question ID to answer value
 */
export function generateMinimalAnswers(
    questions: DynamicQuestion[],
    overrides: AnswerOverrides = {}
): Map<string, unknown> {
    const answers = new Map<string, unknown>();

    for (const question of questions) {
        const { id, type, options, min, defaultValue } = question;

        // Check for override first
        if (id in overrides) {
            answers.set(id, overrides[id]);
            continue;
        }

        // Auto-generate based on type
        switch (type) {
            case 'single':
                if (options && options.length > 0) {
                    // Check if it's a boolean-like question (Ja/Nein)
                    const hasJaNein = options.some(o =>
                        o.id === 'ja' || o.id === 'nein' ||
                        o.label?.toLowerCase() === 'ja' || o.label?.toLowerCase() === 'nein'
                    );
                    if (hasJaNein) {
                        // Prefer "ja" for boolean-like questions
                        const jaOption = options.find(o =>
                            o.id === 'ja' || o.label?.toLowerCase() === 'ja'
                        );
                        answers.set(id, jaOption?.dataValue ?? jaOption?.id ?? true);
                    } else {
                        // Check for Endo-specific preferences
                        const preferredId = ENDO_QUESTION_PREFERENCES[id];
                        if (preferredId) {
                            const preferredOpt = options.find(o => o.id === preferredId);
                            if (preferredOpt) {
                                answers.set(id, preferredOpt.dataValue ?? preferredOpt.id);
                                continue;
                            }
                        }

                        // Use defaultValue if available
                        if (defaultValue !== undefined) {
                            answers.set(id, defaultValue);
                        } else {
                            // Fallback to first option
                            const firstOpt = options[0];
                            answers.set(id, firstOpt.dataValue ?? firstOpt.id);
                        }
                    }
                } else {
                    // No options = default to true
                    answers.set(id, true);
                }
                break;

            case 'multi':
                if (options && options.length > 0) {
                    const firstOpt = options[0];
                    answers.set(id, [firstOpt.dataValue ?? firstOpt.id]);
                } else {
                    answers.set(id, []);
                }
                break;

            case 'number':
                answers.set(id, min ?? defaultValue ?? 1);
                break;

            default:
                // Unknown type - try to infer
                if (options && options.length > 0) {
                    // Treat as single choice
                    const firstOpt = options[0];
                    answers.set(id, firstOpt.dataValue ?? firstOpt.id);
                } else {
                    // Default to true for boolean-like
                    answers.set(id, true);
                }
                break;
        }
    }

    return answers;
}


/**
 * Convert answers Map to plain object for debugging
 */
export function answersToObject(answers: Map<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(answers);
}

/**
 * Merge existing answers with minimal answers for unanswered questions
 */
export function fillMissingAnswers(
    questions: DynamicQuestion[],
    existingAnswers: Map<string, unknown>,
    overrides: AnswerOverrides = {}
): Map<string, unknown> {
    const unanswered = questions.filter(q => !existingAnswers.has(q.id));
    const minimalAnswers = generateMinimalAnswers(unanswered, overrides);

    const merged = new Map(existingAnswers);
    for (const [key, value] of minimalAnswers) {
        merged.set(key, value);
    }

    return merged;
}
