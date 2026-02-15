/**
 * Run Multi-Treatment From Dictation
 * 
 * High-level helper that converts raw dictation → MultiTreatmentResult.
 * Wires: segmentDictation() → runMultiTreatment(plan)
 */

import { segmentDictation } from './segmentationService';
import { runMultiTreatment } from './orchestrator';
import type { MultiTreatmentResult } from './types';

// ═══════════════════════════════════════════════════════════════
// INPUT TYPE
// ═══════════════════════════════════════════════════════════════

export interface RunMultiFromDictationInput {
    /** Raw dictation text */
    dictation: string;
    /** Insurance type */
    insuranceType: 'GKV' | 'PKV';
    /** Text length preference */
    textLength: 'kurz' | 'mittel' | 'lang';
    /** Has MKV agreement */
    hasMKV: boolean;
    /** Optional global answers to seed each segment with */
    answers?: Map<string, unknown>;
    /** User defaults for pre-filling answers */
    userDefaults?: Record<string, Record<string, unknown>>;
    /** Session identifier (optional) */
    sessionId?: string;
}

// ═══════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Run multi-treatment pipeline from a single dictation string.
 * 
 * 1. Segments dictation via keyword detection
 * 2. Seeds each segment with provided answers (if any)
 * 3. Runs orchestrator on the plan
 * 
 * @param input - Dictation and configuration
 * @returns MultiTreatmentResult with all runs and merged output
 */
export async function runMultiFromDictation(
    input: RunMultiFromDictationInput
): Promise<MultiTreatmentResult> {
    const {
        dictation,
        insuranceType,
        textLength,
        hasMKV,
        answers,
        userDefaults,
        sessionId,
    } = input;

    // Step 1: Segment the dictation
    const plan = segmentDictation({
        dictation,
        insuranceType,
        textLength,
        hasMKV,
        userDefaults,
        sessionId,
    });

    // Step 2: Seed answers into each segment (if provided)
    if (answers && answers.size > 0) {
        for (const segment of plan.segments) {
            // Create a NEW Map instance for each segment (do NOT share)
            segment.answers = new Map(answers);
        }
    }

    // Step 3: Run the orchestrator
    return await runMultiTreatment(plan);
}

export default { runMultiFromDictation };
