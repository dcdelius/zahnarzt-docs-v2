/**
 * M18: Treatment Pack Types
 *
 * Defines the TreatmentPack interface for modular treatment registration.
 * Each pack bundles KB access, clinical scenarios, and combinability goldens.
 */

import type { TreatmentKb } from '../kb/treatment/types';
import type { ClinicalScenario } from '../qa/runClinicalSuite';
import type { BuildFactsParams, TreatmentFacts } from '../facts';

// ═══════════════════════════════════════════════════════════════
// COMBINABILITY GOLDEN
// ═══════════════════════════════════════════════════════════════

/**
 * A golden test case for combinability checking.
 */
export interface CombinabilityGolden {
    /** Unique case ID */
    id: string;
    /** Description of the case */
    description: string;
    /** Billing codes to check */
    codes: string[];
    /** Expected verdict */
    expectedVerdict: 'PASS' | 'WARN' | 'BLOCK';
    /** Expected rule ID if BLOCK/WARN */
    expectedRuleId?: string;
    /** Scope for the check */
    scope?: 'SESSION' | 'TOOTH' | 'CANAL';
}

// ═══════════════════════════════════════════════════════════════
// OPTIONAL PACK EXTENSIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Optional medical KB overlay for treatment-specific extensions.
 */
export interface MedicalKbOverlay {
    /** Additional askback triggers */
    additionalTriggers?: Array<{
        keyword: string;
        triggersAskback: string;
    }>;
    /** Treatment-specific rules */
    rules?: Array<{
        id: string;
        condition: string;
        action: string;
    }>;
}

/**
 * Extraction hints for the extractor module.
 */
export interface ExtractionHints {
    /** Keywords that indicate this treatment type */
    treatmentKeywords: string[];
    /** Regex patterns for key entities (e.g., tooth, surfaces) */
    entityPatterns?: Record<string, RegExp>;
}

/**
 * M20: Coverage configuration for a treatment pack.
 */
export interface CoverageConfig {
    /**
     * Billing chip IDs that are explicitly allowed to be uncovered.
     * Must have a comment/justification in the pack code.
     */
    uncoveredBillingChipIds?: string[];
}

// ═══════════════════════════════════════════════════════════════
// M44: UI CONTRACT TYPES
// ═══════════════════════════════════════════════════════════════

/** Chip control mode: toggle (on/off) or param (select value) */
export type ChipControlMode = 'toggle' | 'param';

/** Option for param-type chip controls */
export interface ChipControlOption {
    value: string;
    label: string;
}

/** UI specification for a single chip control */
export interface ChipControlSpec {
    /** Chip ID (or virtual control ID for param groups) */
    chipId: string;

    /** Control mode */
    mode: ChipControlMode;

    /** Display label */
    label: string;

    /** For param mode: list of options (required if mode==='param') */
    options?: ChipControlOption[];

    /** Grouping hint for UI organization */
    group?: 'relevant' | 'optional' | 'advanced';

    /** If true, always show in UI even if chip absent */
    pin?: boolean;

    /** For param mode: maps option value → chip ID (for multi-chip params) */
    chipMapping?: Record<string, string>;
}

/** Settings schema for practice and user levels */
export interface SettingsSchemaV1 {
    practice: Array<{
        key: string;
        label: string;
        type: 'enum' | 'boolean';
        options?: ChipControlOption[];
        mapsToAskbackId?: string;
    }>;
    user: Array<{
        key: string;
        label: string;
        type: 'enum' | 'boolean' | 'string';
        options?: ChipControlOption[];
        mapsToAskbackId?: string;
    }>;
}

/** Askback policy defining critical vs skippable askbacks */
export interface AskbackPolicyV1 {
    /** Askbacks that can NEVER be skipped even if settings exist */
    criticalAskbacks: string[];

    /** Askbacks that MAY be skipped if settings provide value */
    skippableAskbacks?: string[];
}

/** Complete UI contract for a treatment pack */
export interface PackUiContractV1 {
    /** Chip control specifications */
    chipControls: ChipControlSpec[];

    /** Settings schema */
    settingsSchema: SettingsSchemaV1;

    /** Askback policy */
    askbackPolicy: AskbackPolicyV1;

    /** Optional dictation hints for user */
    dictationHints?: string[];
}

// ═══════════════════════════════════════════════════════════════
// TREATMENT PACK INTERFACE
// ═══════════════════════════════════════════════════════════════

/**
 * TreatmentPack bundles all assets for a treatment type.
 *
 * This provides a single point of entry for:
 * - Treatment KB (unified.json)
 * - Clinical scenarios for testing
 * - Combinability goldens
 * - Optional extensions (medical overlay, extraction hints)
 * - UI Contract (M44)
 */
export interface TreatmentPack {
    /** Treatment identifier (must be unique) */
    readonly id: string;

    /** Pack version (semver) */
    readonly version: string;

    /** Optional pack metadata */
    readonly meta?: {
        label?: string;
        description?: string;
    };

    // === KB Access ===

    /**
     * Get the treatment KB (loads unified.json via provider).
     * @returns TreatmentKb or null if not available
     */
    getTreatmentKb(): TreatmentKb | null;

    // === Test Fixtures ===

    /**
     * Get golden clinical scenarios for M14/M15 harness.
     * @returns Array of clinical scenarios
     */
    getGoldenClinicalScenarios(): ClinicalScenario[];

    /**
     * Get combinability goldens (PASS/BLOCK cases).
     * @returns Array of combinability test cases
     */
    getCombinabilityGoldens(): CombinabilityGolden[];

    // === Optional Extensions ===

    /**
     * Optional medical KB overlay for treatment-specific extensions.
     */
    getMedicalKbOverlay?(): MedicalKbOverlay | null;

    /**
     * Optional extraction hints for the extractor.
     */
    getExtractionHints?(): ExtractionHints | null;

    // === Facts Mapping (Pack-Driven) ===

    /**
     * Build facts from extraction (pack-specific).
     * If omitted, V10 falls back to global facts builder.
     */
    buildFactsFromExtraction?(params: BuildFactsParams): TreatmentFacts;

    /**
     * Apply answers/settings to facts (pack-specific).
     * If omitted, V10 falls back to global answer->facts mapper.
     */
    applyAnswersToFacts?(
        facts: TreatmentFacts,
        answers: Map<string, unknown> | Record<string, unknown>
    ): TreatmentFacts;

    /**
     * M20: Optional coverage configuration.
     * Declares which billing chips are explicitly uncovered.
     */
    getCoverageConfig?(): CoverageConfig | null;

    // === M44: UI Contract ===

    /**
     * Get UI contract for pack-driven Review/Controls/Settings.
     * Required for all packs.
     */
    getUiContract(): PackUiContractV1;
}
