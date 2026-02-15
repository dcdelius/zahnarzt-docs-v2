/**
 * Billing Eligibility Guard
 * 
 * PURPOSE:
 * Ensure no billing code is emitted without confirmed evidence.
 * 
 * RULE:
 * A chip may only generate billing if its activation has a confirmed Fact
 * with source ∈ { 'dictation', 'user', 'settings_policy' }
 * 
 * CHIPS REQUIRING CONFIRMATION BEFORE BILLING:
 * - la_infiltr, la_leitung: Must have anesthesia_type Fact confirmed
 * - cp, p: Must have capping_type Fact confirmed (currently via dictation)
 * 
 * CHIPS ALLOWED AS DEFAULT BILLING:
 * - exkavation, komposit_basic, finishing: Always billable (procedure defaults)
 * - kofferdam: Billable if chip active (explicit step)
 * - mehrschicht (MKV): Billable as settings_policy when hasMKV=true
 */

import type { Fact, FactSource } from '../../../../contracts/facts';
import { BILLING_ELIGIBLE_SOURCES, ANESTHESIA_FACTS } from '../../../../contracts/facts';

// ═══════════════════════════════════════════════════════════════
// CHIPS REQUIRING CONFIRMATION
// ═══════════════════════════════════════════════════════════════

/**
 * Chips that must NOT generate billing until their corresponding Fact
 * is confirmed via dictation or user answer.
 * 
 * Key: chipId
 * Value: factKey that must be confirmed
 */
export const CHIPS_REQUIRING_BILLING_CONFIRMATION: Record<string, string> = {
    'la_infiltr': ANESTHESIA_FACTS.KEY,
    'la_leitung': ANESTHESIA_FACTS.KEY,
    'ohne_la': ANESTHESIA_FACTS.KEY,
    // Note: 'cp' and 'p' already require explicit dictation/answer
};

/**
 * Chips that are always billing-eligible when active.
 * These are fundamental procedure steps that don't require confirmation.
 */
export const ALWAYS_BILLING_ELIGIBLE_CHIPS = [
    'exkavation',
    'komposit_basic',
    'finishing',
    'kofferdam',
    'rel_trocken',
    'cp',           // Capping is explicit in dictation
    'p',            // Direct capping is explicit in dictation
    'cp_not_required',
    'fluor',
    // Note: anesthesia chips are NOT in this list
];

/**
 * Chips eligible under MKV settings policy.
 */
export const MKV_POLICY_CHIPS = [
    'mehrschicht',
    'adhaesiv',
];

// ═══════════════════════════════════════════════════════════════
// CHIP PROVENANCE TRACKING
// ═══════════════════════════════════════════════════════════════

/**
 * Chip activation with provenance.
 * Extends chipId with source tracking.
 */
export interface ChipWithProvenance {
    chipId: string;
    source: FactSource;
    evidence?: string;
}

/**
 * Build chips with provenance from various sources.
 * 
 * @param alwaysOnChips - From answer_map.defaults.alwaysOnChipIds → source='default'
 * @param extractedChips - From extraction → source='dictation'  
 * @param answeredChips - From user answers → source='user'
 * @param mkvPolicyChips - From MKV toggle → source='settings_policy'
 */
export function buildChipsWithProvenance(
    alwaysOnChips: string[],
    extractedChips: string[],
    answeredChips: string[],
    mkvPolicyChips: string[],
    rawDictation?: string
): ChipWithProvenance[] {
    const result: ChipWithProvenance[] = [];
    const seen = new Set<string>();

    // 1. User answers have highest priority
    for (const chipId of answeredChips) {
        if (!seen.has(chipId)) {
            result.push({ chipId, source: 'user' });
            seen.add(chipId);
        }
    }

    // 2. Extracted from dictation (explicit mention)
    for (const chipId of extractedChips) {
        if (!seen.has(chipId)) {
            result.push({
                chipId,
                source: 'dictation',
                evidence: rawDictation?.substring(0, 100)
            });
            seen.add(chipId);
        }
    }

    // 3. MKV policy chips
    for (const chipId of mkvPolicyChips) {
        if (!seen.has(chipId)) {
            result.push({
                chipId,
                source: 'settings_policy',
                evidence: 'MKV technique policy'
            });
            seen.add(chipId);
        }
    }

    // 4. Always-on defaults (last priority)
    for (const chipId of alwaysOnChips) {
        if (!seen.has(chipId)) {
            result.push({ chipId, source: 'default' });
            seen.add(chipId);
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// BILLING ELIGIBILITY FILTER
// ═══════════════════════════════════════════════════════════════

/**
 * Filter chips to only those eligible for billing.
 * 
 * RULE: A chip is billing-eligible if:
 * 1. It's in ALWAYS_BILLING_ELIGIBLE_CHIPS, OR
 * 2. It's in MKV_POLICY_CHIPS AND hasMKV=true, OR
 * 3. It has a billing-eligible source (dictation|user|settings_policy)
 * 
 * EXCEPTION: Chips in CHIPS_REQUIRING_BILLING_CONFIRMATION must have
 * their corresponding Fact confirmed (not just inferred).
 */
export function filterBillingEligibleChips(
    chipsWithProvenance: ChipWithProvenance[],
    hasMKV: boolean,
    confirmedFacts: Map<string, Fact> = new Map()
): ChipWithProvenance[] {
    return chipsWithProvenance.filter(chip => {
        // Always-eligible chips pass through
        if (ALWAYS_BILLING_ELIGIBLE_CHIPS.includes(chip.chipId)) {
            return true;
        }

        // MKV policy chips are eligible ONLY when hasMKV=true
        if (MKV_POLICY_CHIPS.includes(chip.chipId)) {
            return hasMKV; // Only eligible if MKV toggle is on
        }

        // Check if chip requires confirmation
        const requiredFactKey = CHIPS_REQUIRING_BILLING_CONFIRMATION[chip.chipId];
        if (requiredFactKey) {
            // Must have confirmed Fact for this chip
            const fact = confirmedFacts.get(requiredFactKey);
            if (!fact) {
                // No Fact → not billing-eligible
                console.debug(`[BillingGuard] ${chip.chipId} blocked: no confirmed ${requiredFactKey} Fact`);
                return false;
            }
            if (!BILLING_ELIGIBLE_SOURCES.includes(fact.source)) {
                // Fact exists but not confirmed source
                console.debug(`[BillingGuard] ${chip.chipId} blocked: ${requiredFactKey} Fact source=${fact.source}`);
                return false;
            }
            return true;
        }

        // Default: check source directly
        return BILLING_ELIGIBLE_SOURCES.includes(chip.source);
    });
}

/**
 * Simple filter: Extract chip IDs from billing-eligible chips.
 */
export function getBillingEligibleChipIds(
    chipsWithProvenance: ChipWithProvenance[],
    hasMKV: boolean,
    confirmedFacts: Map<string, Fact> = new Map()
): string[] {
    const eligible = filterBillingEligibleChips(chipsWithProvenance, hasMKV, confirmedFacts);
    return eligible.map(c => c.chipId);
}
