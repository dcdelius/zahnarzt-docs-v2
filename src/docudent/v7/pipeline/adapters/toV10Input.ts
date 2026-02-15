/**
 * V7 → V10 Input Adapter
 *
 * Converts V7 PipelineInput to V10PipelineInput.
 */

import type { PipelineInput } from '../types';
import type { V10PipelineInput, V10BundleInput, InsuranceType, TextLength } from '../../../v10/public';

/**
 * Check if input requires bundle orchestration (multi-segment).
 */
export function requiresBundleOrchestration(input: PipelineInput): boolean {
    // For now, V7 pipeline only handles single-treatment
    // Multi-treatment is handled by multitreatment orchestrator
    return false;
}

/**
 * Convert V7 PipelineInput to V10PipelineInput.
 */
export function toV10Input(input: PipelineInput): V10PipelineInput {
    const {
        dictation,
        answers: rawAnswers,
        insuranceType,
        textLength,
        treatmentId = 'fuellung',
        preExtracted,
        userDefaults,
    } = input;

    // Normalize answers
    const answers = rawAnswers instanceof Map
        ? rawAnswers
        : new Map(Object.entries(rawAnswers ?? {}));

    return {
        dictation: dictation ?? '',
        treatmentId,
        insuranceType: normalizeInsuranceType(insuranceType),
        textLength: normalizeTextLength(textLength),
        answers,
        preExtracted: preExtracted as Record<string, unknown> | undefined,
        userDefaults: userDefaults as Record<string, unknown> | undefined,
    };
}

/**
 * Convert V7 PipelineInput to V10BundleInput for multi-treatment.
 */
export function toV10BundleInput(
    input: PipelineInput,
    segments?: Array<{
        segmentId: string;
        treatmentId: string;
        teeth?: string[];
    }>
): V10BundleInput {
    const v10Input = toV10Input(input);

    // If no explicit segments, create a single-segment bundle
    if (!segments || segments.length === 0) {
        return {
            dictation: v10Input.dictation,
            segments: [{
                segmentId: 'default',
                treatmentId: v10Input.treatmentId as string,
                insuranceType: v10Input.insuranceType,
                textLength: v10Input.textLength,
                dictation: v10Input.dictation,
                instances: [{ instanceId: 'default' }],
            }],
            globalAnswers: v10Input.answers,
        };
    }

    // Convert provided segments
    return {
        dictation: v10Input.dictation,
        segments: segments.map(seg => ({
            segmentId: seg.segmentId,
            treatmentId: seg.treatmentId as string,
            insuranceType: v10Input.insuranceType,
            textLength: v10Input.textLength,
            dictation: v10Input.dictation,
            instances: (seg.teeth ?? ['']).map(tooth => ({
                instanceId: tooth ? `tooth:${tooth}` : 'default',
                tooth: tooth || undefined,
            })),
        })),
        globalAnswers: v10Input.answers,
    };
}

function normalizeInsuranceType(type: string | undefined): InsuranceType {
    if (type === 'GKV' || type === 'PKV' || type === 'MKV') {
        return type;
    }
    return 'GKV';
}

function normalizeTextLength(length: string | undefined): TextLength {
    if (length === 'kurz' || length === 'mittel' || length === 'lang') {
        return length;
    }
    return 'mittel';
}
