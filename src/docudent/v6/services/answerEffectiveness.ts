/**
 * Answer Effectiveness — Dead Answer Detection
 * 
 * Ensures every answered question has an observable effect on:
 * - Chip activation
 * - Warnings
 * - Output text
 * 
 * If answers have no effect, something is broken in the pipeline.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

// Local warning type to avoid circular imports
export interface ValidationWarning {
    id: string;
    type?: string;
    title?: string;
    description?: string;
}

export interface EffectComparison {
    beforeChips: string[];
    afterChips: string[];
    beforeWarnings: ValidationWarning[];
    afterWarnings: ValidationWarning[];
    beforeText: string;
    afterText: string;
}

export interface EffectResults {
    changedChips: boolean;
    changedWarnings: boolean;
    changedText: boolean;
    addedChips: string[];
    removedChips: string[];
}

// ═══════════════════════════════════════════════════════════════
// COMPUTE EFFECTS
// ═══════════════════════════════════════════════════════════════

/**
 * Compare before/after states to detect what changed.
 */
export function computeAnswerEffects(comparison: EffectComparison): EffectResults {
    const { beforeChips, afterChips, beforeWarnings, afterWarnings, beforeText, afterText } = comparison;

    // Chip changes
    const beforeSet = new Set(beforeChips);
    const afterSet = new Set(afterChips);
    const addedChips = afterChips.filter(c => !beforeSet.has(c));
    const removedChips = beforeChips.filter(c => !afterSet.has(c));
    const changedChips = addedChips.length > 0 || removedChips.length > 0;

    // Warning changes
    const beforeWarningIds = new Set(beforeWarnings.map(w => w.id));
    const afterWarningIds = new Set(afterWarnings.map(w => w.id));
    const changedWarnings =
        beforeWarnings.length !== afterWarnings.length ||
        [...afterWarningIds].some(id => !beforeWarningIds.has(id));

    // Text changes (simple length + content check)
    const changedText = beforeText !== afterText;

    return {
        changedChips,
        changedWarnings,
        changedText,
        addedChips,
        removedChips,
    };
}

// ═══════════════════════════════════════════════════════════════
// ASSERT NO DEAD ANSWERS
// ═══════════════════════════════════════════════════════════════

export interface DeadAnswerCheck {
    answeredQuestionIds: string[];
    effects: EffectResults;
    unmappedQuestions?: string[];
}

/**
 * Throw if answers had no effect on the pipeline.
 * 
 * Rules:
 * - If answeredQuestionIds is empty → OK (no answers to check)
 * - If any of (changedChips OR changedWarnings OR changedText) → OK
 * - Otherwise → Dead answers detected!
 * 
 * Note: Unmapped questions are allowed (logged only) but any answer
 * should have SOME effect. If unmapped questions are the ONLY answers,
 * that's a dead answer scenario.
 */
export function assertNoDeadAnswers(check: DeadAnswerCheck): void {
    const { answeredQuestionIds, effects, unmappedQuestions = [] } = check;

    // No answers? Nothing to check.
    if (answeredQuestionIds.length === 0) {
        return;
    }

    // If all answers are unmapped, that's potentially dead
    const mappedCount = answeredQuestionIds.length - unmappedQuestions.length;

    // Check if ANY effect occurred
    const hasEffect = effects.changedChips || effects.changedWarnings || effects.changedText;

    if (!hasEffect && mappedCount > 0) {
        // This is suspicious - mapped answers should do something
        console.warn('[AnswerEffectiveness] Warning: Answers had no observable effect', {
            answeredQuestionIds,
            effects,
        });
        // In DEV, throw to catch bugs early
        if (import.meta.env?.DEV) {
            throw new Error(
                `Dead answers detected: ${mappedCount} mapped answer(s) had no effect on chips, warnings, or text. ` +
                `Questions: ${answeredQuestionIds.join(', ')}`
            );
        }
    }

    // Log unmapped but don't throw (they might be optional/informational)
    if (unmappedQuestions.length > 0) {
        console.warn('[AnswerEffectiveness] Unmapped questions:', unmappedQuestions);
    }
}

// ═══════════════════════════════════════════════════════════════
// CANONICAL CHECK HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Detect if answers are already in canonical format.
 * Used to prevent double translation.
 */
export function isAlreadyCanonicalAnswers(answers: Map<string, unknown>): boolean {
    // Canonical keys: kofferdam, cavity_depth, capping, vitality, percussion
    const canonicalKeys = ['kofferdam', 'cavity_depth', 'capping', 'capping_material'];

    for (const key of canonicalKeys) {
        if (answers.has(key)) {
            return true;
        }
    }
    return false;
}
