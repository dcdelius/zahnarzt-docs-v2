/**
 * Combinability Module Index
 *
 * Export the SSOT-based combinability checker.
 */

export { checkCombinabilityFromKb } from './checkCombinabilityFromKb';
export type { CombinabilityContext } from './checkCombinabilityFromKb';

// Re-export types from schema
export type {
    CombinabilityCheckResult,
    CombinabilityConflict,
    CombinabilityVerdict,
    CombinabilityRule,
    CombinabilityScope,
} from '../../kb/combinability/schema.v1';
