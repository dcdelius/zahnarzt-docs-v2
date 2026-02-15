import { z } from 'zod';
import { hasPack } from '../packs/registry';

export const TREATMENT_INTENT_CONTRACT_VERSION = '1.0.0';

export const evidenceSpanSchema = z.object({
    start: z.number().int().min(0),
    end: z.number().int().min(0),
    text: z.string().min(1),
}).superRefine((span, ctx) => {
    if (span.end < span.start) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Evidence span end must be >= start',
            path: ['end'],
        });
    }
});

const treatmentIdSchema = z.string().min(1).superRefine((value, ctx) => {
    if (!hasPack(value)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown treatmentId '${value}' (no registered pack)`,
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
    uncertainty: z.string().min(1).optional(),
});

export const treatmentIntentBundleSchema = z.object({
    version: z.literal(TREATMENT_INTENT_CONTRACT_VERSION),
    dictation: z.string().min(1),
    intents: z.array(treatmentIntentSchema).min(1),
    needsConfirmation: z.boolean().optional(),
});

export type EvidenceSpanV1 = z.infer<typeof evidenceSpanSchema>;
export type TreatmentIntentV1 = z.infer<typeof treatmentIntentSchema>;
export type TreatmentIntentBundleV1 = z.infer<typeof treatmentIntentBundleSchema>;

type ValidationResult =
    | { ok: true; data: TreatmentIntentBundleV1 }
    | { ok: false; issues: string[] };

export function validateTreatmentIntentBundle(input: unknown): ValidationResult {
    const parsed = treatmentIntentBundleSchema.safeParse(input);
    if (parsed.success) {
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

