/**
 * V7 Pipeline Hook — PURE STATE CONTAINER
 * 
 * This hook is a DUMB state container:
 * - It holds the current pipeline result
 * - It provides actions to trigger pipeline.run()
 * - It does NOT contain any business logic
 * 
 * ❌ NO chip inference
 * ❌ NO conditional logic based on data values
 * ❌ NO interpretation of backend responses
 */

import { useState, useCallback } from 'react';
import { pipeline } from '../pipeline';
import type { PipelineInput, PipelineResult, DynamicQuestion } from '../pipeline/types';
import { runMultiTreatment } from '../multitreatment';
import type { MultiTreatmentPlan, MultiTreatmentResult, TreatmentSegment } from '../multitreatment/types';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type InsuranceType = 'GKV' | 'PKV';
export type TextLength = 'kurz' | 'mittel' | 'lang';

// Extended state type for multi-treatment
export type V7PipelineState = 'idle' | 'running' | 'questions' | 'output' | 'multi_output' | 'error';

interface V7State {
    /** Current dictation text */
    dictation: string;

    /** User answers to questions */
    answers: Map<string, unknown>;

    /** Insurance type */
    insuranceType: InsuranceType;

    /** Text length preference */
    textLength: TextLength;

    /** Has MKV agreement */
    hasMKV: boolean;

    /** Current pipeline result (what to render) */
    result: PipelineResult;

    /** Is pipeline currently running */
    isProcessing: boolean;

    /** Multi-treatment mode enabled */
    isMultiMode: boolean;

    /** Multi-treatment result (when in multi mode) */
    multiResult: MultiTreatmentResult | null;

    /** Manual segments for multi mode */
    segments: TreatmentSegment[];
}

const INITIAL_RESULT: PipelineResult = {
    state: 'idle',
    questions: [],
    output: null,
    warnings: []
};

// Default segments for multi mode
const createDefaultSegments = (): TreatmentSegment[] => [
    {
        id: 'seg-1',
        treatmentId: 'endo',
        dictationSlice: '',
        extracted: { tooth: null, surfaces: [], diagnosis: null, mentioned: {} },
        answers: new Map(),
        toothScope: [],
    },
    {
        id: 'seg-2',
        treatmentId: 'fuellung',
        dictationSlice: '',
        extracted: { tooth: null, surfaces: [], diagnosis: null, mentioned: {} },
        answers: new Map(),
        toothScope: [],
    },
];

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useV7Pipeline() {
    // ─── State ─────────────────────────────────────────────────
    const [state, setState] = useState<V7State>({
        dictation: '',
        answers: new Map(),
        insuranceType: 'GKV',
        textLength: 'mittel',
        hasMKV: false,
        result: INITIAL_RESULT,
        isProcessing: false,
        isMultiMode: false,
        multiResult: null,
        segments: createDefaultSegments(),
    });

    // ─── Actions (Pure Passthrough) ────────────────────────────

    const setDictation = useCallback((text: string) => {
        setState(s => ({ ...s, dictation: text }));
    }, []);

    const setInsuranceType = useCallback((type: InsuranceType) => {
        setState(s => ({ ...s, insuranceType: type }));
    }, []);

    const setTextLength = useCallback((length: TextLength) => {
        setState(s => ({ ...s, textLength: length }));
    }, []);

    const setHasMKV = useCallback((hasMKV: boolean) => {
        setState(s => ({ ...s, hasMKV }));
    }, []);

    const answerQuestion = useCallback((questionId: string, value: unknown) => {
        setState(s => {
            const newAnswers = new Map(s.answers);
            newAnswers.set(questionId, value);
            return { ...s, answers: newAnswers };
        });
    }, []);

    // ─── Multi-Treatment Actions ───────────────────────────────

    const setMultiMode = useCallback((enabled: boolean) => {
        setState(s => ({
            ...s,
            isMultiMode: enabled,
            multiResult: enabled ? null : s.multiResult,
            result: enabled ? INITIAL_RESULT : s.result,
        }));
    }, []);

    const updateSegment = useCallback((segmentId: string, updates: Partial<TreatmentSegment>) => {
        setState(s => ({
            ...s,
            segments: s.segments.map(seg =>
                seg.id === segmentId ? { ...seg, ...updates } : seg
            ),
        }));
    }, []);

    const addSegment = useCallback(() => {
        setState(s => ({
            ...s,
            segments: [
                ...s.segments,
                {
                    id: `seg-${s.segments.length + 1}`,
                    treatmentId: 'fuellung',
                    dictationSlice: '',
                    extracted: { tooth: null, surfaces: [], diagnosis: null, mentioned: {} },
                    answers: new Map(),
                    toothScope: [],
                },
            ],
        }));
    }, []);

    const removeSegment = useCallback((segmentId: string) => {
        setState(s => ({
            ...s,
            segments: s.segments.filter(seg => seg.id !== segmentId),
        }));
    }, []);

    // ─── Pipeline Execution ────────────────────────────────────
    // This is the ONLY place that calls the backend

    const runPipeline = useCallback(async () => {
        setState(s => ({ ...s, isProcessing: true }));

        const input: PipelineInput = {
            dictation: state.dictation,
            answers: state.answers,
            insuranceType: state.insuranceType,
            textLength: state.textLength,
            hasMKV: state.hasMKV
        };

        try {
            const result = await pipeline.run(input);
            setState(s => ({ ...s, result, isProcessing: false }));
        } catch (error) {
            setState(s => ({
                ...s,
                isProcessing: false,
                result: {
                    state: 'error',
                    questions: [],
                    output: null,
                    warnings: [],
                    error: String(error)
                }
            }));
        }
    }, [state.dictation, state.answers, state.insuranceType, state.textLength, state.hasMKV]);

    // ─── Multi-Treatment Execution ─────────────────────────────

    const runMulti = useCallback(async (plan?: MultiTreatmentPlan) => {
        setState(s => ({ ...s, isProcessing: true }));

        // Build plan from current segments if not provided
        const executionPlan: MultiTreatmentPlan = plan || {
            segments: state.segments,
            executionOrder: 'sequential',
            context: {
                sessionId: `session-${Date.now()}`,
                insuranceType: state.insuranceType,
                textLength: state.textLength,
                hasMKV: state.hasMKV,
            },
        };

        try {
            const result = await runMultiTreatment(executionPlan);
            setState(s => ({
                ...s,
                multiResult: result,
                isProcessing: false,
                result: {
                    ...INITIAL_RESULT,
                    state: 'output', // Use output state for rendering
                },
            }));
        } catch (error) {
            setState(s => ({
                ...s,
                isProcessing: false,
                multiResult: null,
                result: {
                    state: 'error',
                    questions: [],
                    output: null,
                    warnings: [],
                    error: String(error)
                }
            }));
        }
    }, [state.segments, state.insuranceType, state.textLength, state.hasMKV]);

    // ─── Reset ─────────────────────────────────────────────────

    const reset = useCallback(() => {
        setState({
            dictation: '',
            answers: new Map(),
            insuranceType: state.insuranceType, // Preserve
            textLength: state.textLength,       // Preserve
            hasMKV: state.hasMKV,               // Preserve
            result: INITIAL_RESULT,
            isProcessing: false,
            isMultiMode: false,
            multiResult: null,
            segments: createDefaultSegments(),
        });
    }, [state.insuranceType, state.textLength, state.hasMKV]);

    // ─── Derived State ─────────────────────────────────────────

    // Determine current display state
    const getCurrentState = (): V7PipelineState => {
        if (state.isProcessing) return 'running';
        if (state.result.state === 'error') return 'error';
        if (state.isMultiMode && state.multiResult) return 'multi_output';
        if (state.result.state === 'questions') return 'questions';
        if (state.result.state === 'output') return 'output';
        return 'idle';
    };

    // ─── Return ────────────────────────────────────────────────

    return {
        // State (read-only)
        dictation: state.dictation,
        answers: state.answers,
        insuranceType: state.insuranceType,
        textLength: state.textLength,
        hasMKV: state.hasMKV,
        result: state.result,
        isProcessing: state.isProcessing,
        isMultiMode: state.isMultiMode,
        multiResult: state.multiResult,
        segments: state.segments,

        // Derived state (NO LOGIC, just convenience)
        currentState: getCurrentState(),
        questions: state.result.questions,
        output: state.result.output,
        warnings: state.result.warnings,
        error: state.result.error,
        extracted: state.result.extracted,

        // Single-treatment actions
        setDictation,
        setInsuranceType,
        setTextLength,
        setHasMKV,
        answerQuestion,
        runPipeline,
        reset,

        // Multi-treatment actions
        setMultiMode,
        updateSegment,
        addSegment,
        removeSegment,
        runMulti,
    };
}

export type V7PipelineHook = ReturnType<typeof useV7Pipeline>;
