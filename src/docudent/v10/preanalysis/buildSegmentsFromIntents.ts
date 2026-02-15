import type { V10TreatmentSegmentInput } from '../types';
import type { TreatmentIntentBundleV1, TreatmentIntentV1 } from './treatmentIntentContract';

export type BuildSegmentsParams = {
    bundle: TreatmentIntentBundleV1;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    textLength: 'kurz' | 'mittel' | 'lang';
};

function getIntentSortKey(intent: TreatmentIntentV1): [number, string, string] {
    const firstSpan = intent.evidenceSpans[0];
    const start = typeof firstSpan?.start === 'number' ? firstSpan.start : Number.MAX_SAFE_INTEGER;
    return [start, intent.intentId, intent.treatmentId];
}

export function buildSegmentsFromIntents(params: BuildSegmentsParams): V10TreatmentSegmentInput[] {
    const sortedIntents = [...params.bundle.intents].sort((a, b) => {
        const [as, aid, at] = getIntentSortKey(a);
        const [bs, bid, bt] = getIntentSortKey(b);
        if (as !== bs) return as - bs;
        if (aid !== bid) return aid.localeCompare(bid);
        return at.localeCompare(bt);
    });

    return sortedIntents.map((intent, index) => {
        // Keep full dictation context per segment so chips that depend on
        // cross-phrase signals (e.g., MKV wording) are not dropped.
        const dictation = params.bundle.dictation;
        const tooth = intent.tooth;
        const suffix = tooth ? `tooth:${tooth}` : 'untoothed';

        return {
            segmentId: `intent-${index + 1}-${intent.intentId}`,
            treatmentId: intent.treatmentId,
            insuranceType: params.insuranceType,
            textLength: params.textLength,
            dictation,
            instances: [{
                instanceId: `${intent.intentId}:${suffix}`,
                tooth,
                dictation,
            }],
        };
    });
}
