/**
 * V7 Pipeline Types — IMPORTS FROM CONTRACTS ONLY
 *
 * NO INLINE TYPE COPIES ALLOWED.
 * All types are imported from src/docudent/contracts/
 * 
 * ❌ NO createWarningFromString - backend only
 * ❌ NO useDocudentV6 imports
 */

// Re-export from shared contracts - SSOT
export type {
    ValidationWarning,
    DynamicQuestion,
    ComposedOutput,
    PipelineInput,
    PipelineResult
} from '../../contracts/pipeline';

export type { ComposedSection } from '../../contracts/output';

// NO factory exports - those are backend only
