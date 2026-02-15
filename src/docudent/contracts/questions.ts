/**
 * SHARED CONTRACTS — DynamicQuestion
 *
 * This is the SINGLE SOURCE OF TRUTH for question types.
 * All modules (backend AND frontend) MUST import from here.
 */

export interface QuestionOption {
    id: string;
    label: string;
    dataValue?: unknown;
    chipActivation?: string;
    /** Patch to apply when this option is selected */
    patch?: Record<string, unknown>;
}

export interface DynamicQuestion {
    /** Unique question identifier (stable) */
    id: string;

    /** Instance this question belongs to (for multi-treatment) */
    instanceId?: string;
    questionKey?: string;

    /** Question category - 'medical' for medical hard/soft askbacks */
    category: 'medical' | 'forensic' | 'upsell' | 'mkv' | 'rule';

    /** Question text to display */
    question: string;

    /** Input type */
    type?: 'single' | 'number' | 'multi' | 'text' | 'perCanalTable';

    /** Options for single/multi type */
    options?: QuestionOption[];

    /** Current answer (if pre-filled) */
    answered?: unknown;

    // Number-specific fields
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    presets?: number[];
    defaultValue?: number;

    /** Data field path to write answer to */
    dataField?: string;

    // Rule metadata (for rule-triggered questions)
    /** Rule ID that triggered this question */
    ruleId?: string;
    /** Risk level from rule */
    riskLevel?: 'niedrig' | 'mittel' | 'hoch';
    /** Whether unanswered question is a regress risk */
    regressRisk?: boolean;
    /** Medical severity: 'hard' for MUST-answer, 'soft' for SHOULD-answer */
    medicalSeverity?: 'hard' | 'soft';
}

// ═══════════════════════════════════════════════════════════════════════════════
// P7: QUESTION BUNDLE — Presentation-grouped questions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Documentation mode for presentation policy.
 * - fast: Minimize UI, hide optional
 * - balanced: Default, optional collapsed
 * - forensic: Show everything expanded
 */
export type DocMode = 'fast' | 'balanced' | 'forensic';

/**
 * Grouped questions for UI rendering.
 * INVARIANT: (optionalVisible ∪ optionalHidden) === all soft askbacks
 */
export interface QuestionBundle {
    /** HARD askbacks — always visible, always rendered, always on top */
    required: DynamicQuestion[];

    /** SOFT askbacks visible without expanding (may be empty in collapsed mode) */
    optionalVisible: DynamicQuestion[];

    /** SOFT askbacks hidden behind collapse toggle */
    optionalHidden: DynamicQuestion[];

    /** Total optional questions (for UI display: "Optional (X)") */
    optionalTotal: number;

    /** Documentation mode used for this bundle */
    docMode: DocMode;
}
