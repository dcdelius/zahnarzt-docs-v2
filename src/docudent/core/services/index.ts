/**
 * CORE Services — Unified Entry Point
 * 
 * ⚠️ THESE ARE FACADES — NOT NEW IMPLEMENTATIONS
 * 
 * This module provides a single import point for all core services
 * used by the V7 pipeline. The implementations are re-exported from
 * v6/services/ (frozen, read-only).
 * 
 * Usage in V7:
 * ```ts
 * import { extractFromDictation, generateQuestions, generateFinalOutput } from '../../core/services';
 * ```
 * 
 * RULES:
 * ❌ V7 must NOT import directly from v6/
 * ✅ V7 must use these core/services facades
 */

// Extraction
export { extractFromDictation } from './extractionService';
export type { ExtractedData } from './extractionService';

// Questions
export { generateQuestions, generateQuestionsV2 } from './questionService';

// Output
export { generateFinalOutput } from './outputService';
export type { ComposedOutput, ComposedSection } from './outputService';
