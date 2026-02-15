/**
 * Practice Standards — Default-First, Low-Click Standard System
 * 
 * PURPOSE:
 * Define practice-wide and treatment-specific standards that flow
 * automatically into documentation and billing without extra clicks.
 * 
 * DESIGN PRINCIPLES:
 * - DEFAULTS SHOULD FLOW.
 * - QUESTIONS SHOULD BE EXCEPTIONS.
 * - FINALIZATION CONFIRMS STANDARDS.
 * 
 * THREE STANDARD LAYERS:
 * A) Practice Global Standards — Apply to ALL treatments
 * B) Treatment-Specific Standards — Apply to specific treatmentId
 * C) Dictation/Inference — Created from case-specific evidence
 */

import type { Fact } from './facts';
import { factFromSettingsDefault, factFromSettingsPolicy } from './facts';

// ═══════════════════════════════════════════════════════════════
// STANDARD CONFIGURATION TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Billing intent for a standard.
 * - 'none': Documentation only, no billing code
 * - 'documentation_only': Creates text, no billing code
 * - 'billable': Creates text AND billing code
 */
export type BillingIntent = 'none' | 'documentation_only' | 'billable';

/**
 * A single practice standard definition.
 */
export interface StandardDefinition {
    /** Unique fact key for this standard */
    factKey: string;

    /** Default value for this standard */
    defaultValue: string | boolean | number;

    /** Human-readable label (German) */
    label: string;

    /** Billing intent */
    billingIntent: BillingIntent;

    /** Whether this can be reversed per case */
    reversible: boolean;

    /** Optional chip ID this activates */
    chipId?: string;

    /** Documentation text template (if applicable) */
    textTemplate?: string;
}

/**
 * Practice-level global settings.
 */
export interface PracticeDefaults {
    /** Standards applying to all treatments */
    globalStandards: StandardDefinition[];

    /** Treatment-specific standards */
    treatmentDefaults: Record<string, StandardDefinition[]>;
}

// ═══════════════════════════════════════════════════════════════
// PRACTICE GLOBAL STANDARDS (Layer A)
// ═══════════════════════════════════════════════════════════════

/**
 * Standards that apply to ALL treatments.
 * These are documentation steps that are always performed.
 */
export const PRACTICE_GLOBAL_STANDARDS: StandardDefinition[] = [
    {
        factKey: 'aufklaerung',
        defaultValue: true,
        label: 'Aufklärung erfolgt',
        billingIntent: 'documentation_only',
        reversible: true,
        textTemplate: 'Der Patient wurde über die Behandlung aufgeklärt.'
    },
    {
        factKey: 'nachsorge',
        defaultValue: true,
        label: 'Nachsorgehinweise gegeben',
        billingIntent: 'documentation_only',
        reversible: true,
        textTemplate: 'Nachsorgehinweise wurden erteilt.'
    },
    {
        factKey: 'bisskontrolle',
        defaultValue: true,
        label: 'Bisskontrolle durchgeführt',
        billingIntent: 'documentation_only',
        reversible: true,
        textTemplate: 'Okklusion geprüft.'
    },
];

// ═══════════════════════════════════════════════════════════════
// TREATMENT-SPECIFIC STANDARDS (Layer B)
// ═══════════════════════════════════════════════════════════════

/**
 * Füllung-specific standards.
 */
export const FUELLUNG_STANDARDS: StandardDefinition[] = [
    {
        factKey: 'isolation',
        defaultValue: 'kofferdam',
        label: 'Kofferdam standardmäßig',
        billingIntent: 'billable',
        reversible: true,
        chipId: 'kofferdam',
        textTemplate: 'Die Behandlung erfolgte unter Kofferdamisolierung.'
    },
    {
        factKey: 'exkavation',
        defaultValue: true,
        label: 'Exkavation bis sondenhart',
        billingIntent: 'billable',
        reversible: false, // Always done
        chipId: 'exkavation',
        textTemplate: 'Exkavation bis sondenhart.'
    },
    {
        factKey: 'finishing',
        defaultValue: true,
        label: 'Politur standardmäßig',
        billingIntent: 'billable',
        reversible: false, // Always done
        chipId: 'finishing',
        textTemplate: 'Die Füllung wurde ausgearbeitet und poliert.'
    },
];

/**
 * Füllung MKV-specific standards.
 * These apply ONLY when hasMKV=true.
 */
export const FUELLUNG_MKV_STANDARDS: StandardDefinition[] = [
    {
        factKey: 'mkv_technique',
        defaultValue: 'mehrschicht_adhaesiv',
        label: 'Mehrschichttechnik + Adhäsiv',
        billingIntent: 'billable',
        reversible: false, // MKV always uses this
        chipId: 'mehrschicht',
        textTemplate: 'Die Füllung wurde in Mehrschichttechnik gelegt.'
    },
];

/**
 * Endo-specific standards.
 */
export const ENDO_STANDARDS: StandardDefinition[] = [
    {
        factKey: 'isolation',
        defaultValue: 'kofferdam',
        label: 'Kofferdam obligatorisch',
        billingIntent: 'billable',
        reversible: false, // Endo always requires Kofferdam
        chipId: 'kofferdam',
        textTemplate: 'Die Behandlung erfolgte unter Kofferdamisolierung.'
    },
    {
        factKey: 'wl_bestimmung',
        defaultValue: 'required',
        label: 'Arbeitslängenbestimmung erforderlich',
        billingIntent: 'billable',
        reversible: false,
        textTemplate: 'Die Arbeitslänge wurde bestimmt.'
    },
    {
        factKey: 'spuelprotokoll',
        defaultValue: 'naocl_edta',
        label: 'Spülprotokoll Standard',
        billingIntent: 'documentation_only',
        reversible: true,
        textTemplate: 'Spülung mit NaOCl und EDTA.'
    },
];

// ═══════════════════════════════════════════════════════════════
// COMPLETE PRACTICE DEFAULTS
// ═══════════════════════════════════════════════════════════════

/**
 * Complete practice defaults configuration.
 */
export const PRACTICE_DEFAULTS: PracticeDefaults = {
    globalStandards: PRACTICE_GLOBAL_STANDARDS,
    treatmentDefaults: {
        fuellung: FUELLUNG_STANDARDS,
        endo: ENDO_STANDARDS,
    },
};

// ═══════════════════════════════════════════════════════════════
// FACT GENERATION FROM STANDARDS
// ═══════════════════════════════════════════════════════════════

/**
 * Create facts from practice global standards.
 * These are documentation standards that flow automatically.
 */
export function createFactsFromGlobalStandards(): Fact[] {
    return PRACTICE_GLOBAL_STANDARDS.map(std =>
        factFromSettingsDefault(
            std.factKey,
            std.defaultValue,
            `Practice standard: ${std.label}`,
            std.chipId
        )
    );
}

/**
 * Create facts from treatment-specific standards.
 */
export function createFactsFromTreatmentStandards(
    treatmentId: string,
    hasMKV: boolean = false
): Fact[] {
    const treatmentStandards = PRACTICE_DEFAULTS.treatmentDefaults[treatmentId] || [];

    // Base treatment facts
    const facts = treatmentStandards.map(std =>
        factFromSettingsDefault(
            std.factKey,
            std.defaultValue,
            `${treatmentId} standard: ${std.label}`,
            std.chipId
        )
    );

    // Add MKV-specific standards if applicable
    if (treatmentId === 'fuellung' && hasMKV) {
        const mkvFacts = FUELLUNG_MKV_STANDARDS.map(std =>
            // MKV technique is settings_policy (explicit billing intent)
            factFromSettingsPolicy(
                std.factKey,
                std.defaultValue,
                `MKV policy: ${std.label}`,
                std.chipId
            )
        );
        facts.push(...mkvFacts);
    }

    return facts;
}

/**
 * Create all default facts for a case.
 * Combines global + treatment-specific standards.
 */
export function createDefaultFacts(
    treatmentId: string,
    hasMKV: boolean = false
): Fact[] {
    return [
        ...createFactsFromGlobalStandards(),
        ...createFactsFromTreatmentStandards(treatmentId, hasMKV),
    ];
}

// ═══════════════════════════════════════════════════════════════
// STANDARD LOOKUP
// ═══════════════════════════════════════════════════════════════

/**
 * Get standard definition by fact key.
 */
export function getStandardDefinition(
    factKey: string,
    treatmentId?: string
): StandardDefinition | undefined {
    // Check global first
    const global = PRACTICE_GLOBAL_STANDARDS.find(s => s.factKey === factKey);
    if (global) return global;

    // Check treatment-specific
    if (treatmentId) {
        const treatment = PRACTICE_DEFAULTS.treatmentDefaults[treatmentId] || [];
        const found = treatment.find(s => s.factKey === factKey);
        if (found) return found;

        // Check MKV standards for fuellung
        if (treatmentId === 'fuellung') {
            const mkv = FUELLUNG_MKV_STANDARDS.find(s => s.factKey === factKey);
            if (mkv) return mkv;
        }
    }

    return undefined;
}

/**
 * Get text template for a standard.
 */
export function getStandardTextTemplate(
    factKey: string,
    treatmentId?: string
): string | undefined {
    const std = getStandardDefinition(factKey, treatmentId);
    return std?.textTemplate;
}
