/**
 * User Defaults / Preferences Layer
 * 
 * Pre-fills answers for unanswered questions based on user preferences.
 * Called AFTER question generation, BEFORE normalizeAnswers.
 * 
 * ❌ Does NOT override explicit user answers
 * ❌ Does NOT modify questions
 * ✅ Only fills in defaults for unanswered questions
 * ✅ Only applies to "prozess/meta" questions (not befund by default)
 * ✅ Returns metadata about which defaults were applied
 */

export interface UserDefaults {
    [treatmentId: string]: {
        [questionId: string]: string | number | boolean;
    };
}

export interface ApplyDefaultsInput {
    treatmentId: string;
    extracted: Record<string, unknown>;
    questions: Array<{ id: string; category?: string }>;
    answers: Map<string, unknown>;
    userDefaults?: UserDefaults;
}

export interface ApplyDefaultsResult {
    /** Answers with defaults applied */
    answers: Map<string, unknown>;
    /** List of questionIds where defaults were applied */
    appliedDefaults: string[];
    /** Map of questionId → value for applied defaults */
    defaultsMap: Record<string, unknown>;
    /** Source attribution for each answer */
    answersSource: Record<string, 'user' | 'default'>;
}

/**
 * Categories that allow defaults.
 * "befund" questions require user confirmation.
 */
const DEFAULTABLE_CATEGORIES = new Set([
    'upsell',
    'mkv',
    'prozess',
    'meta',
    undefined // Allow if no category specified
]);

/**
 * Apply user defaults to unanswered questions.
 * 
 * @returns Result with answers, applied defaults list, and source attribution
 */
export function applyUserDefaults(input: ApplyDefaultsInput): ApplyDefaultsResult {
    const { treatmentId, questions, answers, userDefaults } = input;

    const answersSource: Record<string, 'user' | 'default'> = {};
    const appliedDefaults: string[] = [];
    const defaultsMap: Record<string, unknown> = {};

    // Record existing user answers
    for (const [key] of answers) {
        answersSource[key] = 'user';
    }

    // Early exit if no defaults
    if (!userDefaults || !userDefaults[treatmentId]) {
        return {
            answers,
            appliedDefaults,
            defaultsMap,
            answersSource
        };
    }

    const treatmentDefaults = userDefaults[treatmentId];
    const result = new Map(answers);

    for (const question of questions) {
        const questionId = question.id;
        const category = question.category;

        // Skip if already answered
        if (answers.has(questionId)) {
            continue;
        }

        // Skip befund/forensic questions (require explicit confirmation)
        if (category === 'befund' || category === 'forensic') {
            continue;
        }

        // Skip if not a defaultable category
        if (!DEFAULTABLE_CATEGORIES.has(category)) {
            continue;
        }

        // Apply default if available
        if (questionId in treatmentDefaults) {
            const value = treatmentDefaults[questionId];
            result.set(questionId, value);
            appliedDefaults.push(questionId);
            defaultsMap[questionId] = value;
            answersSource[questionId] = 'default';

            if (process.env.NODE_ENV === 'development') {
                console.debug(`[UserDefaults] Applied default: ${questionId}=${value}`);
            }
        }
    }

    return {
        answers: result,
        appliedDefaults,
        defaultsMap,
        answersSource
    };
}

export default { applyUserDefaults };
