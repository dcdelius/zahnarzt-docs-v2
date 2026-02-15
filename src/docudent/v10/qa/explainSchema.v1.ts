/**
 * ExplainRun Report Schema v1
 *
 * Types for the deterministic "full circle" explanation report.
 * Every field must be populated - no null holes allowed.
 */

// ═══════════════════════════════════════════════════════════════════════════
// FACT SOURCES
// ═══════════════════════════════════════════════════════════════════════════

export type FactSource = 'dictation' | 'user' | 'settings' | 'inferred' | 'default';

export interface FactEntry {
    factKey: string;
    value: unknown;
    source: FactSource;
    confirmed: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// RULES
// ═══════════════════════════════════════════════════════════════════════════

export interface FiredRule {
    ruleId: string;
    ruleType: 'emit_chip' | 'require_askback' | 'set_default' | 'add_warning';
    scope: 'session' | 'tooth' | 'instance';
    toothNumber?: string;
    instanceId?: string;
    sourceRefs: string[];
    outcome: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ASKBACKS & QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface AskbackMapping {
    askbackId: string;
    questionId: string;
    questionLabel: string;
    required: boolean;
    answered: boolean;
    answer?: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════
// CHIPS
// ═══════════════════════════════════════════════════════════════════════════

export interface ChipEntry {
    chipId: string;
    scope: 'session' | 'tooth' | 'instance';
    toothNumber?: string;
    instanceId?: string;
    emittedByRule: string;
    factSources: FactSource[];
    billingEligible: boolean;
    blockedByGuard: boolean;
    guardReason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// BILLING
// ═══════════════════════════════════════════════════════════════════════════

export interface BillingCodeEntry {
    code: string;
    codeSystem: 'BEMA' | 'GOZ' | 'GOÄ' | 'BEL2';
    sourceChipId: string;
    billingRefField: string; // e.g., "GKV", "PKV", "MKV"
    scope: 'session' | 'tooth';
    toothNumber?: string;
}

export interface CombinabilityConflict {
    ruleId: string;
    codesInvolved: string[];
    scope: 'session' | 'tooth' | 'quadrant';
    toothNumber?: string;
    severity: 'warn' | 'block';
    reason: string;
    sourceRefs: string[];
}

export interface CombinabilityResult {
    verdict: 'pass' | 'warn' | 'block';
    conflicts: CombinabilityConflict[];
    warnings?: string[];
    checkedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEXT BLOCKS
// ═══════════════════════════════════════════════════════════════════════════

export interface TextBlock {
    blockIndex: number;
    sectionKey: string;
    text: string;
    sourceChipIds: string[];
    textLength: 'kurz' | 'mittel' | 'lang';
}

// ═══════════════════════════════════════════════════════════════════════════
// KB METADATA
// ═══════════════════════════════════════════════════════════════════════════

export interface KbMeta {
    source: string;
    version: string;
    hash: string;
}

export interface KbMetaCollection {
    medical: KbMeta;
    treatment: KbMeta;
    combinability: KbMeta;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTION SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

export interface ExtractionSummary {
    engine: 'stub' | 'llm' | 'forced';
    treatmentId: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    tooth?: string;
    surfaces?: string[];
    rawExtractKeys: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCE (for bundle)
// ═══════════════════════════════════════════════════════════════════════════

export interface InstanceReport {
    instanceId: string;
    toothNumber: string;
    chips: ChipEntry[];
    billingCodes: BillingCodeEntry[];
    textBlocks: TextBlock[];
}

// ═══════════════════════════════════════════════════════════════════════════
// FULL REPORT
// ═══════════════════════════════════════════════════════════════════════════

export interface ExplainRunReport {
    version: 'v1';
    generatedAt: string;
    stableHash: string;

    // Input summary
    input: {
        treatmentId: string;
        insuranceType: 'GKV' | 'PKV' | 'MKV';
        dictationPreview: string; // first 100 chars
        teethCount: number;
    };

    // Extraction
    extraction: ExtractionSummary;

    // Facts
    facts: FactEntry[];

    // Medical engine
    firedRules: FiredRule[];

    // Askbacks
    askbacks: AskbackMapping[];

    // Chips (all instances combined for single, per-instance for bundle)
    chips: ChipEntry[];

    // Billing
    billingCodes: BillingCodeEntry[];
    combinability: CombinabilityResult;

    // Output text
    textBlocks: TextBlock[];

    // KB metadata
    kbMeta: KbMetaCollection;

    // Instances (for bundle only)
    instances?: InstanceReport[];

    // Trace lines (existing)
    traceLines: Array<{ key: string; value: unknown }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface ExplainRunOptions {
    format?: 'json' | 'md' | 'both';
    includeTraceLines?: boolean;
}

export interface ExplainRunResult {
    reportJson: ExplainRunReport;
    reportMarkdown?: string;
    stableHash: string;
}
