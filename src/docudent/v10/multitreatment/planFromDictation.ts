/**
 * Build a Multi-Treatment Plan from dictation.
 */

import type { V10TreatmentSegmentInput, V10InstanceInput } from '../types';
import { splitDictationIntoSegments } from './segmentDictation';
import { classifyTreatmentId, detectTreatmentSignals } from './classifyTreatment';
import { scopeExtractionToInstances } from './scoping';

export function planFromDictation(params: {
    dictation: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    textLength: 'kurz' | 'mittel' | 'lang';
}): V10TreatmentSegmentInput[] {
    const { dictation, insuranceType, textLength } = params;
    const rawSegments = splitDictationIntoSegments(dictation);

    // Merge marker/sentence fragments back into coherent treatment chunks.
    // Fragments without explicit treatment signals inherit the previous chunk.
    const mergedSegments: Array<{
        treatmentId: string;
        parts: string[];
    }> = [];

    for (const raw of rawSegments) {
        const segmentText = raw.trim();
        if (!segmentText) continue;

        const classification = classifyTreatmentId(segmentText);
        const hasExplicitSignal = detectTreatmentSignals(segmentText).length > 0;
        const current = mergedSegments[mergedSegments.length - 1];

        if (!current) {
            mergedSegments.push({
                treatmentId: classification.treatmentId,
                parts: [segmentText],
            });
            continue;
        }

        const startsNewTreatmentChunk =
            hasExplicitSignal && classification.treatmentId !== current.treatmentId;

        if (startsNewTreatmentChunk) {
            mergedSegments.push({
                treatmentId: classification.treatmentId,
                parts: [segmentText],
            });
            continue;
        }

        current.parts.push(segmentText);
    }

    return mergedSegments.map((segment, index) => {
        const segmentText = segment.parts.join('. ');
        const treatmentId = segment.treatmentId;
        const scoping = scopeExtractionToInstances(segmentText, treatmentId);
        const teeth = scoping.instances.map(i => i.teeth[0]).filter(Boolean);

        const instances: V10InstanceInput[] = teeth.length > 0
            ? teeth.map(tooth => ({
                instanceId: `tooth:${tooth}`,
                tooth,
                dictation: segmentText,
            }))
            : [{
                instanceId: `segment:${index + 1}`,
                dictation: segmentText,
            }];

        return {
            segmentId: `seg-${index + 1}`,
            treatmentId,
            insuranceType,
            textLength,
            instances,
            dictation: segmentText,
        };
    });
}
