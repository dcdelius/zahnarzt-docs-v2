/**
 * V7 Pipeline — COMPATIBILITY SHIM FOR V10
 *
 * M12.3: V7 is now a thin compatibility layer that delegates ALL
 * execution to V10. No orchestration logic remains in V7.
 *
 * Flow: V7 Input → Adapt → V10 → Adapt → V7 Output
 *
 * ❌ NO extraction calls
 * ❌ NO question generation
 * ❌ NO answer normalization
 * ❌ NO output generation
 * ❌ NO legacy V6 imports
 *
 * ✅ ONLY adapt V7 input → V10 input
 * ✅ ONLY call V10 via public.ts
 * ✅ ONLY adapt V10 output → V7 output
 */

import type { PipelineInput, PipelineResult, PipelineDebugInfo } from './types';

// V10 PUBLIC API — THE ONLY RUNTIME DEPENDENCY
import { runV10 } from '../../v10/public';

// Adapters — convert between V7 and V10 formats
import {
    toV10Input,
    requiresBundleOrchestration,
} from './adapters/toV10Input';
import { fromV10Output } from './adapters/fromV10Output';

// ═══════════════════════════════════════════════════════════════
// PIPELINE.RUN — THIN DELEGATION TO V10
// ═══════════════════════════════════════════════════════════════

/**
 * Execute the V7 pipeline by delegating to V10.
 *
 * This function is a THIN SHIM that:
 * 1. Converts V7 input to V10 input
 * 2. Calls V10 via the public API
 * 3. Converts V10 output to V7 output
 *
 * NO ORCHESTRATION LOGIC. V10 IS THE RUNTIME.
 *
 * @param input - V7 PipelineInput
 * @returns V7 PipelineResult
 */
export async function run(input: PipelineInput): Promise<PipelineResult> {
    try {
        // ─── STEP 1: Convert V7 Input → V10 Input ───────────────────
        const v10Input = toV10Input(input);

        // Debug logging (V7_DEBUG)
        if (typeof window !== 'undefined' && localStorage?.getItem('V7_DEBUG') === 'true') {
            console.debug('[V7 Pipeline] Delegating to V10:', {
                treatmentId: v10Input.treatmentId,
                insuranceType: v10Input.insuranceType,
                hasAnswers: v10Input.answers?.size ?? 0,
            });
        }

        // ─── STEP 2: Call V10 ───────────────────────────────────────
        // V10 handles ALL orchestration: extraction, facts, engine,
        // questions, rendering, billing, trace, combinability, etc.
        const v10Output = await runV10(v10Input);

        // ─── STEP 3: Convert V10 Output → V7 Output ─────────────────
        const v7Result = fromV10Output(v10Output);

        // Attach V10 trace information if available
        if (v10Output.meta?.traceLines) {
            v7Result.debug = v7Result.debug ?? { trace: [], traceEnabled: true };
            (v7Result.debug as any).v10TraceLines = v10Output.meta.traceLines;
        }

        return v7Result;

    } catch (error) {
        // Error fallback — no retry, no silent degradation
        return {
            state: 'error',
            questions: [],
            output: null,
            warnings: [],
            error: `V10 delegation failed: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ═══════════════════════════════════════════════════════════════

export const pipeline = { run };
export default pipeline;
