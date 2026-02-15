/**
 * Multi-Treatment Orchestrator (Headless)
 *
 * Runs multiple treatment segments through the existing V10 pipeline and
 * aggregates output deterministically.
 */

import type { V10BundleInput, V10BundleOutput, V10SegmentOutput, V10ScopedBillingCode } from '../types';
import type { SettingsInput } from '../settings/settingsTypes';
import { runV10 } from '../pipeline/runV10';
import { getBillingScope } from '../../core/billing/knowledgeBase/logic/billingScopeResolver';
import type { QuestionOption } from '../../contracts/questions';

type SegmentRun = {
    segmentId: string;
    treatmentId: string;
    output: NonNullable<V10BundleOutput['output']>;
    raw: Awaited<ReturnType<typeof runV10>>;
};

function buildAutoAnswers(questions: NonNullable<Awaited<ReturnType<typeof runV10>>['questions']>): Map<string, unknown> {
    const answers = new Map<string, unknown>();
    for (const q of questions) {
        const first = q.options?.[0];
        const firstValue = pickOptionValue(first);

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
            // Keep deterministic; text questions are typically optional context.
            answers.set(q.id, '');
            continue;
        }

        // 'single' (or undefined): pick the first option deterministically.
        answers.set(q.id, firstValue ?? 'unknown');
    }
    return answers;
}

function pickOptionValue(first?: QuestionOption): unknown {
    if (!first) return undefined;
    if (first.dataValue !== undefined) return first.dataValue;
    if (first.label !== undefined) return first.label;
    return first.id;
}

function mergeSectionContents(sections: Array<{ id: string; label: string; content: string }>): Array<{ id: string; label: string; content: string }> {
    const buckets = new Map<string, { id: string; label: string; contents: string[] }>();
    for (const section of sections) {
        const existing = buckets.get(section.id);
        if (!existing) {
            buckets.set(section.id, { id: section.id, label: section.label, contents: [section.content] });
        } else {
            existing.contents.push(section.content);
        }
    }
    return Array.from(buckets.values()).map(bucket => ({
        id: bucket.id,
        label: bucket.label,
        content: bucket.contents.filter(Boolean).join('\n\n'),
    }));
}

function buildScopedBillingCodes(
    segmentId: string,
    perInstance: NonNullable<V10BundleOutput['output']>['perInstance']
): V10ScopedBillingCode[] {
    const scoped: V10ScopedBillingCode[] = [];
    for (const instance of Object.values(perInstance)) {
        const tooth = instance.teeth?.[0];
        for (const code of instance.billingRefs) {
            scoped.push({
                code,
                instanceId: instance.instanceId,
                tooth,
                scope: getBillingScope(code),
                chipId: undefined,
            });
        }
    }
    return scoped.map(code => ({
        ...code,
        chipId: code.chipId,
    }));
}

function mergeAnswers(
    globalAnswers: V10BundleInput['globalAnswers'],
    instances: V10BundleInput['segments'][number]['instances']
): Map<string, unknown> {
    const merged = new Map<string, unknown>();
    const globalMap = globalAnswers instanceof Map ? globalAnswers : new Map(Object.entries(globalAnswers ?? {}));
    for (const [k, v] of globalMap) merged.set(k, v);

    for (const instance of instances) {
        const answerMap = instance.answers instanceof Map
            ? instance.answers
            : new Map(Object.entries(instance.answers ?? {}));
        for (const [key, value] of answerMap) {
            if (key.includes('::tooth:')) {
                merged.set(key, value);
            } else if (instance.tooth) {
                merged.set(`${key}::tooth:${instance.tooth}`, value);
            } else {
                merged.set(key, value);
            }
        }
    }

    return merged;
}

export async function runV10Bundle(
    input: V10BundleInput,
    opts?: {
        settings?: SettingsInput;
        autoAnswerAllQuestions?: boolean;
        forceChipsByTreatmentId?: Record<string, string[]>;
    }
): Promise<V10BundleOutput> {
    const normalizeKbReleaseId = (value: unknown): string | undefined => {
        if (typeof value !== 'string') return undefined;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    };
    let pinnedKbReleaseId = normalizeKbReleaseId(
        input.kbReleaseId ?? opts?.settings?.practice?.activeKbReleaseId
    );
    const runs: SegmentRun[] = [];
    const questions: V10BundleOutput['questions'] = [];
    const failedSegments: Array<{ segmentId: string; state: string; error?: string }> = [];

    for (const segment of input.segments) {
        const answers = mergeAnswers(input.globalAnswers, segment.instances);
        const forcedChips = opts?.forceChipsByTreatmentId?.[segment.treatmentId];
        let result = await runV10({
            dictation: segment.dictation ?? input.dictation ?? '',
            treatmentId: segment.treatmentId,
            insuranceType: segment.insuranceType,
            textLength: segment.textLength,
            answers,
            userDefaults: opts?.settings as Record<string, unknown> | undefined,
            kbReleaseId: pinnedKbReleaseId,
            testOnly: forcedChips
                ? { enabled: true, forceChips: forcedChips }
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
                    answers.set(key, value);
                }
                result = await runV10({
                    dictation: segment.dictation ?? input.dictation ?? '',
                    treatmentId: segment.treatmentId,
                    insuranceType: segment.insuranceType,
                    textLength: segment.textLength,
                    answers,
                    userDefaults: opts?.settings as Record<string, unknown> | undefined,
                    kbReleaseId: pinnedKbReleaseId,
                });
                pinnedKbReleaseId = normalizeKbReleaseId(result.meta?.kbReleaseId) ?? pinnedKbReleaseId;
            }
        }

        if (result.state === 'questions' && opts?.forceChipsByTreatmentId?.[segment.treatmentId]) {
            result = await runV10({
                dictation: segment.dictation ?? input.dictation ?? '',
                treatmentId: segment.treatmentId,
                insuranceType: segment.insuranceType,
                textLength: segment.textLength,
                answers,
                userDefaults: opts?.settings as Record<string, unknown> | undefined,
                kbReleaseId: pinnedKbReleaseId,
                testOnly: {
                    enabled: true,
                    forceChips: opts.forceChipsByTreatmentId[segment.treatmentId],
                },
            });
            pinnedKbReleaseId = normalizeKbReleaseId(result.meta?.kbReleaseId) ?? pinnedKbReleaseId;
        }

        if (result.state === 'questions' && result.questions) {
            questions.push(...result.questions);
        }

        if (result.state === 'output' && result.output) {
            runs.push({
                segmentId: segment.segmentId,
                treatmentId: segment.treatmentId,
                output: result.output,
                raw: result,
            });
        } else if (result.state !== 'questions') {
            failedSegments.push({
                segmentId: segment.segmentId,
                state: result.state,
                error: result.state === 'error' ? result.error : undefined,
            });
        }
    }

    if (questions.length > 0) {
        return {
            state: 'questions',
            questions,
        };
    }

    if (runs.length !== input.segments.length) {
        const details = failedSegments.length > 0
            ? failedSegments.map(s => `${s.segmentId}:${s.state}${s.error ? `(${s.error})` : ''}`).join(', ')
            : 'unknown';
        return {
            state: 'error',
            error: `One or more segments failed to produce output (${details}).`,
        };
    }

    const segments: V10SegmentOutput[] = [];
    let allSections: Array<{ id: string; label: string; content: string }> = [];
    const allScopedCodes: V10ScopedBillingCode[] = [];

    for (const run of runs) {
        allSections = allSections.concat(run.output.sections ?? []);
        const scopedCodes = buildScopedBillingCodes(run.segmentId, run.output.perInstance);
        allScopedCodes.push(...scopedCodes);

        segments.push({
            segmentId: run.segmentId,
            treatmentId: run.treatmentId as any,
            text: run.output.fullText,
            billingCodes: scopedCodes,
            instanceOutputs: Object.values(run.output.perInstance).map(instance => ({
                instanceId: instance.instanceId,
                tooth: instance.teeth?.[0],
                text: instance.text,
                chips: instance.chips,
            })),
        });
    }

    const mergedSections = mergeSectionContents(allSections);
    const fullText = mergedSections.map(section => `${section.label}\n${section.content}`).join('\n\n');

    return {
        state: 'output',
        output: {
            fullText,
            billingCodes: allScopedCodes,
            segments,
            sections: mergedSections,
        },
    };
}
