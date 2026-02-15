/**
 * V7 Medical Layer — Index
 *
 * Re-exports all medical layer functionality
 */

// Types
export * from './types';

// Facts creation and application
export {
    createFactsFromExtracted,
    applyAnswersToFacts,
    normalizeYesNo,
    normalizeCariesDepth,
} from './facts';

// Askback evaluation
export {
    evaluateAskbacks,
    hasUnansweredRequired,
    getUnansweredRequired,
} from './askbackMatrix.v1';

// Chip emission
export {
    emitChipsFromFacts,
    getChipIdsFromFacts,
    type ChipEmission,
} from './chipsFromFacts';

// KB-Driven Engine (v1)
export {
    applyMedicalKb,
    withToothScope,
    stripToothScope,
    getToothFromScopedId,
    type MedicalEvalInput,
    type MedicalEvalOutput,
} from '../../medical_kb/engine';
