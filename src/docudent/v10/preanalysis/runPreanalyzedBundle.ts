import type { V10BundleInput, V10BundleOutput } from '../types';
import { runV10Bundle } from '../pipeline/runV10Bundle';
import { buildSegmentsFromIntents } from './buildSegmentsFromIntents';
import { detectTreatmentIntents } from './detectTreatmentIntents';
import { toDeterministicIntentHashInput } from './treatmentIntentContract';

export type RunPreanalyzedBundleInput = {
    dictation: string;
    insuranceType: V10BundleInput['segments'][number]['insuranceType'];
    textLength: V10BundleInput['segments'][number]['textLength'];
    globalAnswers?: V10BundleInput['globalAnswers'];
    kbReleaseId?: string;
    forceFallback?: boolean;
    mockLlmContent?: string;
};

export type PreanalysisMeta = {
    source: 'llm' | 'fallback';
    diagnostics: string[];
    intentHashInput: string;
};

export type RunPreanalyzedBundleResult =
    | {
        state: 'needs_confirmation';
        confirmationReason: 'preanalysis_uncertain';
        preanalysis: PreanalysisMeta;
        preview: {
            bundle: Awaited<ReturnType<typeof detectTreatmentIntents>>['bundle'];
            segments: V10BundleInput['segments'];
        };
    }
    | (V10BundleOutput & {
        preanalysis: PreanalysisMeta;
    });

type RunDeps = {
    runBundle?: (input: V10BundleInput) => Promise<V10BundleOutput>;
};

function hasUncertainIntent(bundle: Awaited<ReturnType<typeof detectTreatmentIntents>>['bundle']): boolean {
    return bundle.intents.some(intent => !!intent.uncertainty && intent.uncertainty.trim().length > 0);
}

export async function runPreanalyzedBundle(
    input: RunPreanalyzedBundleInput,
    deps?: RunDeps
): Promise<RunPreanalyzedBundleResult> {
    const preanalysis = await detectTreatmentIntents(input.dictation, {
        forceFallback: input.forceFallback,
        mockLlmContent: input.mockLlmContent,
    });
    const segments = buildSegmentsFromIntents({
        bundle: preanalysis.bundle,
        insuranceType: input.insuranceType,
        textLength: input.textLength,
    });
    const meta: PreanalysisMeta = {
        source: preanalysis.source,
        diagnostics: preanalysis.diagnostics,
        intentHashInput: toDeterministicIntentHashInput(preanalysis.bundle),
    };

    if (preanalysis.needsConfirmation || hasUncertainIntent(preanalysis.bundle)) {
        return {
            state: 'needs_confirmation',
            confirmationReason: 'preanalysis_uncertain',
            preanalysis: meta,
            preview: {
                bundle: preanalysis.bundle,
                segments,
            },
        };
    }

    const runBundle = deps?.runBundle ?? runV10Bundle;
    const result = await runBundle({
        dictation: preanalysis.bundle.dictation,
        segments,
        globalAnswers: input.globalAnswers,
        kbReleaseId: input.kbReleaseId,
    });

    return {
        ...result,
        preanalysis: meta,
    };
}
