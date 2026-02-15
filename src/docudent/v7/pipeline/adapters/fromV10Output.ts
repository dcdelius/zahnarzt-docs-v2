/**
 * V10 → V7 Output Adapter
 *
 * Converts V10PipelineOutput to V7 PipelineResult.
 * Ensures all required PipelineResult fields are populated.
 */

import type { PipelineResult, ComposedOutput, PipelineDebugInfo } from '../types';
import type { V10PipelineOutput, V10BundleOutput } from '../../../v10/public';
import type { ComposedSection } from '../../../contracts/output';
import type { TraceMarker } from '../../../contracts/pipeline';

/**
 * Convert V10PipelineOutput to V7 PipelineResult.
 */
export function fromV10Output(v10Output: V10PipelineOutput): PipelineResult {
    // Build debug info from V10 trace
    const debug: PipelineDebugInfo | undefined = v10Output.trace ? {
        trace: buildTraceMarkers(v10Output),
        traceEnabled: true,
    } : undefined;

    if (v10Output.state === 'error') {
        return {
            state: 'error',
            questions: [],
            output: null,
            warnings: [],
            error: v10Output.error ?? 'Unknown error',
            debug,
        };
    }

    if (v10Output.state === 'questions') {
        // V10 DEBUG: Log questions mapping
        console.log('[V10→V7 ADAPTER] Mapping questions state:', {
            questionCount: v10Output.questions?.length ?? 0,
            questionIds: v10Output.questions?.map(q => q.id || q.questionKey),
            hasBundle: !!v10Output.questionsBundle,
        });

        return {
            state: 'questions',
            questions: v10Output.questions ?? [],
            questionBundle: v10Output.questionsBundle,
            output: null,
            warnings: [],
            extracted: v10Output.trace?.instances?.[0] ? {
                tooth: v10Output.trace.instances[0].extractedSummary.tooth,
                surfaces: v10Output.trace.instances[0].extractedSummary.surfaces,
                diagnosis: v10Output.trace.instances[0].extractedSummary.diagnosis,
            } : undefined,
            debug,
        };
    }

    // state === 'output'
    const output: ComposedOutput = {
        sections: buildSections(v10Output.output?.fullText ?? ''),
        fullText: v10Output.output?.fullText ?? '',
        copyText: v10Output.output?.fullText ?? '',
        billingCodes: v10Output.output?.billingCodes ?? [],
        warnings: [],
    };

    return {
        state: 'output',
        questions: [],
        questionBundle: v10Output.questionsBundle,
        output,
        warnings: [],
        extracted: v10Output.trace?.instances?.[0] ? {
            tooth: v10Output.trace.instances[0].extractedSummary.tooth,
            surfaces: v10Output.trace.instances[0].extractedSummary.surfaces,
            diagnosis: v10Output.trace.instances[0].extractedSummary.diagnosis,
        } : undefined,
        debug,
    };
}

/**
 * Convert V10BundleOutput to V7 PipelineResult.
 */
export function fromV10BundleOutput(v10Output: V10BundleOutput): PipelineResult {
    // Build debug info from V10 trace
    const debug: PipelineDebugInfo | undefined = v10Output.trace ? {
        trace: buildTraceMarkers(v10Output),
        traceEnabled: true,
    } : undefined;

    if (v10Output.state === 'error') {
        return {
            state: 'error',
            questions: [],
            output: null,
            warnings: [],
            error: v10Output.error ?? 'Unknown error',
            debug,
        };
    }

    if (v10Output.state === 'questions') {
        return {
            state: 'questions',
            questions: v10Output.questions ?? [],
            output: null,
            warnings: [],
            extracted: v10Output.trace?.instances?.[0] ? {
                tooth: v10Output.trace.instances[0].extractedSummary.tooth,
                surfaces: v10Output.trace.instances[0].extractedSummary.surfaces,
                diagnosis: v10Output.trace.instances[0].extractedSummary.diagnosis,
            } : undefined,
            debug,
        };
    }

    // state === 'output'
    const output: ComposedOutput = {
        sections: buildSections(v10Output.output?.fullText ?? ''),
        fullText: v10Output.output?.fullText ?? '',
        copyText: v10Output.output?.fullText ?? '',
        billingCodes: v10Output.output?.billingCodes.map(c => c.code) ?? [],
        warnings: [],
    };

    return {
        state: 'output',
        questions: [],
        output,
        warnings: [],
        extracted: v10Output.trace?.instances?.[0] ? {
            tooth: v10Output.trace.instances[0].extractedSummary.tooth,
            teeth: v10Output.trace.instances.filter(i => i.tooth).map(i => i.tooth!),
            surfaces: v10Output.trace.instances[0].extractedSummary.surfaces,
            diagnosis: v10Output.trace.instances[0].extractedSummary.diagnosis,
        } : undefined,
        debug,
    };
}

/**
 * Build ComposedSection[] from fullText.
 */
function buildSections(fullText: string): ComposedSection[] {
    if (!fullText) return [];

    // Split into paragraphs
    const paragraphs = fullText.split(/\n\n+/).filter(p => p.trim());

    return paragraphs.map((para, idx) => ({
        id: `section-${idx}`,
        label: idx === 0 ? 'Behandlung' : `Abschnitt ${idx + 1}`,
        content: para,
        lines: para.split('\n'),
        format: 'paragraph',
    }));
}

/**
 * Build TraceMarker[] from V10 trace.
 */
function buildTraceMarkers(v10Output: V10PipelineOutput | V10BundleOutput): TraceMarker[] {
    const markers: TraceMarker[] = [];

    if (v10Output.trace) {
        // Input stage
        markers.push({
            stage: 'input',
            detail: `engine:v10 instances:${v10Output.meta.instanceCount}`,
        });

        // Extract stage
        if (v10Output.trace.instances?.length) {
            const firstInst = v10Output.trace.instances[0];
            markers.push({
                stage: 'extract',
                detail: `tooth:${firstInst.extractedSummary.tooth ?? 'none'} surfaces:${firstInst.extractedSummary.surfaces.join(',')}`,
            });
        }

        // Rule hits
        if (v10Output.trace.allRuleHits?.length) {
            markers.push({
                stage: 'gate',
                detail: `rules:${v10Output.trace.allRuleHits.length} hits:${v10Output.trace.allRuleHits.slice(0, 3).join(',')}...`,
            });
        }

        // Chips
        if (v10Output.trace.allChips?.length) {
            markers.push({
                stage: 'render',
                detail: `chips:${v10Output.trace.allChips.length}`,
            });
        }

        // Billing
        markers.push({
            stage: 'billing',
            detail: `codes:${v10Output.trace.finalBillingCodes?.length ?? 0}`,
        });
    }

    return markers;
}
