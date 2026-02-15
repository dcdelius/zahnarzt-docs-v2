/**
 * Question Presentation Policy
 *
 * PURE PRESENTATION LAYER — Never decides medical necessity.
 * Only groups/organizes questions for UI rendering.
 *
 * INVARIANTS:
 * - HARD askbacks ALWAYS visible, ALWAYS on top
 * - SOFT askbacks may be collapsed (UI preference only)
 * - No questions are deleted — only regrouped
 * - Set equality: (optionalVisible ∪ optionalHidden) === original optional
 * - Deterministic: same input → same grouping
 *
 * @see MEDICAL_LAYER_OWNERSHIP.md for policy rationale
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Documentation mode affects presentation defaults.
 * - fast: Minimize questions shown (hide optional)
 * - balanced: Default behavior (optional collapsed)
 * - forensic: Show everything (optional expanded)
 */
export type DocMode = 'fast' | 'balanced' | 'forensic';

/**
 * UI presentation options.
 * These NEVER affect medical necessity — only visibility grouping.
 */
export interface PresentationOptions {
    /** Documentation mode affecting default visibility */
    docMode?: DocMode;

    /** Override soft askbacks visibility regardless of docMode */
    softAskbacksVisibility?: 'collapsed' | 'expanded';

    /** Max soft questions visible when collapsed (rest go to hidden) */
    softAskbacksMaxVisible?: number;
}

/**
 * Grouped questions for UI rendering.
 * Set equality: (optionalVisible ∪ optionalHidden) === original optional input
 */
export interface PresentedQuestions<T> {
    /** HARD askbacks — always visible, always rendered */
    required: T[];

    /** SOFT askbacks visible without expanding */
    optionalVisible: T[];

    /** SOFT askbacks hidden behind collapse toggle */
    optionalHidden: T[];

    /** Total count of optional questions (for UI label) */
    optionalTotal: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_DOC_MODE: DocMode = 'balanced';
const DEFAULT_SOFT_VISIBILITY: Record<DocMode, 'collapsed' | 'expanded'> = {
    fast: 'collapsed',
    balanced: 'collapsed',
    forensic: 'expanded'
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Groups questions for UI presentation.
 *
 * NEVER changes content — only decides visibility grouping.
 * Medical necessity is decided by MEDICAL layer; this is UI-only.
 *
 * @param args.required - HARD askbacks (always visible)
 * @param args.optional - SOFT askbacks (may be collapsed)
 * @param args.options - Presentation preferences
 * @returns Grouped questions for UI rendering
 */
export function presentQuestions<T>(args: {
    required: T[];
    optional: T[];
    options?: PresentationOptions;
}): PresentedQuestions<T> {
    const { required, optional, options = {} } = args;

    // Determine effective visibility
    const docMode = options.docMode ?? DEFAULT_DOC_MODE;
    const visibility = options.softAskbacksVisibility ?? DEFAULT_SOFT_VISIBILITY[docMode];
    const maxVisible = options.softAskbacksMaxVisible;

    // HARD askbacks: always visible, always on top
    const presentedRequired = [...required];

    // SOFT askbacks: group based on visibility mode
    let optionalVisible: T[];
    let optionalHidden: T[];

    if (visibility === 'expanded') {
        // Forensic/expanded: all optional visible
        optionalVisible = [...optional];
        optionalHidden = [];
    } else {
        // Collapsed: optional hidden by default
        if (maxVisible !== undefined && maxVisible > 0) {
            // Show up to maxVisible, rest hidden
            optionalVisible = optional.slice(0, maxVisible);
            optionalHidden = optional.slice(maxVisible);
        } else {
            // All hidden
            optionalVisible = [];
            optionalHidden = [...optional];
        }
    }

    return {
        required: presentedRequired,
        optionalVisible,
        optionalHidden,
        optionalTotal: optional.length
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Get presentation counts for tracing (no PII)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PresentationCounts {
    requiredCount: number;
    optionalVisibleCount: number;
    optionalHiddenCount: number;
    optionalTotal: number;
    docMode: DocMode;
}

export function getPresentationCounts<T>(
    presented: PresentedQuestions<T>,
    docMode: DocMode = 'balanced'
): PresentationCounts {
    return {
        requiredCount: presented.required.length,
        optionalVisibleCount: presented.optionalVisible.length,
        optionalHiddenCount: presented.optionalHidden.length,
        optionalTotal: presented.optionalTotal,
        docMode
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Validate set equality (for testing)
// ═══════════════════════════════════════════════════════════════════════════════

export function validateSetEquality<T>(
    original: T[],
    presented: PresentedQuestions<T>,
    getId: (item: T) => string
): boolean {
    const originalIds = new Set(original.map(getId));
    const presentedIds = new Set([
        ...presented.optionalVisible.map(getId),
        ...presented.optionalHidden.map(getId)
    ]);

    if (originalIds.size !== presentedIds.size) return false;

    for (const id of originalIds) {
        if (!presentedIds.has(id)) return false;
    }

    return true;
}
