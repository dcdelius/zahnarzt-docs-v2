/**
 * Re-export multi-treatment module
 */
export { runMultiTreatment } from './orchestrator';
export { segmentDictation } from './segmentationService';
export { runMultiFromDictation } from './runMultiFromDictation';
export type { SegmentDictationInput } from './segmentationService';
export type { RunMultiFromDictationInput } from './runMultiFromDictation';
export type {
    TreatmentSegment,
    TreatmentRunResult,
    MultiTreatmentPlan,
    MultiTreatmentResult,
    CrossTreatmentContext,
    BillingCode,
    BillingConflict,
    MultiTreatmentInput,
} from './types';

