import { hasPack } from '../packs/registry';
import { classifyTreatmentId } from '../multitreatment/classifyTreatment';
import { splitDictationIntoSegments } from '../multitreatment/segmentDictation';
import {
    TREATMENT_INTENT_CONTRACT_VERSION,
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
      "treatmentId": "fuellung|endo|extraction_stub",
      "tooth": "string optional",
      "phase": "string optional",
      "step": "string optional",
      "confidence": 0..1,
      "evidenceSpans": [{ "start": number, "end": number, "text": "string" }],
      "uncertainty": "string optional"
    }
  ]
}
Regeln:
- Keine Erfindungen.
- Jeder Intent braucht mindestens einen evidenceSpan.
- Wenn unsicher: needsConfirmation=true.
- Nur treatmentIds verwenden, die im Schema stehen.`;

function getOpenAiKey(): string | null {
    const envFromProcess = (typeof process !== 'undefined' && process.env) ? process.env : undefined;
    // @ts-ignore
    const viteKey = import.meta.env?.VITE_OPENAI_API_KEY;
    return viteKey ?? envFromProcess?.VITE_OPENAI_API_KEY ?? null;
}

async function runLlmPreanalysis(dictation: string): Promise<LlmResult | null> {
    const key = getOpenAiKey();
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

function mapClassifierTreatmentToPackId(value: string): 'fuellung' | 'endo' | 'extraction_stub' {
    if (value === 'endo') return 'endo';
    if (value === 'extraction') return 'extraction_stub';
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
    carryTooth?: string
): { intents: TreatmentIntentV1[]; nextOffset: number; diagnostics: string[]; uncertain: boolean } {
    const diagnostics: string[] = [];
    const classification = classifyTreatmentId(segmentText);
    const packTreatmentId = mapClassifierTreatmentToPackId(classification.treatmentId);
    const teethRaw = findAllTeeth(segmentText);
    const teeth = teethRaw.length > 0 ? teethRaw : (carryTooth ? [carryTooth] : []);
    const confidence = classification.confidence === 'high' ? 0.86 : classification.confidence === 'medium' ? 0.68 : 0.45;
    const hasCrownSignals = /\b(kronen|krone|praep|pr[ae]p|beschliff)\b/i.test(segmentText);
    const uncertain = classification.confidence === 'low' || hasCrownSignals;

    const evidenceSpan = buildEvidenceSpan(dictation, segmentText, startOffset);
    const intentBase = {
        treatmentId: packTreatmentId,
        phase: hasCrownSignals ? 'kronenpraep_candidate' : undefined,
        step: hasCrownSignals ? 'confirm_treatment_mapping' : undefined,
        confidence,
        evidenceSpans: [evidenceSpan],
        uncertainty: hasCrownSignals ? 'candidate:crown_prep_no_pack' : (classification.confidence === 'low' ? 'classifier_low_confidence' : undefined),
    };

    const intents: TreatmentIntentV1[] = teeth.length > 0
        ? teeth.map((tooth, idx) => ({
            intentId: `seg-${segmentIndex + 1}-${idx + 1}`,
            tooth,
            ...intentBase,
        }))
        : [{
            intentId: `seg-${segmentIndex + 1}-1`,
            ...intentBase,
        }];

    if (hasCrownSignals && !hasPack('extraction_stub')) {
        diagnostics.push('crown-signal-detected');
    }
    return {
        intents,
        nextOffset: evidenceSpan.end,
        diagnostics,
        uncertain,
    };
}

function fallbackDetect(dictation: string): DetectTreatmentIntentsResult {
    const segments = splitDictationIntoSegments(dictation);
    const intents: TreatmentIntentV1[] = [];
    const diagnostics: string[] = [];
    let cursor = 0;
    let needsConfirmation = false;
    let carryTooth: string | undefined;

    segments.forEach((segmentText, segmentIndex) => {
        const result = fallbackIntentFromSegment(dictation, segmentText, segmentIndex, cursor, carryTooth);
        cursor = result.nextOffset;
        intents.push(...result.intents);
        diagnostics.push(...result.diagnostics);
        if (result.uncertain) needsConfirmation = true;
        const lastIntentWithTooth = [...result.intents].reverse().find(intent => !!intent.tooth);
        if (lastIntentWithTooth?.tooth) carryTooth = lastIntentWithTooth.tooth;
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

    return {
        bundle: canonicalizeTreatmentIntentBundle(parsed.data),
        source: 'fallback',
        diagnostics,
        needsConfirmation,
    };
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
                : await runLlmPreanalysis(dictation);

            if (llmRaw) {
                const parsedJson = parseJsonObject(llmRaw.content);
                if (parsedJson) {
                    const validated = validateTreatmentIntentBundle(parsedJson);
                    if (validated.ok) {
                        const canonical = canonicalizeTreatmentIntentBundle(validated.data);
                        return {
                            bundle: canonical,
                            source: 'llm',
                            needsConfirmation: canonical.needsConfirmation === true,
                            diagnostics,
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
