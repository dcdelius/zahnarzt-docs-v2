/**
 * CORE Output Service — FACADE
 * 
 * ⚠️ THIS IS A FACADE — NOT A NEW IMPLEMENTATION
 * 
 * This module re-exports output generation functionality for use by V7 pipeline.
 * The actual implementation lives in v6/services/ (frozen, read-only).
 * 
 * This facade exists solely to eliminate V6 imports from V7.
 * 
 * RULES:
 * ❌ DO NOT add new logic here
 * ❌ DO NOT modify output behavior
 * ✅ ONLY re-export existing V6 functionality
 * ✅ Update imports when V6 is eventually deprecated
 */

// Re-export from V6 (frozen)
// TODO: When V6 is fully deprecated, implement here directly
export { generateFinalOutput } from '../../v6/services/outputService';

// Re-export types
export type { ComposedOutput, ComposedSection } from '../billing/knowledgeBase/logic/outputComposer';
