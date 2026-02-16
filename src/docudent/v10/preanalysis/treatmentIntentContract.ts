import { z } from 'zod';
import { hasPack } from '../packs/registry';
import { containsBillingSignal } from '../llm/llmBoundaryContract';

export const TREATMENT_INTENT_CONTRACT_VERSION = '1.0.0';
export const PREANALYSIS_TREATMENT_IDS = ['fuellung', 'endo', 'extraction', 'crown_prep'] as const;
export const TREATMENT_INTENT_UNCERTAINTY_CODES = [
    'classifier_low_confidence',
    'llm_low_confidence',
    'llm_ambiguous_mapping',
    'inferred_tooth_from_context',
    'missing_tooth_reference',
] as const;

export const evidenceSpanSchema = z.object({
    start: z.number().int().min(0),
    end: z.number().int().min(0),
    text: z.string().min(1),
}).strict().superRefine((span, ctx) => {
    if (span.end < span.start) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Evidence span end must be >= start',
            path: ['end'],
        });
    }
    if (containsBillingSignal(span.text)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Evidence span text must not contain billing signals',
            path: ['text'],
        });
    }
});

const treatmentIdSchema = z.string().min(1).superRefine((value, ctx) => {
    if (!PREANALYSIS_TREATMENT_IDS.includes(value as typeof PREANALYSIS_TREATMENT_IDS[number])) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown treatmentId '${value}' (not in preanalysis allowlist)`,
        });
        return;
    }
    if (!hasPack(value)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown treatmentId '${value}' (allowlisted but no registered pack)`,
        });
    }
});

export const treatmentIntentSchema = z.object({
    intentId: z.string().min(1),
    treatmentId: treatmentIdSchema,
    tooth: z.string().min(1).optional(),
    phase: z.string().min(1).optional(),
    step: z.string().min(1).optional(),
    confidence: z.number().min(0).max(1),
    evidenceSpans: z.array(evidenceSpanSchema).min(1),
    sharedFacts: z.record(z.unknown()).optional(),
    uncertainty: z.enum(TREATMENT_INTENT_UNCERTAINTY_CODES).optional(),
}).strict().superRefine((intent, ctx) => {
    if (containsBillingSignal(intent.sharedFacts)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'sharedFacts must not contain billing signals',
            path: ['sharedFacts'],
        });
    }
});

export const treatmentIntentBundleSchema = z.object({
    version: z.literal(TREATMENT_INTENT_CONTRACT_VERSION),
    dictation: z.string().min(1),
    intents: z.array(treatmentIntentSchema).min(1),
    needsConfirmation: z.boolean().optional(),
}).strict();

export type EvidenceSpanV1 = z.infer<typeof evidenceSpanSchema>;
export type TreatmentIntentV1 = z.infer<typeof treatmentIntentSchema>;
export type TreatmentIntentBundleV1 = z.infer<typeof treatmentIntentBundleSchema>;
const LOW_CONFIDENCE_REQUIRES_UNCERTAINTY_THRESHOLD = 0.6;

type ValidationResult =
    | { ok: true; data: TreatmentIntentBundleV1 }
    | { ok: false; issues: string[] };

export function validateTreatmentIntentBundle(input: unknown): ValidationResult {
    const parsed = treatmentIntentBundleSchema.safeParse(input);
    if (parsed.success) {
        const issues: string[] = [];
        const dictation = parsed.data.dictation;
        const seenIntentIds = new Set<string>();
        let hasUncertainIntent = false;

        for (const intent of parsed.data.intents) {
            if (intent.uncertainty) hasUncertainIntent = true;
            if (seenIntentIds.has(intent.intentId)) {
                issues.push(`intents.${intent.intentId}: duplicate intentId`);
            } else {
                seenIntentIds.add(intent.intentId);
            }
            if (!intent.tooth && !intent.uncertainty) {
                issues.push(`intents.${intent.intentId}: missing tooth requires uncertainty code`);
            }
            if (
                intent.confidence < LOW_CONFIDENCE_REQUIRES_UNCERTAINTY_THRESHOLD
                && !intent.uncertainty
            ) {
                issues.push(
                    `intents.${intent.intentId}: confidence<${LOW_CONFIDENCE_REQUIRES_UNCERTAINTY_THRESHOLD} requires uncertainty code`
                );
            }

            for (let spanIndex = 0; spanIndex < intent.evidenceSpans.length; spanIndex += 1) {
                const span = intent.evidenceSpans[spanIndex];
                if (span.end > dictation.length) {
                    issues.push(`intents.${intent.intentId}.evidenceSpans.${spanIndex}.end: out of dictation bounds`);
                    continue;
                }

                const slice = dictation.slice(span.start, span.end);
                if (slice.trim().length === 0) {
                    issues.push(`intents.${intent.intentId}.evidenceSpans.${spanIndex}: empty evidence slice`);
                    continue;
                }

                const normalizedSpanText = span.text.trim().toLowerCase();
                const inSlice = slice.toLowerCase().includes(normalizedSpanText);
                const inDictation = dictation.toLowerCase().includes(normalizedSpanText);
                if (!inSlice && !inDictation) {
                    issues.push(`intents.${intent.intentId}.evidenceSpans.${spanIndex}.text: does not match dictation slice`);
                }
            }
        }
        if (hasUncertainIntent && parsed.data.needsConfirmation !== true) {
            issues.push('needsConfirmation: must be true when uncertainty exists');
        }

        if (issues.length > 0) {
            return { ok: false, issues };
        }
        return { ok: true, data: parsed.data };
    }
    return {
        ok: false,
        issues: parsed.error.issues.map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
    };
}

function stableObject(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(stableObject);
    }
    if (value && typeof value === 'object') {
        const src = value as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        for (const key of Object.keys(src).sort()) {
            out[key] = stableObject(src[key]);
        }
        return out;
    }
    return value;
}

export function canonicalizeTreatmentIntentBundle(bundle: TreatmentIntentBundleV1): TreatmentIntentBundleV1 {
    const intents = [...bundle.intents]
        .map(intent => ({
            ...intent,
            evidenceSpans: [...intent.evidenceSpans].sort((a, b) => {
                if (a.start !== b.start) return a.start - b.start;
                if (a.end !== b.end) return a.end - b.end;
                return a.text.localeCompare(b.text);
            }),
        }))
        .sort((a, b) => {
            if (a.intentId !== b.intentId) return a.intentId.localeCompare(b.intentId);
            if (a.treatmentId !== b.treatmentId) return a.treatmentId.localeCompare(b.treatmentId);
            return (a.tooth || '').localeCompare(b.tooth || '');
        });
    return stableObject({
        ...bundle,
        intents,
    }) as TreatmentIntentBundleV1;
}

export function toDeterministicIntentHashInput(bundle: TreatmentIntentBundleV1): string {
    return JSON.stringify(canonicalizeTreatmentIntentBundle(bundle));
}
