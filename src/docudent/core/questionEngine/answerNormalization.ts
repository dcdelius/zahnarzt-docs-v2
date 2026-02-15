/**
 * Answer Normalization Utility — Converts Question IDs to Field Names
 *
 * ═══════════════════════════════════════════════════════════════
 * UI sends answers keyed by question ID (e.g., ENDO_T2_DEVIATION_REASON).
 * Renderer consumes normalized fields (e.g., deviationReason).
 * This utility bridges the gap deterministically.
 * ═══════════════════════════════════════════════════════════════
 */

import type {
    EngineQuestion,
    AnswersByQuestionId,
    NormalizedFields,
} from '../../contracts/questionEngineTypes';

/**
 * Normalize answers from question IDs to field names.
 * 
 * @param questions - The questions that were asked
 * @param answersById - Answers keyed by question.id
 * @returns Fields keyed by fieldsWritten names
 * 
 * Rules:
 * - For each question with an answer, map to all fieldsWritten
 * - If answersById[question.id] is undefined => skip
 * - Deterministic, no side effects
 */
export function normalizeAnswersToFields(
    questions: EngineQuestion[],
    answersById: AnswersByQuestionId
): NormalizedFields {
    const fields: NormalizedFields = {};

    for (const question of questions) {
        const answer = answersById[question.id];

        // Skip if no answer provided
        if (answer === undefined) {
            continue;
        }

        // Write to each field name
        for (const fieldName of question.fieldsWritten) {
            fields[fieldName] = answer;
        }
    }

    return fields;
}

/**
 * Helper to safely get a string field or fallback.
 */
export function getStringField(
    fields: NormalizedFields,
    fieldName: string,
    fallback: string | null = null
): string | null {
    const value = fields[fieldName];
    return typeof value === 'string' ? value : fallback;
}

/**
 * Helper to safely get a string array field or fallback.
 */
export function getStringArrayField(
    fields: NormalizedFields,
    fieldName: string,
    fallback: string[] = []
): string[] {
    const value = fields[fieldName];
    return Array.isArray(value) ? (value as string[]) : fallback;
}

// ═══════════════════════════════════════════════════════════════
// SAFE NORMALIZATION WITH VALIDATION
// ═══════════════════════════════════════════════════════════════

import { validateNormalizedFields } from './fieldValidation';

export interface SafeNormalizationResult {
    fields: NormalizedFields;
    errors: string[];
}

/**
 * Normalize answers and validate against canonical vocabularies.
 * Returns sanitized fields with invalid values removed.
 * 
 * @param questions - The questions that were asked
 * @param answersById - Answers keyed by question.id
 * @returns { fields: sanitized fields, errors: validation errors }
 */
export function safeNormalizeAnswersToFields(
    questions: EngineQuestion[],
    answersById: AnswersByQuestionId
): SafeNormalizationResult {
    // First, normalize normally
    const rawFields = normalizeAnswersToFields(questions, answersById);

    // Then validate
    const validation = validateNormalizedFields(questions, rawFields);

    return {
        fields: validation.sanitized,
        errors: validation.errors,
    };
}

export default {
    normalizeAnswersToFields,
    safeNormalizeAnswersToFields,
    getStringField,
    getStringArrayField,
};
