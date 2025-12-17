/**
 * CORE Question Service — FACADE
 *
 * ═══════════════════════════════════════════════════════════════
 * Re-exports question functionality from core/questions.
 * V7 pipeline and other consumers should import from here.
 * ═══════════════════════════════════════════════════════════════
 *
 * RULES:
 * ❌ DO NOT import from v6/**
 * ✅ Import from core/questions/**
 */

// Re-export from core/questions
export { generateQuestions } from '../questions/questionService';
export { generateQuestionsV2 } from '../questions/questionServiceV2';

// Re-export types
export type { InsuranceType } from '../questions/questionService';
export type { QuestionContext } from '../questions/questionServiceV2';
