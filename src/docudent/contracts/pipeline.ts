/**
 * SHARED CONTRACTS — Pipeline
 *
 * This is the SINGLE SOURCE OF TRUTH for pipeline types.
 * V7 MUST import from here only.
 */

import type { ValidationWarning } from './warnings';
import type { DynamicQuestion, QuestionBundle } from './questions';
import type { ComposedOutput } from './output';
import type { CombinabilityResult } from './compose';

// Re-export for convenience
export type { ValidationWarning, DynamicQuestion, QuestionBundle, ComposedOutput, CombinabilityResult };

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

    /** 
     * Pre-extracted data to use instead of re-extracting from dictation.
     * Used by orchestrator to preserve per-instance extraction through retry.
     */
    preExtracted?: {
        tooth: string | null;
        surfaces: string[];
        diagnosis: string | null;
        mentioned: Record<string, string | boolean>;
    };
}

export interface PipelineResult {
    /** Current state */
    state: 'idle' | 'processing' | 'questions' | 'output' | 'error' | 'unsupported';

    /** Questions to display (flat list for backward compatibility) */
    questions: DynamicQuestion[];

    /** P12.7c: Question bundle with progressive disclosure (preferred over flat questions) */
    questionBundle?: QuestionBundle;

    /** Composed output */
    output: ComposedOutput | null;

    /** Validation warnings - OBJECTS, not strings */
    warnings: ValidationWarning[];

    /** Error message */
    error?: string;

    /** P12.8c: Reason for unsupported state (e.g., 'milchzahn') */
    reason?: string;

    /** P12.8a: Combinability check result for UI banner */
    combinability?: CombinabilityResult;

    /** Extracted data (display only) */
    extracted?: {
        tooth: string | null;
        teeth?: string[];  // P14.X: All detected teeth (SSOT for multi-instance)
        surfaces: string[];
        diagnosis: string | null;
    };

    /** Debug/trace info (DEV/TEST only, gated by env flag) */
    debug?: PipelineDebugInfo;
}

/** Trace marker for wiring proof */
export interface TraceMarker {
    stage: 'input' | 'extract' | 'extract_detail' | 'medical_summary' | 'defaults' | 'questions' | 'answers' | 'gate' | 'render' | 'billing' | 'billing_inputs' | 'billing_result' | 'billing_guard' | 'combinability' | 'testOnly' | 'kb_medical' | 'kb_treatment';
    detail: string;
}

/** Debug info attached to pipeline result */
export interface PipelineDebugInfo {
    /** Ordered trace markers showing pipeline flow */
    trace: TraceMarker[];
    /** Whether trace collection was enabled */
    traceEnabled: boolean;
}
