/**
 * CORE Services — Unified Entry Point
 *
 * ═══════════════════════════════════════════════════════════════
 * M12.4: outputService.ts has been archived (had V6 imports).
 * V7 pipeline now delegates to V10, so it doesn't need output service.
 * ═══════════════════════════════════════════════════════════════
 *
 * For types only (ComposedOutput, etc.), import from:
 * - core/billing/knowledgeBase/logic/outputComposer
 * - contracts/output
 *
 * RULES:
 * ❌ DO NOT import from v6/**
 * ✅ V10 is the only orchestrator
 */

// Extraction
export { extractFromDictation } from './extractionService';
export type { ExtractedData } from './extractionService';

// Questions  
export { generateQuestions, generateQuestionsV2 } from './questionService';

// Output types (re-export from contracts, no V6 dependency)
export type { ComposedOutput, ComposedSection } from '../../contracts/output';

// NOTE: generateFinalOutput has been archived.
// V7 pipeline delegates to V10, which uses M9 SSOT renderer.
// If tests need legacy output, import directly from v6/services/outputService.
