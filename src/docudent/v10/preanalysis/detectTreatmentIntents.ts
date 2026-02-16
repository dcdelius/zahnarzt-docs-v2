import { classifyTreatmentId, detectTreatmentSignals } from '../multitreatment/classifyTreatment';
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

const PREANALYSIS_PROMPT = `Du strukturierst zahnmedizinische Fliesstext-Diktate in Behandlungs-Intents.
Antworte NUR als JSON mit diesem Schema:
{
  "version": "1.0.0",
  "dictation": "<original>",
  "needsConfirmation": true|false,
  "intents": [
    {
      "intentId": "string",
      "treatmentId": "${PREANALYSIS_TREATMENT_IDS.join('|')}",
      "tooth": "string optional",
      "phase": "string optional",
      "step": "string optional",
      "confidence": 0..1,
      "evidenceSpans": [{ "start": number, "end": number, "text": "string" }],
      "uncertainty": "${TREATMENT_INTENT_UNCERTAINTY_CODES.join('|')} optional"
    }
  ]
}
Regeln:
- Keine Erfindungen.
- Jeder Intent braucht mindestens einen evidenceSpan.
- Wenn unsicher: needsConfirmation=true.
- Wenn uncertainty gesetzt ist, muss needsConfirmation=true sein.
- Wenn tooth fehlt, uncertainty setzen (z.B. missing_tooth_reference).
- Keine Billing-Codes/Felder ausgeben (z.B. BEMA/GOZ/GOÄ/BEL, billingCodes, billingRefs).
- Nur treatmentIds verwenden, die im Schema stehen.`;

const EXTRACTION_SIGNAL_RE = /\b(extraktion|luxation|zahn ziehen|entfernt|entfernung|alveole|naht)\b/i;
const EXPLICIT_TREATMENT_SIGNAL_RE = /\b(f[uü]llung|komposit|adh[aä]siv(?:e|er|es|en)?\s+aufbau|aufbauf[uü]llung|endo|wkb|wurzelkanal|trepanation|extraktion|luxation|zahn ziehen|krone|kronenpr[aä]p|beschliff(?:en|en)|praeparation)\b/i;
const SAME_TOOTH_CONTEXT_RE = /\b(selben|gleichen)\s+zahn\b|\bam\s+(selben|gleichen)\b/i;

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

function mapClassifierTreatmentToPackId(value: string): 'fuellung' | 'endo' | 'extraction' | 'crown_prep' {
    if (value === 'endo') return 'endo';
    if (value === 'extraction') return 'extraction';
    if (value === 'crown_prep') return 'crown_prep';
    return 'fuellung';
}

function findAllTeeth(text: string): string[] {
    const matches = text.match(/\b([1-8][1-8])\b/g) || [];
    return Array.from(new Set(matches));
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
} {
    const diagnostics: string[] = [];
    const classification = classifyTreatmentId(segmentText);
    const treatmentSignals = detectTreatmentSignals(segmentText);
    const explicitSignalTreatments = Array.from(new Set(treatmentSignals.map(signal => signal.treatmentId)));
    const hasMultipleTreatmentSignals = explicitSignalTreatments.length > 1;
    const hasExplicitTreatmentSignal = EXPLICIT_TREATMENT_SIGNAL_RE.test(segmentText);
    const hasExplicitSameToothReference = SAME_TOOTH_CONTEXT_RE.test(segmentText);
    if (canSkipNoiseSegment && classification.confidence === 'low' && !hasExplicitTreatmentSignal) {
        diagnostics.push(`segment-skipped-no-treatment-signal:${segmentIndex + 1}`);
        return {
            intents: [],
            nextOffset: startOffset,
            diagnostics,
            uncertain: false,
            contextTeeth: [],
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
        endo: 0.74,
        crown_prep: 0.72,
        fuellung: 0.62,
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
    };
}

function fallbackDetect(dictation: string): DetectTreatmentIntentsResult {
    const segments = splitDictationIntoSegments(dictation);
    const intents: TreatmentIntentV1[] = [];
    const diagnostics: string[] = [];
    let cursor = 0;
    let needsConfirmation = false;
    let contextTeeth: string[] = [];

    segments.forEach((segmentText, segmentIndex) => {
        const result = fallbackIntentFromSegment(
            dictation,
            segmentText,
            segmentIndex,
            cursor,
            contextTeeth,
            intents.length > 0
        );
        cursor = result.nextOffset;
        intents.push(...result.intents);
        diagnostics.push(...result.diagnostics);
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

    return {
        bundle: collapsed.bundle,
        source: 'fallback',
        diagnostics: [...diagnostics, ...collapsed.diagnostics],
        needsConfirmation: collapsed.bundle.needsConfirmation === true,
    };
}

function hasExtractionIntent(bundle: TreatmentIntentBundleV1): boolean {
    return bundle.intents.some(intent => intent.treatmentId === 'extraction');
}

function collapseDuplicateIntents(
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
        try {
            const llmRaw = options?.mockLlmContent
                ? { content: options.mockLlmContent }
                : await runLlmPreanalysis(dictation, options);

            if (llmRaw) {
                const parsedJson = parseJsonObject(llmRaw.content);
                if (parsedJson) {
                    const validated = validateTreatmentIntentBundle(parsedJson);
                    if (validated.ok) {
                        const canonical = canonicalizeTreatmentIntentBundle(validated.data);
                        const collapsed = collapseDuplicateIntents(canonical);
                        if (EXTRACTION_SIGNAL_RE.test(dictation) && !hasExtractionIntent(canonical)) {
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
                            bundle: collapsed.bundle,
                            source: 'llm',
                            needsConfirmation: collapsed.bundle.needsConfirmation === true,
                            diagnostics: [...diagnostics, ...collapsed.diagnostics],
                        };
                    }
                    diagnostics.push(`llm-schema-invalid:${validated.issues[0] ?? 'unknown'}`);
                } else {
                    diagnostics.push('llm-json-parse-failed');
                }
            } else {
                diagnostics.push('llm-unavailable');
            }
        } catch (error) {
            diagnostics.push(`llm-error:${error instanceof Error ? error.message : String(error)}`);
        }
    }

    const fallback = fallbackDetect(dictation);
    return {
        ...fallback,
        diagnostics: [...diagnostics, ...fallback.diagnostics],
    };
}
