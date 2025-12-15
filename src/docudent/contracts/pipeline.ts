/**
 * SHARED CONTRACTS — Pipeline
 *
 * This is the SINGLE SOURCE OF TRUTH for pipeline types.
 * V7 MUST import from here only.
 */

import type { ValidationWarning } from './warnings';
import type { DynamicQuestion } from './questions';
import type { ComposedOutput } from './output';

// Re-export for convenience
export type { ValidationWarning, DynamicQuestion, ComposedOutput };

export interface PipelineInput {
    /** Raw dictation text */
    dictation: string;

    /** User answers to questions */
    answers: Map<string, unknown>;

    /** Insurance type */
    insuranceType: 'GKV' | 'PKV';

    /** Text length preference */
    textLength: 'kurz' | 'mittel' | 'lang';

    /** Has MKV agreement */
    hasMKV?: boolean;

    /** Treatment category */
    treatmentId?: string;

    /** User defaults/preferences for pre-filling answers */
    userDefaults?: { [treatmentId: string]: { [questionId: string]: string | number | boolean } };
}

export interface PipelineResult {
    /** Current state */
    state: 'idle' | 'processing' | 'questions' | 'output' | 'error';

    /** Questions to display */
    questions: DynamicQuestion[];

    /** Composed output */
    output: ComposedOutput | null;

    /** Validation warnings - OBJECTS, not strings */
    warnings: ValidationWarning[];

    /** Error message */
    error?: string;

    /** Extracted data (display only) */
    extracted?: {
        tooth: string | null;
        surfaces: string[];
        diagnosis: string | null;
    };
}
