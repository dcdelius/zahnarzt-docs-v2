/**
 * Answer Normalization — Semantic to Canonical Translation
 *
 * This module translates semantic IDs from QuestionBank
 * to canonical IDs expected by chipResolver and outputComposer.
 *
 * ALL translation happens here. No string matching in other files.
 */

import {
    CANONICAL_QUESTION_IDS,
    CANONICAL_OPTION_IDS,
    type CanonicalQuestionId,
    type CanonicalOptionId
} from '../../contracts/canonicalIds';
import { QUESTION_ID_ALIASES, OPTION_ID_ALIASES } from './mappings';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface NormalizationResult {
    canonicalAnswers: Map<CanonicalQuestionId, CanonicalOptionId | string | number>;
    unmappedQuestions: string[];
    unmappedOptions: Array<{ questionId: string; optionId: string }>;
}

// ═══════════════════════════════════════════════════════════════
// NORMALIZATION FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Normalize semantic answers to canonical format.
 *
 * @param treatmentId - Treatment type (e.g., 'fuellung')
 * @param rawAnswers - Map of questionId → optionId from UI
 * @returns Normalized answers with canonical IDs + any unmapped entries
 */
export function normalizeAnswers(
    treatmentId: string,
    rawAnswers: Map<string, unknown>
): NormalizationResult {
    const canonicalAnswers = new Map<CanonicalQuestionId, CanonicalOptionId | string | number>();
    const unmappedQuestions: string[] = [];
    const unmappedOptions: Array<{ questionId: string; optionId: string }> = [];

    for (const [questionId, optionValue] of rawAnswers) {
        // Step 1: Translate question ID
        const canonicalQuestionId = translateQuestionId(treatmentId, questionId);

        if (!canonicalQuestionId) {
            unmappedQuestions.push(questionId);
            continue;
        }

        // Step 2: Handle different value types
        if (typeof optionValue === 'number') {
            // Numeric values (e.g., MKV amount) pass through
            canonicalAnswers.set(canonicalQuestionId, optionValue);
        } else if (typeof optionValue === 'string') {
            // Translate option ID
            const canonicalOptionId = translateOptionId(treatmentId, questionId, optionValue);

            if (!canonicalOptionId) {
                unmappedOptions.push({ questionId, optionId: optionValue });
                // Still store the raw value as fallback
                canonicalAnswers.set(canonicalQuestionId, optionValue);
            } else {
                canonicalAnswers.set(canonicalQuestionId, canonicalOptionId);
            }
        } else if (typeof optionValue === 'boolean') {
            // Boolean values → yes/no
            canonicalAnswers.set(
                canonicalQuestionId,
                optionValue ? CANONICAL_OPTION_IDS.YES : CANONICAL_OPTION_IDS.NO
            );
        }
    }

    return { canonicalAnswers, unmappedQuestions, unmappedOptions };
}

// ═══════════════════════════════════════════════════════════════
// TRANSLATION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Translate semantic question ID → canonical question ID
 * 
 * Algorithm:
 * 1. Direct lookup in treatment aliases
 * 2. Check if already canonical
 * 3. FALLBACK: Progressive prefix-stripping (split/join approach)
 *    Example: medical_soft_vitality → soft_vitality → vitality
 */
function translateQuestionId(
    treatmentId: string,
    questionId: string
): CanonicalQuestionId | null {
    const treatmentAliases = QUESTION_ID_ALIASES[treatmentId];
    if (!treatmentAliases) {
        console.warn(`[NormalizeAnswers] No aliases for treatment: ${treatmentId}`);
        return null;
    }

    // Step 1: Direct lookup
    const canonical = treatmentAliases[questionId];
    if (canonical) {
        return canonical;
    }

    // Step 2: Check if already canonical
    const allCanonical = Object.values(CANONICAL_QUESTION_IDS);
    if (allCanonical.includes(questionId as CanonicalQuestionId)) {
        return questionId as CanonicalQuestionId;
    }

    // Step 3: Progressive prefix-stripping (deterministic, no regex)
    // Split by underscore and progressively remove leading segments
    const parts = questionId.split('_');
    for (let i = 1; i < parts.length; i++) {
        const stripped = parts.slice(i).join('_');

        // Try alias lookup
        const aliasMatch = treatmentAliases[stripped];
        if (aliasMatch) {
            return aliasMatch;
        }

        // Try canonical direct match
        if (allCanonical.includes(stripped as CanonicalQuestionId)) {
            return stripped as CanonicalQuestionId;
        }
    }

    // No match found
    return null;
}

/**
 * Translate semantic option ID → canonical option ID
 */
function translateOptionId(
    treatmentId: string,
    questionId: string,
    optionId: string
): CanonicalOptionId | null {
    const treatmentAliases = OPTION_ID_ALIASES[treatmentId];
    if (!treatmentAliases) {
        console.warn(`[NormalizeAnswers] No option aliases for treatment: ${treatmentId}`);
        return null;
    }

    // Try with canonical question ID first
    const canonicalQuestionId = translateQuestionId(treatmentId, questionId);
    const questionKey = canonicalQuestionId || questionId;

    const questionOptions = treatmentAliases[questionKey];
    if (!questionOptions) {
        // Check if already canonical
        const allCanonical = Object.values(CANONICAL_OPTION_IDS);
        if (allCanonical.includes(optionId as CanonicalOptionId)) {
            return optionId as CanonicalOptionId;
        }
        return null;
    }

    const canonical = questionOptions[optionId];
    if (!canonical) {
        // Check if already canonical
        const allCanonical = Object.values(CANONICAL_OPTION_IDS);
        if (allCanonical.includes(optionId as CanonicalOptionId)) {
            return optionId as CanonicalOptionId;
        }
        return null;
    }

    return canonical;
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Check if normalization had any unmapped entries
 */
export function hasUnmappedAnswers(result: NormalizationResult): boolean {
    return result.unmappedQuestions.length > 0 || result.unmappedOptions.length > 0;
}

/**
 * Log unmapped answers as warnings (for tracing)
 */
export function logUnmappedAnswers(result: NormalizationResult): void {
    if (result.unmappedQuestions.length > 0) {
        console.warn('[NormalizeAnswers] Unmapped question IDs:', result.unmappedQuestions);
    }
    if (result.unmappedOptions.length > 0) {
        console.warn('[NormalizeAnswers] Unmapped option IDs:', result.unmappedOptions);
    }
}

// ═══════════════════════════════════════════════════════════════
// MERGED FACTS — Single Source of Truth for Output
// ═══════════════════════════════════════════════════════════════

/**
 * MergedFacts combines extraction + canonical answers into a single
 * authoritative object for outputComposer and warning generation.
 */
export interface MergedFacts {
    // Core identification
    tooth: string | null;
    surfaces: string[];
    diagnosis: string | null;

    // Financials
    costs: number | null;
    hasMKV: boolean;
    mkvBetrag: number | null;

    // Clinical findings (canonical values)
    vitality: 'positive' | 'negative' | null;
    percussion: 'positive' | 'negative' | null;
    anesthesia: 'infiltr' | 'leitung' | 'none' | null;
    tiefe: 'normal' | 'deep' | null;
    isolation: 'yes' | 'no' | null;
    cappingMaterial: 'caoh' | 'mta' | 'biodentine' | 'none' | null;

    // Upsell flags
    mehrschicht: boolean;
    adhaesiv: boolean;
}

/**
 * Merge extracted data with canonical answers.
 * Canonical answers OVERRIDE extracted values when they correspond to the same fact.
 */
export function mergeFacts(
    extracted: {
        tooth?: string | null;
        surfaces?: string[];
        diagnosis?: string | null;
        costs?: number | null;
        mentioned?: {
            vitality?: string | null;
            percussion?: string | null;
            anesthesia?: { type?: string } | null;
            tiefe?: string | null;
            kofferdam?: boolean | null;
            material?: string | null;
        };
    },
    canonicalAnswers: Map<CanonicalQuestionId, CanonicalOptionId | string | number>,
    hasMKV: boolean = false
): MergedFacts {
    // Start with extracted values
    const facts: MergedFacts = {
        tooth: extracted.tooth ?? null,
        surfaces: extracted.surfaces ?? [],
        diagnosis: extracted.diagnosis ?? null,
        costs: extracted.costs ?? null,
        hasMKV,
        mkvBetrag: null,
        vitality: null,
        percussion: null,
        anesthesia: null,
        tiefe: null,
        isolation: null,
        cappingMaterial: null,
        mehrschicht: false,
        adhaesiv: false,
    };

    // Map extracted mentioned fields to canonical format
    if (extracted.mentioned) {
        const m = extracted.mentioned;

        // Vitality
        if (m.vitality) {
            facts.vitality = m.vitality === '+' || m.vitality === 'pos' || m.vitality === 'positive'
                ? 'positive' : 'negative';
        }

        // Percussion
        if (m.percussion) {
            facts.percussion = m.percussion === '+' || m.percussion === 'pos' || m.percussion === 'positive'
                ? 'positive' : 'negative';
        }

        // Anesthesia
        if (m.anesthesia?.type) {
            facts.anesthesia = m.anesthesia.type as 'infiltr' | 'leitung' | 'none';
        }

        // Tiefe
        if (m.tiefe) {
            const t = m.tiefe.toLowerCase();
            facts.tiefe = (t === 'tief' || t === 'deep' || t === 'pulpanah' || t === 'profunda')
                ? 'deep' : 'normal';
        }

        // Kofferdam
        if (m.kofferdam !== undefined && m.kofferdam !== null) {
            facts.isolation = m.kofferdam ? 'yes' : 'no';
        }
    }

    // Override with canonical answers (user answers take precedence)
    for (const [questionId, value] of canonicalAnswers) {
        switch (questionId) {
            case CANONICAL_QUESTION_IDS.VITALITY:
                if (value === CANONICAL_OPTION_IDS.POSITIVE) facts.vitality = 'positive';
                else if (value === CANONICAL_OPTION_IDS.NEGATIVE) facts.vitality = 'negative';
                break;

            case CANONICAL_QUESTION_IDS.PERCUSSION:
                if (value === CANONICAL_OPTION_IDS.POSITIVE) facts.percussion = 'positive';
                else if (value === CANONICAL_OPTION_IDS.NEGATIVE) facts.percussion = 'negative';
                break;

            case CANONICAL_QUESTION_IDS.KOFFERDAM:
                if (value === CANONICAL_OPTION_IDS.YES) facts.isolation = 'yes';
                else if (value === CANONICAL_OPTION_IDS.NO) facts.isolation = 'no';
                break;

            case CANONICAL_QUESTION_IDS.TIEFE:
                if (value === CANONICAL_OPTION_IDS.DEEP) facts.tiefe = 'deep';
                else if (value === CANONICAL_OPTION_IDS.NORMAL) facts.tiefe = 'normal';
                break;

            case CANONICAL_QUESTION_IDS.CAPPING_MATERIAL:
                if (value === CANONICAL_OPTION_IDS.CAOH) facts.cappingMaterial = 'caoh';
                else if (value === CANONICAL_OPTION_IDS.MTA) facts.cappingMaterial = 'mta';
                else if (value === CANONICAL_OPTION_IDS.BIODENTINE) facts.cappingMaterial = 'biodentine';
                else if (value === CANONICAL_OPTION_IDS.KEINE) facts.cappingMaterial = 'none';
                break;

            case CANONICAL_QUESTION_IDS.ANESTHESIA:
                if (value === CANONICAL_OPTION_IDS.INFILTRATION) facts.anesthesia = 'infiltr';
                else if (value === CANONICAL_OPTION_IDS.LEITUNGS) facts.anesthesia = 'leitung';
                else if (value === CANONICAL_OPTION_IDS.KEINE_LA) facts.anesthesia = 'none';
                break;

            case CANONICAL_QUESTION_IDS.MKV_BETRAG:
                if (typeof value === 'number') {
                    facts.mkvBetrag = value;
                    facts.hasMKV = true;
                }
                break;

            case CANONICAL_QUESTION_IDS.MEHRSCHICHT:
                facts.mehrschicht = value === CANONICAL_OPTION_IDS.YES;
                break;

            case CANONICAL_QUESTION_IDS.ADHAESIV:
                facts.adhaesiv = value === CANONICAL_OPTION_IDS.YES;
                break;
        }
    }

    return facts;
}

// ═══════════════════════════════════════════════════════════════
// CHIP ACTIVATION FROM CANONICAL ANSWERS
// ═══════════════════════════════════════════════════════════════

import { ANSWER_TO_CHIP, EXCLUSIVE_GROUPS, type CanonicalChipId } from '../../contracts/canonicalIds';

/**
 * Derive chip activations from canonical answers.
 * This is the ONLY place chip activation should happen.
 */
export function deriveChipsFromCanonicalAnswers(
    canonicalAnswers: Map<CanonicalQuestionId, CanonicalOptionId | string | number>,
    baseChips: string[] = []
): string[] {
    const chips = new Set<string>(baseChips);

    for (const [questionId, value] of canonicalAnswers) {
        const chipMap = ANSWER_TO_CHIP[questionId];
        if (!chipMap) continue;

        const chipToActivate = chipMap[value as string];
        if (chipToActivate) {
            // Add the chip
            chips.add(chipToActivate);

            // Remove exclusive alternatives
            for (const group of Object.values(EXCLUSIVE_GROUPS)) {
                if (group.includes(chipToActivate as CanonicalChipId)) {
                    for (const alt of group) {
                        if (alt !== chipToActivate) {
                            chips.delete(alt);
                        }
                    }
                }
            }
        }
    }

    return Array.from(chips);
}

