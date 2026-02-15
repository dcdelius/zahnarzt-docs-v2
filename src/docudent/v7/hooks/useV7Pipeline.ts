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

import { useState, useCallback, useRef, useEffect } from 'react';
import { pipeline } from '../pipeline';
import type { PipelineInput, PipelineResult, DynamicQuestion } from '../pipeline/types';
import { runMultiTreatment } from '../multitreatment';
import type { MultiTreatmentPlan, MultiTreatmentResult, TreatmentSegment, TreatmentInstance } from '../multitreatment/types';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type InsuranceType = 'GKV' | 'PKV';
export type TextLength = 'kurz' | 'mittel' | 'lang';

// Extended state type for multi-treatment
export type V7PipelineState = 'idle' | 'running' | 'questions' | 'output' | 'multi_output' | 'error' | 'unsupported';

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

    /** Treatment type (SSOT for treatment selection) */
    treatmentId: string;

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

    /** P14.X6: Per-instance answers for multi-instance mode */
    instanceAnswers: Record<string, Map<string, unknown>>;

    /** P14.X9 B: Last multi-instance plan for retry functionality */
    lastMultiPlan: LastMultiPlan | null;
}

/** P14.X9 B: Stored plan for retry after questions */
interface LastMultiPlan {
    treatmentId: string;
    dictation: string;
    /** Full instances with extracted data to preserve through retry */
    instances: TreatmentInstance[];
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
        treatmentId: 'fuellung', // Default treatment
        result: INITIAL_RESULT,
        isProcessing: false,
        isMultiMode: false,
        multiResult: null,
        segments: createDefaultSegments(),
        instanceAnswers: {},  // P14.X6: Per-instance answers
        lastMultiPlan: null,  // P14.X9 B: Retry plan
    });

    // Keep a ref to current state to avoid stale closures in async callbacks
    // IMPORTANT: Must update synchronously during render, not in useEffect
    // useEffect runs AFTER render and callbacks could fire before it runs
    const stateRef = useRef(state);
    stateRef.current = state;  // Sync on every render (synchronous)

    // M51: Monotonic runId to prevent stale async results from overwriting fresh ones
    const runIdCounterRef = useRef(0);
    const lastRunIdRef = useRef(0);

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

    const setTreatmentId = useCallback((treatmentId: string) => {
        setState(s => ({ ...s, treatmentId }));
    }, []);

    const answerQuestion = useCallback((questionId: string, value: unknown) => {
        setState(s => {
            const newAnswers = new Map(s.answers);
            newAnswers.set(questionId, value);
            const newState = { ...s, answers: newAnswers };
            // Also update the ref immediately so runPipeline gets fresh answers
            stateRef.current = newState;
            return newState;
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

    // P14.1: Answer a question for a specific segment (isolation)
    const answerSegmentQuestion = useCallback((segmentId: string, questionId: string, value: unknown) => {
        setState(s => ({
            ...s,
            segments: s.segments.map(seg => {
                if (seg.id !== segmentId) return seg;
                const newAnswers = new Map(seg.answers);
                newAnswers.set(questionId, value);
                return { ...seg, answers: newAnswers };
            }),
        }));
    }, []);

    // P14.1: Get answers for a specific segment
    const getSegmentAnswers = useCallback((segmentId: string): Map<string, unknown> => {
        const segment = state.segments.find(s => s.id === segmentId);
        return segment?.answers || new Map();
    }, [state.segments]);

    // P14.1: Clear answers for a specific segment
    const clearSegmentAnswers = useCallback((segmentId: string) => {
        setState(s => ({
            ...s,
            segments: s.segments.map(seg =>
                seg.id === segmentId ? { ...seg, answers: new Map() } : seg
            ),
        }));
    }, []);

    // P14.X6: Per-instance answer management for multi-instance mode
    const answerInstanceQuestion = useCallback((instanceId: string, questionId: string, value: unknown) => {
        setState(s => {
            const currentInstanceAnswers = s.instanceAnswers[instanceId] || new Map<string, unknown>();
            const newInstanceAnswers = new Map(currentInstanceAnswers);
            newInstanceAnswers.set(questionId, value);
            return {
                ...s,
                instanceAnswers: {
                    ...s.instanceAnswers,
                    [instanceId]: newInstanceAnswers,
                },
            };
        });
    }, []);

    const getInstanceAnswers = useCallback((instanceId: string): Map<string, unknown> => {
        return state.instanceAnswers[instanceId] || new Map<string, unknown>();
    }, [state.instanceAnswers]);

    const clearInstanceAnswers = useCallback((instanceId: string) => {
        setState(s => {
            const { [instanceId]: _, ...rest } = s.instanceAnswers;
            return { ...s, instanceAnswers: rest };
        });
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
    // IMPORTANT: Uses stateRef.current to always read the CURRENT state, not stale closure

    const runPipeline = useCallback(async () => {
        // Read from ref to get current state (avoids stale closure)
        const current = stateRef.current;

        // M51: Generate monotonic runId for race protection
        runIdCounterRef.current += 1;
        const thisRunId = runIdCounterRef.current;
        lastRunIdRef.current = thisRunId;
        const runId = `run_${thisRunId}_${Date.now().toString(36)}`;

        // M51: Compute effective insurance type (MKV takes precedence when hasMKV=true)
        const effectiveInsuranceType = current.hasMKV ? 'MKV' : current.insuranceType;

        const input: PipelineInput = {
            dictation: current.dictation,
            answers: current.answers,
            insuranceType: effectiveInsuranceType as 'GKV' | 'PKV',
            textLength: current.textLength,
            hasMKV: current.hasMKV,
            treatmentId: current.treatmentId
        };

        // [V10_UI] Phase 1 logging: payload snapshot
        console.log(`[V10_UI] ${runId} payload=${JSON.stringify({
            dictation: input.dictation?.slice(0, 60) || '',
            dictationLength: input.dictation?.length || 0,
            treatmentId: input.treatmentId,
            insuranceType: input.insuranceType,
            effectiveInsuranceType,
            textLength: input.textLength,
            hasMKV: input.hasMKV,
            answersCount: input.answers?.size || 0,
        })}`);

        // Set processing state
        setState(s => ({ ...s, isProcessing: true }));

        try {
            const result = await pipeline.run(input);

            // M51: Stale result guard - ignore if newer run started
            if (thisRunId !== lastRunIdRef.current) {
                console.log(`[V10_UI] ${runId} STALE_IGNORE (latest=${lastRunIdRef.current})`);
                return;
            }

            // [V10_UI] Phase 1 logging: result summary
            console.log(`[V10_UI] ${runId} resultSummary=${JSON.stringify({
                state: result.state,
                questionsCount: result.questions?.length || 0,
                questionIds: result.questions?.map(q => q.id || q.questionKey) || [],
                hasOutput: !!result.output,
                hasBundle: !!result.questionBundle,
                warningsCount: result.warnings?.length || 0,
                error: result.error || null,
            })}`);

            setState(s => ({ ...s, result, isProcessing: false }));
        } catch (error) {
            // M51: Also guard error path
            if (thisRunId !== lastRunIdRef.current) {
                console.log(`[V10_UI] ${runId} STALE_IGNORE (error path)`);
                return;
            }
            console.error(`[V10_UI] ${runId} error=${JSON.stringify({ message: String(error) })}`);
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
    }, []);

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

    // P14.X3: Create instances from teeth and run multi-instance pipeline
    const createInstancesAndRun = useCallback(async (instances: TreatmentInstance[]) => {
        if (instances.length < 2) return;

        const current = stateRef.current;

        // M51: Generate monotonic runId for race protection
        runIdCounterRef.current += 1;
        const thisRunId = runIdCounterRef.current;
        lastRunIdRef.current = thisRunId;

        // M51: Compute effective insurance type
        const effectiveInsuranceType = current.hasMKV ? 'MKV' : current.insuranceType;

        // Create a single segment with instances
        const segmentWithInstances: TreatmentSegment = {
            id: 'seg-multiinstance',
            treatmentId: current.treatmentId,
            dictationSlice: current.dictation,
            extracted: {
                tooth: null, // Multiple teeth
                surfaces: [],
                diagnosis: null,
                mentioned: {},
            },
            answers: new Map(),
            toothScope: instances.map(i => i.tooth),
            instances,
        };

        // Build plan and execute
        const plan: MultiTreatmentPlan = {
            segments: [segmentWithInstances],
            executionOrder: 'sequential',
            context: {
                sessionId: `session-multiinstance-${Date.now()}`,
                insuranceType: effectiveInsuranceType as 'GKV' | 'PKV',
                textLength: current.textLength,
                hasMKV: current.hasMKV,
            },
        };

        // Enable multi mode and run
        setState(s => ({ ...s, isMultiMode: true, isProcessing: true }));

        try {
            const result = await runMultiTreatment(plan);

            // M51: Stale result guard
            if (thisRunId !== lastRunIdRef.current) {
                console.log(`[V10_UI] createInstancesAndRun STALE_IGNORE (latest=${lastRunIdRef.current})`);
                return;
            }

            // P14.X9 B: Store plan for retry functionality
            // P14.X9 B: Store FULL instances (with extracted data) for proper retry
            const lastMultiPlan: LastMultiPlan = {
                treatmentId: current.treatmentId,
                dictation: current.dictation,
                instances: instances, // Full instances with extracted data
            };

            setState(s => ({
                ...s,
                multiResult: result,
                isProcessing: false,
                lastMultiPlan,  // P14.X9 B: Store for retry
                result: {
                    ...INITIAL_RESULT,
                    state: 'output',
                },
            }));
        } catch (error) {
            // M51: Stale result guard for error path
            if (thisRunId !== lastRunIdRef.current) {
                console.log(`[V10_UI] createInstancesAndRun STALE_IGNORE (error path)`);
                return;
            }
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
    }, []);

    // ─── Reset ─────────────────────────────────────────────────

    const reset = useCallback(() => {
        setState({
            dictation: '',
            answers: new Map(),
            insuranceType: state.insuranceType, // Preserve
            textLength: state.textLength,       // Preserve
            hasMKV: state.hasMKV,               // Preserve
            treatmentId: state.treatmentId,     // Preserve
            result: INITIAL_RESULT,
            isProcessing: false,
            isMultiMode: false,
            multiResult: null,
            segments: createDefaultSegments(),
            instanceAnswers: {},  // P14.X6: Reset instance answers
            lastMultiPlan: null,  // P14.X9 B: Reset retry plan
        });
    }, [state.insuranceType, state.textLength, state.hasMKV, state.treatmentId]);


    // P14.X9 B: Retry multi-instance pipeline with updated instance answers
    const runLastMultiPlan = useCallback(async () => {
        const current = stateRef.current;
        const plan = current.lastMultiPlan;

        if (!plan) {
            console.warn('runLastMultiPlan: No lastMultiPlan stored');
            return;
        }

        // M51: Generate monotonic runId for race protection
        runIdCounterRef.current += 1;
        const thisRunId = runIdCounterRef.current;
        lastRunIdRef.current = thisRunId;

        // M51: Compute effective insurance type
        const effectiveInsuranceType = current.hasMKV ? 'MKV' : current.insuranceType;

        // Rebuild instances with current instanceAnswers, preserving original extracted data
        const instances: TreatmentInstance[] = plan.instances.map((storedInstance) => ({
            ...storedInstance, // Preserve instanceId, tooth, dictationSlice, extracted
            answers: current.instanceAnswers[storedInstance.instanceId] || new Map<string, unknown>(),
        }));

        // P14.X9-DEBUG: Log rebuild info in stub mode
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STUB_EXTRACTION === 'true') {
            console.log('[runLastMultiPlan] Rebuilding instances:', {
                planInstanceIds: plan.instances.map(i => i.instanceId),
                instanceAnswersKeys: Object.keys(current.instanceAnswers),
                instances: instances.map(i => ({
                    instanceId: i.instanceId,
                    tooth: i.tooth,
                    answersSize: i.answers.size,
                    surfacesLen: i.extracted?.surfaces?.length || 0,
                    diagnosis: i.extracted?.diagnosis,
                })),
            });
        }

        // Create segment with updated instances
        const segmentWithInstances: TreatmentSegment = {
            id: 'seg-multiinstance',
            treatmentId: plan.treatmentId,
            dictationSlice: plan.dictation,
            extracted: {
                tooth: null,
                surfaces: [],
                diagnosis: null,
                mentioned: {},
            },
            answers: new Map(),
            toothScope: instances.map(i => i.tooth),
            instances,
        };

        // Build plan
        const multiPlan: MultiTreatmentPlan = {
            segments: [segmentWithInstances],
            executionOrder: 'sequential',
            context: {
                sessionId: `session-retry-${Date.now()}`,
                insuranceType: effectiveInsuranceType as 'GKV' | 'PKV',
                textLength: current.textLength,
                hasMKV: current.hasMKV,
            },
        };

        setState(s => ({ ...s, isProcessing: true }));

        try {
            const result = await runMultiTreatment(multiPlan);

            // M51: Stale result guard
            if (thisRunId !== lastRunIdRef.current) {
                console.log(`[V10_UI] runLastMultiPlan STALE_IGNORE (latest=${lastRunIdRef.current})`);
                return;
            }

            setState(s => ({
                ...s,
                multiResult: result,
                isProcessing: false,
                result: {
                    ...INITIAL_RESULT,
                    state: 'output',
                },
            }));
        } catch (error) {
            // M51: Stale result guard for error path
            if (thisRunId !== lastRunIdRef.current) {
                console.log(`[V10_UI] runLastMultiPlan STALE_IGNORE (error path)`);
                return;
            }
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
    }, []);


    // ─── Go To Questions (for Edit button) ────────────────────
    // Returns to questions step without losing dictation/answers
    const goToQuestions = useCallback(() => {
        setState(s => ({
            ...s,
            result: {
                ...s.result,
                state: 'questions' as const,
            }
        }));
    }, []);

    // ─── Derived State ─────────────────────────────────────────

    // Determine current display state
    const getCurrentState = (): V7PipelineState => {
        if (state.isProcessing) return 'running';
        if (state.result.state === 'error') return 'error';
        if (state.result.state === 'unsupported') return 'unsupported';  // P12.8c
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
        treatmentId: state.treatmentId,
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
        setTreatmentId,
        answerQuestion,
        runPipeline,
        reset,
        goToQuestions,

        // Multi-treatment actions
        setMultiMode,
        updateSegment,
        addSegment,
        removeSegment,
        runMulti,
        // P14.1: Per-segment answer isolation
        answerSegmentQuestion,
        getSegmentAnswers,
        clearSegmentAnswers,
        // P14.X3: Multi-instance creation and execution
        createInstancesAndRun,
        // P14.X6: Per-instance answer isolation
        answerInstanceQuestion,
        getInstanceAnswers,
        clearInstanceAnswers,
        // P14.X9 B: Retry after questions
        runLastMultiPlan,
    };
}

export type V7PipelineHook = ReturnType<typeof useV7Pipeline>;
