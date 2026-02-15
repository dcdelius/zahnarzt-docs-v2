/**
 * useV10Pipeline — V10 Native Pipeline Hook
 * 
 * This is the PRIMARY hook for V10 pipeline execution.
 * It calls runV10 directly from the V10 public API.
 * NO delegation to V7.
 */

import { useState, useCallback, useRef } from 'react';
import { runV10 } from '../public';
import type { V10PipelineInput, V10PipelineOutput, V10PipelineState, V10ReviewContext } from '../types';
import type { SettingsInput } from '../settings/settingsTypes';
import type { MultiTreatmentResult, BillingCode } from '../multitreatment/types';
import type { CombinabilityResult } from '../../contracts/compose';
import { buildSessionBillingSummary, runSessionCombinability, deriveUpsellHints } from '../billing/sessionCombinability';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type InsuranceType = 'GKV' | 'PKV' | 'MKV';
export type TextLength = 'kurz' | 'mittel' | 'lang';

export interface PipelineResult {
    state: 'idle' | 'questions' | 'output' | 'error' | 'unsupported';
    questions: Array<{
        id: string;
        questionKey: string;
        label: string;
        options?: Array<{ value: string; label: string }>;
    }>;
    // FIX: Match ComposedOutput contract - billingCodes at root
    output: {
        fullText: string;
        billingCodes: string[];
        sections?: Array<{ id: string; label: string; content: string }>;
        perInstance?: Record<string, {
            instanceId: string;
            teeth: string[];
            text: string;
            billingRefs: string[];
            chips: string[];
        }>;
        warnings?: unknown[];
    } | null;
    warnings: string[];
    error?: string;
    extracted?: {
        tooth: string | null;
        surfaces: string[];
        diagnosis: string | null;
        teeth?: string[];
        mentioned?: Record<string, unknown>;
    };
    review?: V10ReviewContext;
    questionBundle?: unknown;
    chips?: Array<{ id: string; source: string }>;
    combinability?: { verdict: 'PASS' | 'WARN' | 'BLOCK'; conflicts?: unknown[] };
    kbMeta?: V10PipelineOutput['meta']['kb'];
    kbReleaseId?: V10PipelineOutput['meta']['kbReleaseId'];
    meta?: V10PipelineOutput['meta'];
    provenance?: V10PipelineOutput['meta']['provenance'];
    billingCompleteness?: V10PipelineOutput['meta']['billingCompleteness'];
    regelPruefungen?: V10PipelineOutput['meta']['regelPruefungen'];
    billingValidation?: V10PipelineOutput['meta']['billingValidation'];
    upsellHints?: Array<{
        type: 'mkv';
        segmentId: string;
        tooth?: string;
        message: string;
        requiredAskbacks: string[];
    }>;
    traceLines?: string[];
    debug?: {
        v10TraceLines?: Array<{ key: string; value: unknown }>;
        extractorEngine?: 'stub' | 'llm' | 'forced';
    };
}

interface UseV10PipelineState {
    dictation: string;
    answers: Map<string, unknown>;
    insuranceType: InsuranceType;
    textLength: TextLength;
    hasMKV: boolean;
    treatmentId: string;
    result: PipelineResult;
    isProcessing: boolean;
    // Multi-instance support
    isMultiMode: boolean;
    multiResult: unknown | null;
    instanceAnswers: Record<string, Map<string, unknown>>;
    lastMultiPlan: {
        dictation: string;
        treatmentId: string;
        instances: Array<{
            instanceId: string;
            tooth?: string;
            dictationSlice?: string;
            extracted?: unknown;
            answers?: Map<string, unknown>;
        }>;
    } | null;
}

const INITIAL_RESULT: PipelineResult = {
    state: 'idle',
    questions: [],
    output: null,
    warnings: [],
};

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useV10Pipeline(options?: { settingsInput?: SettingsInput }) {
    const [state, setState] = useState<UseV10PipelineState>({
        dictation: '',
        answers: new Map(),
        insuranceType: 'GKV',
        textLength: 'mittel',
        hasMKV: false,
        treatmentId: 'fuellung',
        result: INITIAL_RESULT,
        isProcessing: false,
        isMultiMode: false,
        multiResult: null,
        instanceAnswers: {},
        lastMultiPlan: null,
    });

    const stateRef = useRef(state);
    stateRef.current = state;

    const runIdCounterRef = useRef(0);
    const lastRunIdRef = useRef(0);
    const settingsRef = useRef<SettingsInput | undefined>(options?.settingsInput);
    settingsRef.current = options?.settingsInput;
    const sessionKbReleaseIdRef = useRef<string | undefined>(undefined);

    const normalizeAnswers = (answers: Map<string, unknown> | Record<string, unknown>) => {
        return answers instanceof Map ? answers : new Map(Object.entries(answers ?? {}));
    };

    const normalizeKbReleaseId = (value: unknown): string | undefined => {
        if (typeof value !== 'string') return undefined;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    };

    const resolveSessionKbReleaseId = (candidate?: string): string | undefined => {
        const normalizedCandidate = normalizeKbReleaseId(candidate);
        if (!sessionKbReleaseIdRef.current && normalizedCandidate) {
            sessionKbReleaseIdRef.current = normalizedCandidate;
        }
        return sessionKbReleaseIdRef.current;
    };

    // ─── Actions ────────────────────────────────────────────────

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
            stateRef.current = newState;
            return newState;
        });
    }, []);

    const setAnswers = useCallback((answers: Map<string, unknown> | Record<string, unknown>) => {
        const newAnswers = normalizeAnswers(answers);
        setState(s => ({ ...s, answers: newAnswers }));
    }, []);

    const setMultiMode = useCallback((enabled: boolean) => {
        setState(s => ({
            ...s,
            isMultiMode: enabled,
            multiResult: enabled ? null : s.multiResult,
            result: enabled ? INITIAL_RESULT : s.result,
        }));
    }, []);

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

    const setInstanceAnswers = useCallback((answersByInstance: Record<string, Map<string, unknown> | Record<string, unknown>>) => {
        const next: Record<string, Map<string, unknown>> = {};
        for (const [instanceId, answers] of Object.entries(answersByInstance)) {
            next[instanceId] = normalizeAnswers(answers as Map<string, unknown> | Record<string, unknown>);
        }
        setState(s => ({ ...s, instanceAnswers: next }));
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

    // ─── Pipeline Execution (DIRECT V10 CALL) ───────────────────

    const runPipeline = useCallback(async (overrides?: Partial<V10PipelineInput> & { userDefaults?: SettingsInput }) => {
        const current = stateRef.current;
        const hasMKV = overrides?.hasMKV ?? current.hasMKV;
        const insuranceType = (overrides?.insuranceType ?? current.insuranceType) as InsuranceType;
        const effectiveInsuranceType = hasMKV ? 'MKV' : insuranceType;
        const dictation = overrides?.dictation ?? current.dictation;
        const treatmentId = overrides?.treatmentId ?? current.treatmentId;
        const textLength = overrides?.textLength ?? current.textLength;
        const answers = normalizeAnswers(overrides?.answers ?? current.answers);
        const chipOverrides = overrides?.chipOverrides;
        const userDefaults = overrides?.userDefaults ?? settingsRef.current;
        const requestedKbReleaseId = normalizeKbReleaseId(
            overrides?.kbReleaseId
            ?? userDefaults?.practice?.activeKbReleaseId
            ?? current.result.kbReleaseId
        );
        const sessionKbReleaseId = resolveSessionKbReleaseId(requestedKbReleaseId);

        runIdCounterRef.current += 1;
        const thisRunId = runIdCounterRef.current;
        lastRunIdRef.current = thisRunId;
        const runId = `v10_run_${thisRunId}_${Date.now().toString(36)}`;

        console.log(`[useV10Pipeline] ${runId} starting pipeline, treatmentId=${treatmentId}`);

        // ═══ PROBE A: UI input → pipeline call ═══
        if (import.meta.env.DEV) {
            console.debug('[PROBE A] UI → Pipeline Input', {
                dictation,
                treatmentId,
                insuranceType: effectiveInsuranceType,
                textLength,
                hasMKV,
                answersKeys: [...answers.keys()],
                answersEntries: Object.fromEntries(answers),
            });
        }

        if (overrides) {
            setState(s => ({
                ...s,
                dictation,
                treatmentId,
                insuranceType,
                textLength,
                hasMKV,
                answers,
                isProcessing: true,
            }));
        } else {
            setState(s => ({ ...s, isProcessing: true }));
        }

        try {
            // DIRECT V10 CALL - NO V7 DELEGATION
            const v10Result = await runV10({
                treatmentId,
                dictation,
                insuranceType: effectiveInsuranceType,
                textLength,
                hasMKV,
                answers,
                chipOverrides,
                userDefaults: userDefaults as Record<string, unknown> | undefined,
                kbReleaseId: sessionKbReleaseId,
            });

            if (thisRunId !== lastRunIdRef.current) {
                console.log(`[useV10Pipeline] ${runId} STALE_IGNORE`);
                return;
            }

            // DEV: Log raw V10 output before normalization
            if (import.meta.env.DEV) {
                console.debug('[V10 raw output]', v10Result?.output);
                console.debug('[V10 raw billingCodes]', v10Result?.output?.billingCodes);
            }

            // Normalize V10 output to UI shape
            // CRITICAL: Preserve original DynamicQuestion structure (question field)
            // while also adding label alias for backwards compat
            // FIX: Preserve V10 output shape - billingCodes at root, NOT billing.codes
            const traceLines = v10Result?.meta?.traceLines ?? (v10Result as any).traceLines ?? [];
            const combinability = (v10Result as any).combinability ?? v10Result?.meta?.combinability;
            resolveSessionKbReleaseId(v10Result?.meta?.kbReleaseId);

            const singlePerInstance = (v10Result as any)?.output?.perInstance as Record<string, {
                instanceId: string;
                teeth: string[];
                chips: string[];
            }> | undefined;
            const singleSegmentId = `${treatmentId}-single`;
            const singleUpsellHints = singlePerInstance
                ? deriveUpsellHints(
                    [{
                        segmentId: singleSegmentId,
                        treatmentId,
                        insuranceType: effectiveInsuranceType,
                        textLength,
                        instances: Object.values(singlePerInstance).map(inst => ({
                            instanceId: inst.instanceId,
                            tooth: inst.teeth?.[0],
                        })),
                        dictation,
                    }],
                    Object.values(singlePerInstance).map(inst => ({
                        segmentId: singleSegmentId,
                        tooth: inst.teeth?.[0],
                        chips: inst.chips ?? [],
                        insuranceType: effectiveInsuranceType,
                    }))
                )
                : [];

            const review = (v10Result as any).review as V10ReviewContext | undefined;
            const extractedFromReview = review?.instances?.length
                ? (() => {
                    const first = review.instances[0];
                    return {
                        ...first.extractedSummary,
                        mentioned: {},
                    };
                })()
                : undefined;

            const result: PipelineResult = {
                state: v10Result.state as PipelineResult['state'],
                questions: (v10Result.questions || []).map((q: any) => {
                    // Extract prompt - DynamicQuestion uses 'question' field
                    const promptText = q.question || q.label || q.questionKey || '(Frage)';
                    return {
                        ...q,  // Preserve all original fields (type, options, etc)
                        id: q.id || q.questionKey,
                        questionKey: q.questionKey,
                        question: promptText,  // DynamicQuestion contract field
                        label: promptText,     // Legacy alias for backwards compat
                    };
                }),
                // FIX: Preserve V10 output shape exactly as runV10 returns it
                // billingCodes is at root (not billing.codes) per ComposedOutput contract
                // NOTE: Type cast because V10PipelineOutput type doesn't include all runtime fields
                output: v10Result.output ? {
                    ...(v10Result.output as any),  // Preserve all fields (perInstance, sections, etc)
                    fullText: v10Result.output.fullText || '',
                    billingCodes: v10Result.output.billingCodes || [],
                    sections: (v10Result.output as any).sections || [],
                    warnings: (v10Result.output as any).warnings || [],
                } : null,
                warnings: (v10Result as any).warnings || [],
                error: v10Result.error,
                extracted: extractedFromReview ?? (v10Result as any).extracted,
                review,
                // FIX: V10 returns 'questionsBundle', normalize both spellings
                questionBundle: (v10Result as any).questionBundle || v10Result.questionsBundle,
                chips: (v10Result as any).chips,
                combinability,
                kbMeta: v10Result?.meta?.kb,
                kbReleaseId: v10Result?.meta?.kbReleaseId,
                meta: v10Result?.meta,
                provenance: v10Result?.meta?.provenance,
                billingCompleteness: v10Result?.meta?.billingCompleteness,
                regelPruefungen: v10Result?.meta?.regelPruefungen,
                billingValidation: v10Result?.meta?.billingValidation,
                upsellHints: singleUpsellHints.length > 0 ? singleUpsellHints : undefined,
                traceLines,
                debug: {
                    v10TraceLines: traceLines,
                    extractorEngine: v10Result?.meta?.extractorEngine,
                },
            };

            // DEV: Log normalized output
            if (import.meta.env.DEV) {
                console.debug('[V10 normalized output]', result.output);
                console.debug('[V10 billingCodes count]', result.output?.billingCodes?.length);
            }

            console.log(`[useV10Pipeline] ${runId} complete, state=${result.state}, questions=${result.questions.length}`);

            setState(s => ({ ...s, result, isProcessing: false }));
        } catch (error) {
            if (thisRunId !== lastRunIdRef.current) return;

            console.error(`[useV10Pipeline] ${runId} error:`, error);
            setState(s => ({
                ...s,
                isProcessing: false,
                result: {
                    state: 'error',
                    questions: [],
                    output: null,
                    warnings: [],
                    error: String(error),
                },
            }));
        }
    }, []);

    // ─── Multi-Instance Execution ───────────────────────────────

    const createInstancesAndRun = useCallback(async (instances: Array<{ instanceId: string; tooth: string; dictationSlice: string; extracted: unknown; answers?: Map<string, unknown> }>) => {
        // For now, run single pipeline per instance sequentially
        // This can be optimized to use runV10Bundle later
        console.log(`[useV10Pipeline] createInstancesAndRun with ${instances.length} instances`);

        runIdCounterRef.current += 1;
        const thisRunId = runIdCounterRef.current;
        lastRunIdRef.current = thisRunId;

        const current = stateRef.current;
        const sessionKbReleaseId = resolveSessionKbReleaseId(
            normalizeKbReleaseId(
                current.result.kbReleaseId
                ?? settingsRef.current?.practice?.activeKbReleaseId
            )
        );
        const seededInstanceAnswers = { ...current.instanceAnswers };
        for (const inst of instances) {
            if (inst.answers) {
                seededInstanceAnswers[inst.instanceId] = normalizeAnswers(inst.answers);
            }
        }

        setState(s => ({
            ...s,
            isMultiMode: true,
            isProcessing: true,
            instanceAnswers: seededInstanceAnswers,
            lastMultiPlan: {
                dictation: current.dictation,
                treatmentId: current.treatmentId,
                instances: instances.map(inst => ({
                    instanceId: inst.instanceId,
                    tooth: inst.tooth,
                    dictationSlice: inst.dictationSlice,
                    extracted: inst.extracted,
                    answers: inst.answers ? normalizeAnswers(inst.answers) : undefined,
                })),
            },
        }));

        try {
            // Run each instance and collect results
            const results = await Promise.all(instances.map(async (inst) => {
                const instanceAnswers = seededInstanceAnswers[inst.instanceId] || new Map();

                return runV10({
                    treatmentId: current.treatmentId,
                    dictation: inst.dictationSlice || current.dictation,
                    insuranceType: current.hasMKV ? 'MKV' : current.insuranceType,
                    textLength: current.textLength,
                    hasMKV: current.hasMKV,
                    answers: instanceAnswers,
                    userDefaults: settingsRef.current as Record<string, unknown> | undefined,
                    kbReleaseId: sessionKbReleaseId,
                });
            }));

            if (thisRunId !== lastRunIdRef.current) {
                console.log(`[useV10Pipeline] createInstancesAndRun STALE_IGNORE (latest=${lastRunIdRef.current})`);
                return;
            }

            for (const result of results) {
                resolveSessionKbReleaseId(result?.meta?.kbReleaseId);
            }

            const buildBillingCodes = (): BillingCode[] => {
                const codes: BillingCode[] = [];
                for (let i = 0; i < results.length; i++) {
                    const res = results[i];
                    const tooth = instances[i]?.tooth;
                    const billing = res.output?.billingCodes ?? [];
                    for (const code of billing) {
                        const system = code.startsWith('BEMA_')
                            ? 'BEMA'
                            : code.startsWith('GOZ_')
                                ? 'GOZ'
                                : code.startsWith('GOÄ_')
                                    ? 'GOÄ'
                                    : 'BEMA';
                        codes.push({
                            code,
                            type: system as BillingCode['type'],
                            tooth,
                            scope: tooth ? 'TOOTH' : 'SESSION',
                            segmentId: current.treatmentId,
                            instanceId: instances[i]?.instanceId,
                        });
                    }
                }
                const seen = new Set<string>();
                return codes.filter(c => {
                    const key = `${c.code}::${c.tooth ?? 'session'}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            };

            const aggregatedCopyText = results
                .map(r => r.output?.fullText || '')
                .filter(Boolean)
                .join('\n\n');

            const scopedCodes = buildBillingCodes().map(code => ({
                code: code.code,
                tooth: code.tooth,
                scope: code.scope === 'TOOTH' ? 'TOOTH' : 'SESSION',
            }));
            const sessionSummary = buildSessionBillingSummary(scopedCodes, [
                {
                    segmentId: current.treatmentId,
                    treatmentId: current.treatmentId,
                    insuranceType: current.hasMKV ? 'MKV' : current.insuranceType,
                    textLength: current.textLength,
                    instances: instances.map(inst => ({
                        instanceId: inst.instanceId,
                        tooth: inst.tooth,
                        dictation: inst.dictationSlice,
                        answers: inst.answers,
                    })),
                },
            ]);
            const sessionCombinability = runSessionCombinability(sessionSummary);
            const combinability: CombinabilityResult = {
                verdict: sessionCombinability.verdict,
                conflicts: sessionCombinability.conflicts.map(c => ({
                    codeA: c.codesInvolved[0] ?? '',
                    codeB: c.codesInvolved[1] ?? '',
                    ruleId: c.ruleId,
                    reason: c.reason,
                    severity: c.severity,
                })),
                warnings: sessionCombinability.warnings,
                requiredJustifications: [],
            };

            const upsellHints = deriveUpsellHints(
                [
                    {
                        segmentId: current.treatmentId,
                        treatmentId: current.treatmentId,
                        insuranceType: current.hasMKV ? 'MKV' : current.insuranceType,
                        textLength: current.textLength,
                        instances: instances.map(inst => ({
                            instanceId: inst.instanceId,
                            tooth: inst.tooth,
                            dictation: inst.dictationSlice,
                            answers: inst.answers,
                        })),
                    },
                ],
                results.map((res, i) => ({
                    segmentId: current.treatmentId,
                    tooth: instances[i]?.tooth,
                    chips: res.trace?.allChips ?? res.trace?.instances?.[0]?.chips ?? [],
                    insuranceType: current.hasMKV ? 'MKV' : current.insuranceType,
                }))
            );

            const combinedResult: MultiTreatmentResult = {
                aggregatedState: results.some(r => r.state === 'questions')
                    ? 'questions'
                    : results.some(r => r.state === 'error')
                        ? 'error'
                        : 'output',
                runs: results.map((r, i) => ({
                    segmentId: instances[i]?.instanceId ?? `segment-${i + 1}`,
                    treatmentId: current.treatmentId,
                    instanceId: instances[i]?.instanceId,
                    result: r,
                    billingCodes: buildBillingCodes(),
                    warnings: r.output?.warnings ?? [],
                })),
                perTreatmentBundles: {},
                mergedOutput: {
                    sections: [],
                    fullText: aggregatedCopyText,
                    billingCodes: buildBillingCodes().map(b => b.code),
                    warnings: [],
                },
                aggregatedCopyText,
                billingCodes: buildBillingCodes(),
                conflicts: [],
                combinability,
                warnings: results.flatMap(r => r.output?.warnings ?? []),
                upsellHints: upsellHints.length > 0 ? upsellHints : undefined,
            };

            setState(s => ({
                ...s,
                multiResult: combinedResult,
                isProcessing: false,
                result: { ...INITIAL_RESULT, state: 'output' },
            }));
        } catch (error) {
            if (thisRunId !== lastRunIdRef.current) {
                console.log('[useV10Pipeline] createInstancesAndRun STALE_IGNORE (error path)');
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
                    error: String(error),
                },
            }));
        }
    }, []);

    const runLastMultiPlan = useCallback(async () => {
        const current = stateRef.current;
        const plan = current.lastMultiPlan;
        const sessionKbReleaseId = resolveSessionKbReleaseId(
            normalizeKbReleaseId(
                current.result.kbReleaseId
                ?? settingsRef.current?.practice?.activeKbReleaseId
            )
        );

        if (!plan) {
            console.warn('[useV10Pipeline] runLastMultiPlan: No lastMultiPlan stored');
            return;
        }

        runIdCounterRef.current += 1;
        const thisRunId = runIdCounterRef.current;
        lastRunIdRef.current = thisRunId;

        setState(s => ({ ...s, isProcessing: true, isMultiMode: true }));

        try {
            const results = await Promise.all(plan.instances.map(async (inst) => {
                const instanceAnswers = current.instanceAnswers[inst.instanceId]
                    || inst.answers
                    || new Map<string, unknown>();

                return runV10({
                    treatmentId: plan.treatmentId,
                    dictation: inst.dictationSlice || plan.dictation,
                    insuranceType: current.hasMKV ? 'MKV' : current.insuranceType,
                    textLength: current.textLength,
                    hasMKV: current.hasMKV,
                    answers: instanceAnswers,
                    userDefaults: settingsRef.current as Record<string, unknown> | undefined,
                    kbReleaseId: sessionKbReleaseId,
                });
            }));

            if (thisRunId !== lastRunIdRef.current) {
                console.log(`[useV10Pipeline] runLastMultiPlan STALE_IGNORE (latest=${lastRunIdRef.current})`);
                return;
            }

            for (const result of results) {
                resolveSessionKbReleaseId(result?.meta?.kbReleaseId);
            }

            const combinedResult = {
                instances: results.map((r, i) => ({
                    instanceId: plan.instances[i].instanceId,
                    tooth: plan.instances[i].tooth,
                    output: r.output,
                    state: r.state,
                })),
            };

            setState(s => ({
                ...s,
                multiResult: combinedResult,
                isProcessing: false,
                result: { ...INITIAL_RESULT, state: 'output' },
            }));
        } catch (error) {
            if (thisRunId !== lastRunIdRef.current) {
                console.log('[useV10Pipeline] runLastMultiPlan STALE_IGNORE (error path)');
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
                    error: String(error),
                },
            }));
        }
    }, []);

    // ─── Reset ──────────────────────────────────────────────────

    const reset = useCallback(() => {
        setState(s => ({
            dictation: '',
            answers: new Map(),
            insuranceType: s.insuranceType,
            textLength: s.textLength,
            hasMKV: s.hasMKV,
            treatmentId: s.treatmentId,
            result: INITIAL_RESULT,
            isProcessing: false,
            isMultiMode: false,
            multiResult: null,
            instanceAnswers: {},
            lastMultiPlan: null,
        }));
    }, []);

    const goToQuestions = useCallback(() => {
        setState(s => ({
            ...s,
            result: { ...s.result, state: 'questions' as const },
        }));
    }, []);

    // ─── Derived State ──────────────────────────────────────────

    const getCurrentState = (): string => {
        if (state.isProcessing) return 'running';
        if (state.result.state === 'error') return 'error';
        if (state.result.state === 'unsupported') return 'unsupported';
        if (state.isMultiMode && state.multiResult) return 'multi_output';
        if (state.result.state === 'questions') return 'questions';
        if (state.result.state === 'output') return 'output';
        return 'idle';
    };

    // ─── Return ─────────────────────────────────────────────────

    return {
        // State
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
        segments: [], // Compat

        // Derived
        currentState: getCurrentState(),
        questions: state.result.questions,
        output: state.result.output,
        warnings: state.result.warnings,
        error: state.result.error,
        extracted: state.result.extracted,

        // Actions
        setDictation,
        setInsuranceType,
        setTextLength,
        setHasMKV,
        setTreatmentId,
        answerQuestion,
        setAnswers,
        runPipeline,
        reset,
        goToQuestions,

        // Multi-instance
        setMultiMode,
        createInstancesAndRun,
        answerInstanceQuestion,
        setInstanceAnswers,
        getInstanceAnswers,
        clearInstanceAnswers,
        runLastMultiPlan,

        // Compat stubs
        updateSegment: () => { },
        addSegment: () => { },
        removeSegment: () => { },
        runMulti: async () => { },
        answerSegmentQuestion: () => { },
        getSegmentAnswers: () => new Map(),
        clearSegmentAnswers: () => { },
    };
}

export type V7PipelineState = 'idle' | 'running' | 'questions' | 'output' | 'multi_output' | 'error' | 'unsupported';
export type V7PipelineHook = ReturnType<typeof useV10Pipeline>;
