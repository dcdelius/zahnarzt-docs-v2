/**
 * Facts Layer — Provenance-Tracked Clinical Truth
 * 
 * PURPOSE:
 * Unify chips, questions, settings, and dictation evidence under
 * a single semantic truth model with explicit provenance.
 * 
 * FACTS ARE TRUTH.
 * CHIPS ARE MECHANISMS.
 * 
 * A Fact is a clinical assertion with:
 * - key: what is being asserted (e.g., 'anesthesia_type', 'mkv_agreed')
 * - value: the asserted value
 * - source: where this truth came from (provenance)
 * - evidence: optional backing text or reference
 * 
 * BILLING ELIGIBILITY RULE:
 * A billing code may only be emitted if the corresponding Fact has
 * source ∈ { 'dictation', 'user', 'settings_policy' }
 * 
 * Facts with source='inferred' or source='default' are NOT billing-eligible
 * until confirmed by user interaction.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Source of a clinical fact.
 * Used to determine billing eligibility.
 * 
 * BILLING ELIGIBILITY MATRIX:
 * - dictation        → ✅ billable immediately
 * - user             → ✅ billable immediately  
 * - settings_policy  → ✅ billable (explicit intent to bill)
 * - settings_default → ⏳ billable ONLY after finalization
 * - user_finalized   → ✅ billable (upgraded from settings_default)
 * - inferred         → ❌ needs confirmation
 * - default          → ❌ not billable
 */
export type FactSource =
    | 'dictation'         // Explicitly stated in dictation (e.g., "Leitungsanästhesie")
    | 'user'              // Answered by user via question
    | 'settings_policy'   // Practice policy that INTENDS to bill (explicit)
    | 'settings_default'  // Practice standard for documentation (billable after finalization)
    | 'user_finalized'    // Upgraded from settings_default after case finalization
    | 'inferred'          // System inference from context (needs confirmation)
    | 'default';          // Default value, not confirmed

/**
 * A single clinical fact with provenance.
 */
export interface Fact {
    key: string;
    value: string | boolean | number | null;
    source: FactSource;
    evidence?: string;  // Text snippet that backs this fact
    chipId?: string;    // Optional: the chip this fact activates
}

/**
 * Collection of facts for a single case/encounter.
 */
export interface FactStore {
    facts: Map<string, Fact>;
    treatmentId: string;
    insuranceType: 'GKV' | 'PKV';
    hasMKV: boolean;
    finalized: boolean;  // True when case is finalized
}

// ═══════════════════════════════════════════════════════════════
// BILLING ELIGIBILITY
// ═══════════════════════════════════════════════════════════════

/**
 * Sources that are IMMEDIATELY eligible for billing (before finalization).
 */
export const IMMEDIATE_BILLING_SOURCES: FactSource[] = [
    'dictation',
    'user',
    'settings_policy',
    'user_finalized',
];

/**
 * Sources that become billing-eligible AFTER finalization.
 * Finalization upgrades settings_default → user_finalized.
 */
export const FINALIZATION_BILLABLE_SOURCES: FactSource[] = [
    'settings_default',
];

/**
 * All sources that can eventually be billing-eligible.
 */
export const BILLING_ELIGIBLE_SOURCES: FactSource[] = [
    ...IMMEDIATE_BILLING_SOURCES,
    ...FINALIZATION_BILLABLE_SOURCES,
];

/**
 * Check if a fact is eligible for billing.
 * @param finalized - If true, settings_default becomes eligible
 */
export function isBillingEligible(fact: Fact, finalized: boolean = false): boolean {
    if (IMMEDIATE_BILLING_SOURCES.includes(fact.source)) {
        return true;
    }
    if (finalized && FINALIZATION_BILLABLE_SOURCES.includes(fact.source)) {
        return true;
    }
    return false;
}

/**
 * Upgrade a fact's source after finalization.
 * settings_default → user_finalized
 */
export function upgradeFactForFinalization(fact: Fact): Fact {
    if (fact.source === 'settings_default') {
        return { ...fact, source: 'user_finalized' };
    }
    return fact;
}

/**
 * Finalize all facts in a store.
 * Upgrades settings_default → user_finalized.
 */
export function finalizeFactStore(store: FactStore): FactStore {
    const upgradedFacts = new Map<string, Fact>();
    for (const [key, fact] of store.facts) {
        upgradedFacts.set(key, upgradeFactForFinalization(fact));
    }
    return { ...store, facts: upgradedFacts, finalized: true };
}

/**
 * Check if a fact key requires confirmation before billing.
 * 
 * These are facts that, if inferred, should trigger a question
 * and wait for user confirmation before billing.
 */
export const FACTS_REQUIRING_CONFIRMATION_FOR_BILLING = [
    'anesthesia_type',      // Must specify infiltr|leitung|keine
    'capping_type',         // Must specify cp|p|none
] as const;

// ═══════════════════════════════════════════════════════════════
// FACT FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a fact from dictation evidence.
 */
export function factFromDictation(
    key: string,
    value: string | boolean | number | null,
    evidence: string,
    chipId?: string
): Fact {
    return { key, value, source: 'dictation', evidence, chipId };
}

/**
 * Create a fact from user answer.
 */
export function factFromUser(
    key: string,
    value: string | boolean | number | null,
    chipId?: string
): Fact {
    return { key, value, source: 'user', chipId };
}

/**
 * Create a fact from settings policy.
 * Use this for explicit practice policies that intend to bill.
 * Example: "MKV fillings always use mehrschicht+adhesiv technique"
 */
export function factFromSettingsPolicy(
    key: string,
    value: string | boolean | number | null,
    evidence: string,
    chipId?: string
): Fact {
    return { key, value, source: 'settings_policy', evidence, chipId };
}

/**
 * Create an inferred fact (NOT billing-eligible until confirmed).
 */
export function factInferred(
    key: string,
    value: string | boolean | number | null,
    evidence: string,
    chipId?: string
): Fact {
    return { key, value, source: 'inferred', evidence, chipId };
}

/**
 * Create a default fact (NOT billing-eligible).
 */
export function factDefault(
    key: string,
    value: string | boolean | number | null,
    chipId?: string
): Fact {
    return { key, value, source: 'default', chipId };
}

/**
 * Create a fact from practice/treatment-level standard settings.
 * These are documentation standards that become billing-eligible after finalization.
 * 
 * Use this for:
 * - Kofferdam (standard isolation method)
 * - Politur (finishing standard)
 * - Aufklärung (patient education standard)
 * - Spülprotokoll (endo standard)
 * 
 * NOT for MKV technique (use settings_policy for explicit billing intent).
 */
export function factFromSettingsDefault(
    key: string,
    value: string | boolean | number | null,
    evidence?: string,
    chipId?: string
): Fact {
    return { key, value, source: 'settings_default', evidence, chipId };
}

// ═══════════════════════════════════════════════════════════════
// ANESTHESIA FACT HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Anesthesia fact keys and their chip mappings.
 */
export const ANESTHESIA_FACTS = {
    KEY: 'anesthesia_type',
    VALUES: {
        INFILTRATION: 'infiltr',
        CONDUCTION: 'leitung',
        NONE: 'keine',
    },
    CHIP_MAP: {
        infiltr: 'la_infiltr',
        leitung: 'la_leitung',
        keine: 'ohne_la',
    } as const,
} as const;

/**
 * Check if anesthesia fact is billing-eligible.
 */
export function isAnesthesiaBillingEligible(fact: Fact | undefined): boolean {
    if (!fact) return false;
    if (fact.key !== ANESTHESIA_FACTS.KEY) return false;
    return isBillingEligible(fact);
}

// ═══════════════════════════════════════════════════════════════
// MKV FACT HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * MKV fact keys.
 */
export const MKV_FACTS = {
    VEREINBARUNG: 'mkv_vereinbarung',
    BETRAG: 'mkv_betrag',
    TECHNIQUE: 'mkv_technique',
} as const;

/**
 * Create MKV technique fact as settings policy.
 * This is the explicit policy: "MKV fillings use mehrschicht+adhesiv"
 */
export function createMkvTechniquePolicyFact(): Fact {
    return factFromSettingsPolicy(
        MKV_FACTS.TECHNIQUE,
        'mehrschicht_adhaesiv',
        'Practice policy: MKV fillings include Mehrschicht+Adhäsiv technique (GOZ 2197)',
        'mehrschicht'
    );
}
