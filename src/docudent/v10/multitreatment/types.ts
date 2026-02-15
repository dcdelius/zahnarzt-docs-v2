/**
 * Multi-Treatment Type Contracts
 * 
 * Defines entities for multi-treatment orchestration.
 * The orchestrator wraps the existing single-treatment pipeline.
 * 
 * P14.1: Segment answer isolation via per-segment answers Map
 * P14.2: SSOT output via MultiComposedDocumentV1
 * P14.3: Billing aggregation with scope (TOOTH/SESSION/UNKNOWN)
 */

import type { PipelineResult, ComposedOutput, ValidationWarning, QuestionBundle } from '../../contracts/pipeline';
import type { CombinabilityResult } from '../../contracts/compose';

// ─── Treatment Instance (P14.X1) ───────────────────────────────
/**
 * P14.X1: A single instance of a treatment on a specific tooth.
 * 
 * Use case: Run the same treatment (e.g., fuellung) on multiple teeth
 * in one session. Each tooth gets its own instance, sharing questions
 * but with isolated answers per tooth.
 * 
 * Example: fuellung on 16 + fuellung on 15 = 2 instances
 */
export interface TreatmentInstance {
    /** Unique instance identifier (format: treatmentId-tooth, e.g., "fuellung-16") */
    instanceId: string;
    /** Tooth this instance applies to */
    tooth: string;
    /** Portion of dictation for this instance (optional if shared) */
    dictationSlice?: string;
    /** Extraction result specific to this tooth */
    extracted: {
        tooth: string | null;
        surfaces: string[];
        diagnosis: string | null;
        mentioned: Record<string, unknown>;
    };
    /** Answers specific to this instance (per-tooth isolation) */
    answers: Map<string, unknown>;
}

// ─── Treatment Segment ─────────────────────────────────────────
/**
 * A portion of dictation mapped to a single treatment type.
 * 
 * P14.X1: Can now contain multiple instances for same treatment on different teeth.
 */
export interface TreatmentSegment {
    /** Unique segment identifier */
    id: string;
    /** Treatment type for this segment */
    treatmentId: string;
    /** Portion of dictation for this segment */
    dictationSlice: string;
    /** Scoped extraction result */
    extracted: {
        tooth: string | null;
        surfaces: string[];
        diagnosis: string | null;
        mentioned: Record<string, unknown>;
    };
    /** Pre-filled answers for this segment */
    answers: Map<string, unknown>;
    /** Teeth covered by this segment */
    toothScope: string[];
    /** P14.X1: Instances for same treatment on multiple teeth */
    instances?: TreatmentInstance[];
}


// ─── Treatment Run Result ──────────────────────────────────────
/**
 * Result of running the single-treatment pipeline on one segment or instance.
 * P14.X1: Can represent instance-level runs via instanceId.
 */
export interface TreatmentRunResult {
    /** Segment that was processed (for segment-level runs) */
    segmentId: string;
    /** Treatment type that was run */
    treatmentId: string;
    /** P14.X1: Instance that was processed (for instance-level runs) */
    instanceId?: string;
    /** Full pipeline result (unchanged) */
    result: PipelineResult;
    /** Billing codes from this run (extracted for convenience) */
    billingCodes: BillingCode[];
    /** Warnings from this run */
    warnings: ValidationWarning[];
}

// ─── Multi-Treatment Plan ──────────────────────────────────────
/**
 * Ordered list of segments to execute.
 */
export interface MultiTreatmentPlan {
    /** Segments to process */
    segments: TreatmentSegment[];
    /** Execution mode */
    executionOrder: 'parallel' | 'sequential';
    /** Shared context across runs */
    context: CrossTreatmentContext;
}

// ─── Cross-Treatment Context ───────────────────────────────────
/**
 * Shared state across treatment runs.
 */
export interface CrossTreatmentContext {
    /** Session identifier */
    sessionId: string;
    /** Patient identifier (optional) */
    patientId?: string;
    /** Insurance type for all segments */
    insuranceType: 'GKV' | 'PKV';
    /** Text length preference */
    textLength: 'kurz' | 'mittel' | 'lang';
    /** MKV agreement */
    hasMKV: boolean;
    /** User defaults (applied per-segment) */
    userDefaults?: Record<string, Record<string, unknown>>;
}

/**
 * Billing code scope determines aggregation behavior:
 * - TOOTH: Duplicates allowed if tooth differs (e.g., filling on 16 + filling on 15)
 * - SESSION: Duplicates must dedupe or trigger WARN/BLOCK (e.g., X-ray per session)
 * - JAW: Duplicates must dedupe per jaw (Kiefer)
 * - CASE: Duplicates must dedupe per case (Behandlung)
 * - UNKNOWN: Default, conservative WARN when duplicated
 */
export type BillingScope = 'TOOTH' | 'SESSION' | 'JAW' | 'CASE' | 'UNKNOWN';


/**
 * Billing code with scope context for multi-treatment aggregation.
 */
export interface BillingCode {
    code: string;
    type: 'BEMA' | 'GOZ' | 'GOÄ';
    description?: string;
    /** P14.3: Tooth this code applies to (for TOOTH-scoped items) */
    tooth?: string;
    /** P14.3: Scope of this billing item */
    scope?: BillingScope;
    /** P14.3: Segment that produced this code */
    segmentId?: string;
    /** P14.X1: Instance that produced this code (for instance-level runs) */
    instanceId?: string;
}

/**
 * Billing conflict between runs.
 */
export interface BillingConflict {
    type: 'duplicate' | 'mutually_exclusive' | 'upgrade' | 'regression';
    codes: string[];
    segments: string[];
    resolution?: 'keep_first' | 'keep_highest' | 'user_decision';
}

// ─── Multi-Treatment Result (P14.2: SSOT Aggregation) ─────────
/**
 * Multi-treatment aggregated state:
 * - 'questions': At least one segment needs questions
 * - 'output': All segments have completed output
 * - 'error': At least one segment errored
 */
export type MultiAggregatedState = 'questions' | 'output' | 'error';

/**
 * Final result of multi-treatment orchestration with SSOT fields.
 */
export interface MultiTreatmentResult {
    /** Aggregated state (derived from per-segment states) */
    aggregatedState: MultiAggregatedState;

    /** Results per segment */
    runs: TreatmentRunResult[];

    /** P14.1: Per-treatment question bundles (when aggregatedState === 'questions') */
    perTreatmentBundles: Record<string, QuestionBundle>;

    /** P14.X1: Per-instance question bundles (keyed by instanceId) */
    perInstanceBundles?: Record<string, QuestionBundle>;

    /** P14.X9: Per-instance unanswered question IDs (keyed by instanceId) */
    unansweredByInstance?: Record<string, string[]>;

    /** Merged output from all runs (legacy compat) */
    mergedOutput: ComposedOutput;

    /** P14.2: SSOT aggregated copy text with deterministic separator */
    aggregatedCopyText: string;

    /** P14.3: Scope-aware deduplicated billing codes */
    billingCodes: BillingCode[];

    /** Detected conflicts */
    conflicts: BillingConflict[];

    /** P14.3: Combined combinability result (aggregated across all segments) */
    combinability: CombinabilityResult | null;

    /** Aggregated warnings */
    warnings: ValidationWarning[];

    /** Session-level upsell hints (deterministic) */
    upsellHints?: Array<{
        type: 'mkv';
        segmentId: string;
        tooth?: string;
        message: string;
        requiredAskbacks: string[];
    }>;
}

// ─── Orchestrator Input ────────────────────────────────────────
/**
 * Input to multi-treatment orchestrator.
 */
export interface MultiTreatmentInput {
    plan: MultiTreatmentPlan;
}
