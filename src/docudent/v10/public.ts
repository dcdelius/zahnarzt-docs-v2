/**
 * V10 Public API
 *
 * Clean import surface for V10 pipeline.
 * This is the ONLY authorized entry point for pipeline execution.
 */

// Main orchestrators
export { runV10, runV10Bundle } from './index';

// Types
export type {
    // Single-instance types
    V10PipelineInput,
    V10PipelineOutput,
    V10PipelineState,
    V10PipelineMeta,
    V10PipelineTrace,
    V10InstanceTrace,
    // Bundle types
    TreatmentId,
    InsuranceType,
    TextLength,
    BillingScope,
    V10InstanceInput,
    V10TreatmentSegmentInput,
    V10BundleInput,
    V10ScopedBillingCode,
    V10SegmentOutput,
    V10BundleOutput,
} from './types';
