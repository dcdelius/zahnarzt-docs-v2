/**
 * Multi-Treatment Type Contracts
 * 
 * Defines entities for multi-treatment orchestration.
 * The orchestrator wraps the existing single-treatment pipeline.
 */

import type { PipelineResult, ComposedOutput, ValidationWarning } from '../../contracts/pipeline';

// ─── Treatment Segment ─────────────────────────────────────────
/**
 * A portion of dictation mapped to a single treatment type.
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
}

// ─── Treatment Run Result ──────────────────────────────────────
/**
 * Result of running the single-treatment pipeline on one segment.
 */
export interface TreatmentRunResult {
    /** Segment that was processed */
    segmentId: string;
    /** Treatment type that was run */
    treatmentId: string;
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

// ─── Billing Types ─────────────────────────────────────────────
/**
 * Billing code (simplified for contract).
 */
export interface BillingCode {
    code: string;
    type: 'BEMA' | 'GOZ' | 'GOÄ';
    description?: string;
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

// ─── Multi-Treatment Result ────────────────────────────────────
/**
 * Final result of multi-treatment orchestration.
 */
export interface MultiTreatmentResult {
    /** Results per segment */
    runs: TreatmentRunResult[];
    /** Merged output from all runs */
    mergedOutput: ComposedOutput;
    /** Deduplicated billing codes */
    billingCodes: BillingCode[];
    /** Detected conflicts */
    conflicts: BillingConflict[];
    /** Aggregated warnings */
    warnings: ValidationWarning[];
}

// ─── Orchestrator Input ────────────────────────────────────────
/**
 * Input to multi-treatment orchestrator.
 */
export interface MultiTreatmentInput {
    plan: MultiTreatmentPlan;
}
