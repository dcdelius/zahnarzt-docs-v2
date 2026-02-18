import type { ReasonedExtractionV1 } from '@/docudent/contracts/extractionV6';
import {
    buildDocumentationContextFromExtraction,
    buildLabeledContextNotes,
    mergeNotesIntoDocumentationContext,
    resolveDocumentationContextMapping,
    syncDocumentationContextToExtraction,
} from '../context/documentationContext';

export interface ReasonedExtractionSummary {
    intentHints: number;
    factHints: number;
    explicitHints: number;
    inferredHints: number;
    forensicNotes: number;
    unresolved: number;
    appliedKeys: string[];
}

interface MergeResult {
    extracted: Record<string, unknown>;
    summary?: ReasonedExtractionSummary;
}

const MIN_EXPLICIT_CONFIDENCE = 0.7;
const MIN_CONTEXT_CONFIDENCE = 0.65;

const FACT_HINT_TO_MENTIONED_KEY: Record<string, string> = {
    endo_step: 'endo_step',
    endo_phase: 'endo_phase',
    working_length: 'working_length',
    wl_method: 'wl_method',
    wf_technique: 'wf_technique',
    root_canals: 'root_canals',
    irrigation_solutions: 'irrigation_solutions',
    endo_medication: 'endo_medication',
    temp_closure: 'temp_closure',
    anesthesia: 'anesthesia',
    capping: 'capping',
    vitality: 'vitality',
    percussion: 'percussion',
    material: 'material',
    kofferdam: 'kofferdam',
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasMeaningfulValue(value: unknown): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
}

function normalizeStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map(item => String(item).trim())
            .filter(Boolean);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? [trimmed] : [];
    }
    return [];
}

function normalizeReasoning(value: unknown): ReasonedExtractionV1 | undefined {
    if (!isRecord(value)) return undefined;
    const intentHints = Array.isArray(value.intentHints)
        ? value.intentHints
            .filter(isRecord)
            .map((hint) => {
                const treatmentId = String(hint.treatmentId ?? '').trim();
                if (!treatmentId) return null;
                const confidence = typeof hint.confidence === 'number' && Number.isFinite(hint.confidence)
                    ? Math.max(0, Math.min(1, hint.confidence))
                    : 0.5;
                const basis = hint.basis === 'inferred' ? 'inferred' : 'explicit';
                const evidence = normalizeStringArray(hint.evidence);
                return {
                    treatmentId,
                    confidence,
                    basis,
                    evidence,
                    tooth: typeof hint.tooth === 'string' && hint.tooth.trim().length > 0 ? hint.tooth.trim() : undefined,
                    phase: typeof hint.phase === 'string' && hint.phase.trim().length > 0 ? hint.phase.trim() : undefined,
                    step: typeof hint.step === 'string' && hint.step.trim().length > 0 ? hint.step.trim() : undefined,
                };
            })
            .filter((hint): hint is NonNullable<typeof hint> => hint !== null)
        : [];

    const factHints = Array.isArray(value.factHints)
        ? value.factHints
            .filter(isRecord)
            .map((hint) => {
                const key = String(hint.key ?? '').trim();
                if (!key) return null;
                const confidence = typeof hint.confidence === 'number' && Number.isFinite(hint.confidence)
                    ? Math.max(0, Math.min(1, hint.confidence))
                    : 0.5;
                const basis = hint.basis === 'inferred' ? 'inferred' : 'explicit';
                return {
                    key,
                    value: hint.value ?? null,
                    confidence,
                    basis,
                    evidence: normalizeStringArray(hint.evidence),
                    requiresConfirmation: hint.requiresConfirmation === true ? true : undefined,
                };
            })
            .filter((hint): hint is NonNullable<typeof hint> => hint !== null)
        : [];

    const forensicNotes = normalizeStringArray(value.forensicNotes);
    const unresolved = normalizeStringArray(value.unresolved);

    if (
        intentHints.length === 0
        && factHints.length === 0
        && forensicNotes.length === 0
        && unresolved.length === 0
    ) {
        return undefined;
    }

    return {
        version: 'v1',
        intentHints: intentHints.length > 0 ? intentHints : undefined,
        factHints: factHints.length > 0 ? factHints : undefined,
        forensicNotes: forensicNotes.length > 0 ? forensicNotes : undefined,
        unresolved: unresolved.length > 0 ? unresolved : undefined,
    };
}

function normalizeFactHintKey(key: string): string {
    return key
        .trim()
        .toLowerCase()
        .replace(/[\s\-]+/g, '_');
}

function isSupportedFactHintValue(value: unknown): boolean {
    if (value === null) return true;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true;
    if (Array.isArray(value)) {
        return value.every(item => typeof item === 'string' || typeof item === 'number');
    }
    if (isRecord(value)) return true;
    return false;
}

/**
 * Applies conservative LLM reasoned hints into extraction payload.
 * Only explicit/high-confidence hints are copied into `mentioned`.
 * Inferred hints stay in meta only and never become billing-relevant facts directly.
 */
export function applyReasonedExtractionHints(
    extracted: Record<string, unknown>,
    treatmentId: string
): MergeResult {
    const reasoning = normalizeReasoning(extracted.reasoning);
    if (!reasoning) return { extracted };

    const next = { ...extracted, reasoning };
    const mentioned = isRecord(next.mentioned) ? { ...next.mentioned } : {};
    const appliedKeys: string[] = [];
    const documentationContext = buildDocumentationContextFromExtraction(next);

    const factHints = reasoning.factHints ?? [];
    const intentHints = reasoning.intentHints ?? [];
    const explicitHints = [...factHints, ...intentHints].filter(hint => hint.basis === 'explicit').length;
    const inferredHints = [...factHints, ...intentHints].filter(hint => hint.basis === 'inferred').length;

    for (const factHint of factHints) {
        if (factHint.basis !== 'explicit') continue;
        if (factHint.requiresConfirmation) continue;
        if (!isSupportedFactHintValue(factHint.value)) continue;

        const normalizedKey = normalizeFactHintKey(factHint.key);
        const mentionedKey = FACT_HINT_TO_MENTIONED_KEY[normalizedKey];
        if (mentionedKey && factHint.confidence >= MIN_EXPLICIT_CONFIDENCE && !hasMeaningfulValue(mentioned[mentionedKey])) {
            mentioned[mentionedKey] = factHint.value;
            appliedKeys.push(`mentioned.${mentionedKey}`);
        }

        const contextMapping = resolveDocumentationContextMapping(normalizedKey);
        if (contextMapping && factHint.confidence >= MIN_CONTEXT_CONFIDENCE) {
            const notes = buildLabeledContextNotes(contextMapping, factHint.value);
            if (mergeNotesIntoDocumentationContext(documentationContext, contextMapping.bucket, notes)) {
                appliedKeys.push(contextMapping.target);
            }
        }
    }

    const matchingIntentHint = intentHints
        .filter(hint => hint.treatmentId === treatmentId && hint.basis === 'explicit')
        .sort((a, b) => b.confidence - a.confidence)[0];

    if (matchingIntentHint && matchingIntentHint.confidence >= MIN_EXPLICIT_CONFIDENCE) {
        if (!hasMeaningfulValue(next.tooth) && typeof matchingIntentHint.tooth === 'string') {
            next.tooth = matchingIntentHint.tooth;
            appliedKeys.push('tooth');
        }
        if (treatmentId === 'endo') {
            if (!hasMeaningfulValue(mentioned.endo_step) && typeof matchingIntentHint.step === 'string') {
                mentioned.endo_step = matchingIntentHint.step;
                appliedKeys.push('mentioned.endo_step');
            }
            if (!hasMeaningfulValue(mentioned.endo_phase) && typeof matchingIntentHint.phase === 'string') {
                mentioned.endo_phase = matchingIntentHint.phase;
                appliedKeys.push('mentioned.endo_phase');
            }
        }
    }

    const forensicNotes = reasoning.forensicNotes ?? [];
    if (mergeNotesIntoDocumentationContext(documentationContext, 'forensicNotes', forensicNotes)) {
        appliedKeys.push('patientenangaben');
    }
    const unresolved = reasoning.unresolved ?? [];
    if (mergeNotesIntoDocumentationContext(documentationContext, 'unresolved', unresolved)) {
        appliedKeys.push('reasoning.unresolved');
    }

    if (Object.keys(mentioned).length > 0) {
        next.mentioned = mentioned;
    }

    const contextAppliedKeys = syncDocumentationContextToExtraction(next, documentationContext);
    appliedKeys.push(...contextAppliedKeys);
    const uniqueAppliedKeys = Array.from(new Set(appliedKeys));

    return {
        extracted: next,
        summary: {
            intentHints: intentHints.length,
            factHints: factHints.length,
            explicitHints,
            inferredHints,
            forensicNotes: forensicNotes.length,
            unresolved: unresolved.length,
            appliedKeys: uniqueAppliedKeys,
        },
    };
}
