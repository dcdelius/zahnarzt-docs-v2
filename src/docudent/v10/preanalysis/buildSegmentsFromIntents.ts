import type { V10TreatmentSegmentInput } from '../types';
import type { TreatmentIntentBundleV1, TreatmentIntentV1 } from './treatmentIntentContract';
import { splitDictationIntoSegments } from '../multitreatment/segmentDictation';

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

const EVIDENCE_CONTEXT_CHARS = 48;
const TOOTH_CLAUSE_SPLIT_RE = /\b(?:und|sowie|danach|anschließend|anschliessend|zusätzlich|zusaetzlich|außerdem|ausserdem|ebenfalls)\b/gi;
const FDI_TOOTH_RE = /\b([1-4][1-8])\b/g;

function escapeRegexLiteral(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasToothToken(text: string, tooth: string): boolean {
    const escaped = escapeRegexLiteral(tooth);
    const pattern = new RegExp(`(?:\\bzahn\\s*)?${escaped}\\b`, 'i');
    return pattern.test(text);
}

function extractFdiTeeth(text: string): string[] {
    const seen = new Set<string>();
    for (const match of text.matchAll(FDI_TOOTH_RE)) {
        const tooth = match[1];
        if (tooth) seen.add(tooth);
    }
    return Array.from(seen);
}

function extractToothClause(segment: string, tooth: string): string {
    const escaped = escapeRegexLiteral(tooth);
    const coarsePattern = new RegExp(`[^.;,!?]*?(?:\\bzahn\\s*)?${escaped}\\b[^.;,!?]*`, 'i');
    const coarse = (segment.match(coarsePattern)?.[0] ?? segment).trim();
    if (!coarse) return segment.trim();

    const teethInClause = extractFdiTeeth(coarse);
    if (teethInClause.length <= 1) return coarse;

    const parts = coarse
        .split(TOOTH_CLAUSE_SPLIT_RE)
        .map(part => part.replace(/^[,;:\s]+|[,;:\s]+$/g, '').trim())
        .filter(Boolean);
    const withTooth = parts.filter(part => hasToothToken(part, tooth));
    if (withTooth.length === 0) return coarse;
    return withTooth.sort((a, b) => a.length - b.length)[0];
}

function buildToothFocusedDictation(
    fullDictation: string,
    tooth: string,
    referenceStart: number
): string | undefined {
    const segments = splitDictationIntoSegments(fullDictation);
    if (segments.length === 0) return undefined;

    const candidates = segments
        .map(segment => {
            const lower = segment.toLowerCase();
            const idx = fullDictation.toLowerCase().indexOf(lower);
            return {
                segment,
                index: idx >= 0 ? idx : Number.MAX_SAFE_INTEGER,
            };
        })
        .filter(candidate => hasToothToken(candidate.segment, tooth));

    if (candidates.length === 0) return undefined;

    const closest = candidates.sort((a, b) => {
        const distA = Math.abs(a.index - referenceStart);
        const distB = Math.abs(b.index - referenceStart);
        if (distA !== distB) return distA - distB;
        return a.segment.length - b.segment.length;
    })[0];

    const clause = extractToothClause(closest.segment, tooth).trim();
    return clause.length > 0 ? clause : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeMentionedValue(value: unknown): unknown {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (isRecord(value)) return value;
    if (Array.isArray(value)) {
        const normalized = value
            .map(item => normalizeMentionedValue(item))
            .filter(item => item !== undefined);
        return normalized.length > 0 ? normalized : undefined;
    }
    return undefined;
}

function toMentionedFromSharedFacts(sharedFacts: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!sharedFacts) return undefined;
    const mentioned: Record<string, unknown> = {};
    const mapIfDefined = (targetKey: string, value: unknown) => {
        const normalized = normalizeMentionedValue(value);
        if (normalized !== undefined) {
            mentioned[targetKey] = normalized;
        }
    };

    mapIfDefined('anesthesia', sharedFacts.anesthesia);
    mapIfDefined('kofferdam', sharedFacts.kofferdam);
    mapIfDefined('material', sharedFacts.material);
    mapIfDefined('tiefe', sharedFacts.cariesDepth ?? sharedFacts.tiefe);
    mapIfDefined('mkv', sharedFacts.mkv);
    mapIfDefined('mehrkosten', sharedFacts.mehrkosten);
    mapIfDefined('vitality', sharedFacts.vitality);
    mapIfDefined('percussion', sharedFacts.percussion);
    mapIfDefined('working_length', sharedFacts.workingLength);
    mapIfDefined('wl_method', sharedFacts.workingLengthMethod);
    mapIfDefined('wf_technique', sharedFacts.wfTechnique);
    mapIfDefined('root_canals', sharedFacts.canalCount);
    mapIfDefined('endo_step', sharedFacts.step);
    mapIfDefined('endo_phase', sharedFacts.phase);
    mapIfDefined('endo_medication', sharedFacts.medication);
    mapIfDefined('temp_closure', sharedFacts.tempClosure);
    mapIfDefined('irrigation_solutions', sharedFacts.irrigationSolutions);
    mapIfDefined('capping', sharedFacts.capping);
    mapIfDefined('finishing', sharedFacts.finishing);
    mapIfDefined('okklusion', sharedFacts.okklusion);
    mapIfDefined('bisskontrolle', sharedFacts.bisskontrolle);
    mapIfDefined('politur', sharedFacts.politur);

    return Object.keys(mentioned).length > 0 ? mentioned : undefined;
}

function buildFocusedSegmentDictation(
    fullDictation: string,
    intent: TreatmentIntentV1
): string {
    const spans = intent.evidenceSpans ?? [];
    if (!fullDictation || spans.length === 0) {
        return fullDictation;
    }
    const sortedSpans = [...spans].sort((a, b) => {
        if (a.start !== b.start) return a.start - b.start;
        if (a.end !== b.end) return a.end - b.end;
        return a.text.localeCompare(b.text);
    });
    const firstSpanStart = sortedSpans[0]?.start ?? 0;
    const evidenceText = sortedSpans.map(span => span.text ?? '').join(' ');
    const evidenceTeeth = extractFdiTeeth(evidenceText);
    // Only enforce tooth-focused slicing when one evidence span contains
    // multiple teeth and would otherwise leak surfaces between instances.
    if (intent.tooth && evidenceTeeth.length > 1) {
        const toothFocused = buildToothFocusedDictation(fullDictation, intent.tooth, firstSpanStart);
        if (toothFocused) {
            return toothFocused;
        }
    }
    const start = Math.max(0, firstSpanStart - EVIDENCE_CONTEXT_CHARS);
    const end = Math.min(fullDictation.length, sortedSpans[sortedSpans.length - 1].end + EVIDENCE_CONTEXT_CHARS);
    const slice = fullDictation.slice(start, end).trim();
    if (slice.length > 0) {
        return slice;
    }
    const fallbackFromSpans = sortedSpans
        .map(span => span.text.trim())
        .filter(Boolean)
        .join(' ');
    return fallbackFromSpans.length > 0 ? fallbackFromSpans : fullDictation;
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
        const dictation = buildFocusedSegmentDictation(params.bundle.dictation, intent);
        const tooth = intent.tooth;
        const suffix = tooth ? `tooth:${tooth}` : 'untoothed';
        const sharedFacts = isRecord(intent.sharedFacts) ? intent.sharedFacts : undefined;
        const mentioned = toMentionedFromSharedFacts(sharedFacts);

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
                preanalysisHints: {
                    source: 'intent_preanalysis',
                    intentId: intent.intentId,
                    treatmentId: intent.treatmentId,
                    tooth,
                    confidence: intent.confidence,
                    phase: intent.phase,
                    step: intent.step,
                    evidenceSpans: intent.evidenceSpans,
                    sharedFacts,
                    mentioned,
                },
            }],
        };
    });
}
