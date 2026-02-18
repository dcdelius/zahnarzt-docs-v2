import { classifyTreatmentId, detectTreatmentSignals, type ClassifiedTreatment } from '../multitreatment/classifyTreatment';
import { splitDictationIntoSegments } from '../multitreatment/segmentDictation';
import {
    PREANALYSIS_TREATMENT_IDS,
    TREATMENT_INTENT_CONTRACT_VERSION,
    TREATMENT_INTENT_UNCERTAINTY_CODES,
    canonicalizeTreatmentIntentBundle,
    type TreatmentIntentBundleV1,
    type TreatmentIntentV1,
    validateTreatmentIntentBundle,
} from './treatmentIntentContract';
import { buildPreanalysisPrompt } from '@/docudent/contracts/llmPromptContracts';

type LlmResult = {
    content: string;
};

export type DetectTreatmentIntentsOptions = {
    forceFallback?: boolean;
    mockLlmContent?: string;
    llmGateway?: (dictation: string) => Promise<string | null>;
};

export type DetectTreatmentIntentsResult = {
    bundle: TreatmentIntentBundleV1;
    source: 'llm' | 'fallback';
    needsConfirmation: boolean;
    diagnostics: string[];
};

type ReconcileResult = {
    bundle: TreatmentIntentBundleV1;
    diagnostics: string[];
};

const PREANALYSIS_PROMPT = buildPreanalysisPrompt({
    version: TREATMENT_INTENT_CONTRACT_VERSION,
    treatmentIds: PREANALYSIS_TREATMENT_IDS,
    uncertaintyCodes: TREATMENT_INTENT_UNCERTAINTY_CODES,
});

const EXTRACTION_SIGNAL_RE = /\b(extraktion|luxation|zahn ziehen|entfernt|entfernung|alveole|naht)\b/i;
const EXPLICIT_TREATMENT_SIGNAL_RE = /\b(f[uü]llung|komposit|adh[aä]siv(?:e|er|es|en)?\s+aufbau|aufbauf[uü]llung|endo|wkb|wurzelkanal|trepanation|extraktion|luxation|zahn ziehen|pzr|professionelle\s+zahnreinigung|zahnreinigung|zahnstein|belagsentfernung|politur|fluoridierung|krone|teilkrone|brücke|bruecke|brückenglied|brueckenglied|onlay|overlay|kronenpr[aä]p|beschliff(?:en|en)|praeparation|r[oö]ntgen|roentgen|xray|opg|zahnfilm|untersuchung|kontrolluntersuchung|check-up|überkappung|ueberkappung|pulpaeröffnung|pulpaeroeffnung|fissurenversiegelung|versiegelung|sealant|parodontitis|parodontal|parodontologie|psi|ait|upt|wsr|wurzelspitzenresektion|apikoektomie|apektomie|trauma|zahntrauma|avulsion|zahnunfall|schienung|okklusionsschiene|aufbissschiene|knirscherschiene|protrusionsschiene|schienentherapie|teilprothese|interimsteilprothese|klammerprothese|modellguss(?:prothese)?|totalprothese|vollprothese|totale|immediatprothese|zahnlos|implant|implantat|implantation|implantatinsertion|implantatfreilegung)\b/i;
const SAME_TOOTH_CONTEXT_RE = /\b(selben|gleichen)\s+zahn\b|\bam\s+(selben|gleichen)\b/i;
const TOOTH_VALUE_UNIT_RE = /\b([1-8][1-8])\b\s*(?:ncm|mm|cm|ml|mg|rpm|nm)\b/gi;
const ROOT_CANAL_VALUE_RE = /\b(?:mb|ml|db|dl|d|p|pal|k1|k2|k3|k4)\s*[:=]?\s*([1-8][1-8])\b/gi;
const INSURANCE_ONLY_SEGMENT_RE = /^\s*(?:gkv|pkv|mkv)\s*$/i;
const SKIPPED_CONTEXT_SIGNAL_RE = /\b(?:bisskontrolle|okklusion|okklusionskontrolle|artikulations(?:folie|papier)|politur|hochglanzpolitur|finierung|nachpolier|sensibil|empfindlich|beschwerd|klopfdolent|kontrolle|nachsorge|wiederkommen)\b/i;
const HISTORICAL_CONTEXT_RE = /\b(?:seit\s+(?:der|dem)?\s*letzt(?:en|er|em)?|nach\s+(?:der|dem)?\s*letzt(?:en|er|em)?|beim\s+letzten\s+mal|im\s+vortermin|vorbehandlung)\b/i;
const SYMPTOM_CONTEXT_RE = /\b(?:empfindlich|temperaturempfind(?:lich)?|temp(?:eratur)?sensibel|ueberempfind(?:lich)?|überempfind(?:lich)?|schmerz|beschwerd|klopfdolent|klopfempfindlich|reiz)\b/i;
const PROCEDURE_ACTION_RE = /\b(?:heute|durchgef(?:ue|ü)hrt|gelegt|versorgt|erneut\s+er(?:oe|ö)ffnet|trepanation|trepaniert|sp(?:ue|ü)lung|gesp(?:ue|ü)lt|einlage|extrahiert|aufbereitung|wurzelf(?:ue|ü)llung|eingegliedert|angefertigt|praeparation|präparation|abformung|fluoridierung|versiegelung)\b/i;
const CONTEXT_ONLY_MARKER_RE = /\b(?:anamnese|vorgeschichte|familiaer|famili(?:a|ä)r|belastet|angst|schlafmangel|medikation|antikoagulation|rauch|raucht|sozial|recall|kontrolle|nachsorge|terminiert|verfuegbar|verfügbar)\b/i;
const PROSTHETIC_INSERTION_RE = /\b(?:eingegliedert|eingesetzt|eingliederung|zementiert|eingeklebt)\b/i;
const PROSTHETIC_DEFINITIVE_RE = /\b(?:definitiv(?:e|er|es|en)?|endg(?:u|ü)ltig(?:e|er|es|en)?)\b/i;

function escapeRegexLiteral(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map(entry => String(entry).trim())
            .filter(Boolean);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? [trimmed] : [];
    }
    return [];
}

function normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

function normalizeForensicContextNote(value: string): string {
    const normalized = normalizeWhitespace(value)
        .replace(/^[,;:\-\s]+/, '')
        .replace(/^(?:dass|und|sowie)\s+/i, '')
        .trim();
    return normalized;
}

function isHistoricalComplaintOnlyEvidence(evidenceText: string): boolean {
    const normalized = normalizeWhitespace(evidenceText);
    if (!normalized) return false;
    if (!HISTORICAL_CONTEXT_RE.test(normalized)) return false;
    if (!SYMPTOM_CONTEXT_RE.test(normalized)) return false;
    if (PROCEDURE_ACTION_RE.test(normalized)) return false;
    return true;
}

function isContextOnlyEvidence(evidenceText: string): boolean {
    const normalized = normalizeWhitespace(evidenceText);
    if (!normalized) return false;
    if (!CONTEXT_ONLY_MARKER_RE.test(normalized)) return false;
    if (PROCEDURE_ACTION_RE.test(normalized)) return false;
    return true;
}

function inferProstheticFinalTreatmentId(
    intent: TreatmentIntentV1,
    evidenceText: string
): TreatmentIntentV1['treatmentId'] | undefined {
    const normalized = normalizeWhitespace(evidenceText).toLowerCase();
    if (!normalized) return undefined;
    const hasInsertionSignal = PROSTHETIC_INSERTION_RE.test(normalized);
    const hasDefinitiveSignal = PROSTHETIC_DEFINITIVE_RE.test(normalized);
    if (!hasInsertionSignal && !hasDefinitiveSignal) return undefined;

    if (normalized.includes('teilkrone')) return 'teilkrone';
    if (normalized.includes('bruecke') || normalized.includes('brücke')) return 'bruecke';
    if (normalized.includes('krone') && intent.treatmentId === 'crown_prep') return 'krone';
    return undefined;
}

function mergeForensicNoteIntoIntent(
    intent: TreatmentIntentV1,
    noteRaw: string
): TreatmentIntentV1 {
    const note = normalizeForensicContextNote(noteRaw);
    if (!note) return intent;

    const sharedFacts = isRecord(intent.sharedFacts) ? { ...intent.sharedFacts } : {};
    const existingNotes = [
        ...normalizeStringArray(sharedFacts.forensicNotes),
        ...normalizeStringArray(sharedFacts.forensic_notes),
    ];
    const mergedNotes = Array.from(new Set([...existingNotes, note]));
    sharedFacts.forensicNotes = mergedNotes;
    delete sharedFacts.forensic_notes;

    const normalizedLower = note.toLowerCase();
    const hasOkklusionSignal = /\b(?:okklusion|okklusionskontrolle|bisskontrolle|artikulations(?:folie|papier)|einschleif)\b/i.test(normalizedLower);
    const hasPoliturSignal = /\b(?:politur|hochglanzpolitur|finier|nachpolier)\b/i.test(normalizedLower);
    if (hasOkklusionSignal) {
        sharedFacts.okklusion = true;
        sharedFacts.bisskontrolle = true;
    }
    if (hasPoliturSignal) {
        sharedFacts.politur = true;
    }
    if (hasOkklusionSignal || hasPoliturSignal) {
        sharedFacts.finishing = true;
    }

    return {
        ...intent,
        sharedFacts,
    };
}

function mergeEvidenceSpans(
    base: TreatmentIntentV1['evidenceSpans'],
    additions: TreatmentIntentV1['evidenceSpans']
): TreatmentIntentV1['evidenceSpans'] {
    const seen = new Set<string>();
    const merged = [...base, ...additions]
        .filter((span) => {
            const key = `${span.start}:${span.end}:${span.text}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((a, b) => {
            if (a.start !== b.start) return a.start - b.start;
            if (a.end !== b.end) return a.end - b.end;
            return a.text.localeCompare(b.text);
        });
    return merged;
}

function mergeContextIntoIntent(
    intent: TreatmentIntentV1,
    noteRaw: string,
    evidenceSpans?: TreatmentIntentV1['evidenceSpans']
): TreatmentIntentV1 {
    const withNote = mergeForensicNoteIntoIntent(intent, noteRaw);
    if (!evidenceSpans || evidenceSpans.length === 0) return withNote;
    return {
        ...withNote,
        evidenceSpans: mergeEvidenceSpans(withNote.evidenceSpans, evidenceSpans),
    };
}

function demoteHistoricalComplaintIntents(
    bundle: TreatmentIntentBundleV1
): { bundle: TreatmentIntentBundleV1; diagnostics: string[] } {
    if (bundle.intents.length <= 1) {
        return { bundle, diagnostics: [] };
    }

    const diagnostics: string[] = [];
    const kept: TreatmentIntentV1[] = [];
    const demoted: Array<{ intent: TreatmentIntentV1; note: string }> = [];

    for (const intent of bundle.intents) {
        const evidenceText = normalizeWhitespace(intent.evidenceSpans.map(span => span.text).join(' '));
        if (!isHistoricalComplaintOnlyEvidence(evidenceText) && !isContextOnlyEvidence(evidenceText)) {
            kept.push(intent);
            continue;
        }
        demoted.push({ intent, note: evidenceText });
        diagnostics.push(`historical-context-intent-demoted:${intent.intentId}:${intent.treatmentId}`);
    }

    if (demoted.length === 0 || kept.length === 0) {
        return { bundle, diagnostics: [] };
    }

    const withContext = [...kept];
    for (const item of demoted) {
        const sameToothIndex = item.intent.tooth
            ? withContext.findIndex(candidate => candidate.tooth === item.intent.tooth)
            : -1;
        const targetIndex = sameToothIndex >= 0 ? sameToothIndex : withContext.length - 1;
        withContext[targetIndex] = mergeForensicNoteIntoIntent(withContext[targetIndex], item.note);
        diagnostics.push(`historical-context-note-attached:${withContext[targetIndex].intentId}`);
    }

    return {
        bundle: canonicalizeTreatmentIntentBundle({
            ...bundle,
            intents: withContext,
            needsConfirmation:
                bundle.needsConfirmation === true
                || withContext.some(intent => Boolean(intent.uncertainty)),
        }),
        diagnostics,
    };
}

function demoteAmbiguousUntoothedContinuationIntents(
    bundle: TreatmentIntentBundleV1
): { bundle: TreatmentIntentBundleV1; diagnostics: string[] } {
    if (bundle.intents.length <= 1) {
        return { bundle, diagnostics: [] };
    }

    const diagnostics: string[] = [];
    const kept: TreatmentIntentV1[] = [];

    for (const intent of bundle.intents) {
        const evidenceText = normalizeWhitespace(intent.evidenceSpans.map(span => span.text).join(' '));
        const hasToothInEvidence = findAllTeeth(evidenceText).length > 0;
        const isAmbiguousUntoothed =
            !intent.tooth
            && intent.uncertainty === 'llm_ambiguous_mapping'
            && !hasToothInEvidence;

        if (!isAmbiguousUntoothed) {
            kept.push(intent);
            continue;
        }

        const targetIndex = (() => {
            for (let i = kept.length - 1; i >= 0; i -= 1) {
                const candidate = kept[i];
                if (!candidate?.tooth) continue;
                if (candidate.treatmentId !== intent.treatmentId) continue;
                return i;
            }
            return -1;
        })();

        if (targetIndex < 0) {
            kept.push(intent);
            continue;
        }

        const appliesToAllSiblingIntents = /\b(?:beide|allen?|sämtlich(?:e|en)?)\b/i.test(evidenceText);
        if (appliesToAllSiblingIntents) {
            const siblingIndexes = kept
                .map((candidate, index) => ({ candidate, index }))
                .filter(entry => entry.candidate.treatmentId === intent.treatmentId && Boolean(entry.candidate.tooth))
                .map(entry => entry.index);
            if (siblingIndexes.length > 0) {
                for (const siblingIndex of siblingIndexes) {
                    kept[siblingIndex] = mergeContextIntoIntent(kept[siblingIndex], evidenceText, intent.evidenceSpans);
                }
            } else {
                kept[targetIndex] = mergeContextIntoIntent(kept[targetIndex], evidenceText, intent.evidenceSpans);
            }
        } else {
            kept[targetIndex] = mergeContextIntoIntent(kept[targetIndex], evidenceText, intent.evidenceSpans);
        }
        diagnostics.push(`ambiguous-untoothed-intent-demoted:${intent.intentId}:${intent.treatmentId}`);
        diagnostics.push(`ambiguous-untoothed-note-attached:${kept[targetIndex].intentId}`);
    }

    return {
        bundle: canonicalizeTreatmentIntentBundle({
            ...bundle,
            intents: kept,
            needsConfirmation: kept.some(intent => Boolean(intent.uncertainty)),
        }),
        diagnostics,
    };
}

function getServerOpenAiKey(): string | null {
    if (typeof window !== 'undefined') return null;
    const envFromProcess = (typeof process !== 'undefined' && process.env) ? process.env : undefined;
    return envFromProcess?.OPENAI_API_KEY ?? null;
}

async function runBrowserGatewayPreanalysis(dictation: string): Promise<LlmResult | null> {
    if (typeof window === 'undefined') return null;
    const content = await (await import('./preanalysisGatewayClient')).callPreanalysisGateway(dictation);
    if (!content) return null;
    return { content };
}

async function runLlmPreanalysis(
    dictation: string,
    options?: DetectTreatmentIntentsOptions
): Promise<LlmResult | null> {
    if (options?.llmGateway) {
        const content = await options.llmGateway(dictation);
        if (!content) return null;
        return { content };
    }

    if (typeof window !== 'undefined') {
        return runBrowserGatewayPreanalysis(dictation);
    }

    const key = getServerOpenAiKey();
    if (!key) return null;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.0,
            max_tokens: 900,
            messages: [
                { role: 'system', content: PREANALYSIS_PROMPT },
                { role: 'user', content: dictation },
            ],
        }),
    });
    if (!response.ok) {
        throw new Error(`Preanalysis LLM call failed: ${response.status}`);
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') return null;
    return { content };
}

function parseJsonObject(raw: string): unknown | null {
    const stripped = raw
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
}

function normalizeOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeLlmBundleCandidate(input: unknown): unknown {
    if (!input || typeof input !== 'object') return input;
    const src = input as Record<string, unknown>;
    const intentsRaw = Array.isArray(src.intents) ? src.intents : undefined;
    if (!intentsRaw) return input;

    const intents = intentsRaw
        .filter(intent => intent && typeof intent === 'object')
        .map((intent, index) => {
            const record = { ...(intent as Record<string, unknown>) };
            const intentId = record.intentId;
            if (typeof intentId === 'number' && Number.isFinite(intentId)) {
                record.intentId = String(intentId);
            } else {
                record.intentId = normalizeOptionalString(intentId) ?? `llm-intent-${index + 1}`;
            }

            const treatmentId = normalizeOptionalString(record.treatmentId);
            if (treatmentId) record.treatmentId = treatmentId;

            const confidenceRaw = record.confidence;
            if (typeof confidenceRaw === 'string') {
                const parsed = Number(confidenceRaw.replace(',', '.'));
                if (Number.isFinite(parsed)) record.confidence = parsed;
            }

            const tooth = normalizeOptionalString(record.tooth);
            if (tooth) record.tooth = tooth;
            else delete record.tooth;

            const phase = normalizeOptionalString(record.phase);
            if (phase) record.phase = phase;
            else delete record.phase;

            const step = normalizeOptionalString(record.step);
            if (step) record.step = step;
            else delete record.step;

            const uncertainty = normalizeOptionalString(record.uncertainty);
            if (uncertainty) record.uncertainty = uncertainty;
            else delete record.uncertainty;

            if (Array.isArray(record.evidenceSpans)) {
                record.evidenceSpans = record.evidenceSpans
                    .filter(span => span && typeof span === 'object')
                    .map((span) => {
                        const spanRecord = { ...(span as Record<string, unknown>) };
                        if (typeof spanRecord.start === 'string') {
                            const parsedStart = Number(spanRecord.start);
                            if (Number.isFinite(parsedStart)) spanRecord.start = parsedStart;
                        }
                        if (typeof spanRecord.end === 'string') {
                            const parsedEnd = Number(spanRecord.end);
                            if (Number.isFinite(parsedEnd)) spanRecord.end = parsedEnd;
                        }
                        const spanText = normalizeOptionalString(spanRecord.text);
                        if (spanText) spanRecord.text = spanText;
                        return spanRecord;
                    });
            }

            const confidenceFinal = typeof record.confidence === 'number' && Number.isFinite(record.confidence)
                ? Math.max(0, Math.min(1, Number(record.confidence)))
                : 0.5;
            record.confidence = confidenceFinal;

            const toothFinal = normalizeOptionalString(record.tooth);
            if (!toothFinal && !record.uncertainty) {
                record.uncertainty = 'missing_tooth_reference';
            }
            if (confidenceFinal < 0.6 && !record.uncertainty) {
                record.uncertainty = 'llm_low_confidence';
            }

            return record;
        });

    const needsConfirmationRaw = src.needsConfirmation;
    const needsConfirmation =
        typeof needsConfirmationRaw === 'boolean'
            ? needsConfirmationRaw
            : typeof needsConfirmationRaw === 'string'
                ? needsConfirmationRaw.toLowerCase() === 'true'
                : undefined;

    const computedNeedsConfirmation = intents.some((intent) => {
        if (!intent || typeof intent !== 'object') return false;
        return Boolean((intent as Record<string, unknown>).uncertainty);
    });

    const needsConfirmationFinal = needsConfirmation === true || computedNeedsConfirmation;

    return {
        ...src,
        intents,
        needsConfirmation: needsConfirmationFinal,
    };
}

function mapClassifierTreatmentToPackId(value: string): ClassifiedTreatment['treatmentId'] {
    if (value === 'endo') return 'endo';
    if (value === 'extraction') return 'extraction';
    if (value === 'pzr') return 'pzr';
    if (value === 'crown_prep') return 'crown_prep';
    if (value === 'krone') return 'krone';
    if (value === 'bruecke') return 'bruecke';
    if (value === 'teilkrone') return 'teilkrone';
    if (value === 'wsr') return 'wsr';
    if (value === 'trauma') return 'trauma';
    if (value === 'implant') return 'implant';
    if (value === 'schiene') return 'schiene';
    if (value === 'teilprothese') return 'teilprothese';
    if (value === 'totalprothese') return 'totalprothese';
    if (value === 'ueberkappung') return 'ueberkappung';
    if (value === 'fissurenversiegelung') return 'fissurenversiegelung';
    if (value === 'parodontologie') return 'parodontologie';
    if (value === 'upt') return 'upt';
    if (value === 'untersuchung') return 'untersuchung';
    if (value === 'roentgen') return 'roentgen';
    return 'fuellung';
}

function findAllTeeth(text: string): string[] {
    const collectBlockedRanges = (pattern: RegExp): Array<{ start: number; end: number }> => {
        const withGlobal = pattern.flags.includes('g')
            ? pattern
            : new RegExp(pattern.source, `${pattern.flags}g`);
        const ranges: Array<{ start: number; end: number }> = [];
        for (const match of text.matchAll(withGlobal)) {
            const value = match[1];
            if (!value || match.index === undefined) continue;
            const localOffset = match[0].indexOf(value);
            if (localOffset < 0) continue;
            const start = match.index + localOffset;
            ranges.push({ start, end: start + value.length });
        }
        return ranges;
    };

    const blockedRanges = [
        ...collectBlockedRanges(TOOTH_VALUE_UNIT_RE),
        ...collectBlockedRanges(ROOT_CANAL_VALUE_RE),
    ];

    const result: string[] = [];
    for (const match of text.matchAll(/\b([1-8][1-8])\b/g)) {
        const value = match[1];
        if (!value || match.index === undefined) continue;
        const start = match.index;
        const end = start + value.length;
        const isBlocked = blockedRanges.some(range => start >= range.start && end <= range.end);
        if (isBlocked) continue;
        if (!result.includes(value)) {
            result.push(value);
        }
    }
    return result;
}

function buildEvidenceSpan(dictation: string, snippet: string, startSearchAt: number): { start: number; end: number; text: string } {
    const lowerDictation = dictation.toLowerCase();
    const lowerSnippet = snippet.toLowerCase();
    const start = lowerDictation.indexOf(lowerSnippet, startSearchAt);
    if (start < 0) {
        return {
            start: Math.max(0, startSearchAt),
            end: Math.max(0, startSearchAt + snippet.length),
            text: snippet,
        };
    }
    return {
        start,
        end: start + snippet.length,
        text: snippet,
    };
}

function fallbackIntentFromSegment(
    dictation: string,
    segmentText: string,
    segmentIndex: number,
    startOffset: number,
    contextTeeth: string[] = [],
    canSkipNoiseSegment = false
): {
    intents: TreatmentIntentV1[];
    nextOffset: number;
    diagnostics: string[];
    uncertain: boolean;
    contextTeeth: string[];
    skippedContextNote?: string;
} {
    const diagnostics: string[] = [];
    const classification = classifyTreatmentId(segmentText);
    const treatmentSignals = detectTreatmentSignals(segmentText);
    const explicitSignalTreatments = Array.from(new Set(treatmentSignals.map(signal => signal.treatmentId)));
    const hasMultipleTreatmentSignals = explicitSignalTreatments.length > 1;
    const hasExplicitTreatmentSignal = EXPLICIT_TREATMENT_SIGNAL_RE.test(segmentText);
    const hasExplicitSameToothReference = SAME_TOOTH_CONTEXT_RE.test(segmentText);
    const normalizedSegment = normalizeWhitespace(segmentText);
    if (canSkipNoiseSegment && classification.confidence === 'low' && !hasExplicitTreatmentSignal) {
        diagnostics.push(`segment-skipped-no-treatment-signal:${segmentIndex + 1}`);
        const skippedContextNote = SKIPPED_CONTEXT_SIGNAL_RE.test(normalizedSegment)
            || isHistoricalComplaintOnlyEvidence(normalizedSegment)
            || isContextOnlyEvidence(normalizedSegment)
            ? normalizedSegment
            : undefined;
        return {
            intents: [],
            nextOffset: startOffset,
            diagnostics,
            uncertain: false,
            contextTeeth: [],
            skippedContextNote,
        };
    }

    const teethRaw = findAllTeeth(segmentText);
    const singleContextTooth = contextTeeth.length === 1 ? contextTeeth[0] : undefined;
    const inferredToothFromContext = teethRaw.length === 0 && Boolean(singleContextTooth) && !hasExplicitSameToothReference;
    const explicitSameToothLinked = teethRaw.length === 0 && Boolean(singleContextTooth) && hasExplicitSameToothReference;
    const ambiguousToothContext = teethRaw.length === 0 && contextTeeth.length > 1;
    const missingToothReference = teethRaw.length === 0 && contextTeeth.length === 0;
    const teeth = teethRaw.length > 0 ? teethRaw : (singleContextTooth ? [singleContextTooth] : []);
    const defaultConfidence = classification.confidence === 'high' ? 0.86 : classification.confidence === 'medium' ? 0.68 : 0.45;
    const treatmentIds = hasMultipleTreatmentSignals ? explicitSignalTreatments : [mapClassifierTreatmentToPackId(classification.treatmentId)];
    const uncertainBase =
        classification.confidence === 'low'
        || inferredToothFromContext
        || missingToothReference
        || ambiguousToothContext
        || hasMultipleTreatmentSignals;
    const baseUncertainty =
        missingToothReference ? 'missing_tooth_reference'
            : ambiguousToothContext ? 'llm_ambiguous_mapping'
            : inferredToothFromContext ? 'inferred_tooth_from_context'
                : classification.confidence === 'low' ? 'classifier_low_confidence'
                    : hasMultipleTreatmentSignals ? 'llm_ambiguous_mapping'
                        : undefined;
    const uncertain = uncertainBase;
    if (hasMultipleTreatmentSignals) {
        diagnostics.push(`segment-multi-treatment-signals:${segmentIndex + 1}:${treatmentIds.join('|')}`);
    }

    const evidenceSpan = buildEvidenceSpan(dictation, segmentText, startOffset);
    const intents: TreatmentIntentV1[] = [];
    const confidenceByTreatment: Record<string, number> = {
        extraction: 0.74,
        pzr: 0.7,
        endo: 0.74,
        crown_prep: 0.72,
        krone: 0.72,
        bruecke: 0.72,
        teilkrone: 0.72,
        wsr: 0.72,
        trauma: 0.72,
        implant: 0.72,
        schiene: 0.7,
        teilprothese: 0.7,
        totalprothese: 0.7,
        ueberkappung: 0.68,
        untersuchung: 0.66,
        fuellung: 0.62,
        roentgen: 0.7,
    };

    treatmentIds.forEach((treatmentId, treatmentIndex) => {
        const treatmentConfidence = hasMultipleTreatmentSignals
            ? (confidenceByTreatment[treatmentId] ?? 0.6)
            : defaultConfidence;
        const intentBase = {
            treatmentId,
            confidence: treatmentConfidence,
            evidenceSpans: [evidenceSpan],
            uncertainty: baseUncertainty,
        } as const;
        if (teeth.length > 0) {
            teeth.forEach((tooth, toothIndex) => {
                intents.push({
                    intentId: `seg-${segmentIndex + 1}-${treatmentIndex + 1}-${toothIndex + 1}`,
                    tooth,
                    ...intentBase,
                });
            });
            return;
        }
        intents.push({
            intentId: `seg-${segmentIndex + 1}-${treatmentIndex + 1}-1`,
            ...intentBase,
        });
    });

    if (inferredToothFromContext) {
        diagnostics.push('tooth-inferred-from-context');
    }
    if (explicitSameToothLinked) {
        diagnostics.push('tooth-linked-explicit-same-context');
    }
    if (ambiguousToothContext) {
        diagnostics.push('tooth-context-ambiguous');
    }
    if (missingToothReference) {
        diagnostics.push('tooth-missing-reference');
    }
    return {
        intents,
        nextOffset: evidenceSpan.end,
        diagnostics,
        uncertain,
        contextTeeth: teethRaw,
        skippedContextNote: undefined,
    };
}

function attachSkippedContextToTailIntents(
    intents: TreatmentIntentV1[],
    noteRaw: string
): TreatmentIntentV1[] {
    const note = normalizeForensicContextNote(noteRaw);
    if (!note || intents.length === 0) return intents;

    const tailTreatmentId = intents[intents.length - 1]?.treatmentId;
    if (!tailTreatmentId) return intents;

    const next = [...intents];
    let attached = false;
    for (let i = next.length - 1; i >= 0; i -= 1) {
        const candidate = next[i];
        if (candidate.treatmentId !== tailTreatmentId) {
            if (attached) break;
            continue;
        }
        next[i] = mergeForensicNoteIntoIntent(candidate, note);
        attached = true;
    }

    if (!attached) {
        next[next.length - 1] = mergeForensicNoteIntoIntent(next[next.length - 1], note);
    }
    return next;
}

function fallbackDetect(dictation: string): DetectTreatmentIntentsResult {
    const segments = splitDictationIntoSegments(dictation);
    const intents: TreatmentIntentV1[] = [];
    const diagnostics: string[] = [];
    let cursor = 0;
    let needsConfirmation = false;
    let contextTeeth: string[] = [];

    segments.forEach((segmentText, segmentIndex) => {
        const isInsuranceOnlySegment = INSURANCE_ONLY_SEGMENT_RE.test(segmentText.trim());
        const result = fallbackIntentFromSegment(
            dictation,
            segmentText,
            segmentIndex,
            cursor,
            contextTeeth,
            intents.length > 0 || isInsuranceOnlySegment
        );
        cursor = result.nextOffset;
        intents.push(...result.intents);
        diagnostics.push(...result.diagnostics);
        if (result.skippedContextNote && intents.length > 0) {
            const merged = attachSkippedContextToTailIntents(intents, result.skippedContextNote);
            intents.splice(0, intents.length, ...merged);
            diagnostics.push(`segment-context-note-attached:${segmentIndex + 1}`);
        }
        if (result.uncertain) needsConfirmation = true;
        if (result.contextTeeth.length > 0) {
            contextTeeth = result.contextTeeth;
        }
    });

    const parsed = validateTreatmentIntentBundle({
        version: TREATMENT_INTENT_CONTRACT_VERSION,
        dictation,
        intents,
        needsConfirmation,
    });

    if (!parsed.ok) {
        throw new Error(`Fallback preanalysis produced invalid bundle: ${parsed.issues.join('; ')}`);
    }

    const canonical = canonicalizeTreatmentIntentBundle(parsed.data);
    const collapsed = collapseDuplicateIntents(canonical);
    const pruned = pruneLikelyRootCanalToothArtifacts(collapsed.bundle, dictation);
    const demotedHistorical = demoteHistoricalComplaintIntents(pruned.bundle);
    const demotedContinuation = demoteAmbiguousUntoothedContinuationIntents(demotedHistorical.bundle);

    return {
        bundle: demotedContinuation.bundle,
        source: 'fallback',
        diagnostics: [
            ...diagnostics,
            ...collapsed.diagnostics,
            ...pruned.diagnostics,
            ...demotedHistorical.diagnostics,
            ...demotedContinuation.diagnostics,
        ],
        needsConfirmation: demotedContinuation.bundle.needsConfirmation === true,
    };
}

function hasExtractionIntent(bundle: TreatmentIntentBundleV1): boolean {
    return bundle.intents.some(intent => intent.treatmentId === 'extraction');
}

function hasRootCanalValueReference(dictation: string, tooth: string): boolean {
    const escapedTooth = escapeRegexLiteral(tooth);
    const pattern = new RegExp(`\\b(?:mb|ml|db|dl|d|p|pal|k1|k2|k3|k4)\\s*[:=]?\\s*${escapedTooth}\\b`, 'i');
    return pattern.test(dictation);
}

function pruneLikelyRootCanalToothArtifacts(
    bundle: TreatmentIntentBundleV1,
    dictation: string
): { bundle: TreatmentIntentBundleV1; diagnostics: string[] } {
    const explicitTeeth = new Set(findAllTeeth(dictation));
    if (explicitTeeth.size === 0) {
        return { bundle, diagnostics: [] };
    }

    const diagnostics: string[] = [];
    const filtered = bundle.intents.filter((intent) => {
        if (!intent.tooth) return true;
        if (explicitTeeth.has(intent.tooth)) return true;
        if (!hasRootCanalValueReference(dictation, intent.tooth)) return true;
        diagnostics.push(`root-canal-value-tooth-artifact-pruned:${intent.intentId}:${intent.tooth}`);
        return false;
    });

    if (filtered.length === bundle.intents.length || filtered.length === 0) {
        return { bundle, diagnostics };
    }

    return {
        bundle: canonicalizeTreatmentIntentBundle({
            ...bundle,
            intents: filtered,
            needsConfirmation:
                bundle.needsConfirmation === true
                || filtered.some(intent => Boolean(intent.uncertainty)),
        }),
        diagnostics,
    };
}

export function collapseDuplicateIntents(
    bundle: TreatmentIntentBundleV1
): { bundle: TreatmentIntentBundleV1; diagnostics: string[] } {
    const grouped = new Map<string, TreatmentIntentV1[]>();
    const diagnostics: string[] = [];

    for (const intent of bundle.intents) {
        const key = `${intent.treatmentId}::${intent.tooth ?? 'unknown'}`;
        const list = grouped.get(key) ?? [];
        list.push(intent);
        grouped.set(key, list);
    }

    const mergedIntents: TreatmentIntentV1[] = [];
    let collapsedAny = false;

    for (const [groupKey, intents] of grouped.entries()) {
        if (intents.length === 1) {
            mergedIntents.push(intents[0]);
            continue;
        }

        collapsedAny = true;
        diagnostics.push(`duplicate-intent-collapsed:${groupKey}:${intents.length}`);

        const winner = [...intents].sort((a, b) => {
            if (a.confidence !== b.confidence) return b.confidence - a.confidence;
            const aEvidenceLength = a.evidenceSpans.reduce((sum, span) => sum + Math.max(0, span.end - span.start), 0);
            const bEvidenceLength = b.evidenceSpans.reduce((sum, span) => sum + Math.max(0, span.end - span.start), 0);
            if (aEvidenceLength !== bEvidenceLength) return bEvidenceLength - aEvidenceLength;
            const aStart = Math.min(...a.evidenceSpans.map(span => span.start));
            const bStart = Math.min(...b.evidenceSpans.map(span => span.start));
            if (aStart !== bStart) return aStart - bStart;
            return a.intentId.localeCompare(b.intentId);
        })[0];

        const seenEvidence = new Set<string>();
        const mergedEvidence = [...intents]
            .flatMap(intent => intent.evidenceSpans)
            .filter(span => {
                const key = `${span.start}:${span.end}:${span.text}`;
                if (seenEvidence.has(key)) return false;
                seenEvidence.add(key);
                return true;
            })
            .sort((a, b) => {
                if (a.start !== b.start) return a.start - b.start;
                if (a.end !== b.end) return a.end - b.end;
                return a.text.localeCompare(b.text);
            });

        mergedIntents.push({
            ...winner,
            uncertainty: selectMergedUncertainty(intents),
            evidenceSpans: mergedEvidence,
        });
    }

    return {
        bundle: canonicalizeTreatmentIntentBundle({
            ...bundle,
            intents: mergedIntents,
            needsConfirmation:
                bundle.needsConfirmation === true
                    || mergedIntents.some(intent => Boolean(intent.uncertainty)),
        }),
        diagnostics,
    };
}

function reconcileLlmBundleWithDeterministicSignals(bundle: TreatmentIntentBundleV1): ReconcileResult {
    const diagnostics: string[] = [];
    const intents = bundle.intents.map((intent) => {
        const evidenceText = intent.evidenceSpans.map(span => span.text).join(' ').trim();
        if (!evidenceText) return intent;
        const prostheticOverride = inferProstheticFinalTreatmentId(intent, evidenceText);
        if (prostheticOverride && prostheticOverride !== intent.treatmentId) {
            diagnostics.push(`llm-treatment-overridden-by-prosthetic-step:${intent.intentId}:${intent.treatmentId}->${prostheticOverride}`);
            return {
                ...intent,
                treatmentId: prostheticOverride,
            };
        }
        const signals = detectTreatmentSignals(evidenceText);
        const distinctSignals = Array.from(new Set(signals.map(signal => signal.treatmentId)));
        if (distinctSignals.length !== 1) return intent;
        const deterministicTreatment = distinctSignals[0];
        if (deterministicTreatment === intent.treatmentId) return intent;
        diagnostics.push(`llm-treatment-overridden-by-signal:${intent.intentId}:${intent.treatmentId}->${deterministicTreatment}`);
        return {
            ...intent,
            treatmentId: deterministicTreatment,
            uncertainty: undefined,
        };
    });
    return {
        bundle: canonicalizeTreatmentIntentBundle({
            ...bundle,
            intents,
        }),
        diagnostics,
    };
}

const UNCERTAINTY_PRIORITY: TreatmentIntentV1['uncertainty'][] = [
    'missing_tooth_reference',
    'inferred_tooth_from_context',
    'llm_ambiguous_mapping',
    'llm_low_confidence',
    'classifier_low_confidence',
];

function selectMergedUncertainty(intents: TreatmentIntentV1[]): TreatmentIntentV1['uncertainty'] {
    const uncertainties = new Set(
        intents
            .map(intent => intent.uncertainty)
            .filter((value): value is NonNullable<TreatmentIntentV1['uncertainty']> => Boolean(value))
    );
    if (uncertainties.size === 0) return undefined;
    for (const code of UNCERTAINTY_PRIORITY) {
        if (code && uncertainties.has(code)) return code;
    }
    return [...uncertainties][0];
}

export async function detectTreatmentIntents(
    dictation: string,
    options?: DetectTreatmentIntentsOptions
): Promise<DetectTreatmentIntentsResult> {
    if (!dictation || !dictation.trim()) {
        throw new Error('detectTreatmentIntents requires non-empty dictation');
    }

    const diagnostics: string[] = [];
    if (!options?.forceFallback) {
        const maxAttempts = options?.mockLlmContent ? 1 : 2;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                const llmRaw = options?.mockLlmContent
                    ? { content: options.mockLlmContent }
                    : await runLlmPreanalysis(dictation, options);

                if (llmRaw) {
                    const parsedJson = parseJsonObject(llmRaw.content);
                    if (parsedJson) {
                        const sanitizedJson = sanitizeLlmBundleCandidate(parsedJson);
                        const validated = validateTreatmentIntentBundle(sanitizedJson);
                        if (validated.ok) {
                            const canonical = canonicalizeTreatmentIntentBundle(validated.data);
                            const reconciled = reconcileLlmBundleWithDeterministicSignals(canonical);
                            const collapsed = collapseDuplicateIntents(reconciled.bundle);
                            const pruned = pruneLikelyRootCanalToothArtifacts(collapsed.bundle, dictation);
                            const demotedHistorical = demoteHistoricalComplaintIntents(pruned.bundle);
                            const demotedContinuation = demoteAmbiguousUntoothedContinuationIntents(demotedHistorical.bundle);
                            if (EXTRACTION_SIGNAL_RE.test(dictation) && !hasExtractionIntent(reconciled.bundle)) {
                                const fallback = fallbackDetect(dictation);
                                if (hasExtractionIntent(fallback.bundle)) {
                                    return {
                                        bundle: fallback.bundle,
                                        source: 'llm',
                                        needsConfirmation: fallback.bundle.needsConfirmation === true,
                                        diagnostics: [...diagnostics, 'llm-missed-extraction:fallback-override', ...fallback.diagnostics],
                                    };
                                }
                            }
                            return {
                                bundle: demotedContinuation.bundle,
                                source: 'llm',
                                needsConfirmation: demotedContinuation.bundle.needsConfirmation === true,
                                diagnostics: [
                                    ...diagnostics,
                                    ...reconciled.diagnostics,
                                    ...collapsed.diagnostics,
                                    ...pruned.diagnostics,
                                    ...demotedHistorical.diagnostics,
                                    ...demotedContinuation.diagnostics,
                                ],
                            };
                        }
                        diagnostics.push(`llm-schema-invalid:attempt${attempt}:${validated.issues[0] ?? 'unknown'}`);
                    } else {
                        diagnostics.push(`llm-json-parse-failed:attempt${attempt}`);
                    }
                } else {
                    diagnostics.push(`llm-unavailable:attempt${attempt}`);
                }
            } catch (error) {
                diagnostics.push(`llm-error:attempt${attempt}:${error instanceof Error ? error.message : String(error)}`);
            }

            if (attempt < maxAttempts) {
                diagnostics.push(`llm-retry:attempt${attempt + 1}`);
            }
        }
    }

    const fallback = fallbackDetect(dictation);
    return {
        ...fallback,
        diagnostics: [...diagnostics, ...fallback.diagnostics],
    };
}
