/**
 * V7 Pipeline Trace Stages — SINGLE SOURCE OF TRUTH
 * 
 * These are the LOCKED stage names used by the V7 pipeline.
 * Gate 6 tests assert against this list.
 * 
 * If you need to add/remove/rename stages, you MUST:
 * 1. Update this list
 * 2. Update corresponding trace() calls in index.ts
 * 3. Update Gate 6 tests (they will fail automatically)
 */

export const V7_TRACE_STAGES = [
    'PIPELINE_INPUT',
    'EXTRACTED',
    'QUESTIONS',
    'NORMALIZED_ANSWERS',
    'OUTPUT_INPUT',
    'OUTPUT_RESULT',
] as const;

export type V7TraceStage = typeof V7_TRACE_STAGES[number];

// Named exports for direct import in index.ts
export const STAGE_PIPELINE_INPUT = V7_TRACE_STAGES[0];
export const STAGE_EXTRACTED = V7_TRACE_STAGES[1];
export const STAGE_QUESTIONS = V7_TRACE_STAGES[2];
export const STAGE_NORMALIZED_ANSWERS = V7_TRACE_STAGES[3];
export const STAGE_OUTPUT_INPUT = V7_TRACE_STAGES[4];
export const STAGE_OUTPUT_RESULT = V7_TRACE_STAGES[5];
