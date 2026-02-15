/**
 * V10 UI Pipeline Result Normalizer
 * 
 * Per spec Phase 2: Single adapter function to normalize pipeline result for UI.
 * The UI must render ONLY from this normalized shape.
 */

import type { PipelineResult } from '../pipeline/types';
import type { DynamicQuestion } from '../../contracts/questions';
import type { ComposedSection } from '../../contracts/output';

export type NormalizedUiState = 'idle' | 'running' | 'questions' | 'review' | 'output' | 'error';
export type UiStep = 'dictation' | 'review' | 'output' | 'error';

export interface NormalizedPipelineResult {
    /** Current UI state */
    state: NormalizedUiState;

    /** UI Stepper step (derived from state) */
    step: UiStep;

    /** Questions to display (for state='questions'/'review') */
    questions: DynamicQuestion[];

    /** Output text (for state='output') */
    outputText: string;

    /** Output sections (for state='output') */
    outputSections: ComposedSection[];

    /** Billing codes (for state='output') */
    billingCodes: string[];

    /** Tooth summary */
    toothSummary: {
        tooth: string | null;
        surfaces: string[];
    };

    /** Trace info for debugging */
    trace: {
        chips: string[];
        meta: Record<string, unknown>;
        explain: string | null;
        billingGuard?: { allowed: number; blocked: number };
    };

    /** Instances (for multi-mode) */
    instances: Array<{
        id: string;
        tooth: string | null;
        treatmentId: string;
    }>;

    /** Error message (for state='error') */
    error: string | null;

    /** Diagnostic info for contract violations */
    diagnostic: string | null;

    /** Can user edit/review (true when output state) */
    canEdit: boolean;

    /** Insurance type from payload */
    insuranceType: 'GKV' | 'PKV' | 'MKV' | null;

    /** Raw result for advanced debugging */
    _raw: PipelineResult | null;
}

/**
 * Normalize a pipeline result for UI consumption.
 * This is the ONLY shape the UI should render from.
 * 
 * M52: Strict invariants enforced:
 * - questions state with no questions → error
 * - output state with no output → error
 * - output with unexplained empty billing → error
 */
export function normalizePipelineResultForUi(
    result: PipelineResult | null,
    isProcessing: boolean = false
): NormalizedPipelineResult {
    // Helper to derive step from state
    const deriveStep = (state: NormalizedUiState): UiStep => {
        switch (state) {
            case 'idle':
            case 'running':
                return 'dictation';
            case 'questions':
            case 'review':
                return 'review';
            case 'output':
                return 'output';
            case 'error':
                return 'error';
            default:
                return 'dictation';
        }
    };

    // Default empty state
    const empty: NormalizedPipelineResult = {
        state: isProcessing ? 'running' : 'idle',
        step: isProcessing ? 'dictation' : 'dictation',
        questions: [],
        outputText: '',
        outputSections: [],
        billingCodes: [],
        toothSummary: { tooth: null, surfaces: [] },
        trace: { chips: [], meta: {}, explain: null },
        instances: [],
        error: null,
        diagnostic: null,
        canEdit: false,
        insuranceType: null,
        _raw: result,
    };

    if (!result) return empty;
    if (isProcessing) return { ...empty, state: 'running', step: 'dictation', _raw: result };

    // Map pipeline state to UI state
    let uiState: NormalizedUiState;
    let diagnostic: string | null = null;

    switch (result.state) {
        case 'questions':
            uiState = 'questions';
            break;
        case 'output':
            uiState = 'output';
            break;
        case 'error':
            uiState = 'error';
            break;
        default:
            uiState = 'idle';
    }

    // ═══════════════════════════════════════════════════════════════
    // M52 STRICT INVARIANTS
    // ═══════════════════════════════════════════════════════════════

    // INVARIANT 1: questions state with no questions → error
    if (uiState === 'questions' && (!result.questions || result.questions.length === 0)) {
        console.error('[V10_UI NORMALIZER] CONTRACT VIOLATION: Questions state but questions array empty!', {
            state: result.state,
            questionsLength: result.questions?.length,
            hasBundle: !!result.questionBundle,
        });
        uiState = 'error';
        diagnostic = 'questions_state_without_questions';
    }

    // INVARIANT 2: output state with no output → error
    if (uiState === 'output' && !result.output) {
        console.error('[V10_UI NORMALIZER] CONTRACT VIOLATION: Output state but output object missing!');
        uiState = 'error';
        diagnostic = 'output_state_without_output';
    }

    // INVARIANT 3: output with unexplained empty billing
    if (uiState === 'output' && result.output) {
        const billingCodes = result.output.billingCodes ?? [];
        if (billingCodes.length === 0) {
            // Check for explainable reasons
            const meta = result.combinability ?? result.debug as any;
            const billingGuardBlocked = (meta?.billingGuard?.blocked ?? 0) > 0;
            const billingGuardAllowedZero = (meta?.billingGuard?.allowed ?? -1) === 0;
            const insuranceFilter = meta?.insuranceFiltered === true;
            const packUnsupported = result.warnings?.some(w =>
                w.title?.includes('unsupported') || w.title?.includes('nicht unterstützt')
            );

            const isExplained = billingGuardBlocked || billingGuardAllowedZero || insuranceFilter || packUnsupported;

            if (!isExplained) {
                console.warn('[V10_UI NORMALIZER] WARNING: Output with zero billing codes not explained', {
                    billingGuard: meta?.billingGuard,
                    insuranceFiltered: insuranceFilter,
                    packUnsupported,
                });
                // Don't promote to error, but set diagnostic for visibility
                diagnostic = 'empty_billing_unexplained';
            }
        }
    }

    // Build trace with billing guard info
    const billingGuard = (result.debug as any)?.billingGuard || (result as any).billingGuard;

    return {
        state: uiState,
        step: deriveStep(uiState),
        questions: result.questions ?? [],
        outputText: result.output?.fullText ?? '',
        outputSections: result.output?.sections ?? [],
        billingCodes: result.output?.billingCodes ?? [],
        toothSummary: {
            tooth: result.extracted?.tooth ?? null,
            surfaces: result.extracted?.surfaces ?? [],
        },
        trace: {
            chips: (result.debug?.trace || []).map(t => t.detail || ''),
            meta: { traceCount: (result.debug?.trace || []).length },
            explain: null,
            billingGuard: billingGuard ? {
                allowed: billingGuard.allowed ?? 0,
                blocked: billingGuard.blocked ?? 0
            } : undefined,
        },
        instances: [],
        error: result.error ?? (diagnostic ? `Contract violation: ${diagnostic}` : null),
        diagnostic,
        canEdit: uiState === 'output',
        insuranceType: (result as any).insuranceType ?? null,
        _raw: result,
    };
}

/**
 * Check if the normalized result has valid questions to display.
 */
export function hasValidQuestions(normalized: NormalizedPipelineResult): boolean {
    return normalized.state === 'questions' && normalized.questions.length > 0;
}

/**
 * Check if the normalized result has valid output to display.
 */
export function hasValidOutput(normalized: NormalizedPipelineResult): boolean {
    return normalized.state === 'output' && (
        normalized.outputText.length > 0 ||
        normalized.outputSections.length > 0
    );
}
