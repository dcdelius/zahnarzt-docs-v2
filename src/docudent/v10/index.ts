/**
 * V10 — Barrel Export
 *
 * THE SINGLE ENTRY POINT for pipeline execution.
 */

export { runV10 } from './pipeline/runV10';
export { runV10Bundle } from './pipeline/runV10Bundle';
export { runPreanalyzedBundle } from './preanalysis/runPreanalyzedBundle';

export type {
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
