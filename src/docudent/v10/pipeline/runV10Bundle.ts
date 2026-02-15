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
import type { DynamicQuestion } from '../../contracts/questions';
import { runV10 } from './runV10';
import { renderFromKbChips, getChipFromKb } from '../renderer';
import {
    buildSessionBillingSummary,
    runSessionCombinability,
    deriveUpsellHints,
} from '../billing/sessionCombinability';

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
 * TOOTH: keep all (with tooth info).
 */
function dedupeBillingCodes(codes: V10ScopedBillingCode[]): V10ScopedBillingCode[] {
    const seen = new Map<string, V10ScopedBillingCode>();
    const result: V10ScopedBillingCode[] = [];

    for (const code of codes) {
        if (code.scope === 'SESSION') {
            // SESSION scope: dedupe by code only
            if (!seen.has(code.code)) {
                seen.set(code.code, code);
                result.push(code);
            }
        } else {
            // TOOTH scope: keep per tooth
            const key = `${code.code}::${code.tooth ?? 'none'}`;
            if (!seen.has(key)) {
                seen.set(key, code);
                result.push(code);
            }
        }
    }

    return result;
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
export async function runV10Bundle(input: V10BundleInput): Promise<V10BundleOutput> {
    const startTime = Date.now();
    const isDev = process.env.NODE_ENV !== 'production';

    try {
        const { segments, globalAnswers, dictation: fullDictation } = input;

        // Normalize global answers
        const globalAnswerMap = globalAnswers instanceof Map
            ? globalAnswers
            : new Map(Object.entries(globalAnswers ?? {}));

        // Collect results from all instances
        const allResults: CollectedInstanceResult[] = [];

        for (const segment of segments) {
            const segmentDictation = segment.dictation ?? fullDictation ?? '';

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
                const result = await runV10({
                    dictation: instanceDictation,
                    treatmentId: segment.treatmentId,
                    insuranceType: segment.insuranceType,
                    textLength: segment.textLength,
                    answers: mergedAnswers,
                    teeth: instance.tooth ? [instance.tooth] : undefined,
                });

                // Check for required questions
                const hasUnansweredRequired = result.state === 'questions' &&
                    (result.questions?.some(q => q.medicalSeverity === 'hard') ?? false);

                // Get chips and render
                const chips = result.trace?.allChips ?? [];
                let text = '';
                const billingCodes: V10ScopedBillingCode[] = [];

                if (result.state === 'output' && result.output) {
                    text = result.output.fullText;

                    // Convert billing codes to scoped format
                    for (const code of result.output.billingCodes) {
                        const scope = getChipBillingScope(segment.treatmentId, code);
                        billingCodes.push({
                            code,
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
                    questions: result.questions ?? [],
                    chips,
                    text,
                    billingCodes,
                    trace: result.trace?.instances?.[0] ?? {
                        tooth: instance.tooth,
                        extractedSummary: { tooth: null, surfaces: [], diagnosis: null },
                        facts: {},
                        ruleHits: [],
                        askbacks: { required: [], optional: [] },
                        chips: [],
                        renderedChipIds: [],
                    },
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
                meta: buildMeta(allResults, startTime),
                trace: isDev ? buildTrace(allResults) : undefined,
            };
        }

        // All answered — build output
        const segmentOutputs = buildSegmentOutputs(allResults, segments);
        const allBillingCodes = allResults.flatMap(r => r.billingCodes);
        const dedupedBilling = dedupeBillingCodes(allBillingCodes);
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

        return {
            state: 'output',
            output: {
                fullText,
                billingCodes: dedupedBilling,
                segments: segmentOutputs,
            },
            meta: buildMeta(allResults, startTime, sessionCombinability, upsellHints),
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
                durations: { total: Date.now() - startTime },
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
        if (seen.has(item.question.id)) return false;
        seen.add(item.question.id);
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

    for (const segment of segments) {
        const segmentResults = results.filter(r => r.segmentId === segment.segmentId);

        const instanceOutputs = segmentResults.map(r => ({
            instanceId: r.instanceId,
            tooth: r.tooth,
            text: r.text,
            chips: r.chips,
        }));

        const segmentText = instanceOutputs.map(io => io.text).join(' ');
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
    startTime: number,
    sessionCombinability?: ReturnType<typeof runSessionCombinability>,
    upsellHints?: ReturnType<typeof deriveUpsellHints>
): V10PipelineMeta {
    return {
        engineUsed: 'v10',
        instanceCount: results.length,
        multiInstance: results.length > 1,
        durations: {
            total: Date.now() - startTime,
        },
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
