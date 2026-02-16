/**
 * V10 Bundle Orchestrator — Multi-Instance / Multi-Treatment
 *
 * Processes bundles of segments with multiple instances each.
 * Handles scope-aware question ordering and billing dedup.
 */

import type {
    V10BundleInput,
    V10BundleOutput,
    V10PipelineTrace,
    V10ScopedBillingCode,
    V10SegmentOutput,
    V10InstanceTrace,
    V10PipelineMeta,
} from '../types';
import type { DynamicQuestion, QuestionOption } from '../../contracts/questions';
import { runV10 } from './runV10';
import { renderFromKbChips, getChipFromKb } from '../renderer';
import {
    buildSessionBillingSummary,
    runSessionCombinability,
    deriveUpsellHints,
} from '../billing/sessionCombinability';
import type { SettingsInput } from '../settings/settingsTypes';

// ═══════════════════════════════════════════════════════════════
// SCOPE DEDUP HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Determine billing scope for a chip.
 * SESSION-scoped chips (e.g., anesthesia) are deduped across all instances.
 * TOOTH-scoped chips are kept per-tooth.
 */
function getChipBillingScope(
    treatmentId: string,
    chipId: string
): 'SESSION' | 'TOOTH' {
    // Check KB for scope info (fallback to TOOTH if not specified)
    const chip = getChipFromKb(treatmentId, chipId);
    if (chip) {
        // Check phase for scope hints
        const sessionPhases = ['anaesthesie', 'vorbereitung'];
        if (chip.phase && sessionPhases.includes(chip.phase)) {
            return 'SESSION';
        }
    }
    return 'TOOTH';
}

/**
 * Dedupe billing codes by scope.
 * SESSION: keep only first occurrence.
 * INSTANCE: keep first occurrence per instance.
 * TOOTH: keep first occurrence per tooth.
 */
function dedupeBillingCodes(codes: V10ScopedBillingCode[]): V10ScopedBillingCode[] {
    const seen = new Map<string, V10ScopedBillingCode>();
    const result: V10ScopedBillingCode[] = [];

    const dedupePolicyFor = (code: V10ScopedBillingCode): 'SESSION' | 'INSTANCE' | 'TOOTH' => {
        if (code.scope === 'SESSION') return 'SESSION';
        // Safety default: non-session billing is instance-bound, so two procedures
        // on the same tooth do not silently collapse into one code.
        return 'INSTANCE';
    };

    const dedupeKeyFor = (code: V10ScopedBillingCode): string => {
        const policy = dedupePolicyFor(code);
        if (policy === 'SESSION') {
            return `SESSION::${code.code}`;
        }
        if (policy === 'TOOTH') {
            return `TOOTH::${code.code}::${code.tooth ?? 'none'}`;
        }
        return `INSTANCE::${code.code}::${code.instanceId}`;
    };

    for (const code of codes) {
        const key = dedupeKeyFor(code);
        if (!seen.has(key)) {
            seen.set(key, code);
            result.push(code);
        }
    }

    return result.sort((a, b) => {
        const scopeCmp = a.scope.localeCompare(b.scope);
        if (scopeCmp !== 0) return scopeCmp;
        const instanceCmp = a.instanceId.localeCompare(b.instanceId);
        if (instanceCmp !== 0) return instanceCmp;
        const toothCmp = (a.tooth ?? '').localeCompare(b.tooth ?? '');
        if (toothCmp !== 0) return toothCmp;
        return a.code.localeCompare(b.code);
    });
}

// ═══════════════════════════════════════════════════════════════
// INSTANCE RESULT COLLECTION
// ═══════════════════════════════════════════════════════════════

interface CollectedInstanceResult {
    segmentId: string;
    instanceId: string;
    tooth?: string;
    treatmentId: string;
    hasUnansweredRequired: boolean;
    questions: DynamicQuestion[];
    chips: string[];
    text: string;
    billingCodes: V10ScopedBillingCode[];
    trace: V10InstanceTrace;
    factSources: Array<{
        key: string;
        source: 'dictation' | 'settings' | 'askback' | 'manual';
        origin: 'answer' | 'settings';
        scope: 'session' | 'tooth';
        toothScope?: string;
    }>;
    askbackProvenance: NonNullable<NonNullable<V10PipelineMeta['provenance']>['askbacks']>;
    chipProvenance: NonNullable<NonNullable<V10PipelineMeta['provenance']>['chips']>;
    billingGuard?: NonNullable<NonNullable<V10PipelineMeta['provenance']>['billingGuard']>;
    extractorEngine?: V10PipelineMeta['extractorEngine'];
    traceLines?: string[];
}

function extractToothFromScopedId(id?: string): string | undefined {
    if (!id) return undefined;
    const scopedMatch = id.match(/::tooth:(\d+)$/);
    if (scopedMatch?.[1]) return scopedMatch[1];
    const dashMatch = id.match(/-(\d+)-\d+$/);
    if (dashMatch?.[1]) return dashMatch[1];
    const suffixMatch = id.match(/tooth:(\d+)(?:$|:)/);
    if (suffixMatch?.[1]) return suffixMatch[1];
    return undefined;
}

function questionMatchesInstance(question: DynamicQuestion, tooth?: string): boolean {
    if (!tooth) return true;
    const questionTooth = extractToothFromScopedId(question.id)
        ?? extractToothFromScopedId(question.instanceId);
    if (!questionTooth) return true;
    return questionTooth === tooth;
}

export interface RunV10BundleOptions {
    settings?: SettingsInput;
    autoAnswerAllQuestions?: boolean;
    forceChipsByTreatmentId?: Record<string, string[]>;
}

function stableHash(input: string): string {
    let hash = 5381;
    for (let i = 0; i < input.length; i += 1) {
        hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
    }
    return `h${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function pickOptionValue(first?: QuestionOption): unknown {
    if (!first) return undefined;
    if (first.dataValue !== undefined) return first.dataValue;
    if (first.label !== undefined) return first.label;
    return first.id;
}

function buildAutoAnswers(questions: DynamicQuestion[]): Map<string, unknown> {
    const answers = new Map<string, unknown>();
    for (const q of questions) {
        const firstValue = pickOptionValue(q.options?.[0]);

        if (q.type === 'multi') {
            answers.set(q.id, firstValue !== undefined ? [firstValue] : []);
            continue;
        }
        if (q.type === 'number') {
            const num = q.defaultValue ?? q.presets?.[0] ?? q.min ?? 0;
            answers.set(q.id, num);
            continue;
        }
        if (q.type === 'text') {
            answers.set(q.id, '');
            continue;
        }
        answers.set(q.id, firstValue ?? 'unknown');
    }
    return answers;
}

function sortSourceRefs(sourceRefs: Array<{ sourceId: string; anchorId: string; note?: string }>): Array<{ sourceId: string; anchorId: string; note?: string }> {
    return [...sourceRefs].sort((a, b) => {
        const sourceCmp = a.sourceId.localeCompare(b.sourceId);
        if (sourceCmp !== 0) return sourceCmp;
        const anchorCmp = a.anchorId.localeCompare(b.anchorId);
        if (anchorCmp !== 0) return anchorCmp;
        return (a.note ?? '').localeCompare(b.note ?? '');
    });
}

// ═══════════════════════════════════════════════════════════════
// MAIN BUNDLE ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Run the V10 bundle pipeline.
 *
 * Processes segments in order, instances within each segment in order.
 * Returns 'questions' if any instance has unanswered required questions.
 */
export async function runV10Bundle(
    input: V10BundleInput,
    opts?: RunV10BundleOptions
): Promise<V10BundleOutput> {
    const isDev = process.env.NODE_ENV !== 'production';
    const normalizeKbReleaseId = (value: unknown): string | undefined => {
        if (typeof value !== 'string') return undefined;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    };

    try {
        const { segments, globalAnswers, dictation: fullDictation } = input;
        let pinnedKbReleaseId = normalizeKbReleaseId(input.kbReleaseId);

        // Normalize global answers
        const globalAnswerMap = globalAnswers instanceof Map
            ? globalAnswers
            : new Map(Object.entries(globalAnswers ?? {}));

        // Collect results from all instances
        const allResults: CollectedInstanceResult[] = [];

        for (const segment of segments) {
            const segmentDictation = segment.dictation ?? fullDictation ?? '';
            const forcedChips = opts?.forceChipsByTreatmentId?.[segment.treatmentId];

            for (const instance of segment.instances) {
                const instanceDictation = instance.dictation ?? segmentDictation;

                // Merge global + segment + instance answers
                const mergedAnswers = new Map(globalAnswerMap);
                if (instance.answers) {
                    const instanceAnswerMap = instance.answers instanceof Map
                        ? instance.answers
                        : new Map(Object.entries(instance.answers));
                    for (const [k, v] of instanceAnswerMap) {
                        mergedAnswers.set(k, v);
                    }
                }

                // Call single-instance runV10
                let result = await runV10({
                    dictation: instanceDictation,
                    treatmentId: segment.treatmentId,
                    insuranceType: segment.insuranceType,
                    textLength: segment.textLength,
                    answers: mergedAnswers,
                    userDefaults: opts?.settings as Record<string, unknown> | undefined,
                    teeth: instance.tooth ? [instance.tooth] : undefined,
                    kbReleaseId: pinnedKbReleaseId,
                    testOnly: forcedChips
                        ? {
                            enabled: true,
                            forceChips: forcedChips,
                        }
                        : undefined,
                });
                pinnedKbReleaseId = normalizeKbReleaseId(result.meta?.kbReleaseId) ?? pinnedKbReleaseId;

                if (result.state === 'questions') {
                    const requiredCount = result.questionsBundle?.required?.length ?? 0;
                    const shouldAutoAnswer =
                        (opts?.autoAnswerAllQuestions === true && (result.questions?.length ?? 0) > 0)
                        || (requiredCount === 0 && (result.questions?.length ?? 0) > 0);

                    if (shouldAutoAnswer) {
                        const autoAnswers = buildAutoAnswers(result.questions ?? []);
                        for (const [key, value] of autoAnswers) {
                            mergedAnswers.set(key, value);
                        }
                        result = await runV10({
                            dictation: instanceDictation,
                            treatmentId: segment.treatmentId,
                            insuranceType: segment.insuranceType,
                            textLength: segment.textLength,
                            answers: mergedAnswers,
                            userDefaults: opts?.settings as Record<string, unknown> | undefined,
                            teeth: instance.tooth ? [instance.tooth] : undefined,
                            kbReleaseId: pinnedKbReleaseId,
                        });
                        pinnedKbReleaseId = normalizeKbReleaseId(result.meta?.kbReleaseId) ?? pinnedKbReleaseId;
                    }
                }

                if (result.state === 'questions' && forcedChips) {
                    result = await runV10({
                        dictation: instanceDictation,
                        treatmentId: segment.treatmentId,
                        insuranceType: segment.insuranceType,
                        textLength: segment.textLength,
                        answers: mergedAnswers,
                        userDefaults: opts?.settings as Record<string, unknown> | undefined,
                        teeth: instance.tooth ? [instance.tooth] : undefined,
                        kbReleaseId: pinnedKbReleaseId,
                        testOnly: {
                            enabled: true,
                            forceChips: forcedChips,
                        },
                    });
                    pinnedKbReleaseId = normalizeKbReleaseId(result.meta?.kbReleaseId) ?? pinnedKbReleaseId;
                }

                // Check for required questions
                const scopedQuestions = (result.questions ?? [])
                    .filter(question => questionMatchesInstance(question, instance.tooth))
                    .map(question => ({
                        ...question,
                        // Rebind all question answers to the bundle instance id so
                        // completion writes back into the same pending bundle path.
                        instanceId: instance.instanceId,
                    }));

                const hasUnansweredRequired = result.state === 'questions' &&
                    scopedQuestions.some(q => q.medicalSeverity === 'hard');

                const outputInstance = result.state === 'output' && result.output
                    ? Object.values(result.output.perInstance ?? {}).find(entry =>
                        instance.tooth
                            ? entry.teeth?.includes(instance.tooth)
                            : true
                    ) ?? Object.values(result.output.perInstance ?? {})[0]
                    : undefined;

                const traceInstance = result.trace?.instances?.find(traceEntry =>
                    instance.tooth ? traceEntry.tooth === instance.tooth : true
                ) ?? result.trace?.instances?.[0];

                // Keep chips aligned to the selected bundle instance to prevent
                // cross-instance leakage when runV10 internally scopes multiple teeth.
                const chips = outputInstance?.chips
                    ?? traceInstance?.chips
                    ?? result.trace?.allChips
                    ?? [];
                let text = '';
                const billingCodes: V10ScopedBillingCode[] = [];
                const reviewInstance = result.review?.instances?.find(review =>
                    instance.tooth
                        ? review.teeth?.includes(instance.tooth) || review.tooth === instance.tooth
                        : true
                ) ?? result.review?.instances?.[0];
                const factSources = Object.entries(reviewInstance?.factSources ?? {}).map(([key, source]) => ({
                    key,
                    source,
                    origin: source === 'settings' ? 'settings' : 'answer',
                    scope: instance.tooth ? 'tooth' as const : 'session' as const,
                    toothScope: instance.tooth,
                }));
                const rawAskbackProvenance = result.meta?.provenance?.askbacks ?? [];
                const askbackProvenance = rawAskbackProvenance.map(askback => ({
                    ...askback,
                    scope: askback.scope ?? (instance.tooth ? 'tooth' : 'session'),
                    toothScope: askback.toothScope ?? instance.tooth,
                    sourceRefs: sortSourceRefs(askback.sourceRefs ?? []),
                    triggeredByFacts: [...new Set(askback.triggeredByFacts ?? [])].sort((a, b) => a.localeCompare(b)),
                }));
                const rawChipProvenance = result.meta?.provenance?.chips ?? [];
                const chipProvenance = rawChipProvenance.map(chip => ({
                    ...chip,
                    scope: chip.scope ?? (instance.tooth ? 'tooth' : 'session'),
                    toothScope: chip.toothScope ?? instance.tooth,
                    sourceRefs: sortSourceRefs(chip.sourceRefs ?? []),
                    factSources: [...new Set(chip.factSources ?? [])].sort((a, b) => a.localeCompare(b)),
                }));

                if (result.state === 'output' && result.output) {
                    text = outputInstance?.text ?? result.output.fullText;
                    const billingRefs = outputInstance?.billingRefs ?? result.output.billingCodes;

                    // Convert billing codes to scoped format
                    for (const code of billingRefs) {
                        const scope = getChipBillingScope(segment.treatmentId, code);
                        billingCodes.push({
                            code,
                            instanceId: instance.instanceId,
                            tooth: instance.tooth,
                            scope,
                        });
                    }
                }

                allResults.push({
                    segmentId: segment.segmentId,
                    instanceId: instance.instanceId,
                    tooth: instance.tooth,
                    treatmentId: segment.treatmentId,
                    hasUnansweredRequired,
                    questions: scopedQuestions,
                    chips,
                    text,
                    billingCodes,
                    trace: traceInstance ?? {
                        tooth: instance.tooth,
                        extractedSummary: { tooth: null, surfaces: [], diagnosis: null },
                        facts: {},
                        ruleHits: [],
                        askbacks: { required: [], optional: [] },
                        chips: [],
                        renderedChipIds: [],
                    },
                    factSources,
                    askbackProvenance,
                    chipProvenance,
                    billingGuard: result.meta?.provenance?.billingGuard,
                    extractorEngine: result.meta?.extractorEngine,
                    traceLines: result.meta?.traceLines,
                });
            }
        }

        // Check if any instance has unanswered required questions
        const hasAnyUnanswered = allResults.some(r => r.hasUnansweredRequired);

        if (hasAnyUnanswered) {
            // Collect and sort all questions
            const allQuestions = collectAndSortQuestions(allResults);

            return {
                state: 'questions',
                questions: allQuestions,
                meta: buildMeta(allResults),
                trace: isDev ? buildTrace(allResults) : undefined,
            };
        }

        // All answered — build output
        const segmentOutputs = buildSegmentOutputs(allResults, segments);
        const allBillingCodes = allResults.flatMap(r => r.billingCodes);
        const dedupedBilling = dedupeBillingCodes(allBillingCodes);
        if (dedupedBilling.some(code => !code.instanceId || !code.instanceId.trim())) {
            throw new Error('Invariant violation: bundle billing code without instanceId');
        }
        const fullText = segmentOutputs.map(s => s.text).join('\n\n');

        const sessionSummary = buildSessionBillingSummary(allBillingCodes, segments);
        const sessionCombinability = runSessionCombinability(sessionSummary);
        const upsellHints = deriveUpsellHints(
            segments,
            allResults.map(r => ({
                segmentId: r.segmentId,
                tooth: r.tooth,
                chips: r.chips,
                insuranceType: segments.find(s => s.segmentId === r.segmentId)?.insuranceType ?? 'GKV',
            }))
        );

        const outputHash = stableHash(JSON.stringify({
            fullText,
            billing: dedupedBilling.map(code => ({
                code: code.code,
                instanceId: code.instanceId,
                tooth: code.tooth ?? null,
                scope: code.scope,
            })),
        }));

        return {
            state: 'output',
            output: {
                fullText,
                billingCodes: dedupedBilling,
                segments: segmentOutputs,
            },
            meta: buildMeta(allResults, sessionCombinability, upsellHints, outputHash),
            trace: isDev ? buildTrace(allResults) : undefined,
        };
    } catch (error) {
        return {
            state: 'error',
            error: error instanceof Error ? error.message : String(error),
            meta: {
                engineUsed: 'v10',
                instanceCount: 0,
                multiInstance: true,
                durations: { total: 0 },
            },
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// QUESTION COLLECTION AND SORTING
// ═══════════════════════════════════════════════════════════════

function collectAndSortQuestions(
    results: CollectedInstanceResult[]
): DynamicQuestion[] {
    // Collect all questions, preserving segment/instance order
    const allQuestions: Array<{
        question: DynamicQuestion;
        segmentIndex: number;
        instanceIndex: number;
    }> = [];

    const segmentOrder = new Map<string, number>();
    const instanceOrder = new Map<string, number>();

    let segIdx = 0;
    let instIdx = 0;

    for (const result of results) {
        if (!segmentOrder.has(result.segmentId)) {
            segmentOrder.set(result.segmentId, segIdx++);
        }
        if (!instanceOrder.has(result.instanceId)) {
            instanceOrder.set(result.instanceId, instIdx++);
        }

        for (const q of result.questions) {
            allQuestions.push({
                question: q,
                segmentIndex: segmentOrder.get(result.segmentId)!,
                instanceIndex: instanceOrder.get(result.instanceId)!,
            });
        }
    }

    // Dedupe by question ID (keep first occurrence per stable order)
    const seen = new Set<string>();
    const deduped = allQuestions.filter(item => {
        const scopeKey = `${item.question.instanceId ?? 'global'}::${item.question.id}`;
        if (seen.has(scopeKey)) return false;
        seen.add(scopeKey);
        return true;
    });

    // Sort: segment order → instance order → required first → id
    deduped.sort((a, b) => {
        // Segment order
        if (a.segmentIndex !== b.segmentIndex) {
            return a.segmentIndex - b.segmentIndex;
        }
        // Instance order
        if (a.instanceIndex !== b.instanceIndex) {
            return a.instanceIndex - b.instanceIndex;
        }
        // Required before optional
        const aReq = a.question.medicalSeverity === 'hard' ? 0 : 1;
        const bReq = b.question.medicalSeverity === 'hard' ? 0 : 1;
        if (aReq !== bReq) return aReq - bReq;
        // Alphabetical by id
        return a.question.id.localeCompare(b.question.id);
    });

    return deduped.map(item => item.question);
}

// ═══════════════════════════════════════════════════════════════
// OUTPUT BUILDING
// ═══════════════════════════════════════════════════════════════

function buildSegmentOutputs(
    results: CollectedInstanceResult[],
    segments: V10BundleInput['segments']
): V10SegmentOutput[] {
    const outputs: V10SegmentOutput[] = [];
    const orderedSegments = [...segments].sort((a, b) => {
        const aTooth = results.find(r => r.segmentId === a.segmentId)?.tooth ?? '';
        const bTooth = results.find(r => r.segmentId === b.segmentId)?.tooth ?? '';
        const toothCmp = aTooth.localeCompare(bTooth);
        if (toothCmp !== 0) return toothCmp;
        const treatmentCmp = a.treatmentId.localeCompare(b.treatmentId);
        if (treatmentCmp !== 0) return treatmentCmp;
        return a.segmentId.localeCompare(b.segmentId);
    });

    for (const segment of orderedSegments) {
        const segmentResults = results.filter(r => r.segmentId === segment.segmentId);

        const instanceOutputs = [...segmentResults]
            .sort((a, b) => {
                const toothCmp = (a.tooth ?? '').localeCompare(b.tooth ?? '');
                if (toothCmp !== 0) return toothCmp;
                return a.instanceId.localeCompare(b.instanceId);
            })
            .map(r => ({
            instanceId: r.instanceId,
            tooth: r.tooth,
            text: r.text,
            chips: r.chips,
            }));

        const segmentText = instanceOutputs.map(io => io.text).join('\n\n');
        const segmentBilling = segmentResults.flatMap(r => r.billingCodes);

        outputs.push({
            segmentId: segment.segmentId,
            treatmentId: segment.treatmentId,
            text: segmentText,
            billingCodes: segmentBilling,
            instanceOutputs,
        });
    }

    return outputs;
}

function buildMeta(
    results: CollectedInstanceResult[],
    sessionCombinability?: ReturnType<typeof runSessionCombinability>,
    upsellHints?: ReturnType<typeof deriveUpsellHints>,
    outputHash?: string,
): V10PipelineMeta {
    const sortedByInstance = [...results].sort((a, b) => a.instanceId.localeCompare(b.instanceId));
    const extractorEngines = Array.from(new Set(sortedByInstance
        .map(result => result.extractorEngine)
        .filter((engine): engine is NonNullable<V10PipelineMeta['extractorEngine']> => Boolean(engine))));
    const extractorEngine = extractorEngines.length === 1 ? extractorEngines[0] : undefined;
    const extractDetailLine = sortedByInstance
        .flatMap(result => result.traceLines ?? [])
        .find(line => typeof line === 'string' && line.startsWith('extract_detail:'));
    const traceLines = extractDetailLine ? [extractDetailLine] : undefined;

    const uniqueFactSources = new Map<string, CollectedInstanceResult['factSources'][number]>();
    for (const result of results) {
        for (const source of result.factSources) {
            const key = `${source.key}::${source.source}::${source.scope}::${source.toothScope ?? ''}`;
            if (!uniqueFactSources.has(key)) {
                uniqueFactSources.set(key, source);
            }
        }
    }

    const askbackByKey = new Map<string, NonNullable<NonNullable<V10PipelineMeta['provenance']>['askbacks']>[number]>();
    for (const result of results) {
        for (const askback of result.askbackProvenance) {
            const key = [
                askback.askbackId,
                askback.ruleId,
                askback.scope,
                askback.toothScope ?? '',
                askback.sourceRefs.map(ref => `${ref.sourceId}#${ref.anchorId}:${ref.note ?? ''}`).join('|'),
            ].join('::');
            if (!askbackByKey.has(key)) {
                askbackByKey.set(key, askback);
            }
        }
    }
    const chipByKey = new Map<string, NonNullable<NonNullable<V10PipelineMeta['provenance']>['chips']>[number]>();
    for (const result of results) {
        for (const chip of result.chipProvenance) {
            const key = [
                chip.chipId,
                chip.emittedByRuleId,
                chip.scope,
                chip.toothScope ?? '',
                chip.billingEligible ? '1' : '0',
                chip.factSources.join('|'),
                chip.sourceRefs.map(ref => `${ref.sourceId}#${ref.anchorId}:${ref.note ?? ''}`).join('|'),
            ].join('::');
            if (!chipByKey.has(key)) {
                chipByKey.set(key, chip);
            }
        }
    }
    const askbacks = Array.from(askbackByKey.values()).sort((a, b) => {
        const toothCmp = (a.toothScope ?? '').localeCompare(b.toothScope ?? '');
        if (toothCmp !== 0) return toothCmp;
        const idCmp = a.askbackId.localeCompare(b.askbackId);
        if (idCmp !== 0) return idCmp;
        return a.ruleId.localeCompare(b.ruleId);
    });
    const chips = Array.from(chipByKey.values()).sort((a, b) => {
        const toothCmp = (a.toothScope ?? '').localeCompare(b.toothScope ?? '');
        if (toothCmp !== 0) return toothCmp;
        const chipCmp = a.chipId.localeCompare(b.chipId);
        if (chipCmp !== 0) return chipCmp;
        return a.emittedByRuleId.localeCompare(b.emittedByRuleId);
    });
    const guardTotals = results.reduce((acc, result) => {
        if (!result.billingGuard) return acc;
        acc.allowed += result.billingGuard.allowed;
        acc.blocked += result.billingGuard.blocked;
        for (const chipId of result.billingGuard.blockedChipIds ?? []) {
            acc.blockedChipIds.add(chipId);
        }
        return acc;
    }, {
        allowed: 0,
        blocked: 0,
        blockedChipIds: new Set<string>(),
    });

    return {
        engineUsed: 'v10',
        instanceCount: results.length,
        multiInstance: results.length > 1,
        durations: {
            // Determinism invariant: output payload must not depend on wall clock time.
            total: 0,
        },
        traceLines,
        extractorEngine,
        combinability: sessionCombinability ? {
            verdict: sessionCombinability.verdict,
            conflicts: sessionCombinability.conflicts.map(c => ({
                ruleId: c.ruleId,
                codesInvolved: c.codesInvolved,
                reason: c.reason,
            })),
            blockedCodes: sessionCombinability.blockedCodes,
            kbVersion: sessionCombinability.kbVersion,
            droppedCodes: sessionCombinability.droppedCodes,
        } : undefined,
        upsellHints: upsellHints && upsellHints.length > 0 ? upsellHints : undefined,
        provenance: {
            askbacks,
            chips,
            factSources: Array.from(uniqueFactSources.values()),
            billingGuard: {
                allowed: guardTotals.allowed,
                blocked: guardTotals.blocked,
                blockedChipIds: [...guardTotals.blockedChipIds].sort((a, b) => a.localeCompare(b)),
            },
        },
        outputHash,
    };
}

function buildTrace(results: CollectedInstanceResult[]): V10PipelineTrace {
    return {
        instances: results.map(r => r.trace),
        allRuleHits: [...new Set(results.flatMap(r => r.trace.ruleHits))],
        allChips: [...new Set(results.flatMap(r => r.chips))],
        finalBillingCodes: [...new Set(results.flatMap(r => r.billingCodes.map(b => b.code)))],
    };
}
