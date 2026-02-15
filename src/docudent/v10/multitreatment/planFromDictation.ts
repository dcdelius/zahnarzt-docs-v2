/**
 * Build a Multi-Treatment Plan from dictation.
 */

import type { V10TreatmentSegmentInput, V10InstanceInput } from '../types';
import { splitDictationIntoSegments } from './segmentDictation';
import { classifyTreatmentId } from './classifyTreatment';
import { scopeExtractionToInstances } from './scoping';

export function planFromDictation(params: {
    dictation: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    textLength: 'kurz' | 'mittel' | 'lang';
}): V10TreatmentSegmentInput[] {
    const { dictation, insuranceType, textLength } = params;
    const segments = splitDictationIntoSegments(dictation);

    return segments.map((segmentText, index) => {
        const classification = classifyTreatmentId(segmentText);
        const treatmentId = classification.treatmentId;
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
