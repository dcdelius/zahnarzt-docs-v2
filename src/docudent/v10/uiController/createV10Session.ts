/**
 * V10 Session Controller
 * 
 * Pure function wrapper around the V10 UI pipeline.
 * This MUST use the same code path as the UI.
 * 
 * RULES:
 * - NO fake chips (no `${factKey}_${value}`)
 * - NO shadow questions (use runV10 questions)
 * - Rule-based chipDelta from registry
 * - Real instance isolation
 */

import { runV10 } from '../pipeline/runV10';
import { scopeExtractionToInstances } from '../multitreatment/scoping';
import { applySettingsDefaults, type SettingsContext } from '../settings/resolveDefaultsToFacts';
import type { V10PipelineOutput } from '../pipeline/runV10';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type V10UiState =
    | { phase: 'idle' }
    | { phase: 'running' }
    | { phase: 'questions'; questions: QuestionsByInstance; instances: InstanceState[] }
    | { phase: 'output'; output: OutputState; instances: InstanceState[] }
    | { phase: 'error'; error: string };

export type QuestionsByInstance = Record<string, Array<{
    id: string;
    instanceId: string;
    packId: string;
    ruleId: string;
    level: 'L1';
    question: string;
    options: Array<{ value: string; label: string }>;
    meta: {
        packId: string;
        instanceId: string;
        ruleId: string;
        requiredFacts: string[];
        because: Record<string, unknown>;
    };
}>>;

export interface InstanceState {
    instanceId: string;
    packId: string;
    teeth: string[];
    surfaces: string[];
    facts: Record<string, unknown>;
    answeredFacts: Set<string>;
    chips: Set<string>;  // Changed to Set<string> for proper add/remove
}

export interface OutputState {
    fullText: string;
    billingRefs: string[];
    // perInstance is now the SSOT from runV10
    perInstance: Record<string, {
        text: string;
        billingRefs: string[];
    }>;
    kbMeta?: V10PipelineOutput['meta']['kb'];
    kbReleaseId?: V10PipelineOutput['meta']['kbReleaseId'];
    debug?: (V10PipelineOutput['meta']['debug'] & {
        v10TraceLines?: string[];
    }) | undefined;
}

export interface V10SessionOptions {
    goldenMode?: boolean;
    treatmentId?: string;
    insuranceType?: 'GKV' | 'PKV' | 'MKV';
    textLength?: 'kurz' | 'mittel' | 'lang';
    settings?: SettingsContext;
    kbReleaseId?: string;
    requireLlmExtraction?: boolean;
    forceExtraction?: Record<string, unknown>;
    forceAnswers?: Record<string, unknown>;
}

export interface V10Session {
    start(dictation: string, opts?: V10SessionOptions): Promise<V10UiState>;
    answer(instanceId: string, questionId: string, value: string): Promise<V10UiState>;
    getState(): V10UiState;
    getInstances(): InstanceState[];
    getAnsweredFacts(): Map<string, Set<string>>;
}

function normalizeQuestionKey(questionId: string): string {
    let key = questionId.replace(/::tooth:\d+$/, '');
    if (key.includes('::')) {
        key = key.split('::').pop() ?? key;
    }
    const prefixMatch = key.match(/^(medical|forensic|rule|mkv|upsell)_(.+)$/);
    return prefixMatch ? prefixMatch[2] : key;
}

function stripInstancePrefix(questionId: string, instanceId: string): string {
    const prefix = `${instanceId}::`;
    return questionId.startsWith(prefix) ? questionId.slice(prefix.length) : questionId;
}

// ═══════════════════════════════════════════════════════════════
// SESSION FACTORY
// ═══════════════════════════════════════════════════════════════

export function createV10Session(): V10Session {
    let state: V10UiState = { phase: 'idle' };
    let instances: InstanceState[] = [];
    let currentDictation = '';
    let currentOpts: V10SessionOptions = {};
    let sessionKbReleaseId: string | undefined;
    const answeredFactsByInstance = new Map<string, Set<string>>();
    let answers = new Map<string, unknown>();

    const normalizeKbReleaseId = (value: unknown): string | undefined => {
        if (typeof value !== 'string') return undefined;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    };

    /**
     * Start the pipeline with dictation.
     */
    async function start(dictation: string, opts: V10SessionOptions = {}): Promise<V10UiState> {
        currentDictation = dictation;
        currentOpts = opts;
        answers = new Map();
        sessionKbReleaseId = normalizeKbReleaseId(opts.kbReleaseId);
        state = { phase: 'running' };

        try {
            // 1. Run the REAL pipeline first - this is the source of truth
            // First scope to get teeth list for perTooth output
            const preScoping = scopeExtractionToInstances(dictation, opts.treatmentId || 'fuellung');
            const teeth = preScoping.instances.flatMap(i => i.teeth);

        const testOnly = (opts.forceExtraction || opts.forceAnswers)
            ? {
                enabled: true,
                forceExtraction: opts.forceExtraction,
                forceAnswers: opts.forceAnswers,
            }
            : undefined;

            const result = await runV10({
                dictation,
                treatmentId: opts.treatmentId || 'fuellung',
                insuranceType: opts.insuranceType || 'GKV',
                textLength: opts.textLength || 'mittel',
                answers,
                userDefaults: opts.settings as Record<string, unknown> | undefined,
                kbReleaseId: sessionKbReleaseId,
                requireLlmExtraction: opts.requireLlmExtraction,
                teeth: teeth.length > 0 ? teeth : undefined,  // Pass teeth for perTooth output
                testOnly,
            });
            sessionKbReleaseId = normalizeKbReleaseId(result.meta?.kbReleaseId) ?? sessionKbReleaseId;

            // 2. Build instance states from scoping (use preScoping from above)
            instances = preScoping.instances.map(inst => ({
                instanceId: inst.instanceId,
                packId: inst.packId,
                teeth: inst.teeth,
                surfaces: inst.surfaces,
                facts: applySettingsDefaults(inst.facts, opts.settings),
                answeredFacts: new Set<string>(),
                chips: new Set<string>(),  // Empty - chips come from pipeline
            }));

            // Initialize answered facts map
            for (const inst of instances) {
                answeredFactsByInstance.set(inst.instanceId, inst.answeredFacts);
            }

            // 4. Use runV10's result directly - NO SHADOW QUESTIONS
            if (result.state === 'questions' && result.questions) {
                // Convert runV10 questions to QuestionsByInstance format
                const questions = convertToQuestionsByInstance(result.questions, instances);
                state = { phase: 'questions', questions, instances };
            } else if (result.state === 'output' && result.output) {
                applyChipsFromPerInstance(instances, result.output?.perInstance);
                if (instances.every(inst => inst.chips.size === 0)) {
                    applyChipsFromDebug(instances, result.meta?.debug?.instances);
                }
                if (instances.every(inst => inst.chips.size === 0)) {
                    applyChipsFromTrace(instances, result.trace?.allChips);
                }

                // Use perInstance directly from runV10 (SSOT)
                if (!result.output.perInstance) {
                    state = { phase: 'error', error: '[BUG] runV10 output missing perInstance' };
                    return state;
                }

                const output: OutputState = {
                    fullText: result.output.fullText || '',
                    billingRefs: extractBillingRefs(result.output),
                    perInstance: mapPipelinePerInstance(result.output.perInstance),
                    kbMeta: result.meta?.kb,
                    kbReleaseId: result.meta?.kbReleaseId,
                    debug: result.meta
                        ? {
                            ...(result.meta?.debug ?? {}),
                            v10TraceLines: result.meta?.traceLines,
                        }
                        : undefined,
                };

                state = { phase: 'output', output, instances };
            } else if (result.state === 'error') {
                state = { phase: 'error', error: result.error || 'unknown' };
            } else {
                state = { phase: 'error', error: result.state || 'unknown' };
            }

            return state;

        } catch (error) {
            state = { phase: 'error', error: String(error) };
            return state;
        }
    }

    /**
     * Answer a question and recompute state.
     */
    async function answer(instanceId: string, questionId: string, value: string): Promise<V10UiState> {
        // Find the instance
        const instance = instances.find(i => i.instanceId === instanceId);
        if (!instance) {
            return state;
        }

        const pipelineQuestionId = stripInstancePrefix(questionId, instanceId);
        const normalizedKey = normalizeQuestionKey(pipelineQuestionId);
        instance.facts[normalizedKey] = value;
        instance.answeredFacts.add(normalizedKey);
        answeredFactsByInstance.set(instanceId, instance.answeredFacts);

        const tooth = instance.teeth?.[0];
        const hasConcreteTooth = typeof tooth === 'string' && /^\d{2}$/.test(tooth);
        const scopedKey = pipelineQuestionId.includes('::tooth:')
            ? pipelineQuestionId
            : (hasConcreteTooth ? `${pipelineQuestionId}::tooth:${tooth}` : pipelineQuestionId);
        answers.set(scopedKey, value);

        // 4. Re-run the REAL pipeline with answers
        const testOnly = (currentOpts.forceExtraction || currentOpts.forceAnswers)
            ? {
                enabled: true,
                forceExtraction: currentOpts.forceExtraction,
                forceAnswers: currentOpts.forceAnswers,
            }
            : undefined;

        const result = await runV10({
            dictation: currentDictation,
            treatmentId: currentOpts.treatmentId || 'fuellung',
            insuranceType: currentOpts.insuranceType || 'GKV',
            textLength: currentOpts.textLength || 'mittel',
            answers,
            userDefaults: currentOpts.settings as Record<string, unknown> | undefined,
            kbReleaseId: sessionKbReleaseId,
            requireLlmExtraction: currentOpts.requireLlmExtraction,
            testOnly,
        });
        sessionKbReleaseId = normalizeKbReleaseId(result.meta?.kbReleaseId) ?? sessionKbReleaseId;

        // 5. Use result state
        if (result.state === 'questions' && result.questions) {
            const questions = convertToQuestionsByInstance(result.questions, instances);
            state = { phase: 'questions', questions, instances };
        } else if (result.state === 'output' && result.output) {
            applyChipsFromPerInstance(instances, result.output?.perInstance);
            if (instances.every(inst => inst.chips.size === 0)) {
                applyChipsFromDebug(instances, result.meta?.debug?.instances);
            }
            if (instances.every(inst => inst.chips.size === 0)) {
                applyChipsFromTrace(instances, result.trace?.allChips);
            }

            // Use perInstance directly from runV10 (SSOT)
            if (!result.output.perInstance) {
                state = { phase: 'error', error: '[BUG] runV10 output missing perInstance' };
                return state;
            }

            const output: OutputState = {
                fullText: result.output.fullText || '',
                billingRefs: extractBillingRefs(result.output),
                perInstance: mapPipelinePerInstance(result.output.perInstance),
                kbMeta: result.meta?.kb,
                kbReleaseId: result.meta?.kbReleaseId,
                debug: result.meta
                    ? {
                        ...(result.meta?.debug ?? {}),
                        v10TraceLines: result.meta?.traceLines,
                    }
                    : undefined,
            };

            state = { phase: 'output', output, instances };
        } else if (result.state === 'error') {
            state = { phase: 'error', error: result.error || 'unknown' };
        }

        return state;
    }

    return {
        start,
        answer,
        getState: () => state,
        getInstances: () => instances,
        getAnsweredFacts: () => answeredFactsByInstance,
    };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Convert DynamicQuestion[] to QuestionsByInstance.
 * Questions are bound to instances via their instanceId field.
 */
function convertToQuestionsByInstance(
    questions: unknown[],
    instances: InstanceState[]
): QuestionsByInstance {
    const result: QuestionsByInstance = {};

    // Default instance only used if question has no instanceId
    const defaultInstanceId = instances[0]?.instanceId || 'default';

    for (const q of questions as Array<{
        id?: string;
        questionKey?: string;
        question?: string;
        instanceId?: string;  // Now questions have this field
        options?: Array<{ value: string; label: string; dataValue?: string }>;
    }>) {
        // Use question's instanceId if available, otherwise fallback to default
        const instanceId = q.instanceId || defaultInstanceId;

        // Verify instance exists
        const instanceExists = instances.some(i => i.instanceId === instanceId);
        const resolvedInstanceId = instanceExists ? instanceId : defaultInstanceId;

        if (!result[resolvedInstanceId]) {
            result[resolvedInstanceId] = [];
        }

        const matchedInstance = instances.find(i => i.instanceId === resolvedInstanceId);

        const questionId = q.id || q.questionKey || 'unknown';
        result[resolvedInstanceId].push({
            id: `${resolvedInstanceId}::${questionId}`,
            instanceId: resolvedInstanceId,
            packId: matchedInstance?.packId || 'fuellung',
            ruleId: q.questionKey || q.id || 'unknown',
            level: 'L1' as const,
            question: q.question || '',
            options: (q.options || []).map(opt => ({
                value: opt.dataValue ?? opt.value,
                label: opt.label,
            })),
            meta: {
                packId: matchedInstance?.packId || 'fuellung',
                instanceId: resolvedInstanceId,
                ruleId: q.questionKey || q.id || 'unknown',
                requiredFacts: [],
                because: {},
            },
        });
    }

    return result;
}

/**
 * Extract billing refs from output.
 */
function extractBillingRefs(output: { billingCodes?: unknown[] }): string[] {
    if (!output.billingCodes) return [];

    return output.billingCodes.map((c: unknown) => {
        if (typeof c === 'string') return c;
        if (typeof c === 'object' && c !== null && 'code' in c) {
            return (c as { code: string }).code;
        }
        return String(c);
    });
}

/**
 * Map perInstance from runV10 to OutputState format.
 * Direct 1:1 mapping - perInstance is now the SSOT from runV10.
 */
function mapPipelinePerInstance(
    pipelinePerInstance: Record<string, {
        instanceId: string;
        teeth: string[];
        text: string;
        billingRefs: string[];
        chips: string[];
    }>
): Record<string, { text: string; billingRefs: string[] }> {
    const result: Record<string, { text: string; billingRefs: string[] }> = {};

    for (const [key, val] of Object.entries(pipelinePerInstance)) {
        result[key] = {
            text: val.text,
            billingRefs: val.billingRefs,
        };
    }

    return result;
}

function applyChipsFromPerInstance(
    instances: InstanceState[],
    perInstance?: Record<string, { chips?: string[] }>
): void {
    if (!perInstance) return;
    for (const inst of instances) {
        const entry = perInstance[inst.instanceId];
        if (!entry?.chips) continue;
        for (const chipId of entry.chips) {
            inst.chips.add(chipId);
        }
    }
}

function applyChipsFromDebug(
    instances: InstanceState[],
    debugInstances?: Array<{ instanceId?: string; tooth?: string; chips?: string[] }>
): void {
    if (!Array.isArray(debugInstances) || debugInstances.length === 0) return;
    for (const debugInst of debugInstances) {
        const target =
            (debugInst.instanceId
                ? instances.find(inst => inst.instanceId === debugInst.instanceId)
                : undefined)
            ?? (debugInst.tooth
                ? instances.find(inst => inst.teeth?.includes(String(debugInst.tooth)))
                : undefined);
        if (!target || !debugInst.chips) continue;
        for (const chipId of debugInst.chips) {
            target.chips.add(chipId);
        }
    }
}

function applyChipsFromTrace(instances: InstanceState[], allChips?: string[]): void {
    if (!Array.isArray(allChips) || allChips.length === 0) return;
    if (!instances[0]) return;
    for (const chipId of allChips) {
        instances[0].chips.add(chipId);
    }
}
