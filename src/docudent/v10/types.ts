/**
 * V10 Pipeline Types
 *
 * Canonical types for the unified V10 orchestrator.
 * V10 is the single source of truth for pipeline execution.
 */

import type { DynamicQuestion, QuestionBundle } from '../../contracts/questions';
import type { TreatmentFacts } from './facts';
import type { OverridesByInstance } from './settings/useChipOverrides';
import type { ValidationResult as BillingValidationResult } from '../../core/billing/knowledgeBase/logic/billingValidation';
import type { SourceRef } from '../../medical_kb/schema.v1';

/**
 * Source of a fact for billing eligibility
 * - 'dictation': Extracted from dictation text
 * - 'user': Provided by user answer
 * - 'settings': From practice settings/policy
 * - 'inferred': Inferred by rules (NOT billing eligible)
 * - 'default': Default value (NOT billing eligible)
 */
export type FactSource = 'dictation' | 'user' | 'settings' | 'inferred' | 'default';

// ═══════════════════════════════════════════════════════════════
// BILLING INTENT (Channelization)
// ═══════════════════════════════════════════════════════════════

/** Insurance type for billing */
export type InsuranceType = 'GKV' | 'PKV' | 'MKV';

/**
 * BillingIntent: Controls which catalog lookups are allowed.
 * Computed early in pipeline, prevents forbidden lookups.
 */
export interface BillingIntent {
    mode: InsuranceType;
    /** Allow BEMA catalog lookups (GKV, MKV) */
    allowBema: boolean;
    /** Allow GOZ catalog lookups (PKV) */
    allowGoz: boolean;
    /** Allow GOZ addon for MKV (Mehrkosten) */
    allowGozAddon: boolean;
}

/**
 * Compute BillingIntent from insurance type and Mehrkosten status.
 * Pure function - no side effects.
 */
export function computeBillingIntent(
    insuranceType: InsuranceType,
    mehrkostenActive: boolean
): BillingIntent {
    switch (insuranceType) {
        case 'GKV':
            return { mode: 'GKV', allowBema: true, allowGoz: false, allowGozAddon: false };
        case 'PKV':
            return { mode: 'PKV', allowBema: false, allowGoz: true, allowGozAddon: false };
        case 'MKV':
            return { mode: 'MKV', allowBema: true, allowGoz: false, allowGozAddon: mehrkostenActive };
    }
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE INPUT
// ═══════════════════════════════════════════════════════════════

export interface V10PipelineInput {
    /** Raw dictation text */
    dictation: string;

    /** Treatment ID (fuellung, endo, etc.) */
    treatmentId: string;

    /** Insurance type */
    insuranceType: 'GKV' | 'PKV' | 'MKV';

    /** Text length preference */
    textLength: 'kurz' | 'mittel' | 'lang';

    /** User answers (may be scoped, e.g., medical_ueberkappung::tooth:16) */
    answers?: Map<string, unknown> | Record<string, unknown>;

    /** List of teeth to process (multi-instance mode) */
    teeth?: string[];

    /** Pre-extracted data (skip extraction) */
    preExtracted?: Record<string, unknown>;

    /**
     * Optional intent-preanalysis hints (LLM/fallback stage).
     * Never a billing source; used only to improve extraction/fact prefill.
     */
    preanalysisHints?: V10PreanalysisHints;

    /** User defaults for pre-filling */
    userDefaults?: Record<string, unknown>;

    /** Optional KB release pin for deterministic session runs */
    kbReleaseId?: string;

    /**
     * Optional hard requirement for extraction runtime method.
     * When true, pipeline returns error if extraction does not run with LLM method.
     */
    requireLlmExtraction?: boolean;

    /** Per-instance chip overrides (manual control center) */
    chipOverrides?: OverridesByInstance;

    /** Test-only options (only active in test mode) */
    testOnly?: V10TestOnlyOptions;
}

// ═══════════════════════════════════════════════════════════════
// TEST-ONLY OPTIONS
// ═══════════════════════════════════════════════════════════════

export interface V10TestOnlyOptions {
    /** Enable testOnly mode (required in production) */
    enabled?: boolean;

    /** Force specific extraction result */
    forceExtraction?: Record<string, unknown>;

    /** Force specific answers */
    forceAnswers?: Map<string, unknown> | Record<string, unknown>;

    /** Force specific chips */
    forceChips?: string[];

    /** Skip combinability check */
    skipCombinability?: boolean;

    /** Force specific billing codes (for combinability testing) */
    forceBillingCodes?: string[];

    /** M62: Simulate user settings (e.g., defaultCappingMaterial) */
    settings?: Record<string, unknown>;
    /** @deprecated Use `settings` instead (kept for test compatibility) */
    userSettings?: Record<string, unknown>;

    /**
     * G109: Golden Dictation Mode
     * When enabled, forces unknown facts to guarantee askbacks.
     * Uses explicit values from golden_dictation_facts.ts.
     */
    goldenMode?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE OUTPUT
// ═══════════════════════════════════════════════════════════════

export type V10PipelineState = 'questions' | 'output' | 'error';

export interface V10PipelineOutput {
    /** Current state */
    state: V10PipelineState;

    /** Questions to display (when state === 'questions') */
    questions?: DynamicQuestion[];

    /** Question bundle with progressive disclosure */
    questionsBundle?: QuestionBundle;

    /**
     * Review context for the 3-step UI (always safe, no raw dictation).
     * Used to display "Erkannt" and applied defaults during the Review step.
     */
    review?: V10ReviewContext;

    /** Final output (when state === 'output') */
    output?: {
        /** Full rendered text (from SSOT renderer) */
        fullText: string;
        /** Billing codes (global, derived from perInstance) */
        billingCodes: string[];
        /** Per-instance breakdown (SSOT for multi-treatment) */
        perInstance: Record<string, {
            instanceId: string;
            teeth: string[];
            text: string;
            billingRefs: string[];
            chips: string[];
        }>;
        /** Composed sections (KZV-style documentation) */
        sections?: Array<{
            id: 'dokumentation' | 'abrechnung' | 'mkv' | 'hinweise';
            label: string;
            content: string;
        }>;
        /** @deprecated Use perInstance instead */
        perTooth?: Array<{
            tooth: string;
            text: string;
            billingCodes: string[];
        }>;
    };

    /** Error message (when state === 'error') */
    error?: string;

    /** Pipeline metadata */
    meta: V10PipelineMeta;

    /** Trace info (DEV only) */
    trace?: V10PipelineTrace;
}

// ═══════════════════════════════════════════════════════════════
// REVIEW CONTEXT (UI)
// ═══════════════════════════════════════════════════════════════

/**
 * Safe, UI-facing summary for the Review step.
 * - No raw dictation strings (PII risk)
 * - Per-instance and deterministic
 */
export interface V10ReviewContext {
    instances: Array<{
        instanceId: string;
        treatmentId: string;
        teeth: string[];
        tooth?: string;
        /** Settings-driven standard chips (canonical IDs), used for UI "Standards" summary */
        standardChipIds: string[];
        extractedSummary: {
            tooth: string | null;
            surfaces: string[];
            diagnosis: string | null;
        };
        facts: {
            toothRegion?: TreatmentFacts['toothRegion'];
            surfaces?: TreatmentFacts['surfaces'];
            surfaceSource?: TreatmentFacts['surfaceSource'];
            cariesDepth?: TreatmentFacts['cariesDepth'];
            anesthesia?: TreatmentFacts['anesthesia'];
            anesthesiaAmbiguous?: TreatmentFacts['anesthesiaAmbiguous'];
            kofferdamUsed?: boolean;
            kofferdamMentioned?: TreatmentFacts['kofferdamMentioned'];
            capping?: TreatmentFacts['capping'];
            pulpaOpened?: TreatmentFacts['pulpaOpened'];
            materialMentioned?: TreatmentFacts['materialMentioned'];
            material?: TreatmentFacts['material'];
            render?: TreatmentFacts['render'];
            insuranceType?: TreatmentFacts['insuranceType'];
            mkvPresent?: TreatmentFacts['mkvPresent'];
            nurKasse?: TreatmentFacts['nurKasse'];
            mehrkostenMentioned?: TreatmentFacts['mehrkostenMentioned'];
            mehrkostenConfirmed?: TreatmentFacts['mehrkostenConfirmed'];
            mkvJustification?: TreatmentFacts['mkvJustification'];
            endo?: TreatmentFacts['endo'];
        };
        /** UI-facing provenance labels for displayed fact pills */
        factSources?: Record<string, 'dictation' | 'settings' | 'askback' | 'manual'>;
    }>;
}

export type V10ClinicalObligationOutcome = 'done' | 'not_done' | 'deferred_next_visit';

export interface V10ClinicalObligationCheck {
    instanceId: string;
    tooth?: string;
    treatmentId: string;
    obligationId: string;
    askbackId: string;
    factPath: string;
    outcome: V10ClinicalObligationOutcome;
    reason: string;
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE META
// ═══════════════════════════════════════════════════════════════

export interface V10PipelineMeta {
    /** Engine version used */
    engineUsed: 'v10';

    /** Duration in ms per stage */
    durations?: {
        extraction?: number;
        facts?: number;
        engine?: number;
        compile?: number;
        render?: number;
        total?: number;
    };

    /** Fallback reason (if fallback occurred) */
    fallbackReason?: string;

    /** Number of instances processed */
    instanceCount: number;

    /** Whether multi-tooth mode was used */
    multiInstance: boolean;

    /** V7-compatible trace lines (DEV only) */
    traceLines?: string[];

    /** Which extraction engine was used */
    extractorEngine?: 'stub' | 'llm' | 'forced';

    /** Whether any testOnly overrides were applied */
    testOnlyApplied?: boolean;

    /** KB version/hash/source metadata */
    kbReleaseId?: string;
    kb?: {
        /** Medical KB metadata */
        medical?: {
            version: string;
            hash: string;
            source: 'json' | 'firestore' | 'firestore_fallback' | 'forced';
        };
        /** Treatment KB metadata (per treatmentId) */
        treatments?: Record<string, {
            version: string;
            hash: string;
            source: 'json' | 'firestore' | 'firestore_fallback' | 'forced';
        }>;
        /** Combinability KB metadata */
        combinability?: {
            version: string;
            hash: string;
            source: 'json' | 'firestore' | 'firestore_fallback' | 'forced';
        };
    };

    /** Provenance metadata for explainability (M15) */
    provenance?: {
        /** Per-askback provenance */
        askbacks: Array<{
            askbackId: string;
            ruleId: string;
            sourceRefs: SourceRef[];
            scope: 'session' | 'tooth';
            toothScope?: string;
            triggeredByFacts: string[];
        }>;
        /** Per-chip provenance */
        chips: Array<{
            chipId: string;
            emittedByRuleId: string;
            factSources: FactSource[];
            sourceRefs: SourceRef[];
            scope: 'session' | 'tooth';
            toothScope?: string;
            billingEligible: boolean;
        }>;
        /** Billing guard summary */
        billingGuard?: {
            allowed: number;
            blocked: number;
            blockedChipIds: string[];
        };
        /** Fact-level provenance (answers + settings) */
        factSources?: Array<{
            key: string;
            source: FactSource;
            origin: 'answer' | 'settings';
            scope: 'session' | 'tooth';
            toothScope?: string;
        }>;
    };

    /** Combinability check result (M16) */
    combinability?: {
        verdict: 'PASS' | 'WARN' | 'BLOCK';
        conflicts: Array<{
            ruleId: string;
            codesInvolved: string[];
            reason: string;
        }>;
        blockedCodes: string[];
        kbVersion: string;
        /** GP4: Dropped codes by autoResolve */
        droppedCodes?: string[];
        /** Warnings for coverage gaps or auto-resolve notes */
        warnings?: string[];
    };

    /** GP4: Billing completeness check result */
    billingCompleteness?: {
        isComplete: boolean;
        missing: Array<{ instanceId: string; reason: string; hint?: string }>;
        origins: Array<{ code: string; origin: string; ref: string }>;
    };

    /** Core billing validation (rule conflicts + documentation hints) */
    billingValidation?: BillingValidationResult;

    /** Core rule engine checks (RegressGuard) */
    regelPruefungen?: Array<{
        regelId: string;
        titel: string;
        severity: 'blocker' | 'warnung' | 'info';
        message: string;
        betroffeneCodes: string[];
        dokumentationBenötigt?: string[];
        autoFix?: {
            action: 'remove' | 'add' | 'replace';
            codes?: string[];
            text?: string;
        };
    }>;

    /** Session-level upsell hints (deterministic) */
    upsellHints?: Array<{
        type: 'mkv';
        segmentId: string;
        tooth?: string;
        message: string;
        requiredAskbacks: string[];
    }>;

    /** Deterministic output fingerprint for replay comparability */
    outputHash?: string;

    /** Centralized clinical obligation evaluation outcomes */
    clinicalObligations?: {
        checks: V10ClinicalObligationCheck[];
        summary: {
            done: number;
            notDone: number;
            deferredNextVisit: number;
        };
    };

    /** Optional summary of LLM reasoned extraction hints (read-only diagnostics) */
    reasonedExtraction?: {
        intentHints: number;
        factHints: number;
        explicitHints: number;
        inferredHints: number;
        forensicNotes: number;
        unresolved: number;
        appliedKeys: string[];
    };

    /** Optional status for second-stage LLM forensic composition */
    forensicComposer?: {
        enabled: boolean;
        applied: boolean;
        sectionCount: number;
        error?: string;
    };

    /** Debug payload for checks (DEV only) */
    debug?: {
        instances: Array<{
            instanceId: string;
            tooth?: string;
            cappingPerformed?: string;
            pulpaOpened?: boolean;
            nurKasse?: boolean;
            mkvPresent?: boolean;
            mehrkostenConfirmed?: boolean;
            chips: string[];
            chipEmitters?: Record<string, string>;
        }>;
    };
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE TRACE (DEV ONLY)
// ═══════════════════════════════════════════════════════════════

export interface V10InstanceTrace {
    tooth?: string;
    extractedSummary: {
        tooth: string | null;
        surfaces: string[];
        diagnosis: string | null;
    };
    facts: Partial<TreatmentFacts>;
    ruleHits: string[];
    askbacks: {
        required: string[];
        optional: string[];
    };
    chips: string[];
    renderedChipIds: string[];
}

export interface V10PipelineTrace {
    /** Trace per instance */
    instances: V10InstanceTrace[];

    /** Aggregated rule hits */
    allRuleHits: string[];

    /** Aggregated chips */
    allChips: string[];

    /** Final billing codes */
    finalBillingCodes: string[];
}

// ═══════════════════════════════════════════════════════════════
// BUNDLE TYPES (Multi-Instance / Multi-Treatment)
// ═══════════════════════════════════════════════════════════════

export type TreatmentId = 'fuellung' | 'endo' | string;
// InsuranceType is now defined at line 27 with BillingIntent
export type TextLength = 'kurz' | 'mittel' | 'lang';
export type BillingScope = 'SESSION' | 'TOOTH';

/** Input for a single instance within a segment */
export interface V10InstanceInput {
    /** Stable ID, e.g. "tooth:16" */
    instanceId: string;
    /** Tooth number, e.g. "16" */
    tooth?: string;
    /** Instance-specific dictation (or inherited from segment) */
    dictation?: string;
    /** Scoped answers, e.g. medical_ueberkappung::tooth:16 */
    answers?: Map<string, unknown> | Record<string, unknown>;
    /** Optional preanalysis hints scoped to this instance */
    preanalysisHints?: V10PreanalysisHints;
}

export interface V10PreanalysisEvidenceSpan {
    start: number;
    end: number;
    text: string;
}

export interface V10PreanalysisHints {
    source: 'intent_preanalysis';
    intentId: string;
    treatmentId: string;
    tooth?: string;
    confidence: number;
    phase?: string;
    step?: string;
    evidenceSpans: V10PreanalysisEvidenceSpan[];
    sharedFacts?: Record<string, unknown>;
    mentioned?: Record<string, unknown>;
}

/** Input for a treatment segment (one treatmentId, multiple instances) */
export interface V10TreatmentSegmentInput {
    /** Stable segment ID */
    segmentId: string;
    /** Treatment type */
    treatmentId: TreatmentId;
    /** Insurance type */
    insuranceType: InsuranceType;
    /** Text length preference */
    textLength: TextLength;
    /** Instances within this segment */
    instances: V10InstanceInput[];
    /** Segment-level dictation (inherited by instances if not overridden) */
    dictation?: string;
}

/** Input for a full bundle (multiple segments) */
export interface V10BundleInput {
    /** Full dictation (optional, may be split per segment) */
    dictation?: string;
    /** Segments to process in order */
    segments: V10TreatmentSegmentInput[];
    /** Global answers (applied to all segments) */
    globalAnswers?: Map<string, unknown> | Record<string, unknown>;
    /** Optional KB release pin used for all segment/instance runs */
    kbReleaseId?: string;
    /** Optional hard requirement propagated to each runV10 instance */
    requireLlmExtraction?: boolean;
}

/** Billing code with scope information */
export interface V10ScopedBillingCode {
    /** Billing code (e.g., BEMA_25, GOZ_2330) */
    code: string;
    /** Source instance identifier (required for provenance) */
    instanceId: string;
    /** Tooth if TOOTH-scoped */
    tooth?: string;
    /** Scope type */
    scope: BillingScope;
    /** Source chip ID */
    chipId?: string;
}

/** Output for a segment */
export interface V10SegmentOutput {
    segmentId: string;
    treatmentId: TreatmentId;
    text: string;
    billingCodes: V10ScopedBillingCode[];
    instanceOutputs: Array<{
        instanceId: string;
        tooth?: string;
        text: string;
        chips: string[];
    }>;
}

/** Bundle output */
export interface V10BundleOutput {
    /** Current state */
    state: V10PipelineState;

    /** Questions to display (when state === 'questions') */
    questions?: DynamicQuestion[];

    /** Final output (when state === 'output') */
    output?: {
        /** Full rendered text (all segments) */
        fullText: string;
        /** All billing codes with scope info */
        billingCodes: V10ScopedBillingCode[];
        /** Per-segment breakdown */
        segments?: V10SegmentOutput[];
    };

    /** Error message (when state === 'error') */
    error?: string;

    /** Pipeline metadata */
    meta: V10PipelineMeta;

    /** Trace info (DEV only) */
    trace?: V10PipelineTrace;
}
