/**
 * Answer ID Translator — SSOT for Question/Option ID Canonicalization
 *
 * QuestionBank uses semantic IDs (e.g., "isolation", "kofferdam", "relativ")
 * AnswerMap/ChipResolver uses canonical IDs (e.g., "kofferdam", "yes", "no")
 *
 * This module bridges the gap with zero logic — pure mapping.
 * Question ID translation uses questionIdPatterns from answer_map.json.
 * Option ID translation uses optionAliases from answer_map.json (semantic→normalized).
 *
 * IMPORTANT: This does NOT translate to chip IDs — that's chipResolver's job.
 *
 * ❌ NO hardcoded mappings
 * ❌ NO business logic
 * ❌ NO chip inference
 * ✅ ONLY ID normalization from JSON SSOT
 */

import { loadAnswerMapConfig, isKnownTreatment, KNOWN_TREATMENTS, type AnswerMapConfig } from '../registry';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface MapEntry {
    questionKey: string;
    questionIdPatterns: string[];
    answers: Record<string, string | null>;
    optionAliases?: Record<string, string>; // semantic option → normalized option
}

// ═══════════════════════════════════════════════════════════════
// CACHE — Avoid reloading JSON on every translation
// ═══════════════════════════════════════════════════════════════

const mapCache = new Map<string, AnswerMapConfig>();

function getMapConfig(treatmentId: string): AnswerMapConfig {
    // Validate treatmentId
    if (!isKnownTreatment(treatmentId)) {
        throw new Error(
            `Unknown treatment: "${treatmentId}". ` +
            `Available treatments: ${KNOWN_TREATMENTS.join(', ')}`
        );
    }

    // Check cache
    if (mapCache.has(treatmentId)) {
        return mapCache.get(treatmentId)!;
    }

    // Load from registry
    const config = loadAnswerMapConfig(treatmentId);
    mapCache.set(treatmentId, config);
    return config;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Find map entry by question ID pattern
// ═══════════════════════════════════════════════════════════════

function findMapEntry(config: AnswerMapConfig, questionId: string): MapEntry | null {
    for (const entry of config.map) {
        // Check if questionId matches any pattern OR the questionKey itself
        if (entry.questionKey === questionId || entry.questionIdPatterns.includes(questionId)) {
            return entry as MapEntry;
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
// TRANSLATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Translate semantic question ID to canonical question ID.
 * Returns the questionKey from answer_map if found, otherwise original.
 * 
 * Policy: Pass-through for unknown keys (no throw in prod)
 */
export function translateQuestionId(treatmentId: string, questionId: string): string {
    try {
        const config = getMapConfig(treatmentId);
        const entry = findMapEntry(config, questionId);

        if (entry) {
            return entry.questionKey; // Canonical key from JSON
        }

        // Pass-through: key not in mapping, keep original
        if (import.meta.env.DEV) {
            console.debug(`[AnswerTranslator] No mapping for question: ${treatmentId}:${questionId}`);
        }
        return questionId;
    } catch (e) {
        // Unknown treatment - rethrow
        throw e;
    }
}

/**
 * Translate semantic option ID to normalized option ID.
 * Uses optionAliases if present, otherwise passes through.
 * 
 * IMPORTANT: Does NOT translate to chip IDs — that's chipResolver's job.
 * This only normalizes UI option values to what answer_map.answers expects.
 * 
 * Policy: Pass-through for unknown options (no throw in prod)
 */
export function translateOptionId(
    treatmentId: string,
    questionId: string,
    optionId: string
): string {
    try {
        const config = getMapConfig(treatmentId);
        const entry = findMapEntry(config, questionId);

        if (!entry) {
            // No mapping for this question - pass through
            return optionId;
        }

        // Check optionAliases first (semantic → normalized)
        if (entry.optionAliases) {
            const alias = entry.optionAliases[optionId] || entry.optionAliases[optionId.toLowerCase()];
            if (alias) {
                return alias;
            }
        }

        // If optionId is already a key in answers, it's already normalized
        if (optionId in entry.answers || optionId.toLowerCase() in entry.answers) {
            return optionId.toLowerCase() in entry.answers ? optionId.toLowerCase() : optionId;
        }

        // Pass-through: option not in mapping
        if (import.meta.env.DEV) {
            console.debug(`[AnswerTranslator] No alias for option: ${treatmentId}:${questionId}:${optionId}`);
        }
        return optionId;
    } catch (e) {
        // Unknown treatment - rethrow
        throw e;
    }
}

/**
 * Translate entire answers Map to canonical IDs.
 * This is the main entry point for pipeline integration.
 * 
 * - Translates question IDs via questionIdPatterns
 * - Normalizes option IDs via optionAliases (NOT to chip IDs)
 * - Preserves capping_material for placeholder substitution
 * 
 * @throws Error if treatmentId is unknown
 */
export function translateAnswers(
    treatmentId: string,
    answers: Map<string, unknown>
): Map<string, unknown> {
    // Validate treatmentId upfront (will throw for unknown)
    getMapConfig(treatmentId);

    const canonicalAnswers = new Map<string, unknown>();

    // Material values that require capping_material preservation
    const MATERIAL_VALUES = ['mta', 'caoh', 'biodentine', 'keine', 'none'];

    for (const [questionId, optionId] of answers) {
        const canonicalQuestionId = translateQuestionId(treatmentId, questionId);

        // Handle different answer types
        if (typeof optionId === 'string') {
            const normalizedOptionId = translateOptionId(treatmentId, questionId, optionId);
            canonicalAnswers.set(canonicalQuestionId, normalizedOptionId);

            // ═══════════════════════════════════════════════════════════════
            // PRESERVE CAPPING MATERIAL for placeholder substitution
            // material:mta → capping:cp (for chips) + capping_material:mta (for text)
            // ═══════════════════════════════════════════════════════════════
            if ((questionId === 'material' || questionId === 'capping' ||
                questionId === 'forensic_material' || questionId === 'forensic_capping') &&
                MATERIAL_VALUES.includes(optionId.toLowerCase())) {
                // Normalize to lowercase for consistency
                const normalizedMaterial = optionId.toLowerCase() === 'keine' ? 'none' : optionId.toLowerCase();
                canonicalAnswers.set('capping_material', normalizedMaterial);
            }
        } else if (Array.isArray(optionId)) {
            // Multi-select: translate each option
            const normalizedOptions = optionId.map(opt =>
                typeof opt === 'string'
                    ? translateOptionId(treatmentId, questionId, opt)
                    : opt
            );
            canonicalAnswers.set(canonicalQuestionId, normalizedOptions);
        } else {
            // Number or boolean: pass through unchanged
            canonicalAnswers.set(canonicalQuestionId, optionId);
        }
    }

    if (import.meta.env.DEV) {
        console.debug('[AnswerTranslator] Translated:', {
            original: Object.fromEntries(answers),
            canonical: Object.fromEntries(canonicalAnswers)
        });
    }

    return canonicalAnswers;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export const answerIdTranslator = {
    translateQuestionId,
    translateOptionId,
    translateAnswers,
};

export default answerIdTranslator;
