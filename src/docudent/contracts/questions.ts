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

    /** Key from QuestionBank (SSOT reference) */
    questionKey?: string;

    /** Question category */
    category: 'forensic' | 'upsell' | 'mkv' | 'rule';

    /** Question text to display */
    question: string;

    /** Input type */
    type?: 'single' | 'number' | 'multi';

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
}
