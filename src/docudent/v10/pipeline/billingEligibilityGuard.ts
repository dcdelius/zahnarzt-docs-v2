/**
 * Billing Eligibility Guard (M15)
 *
 * Ensures that billing codes are only produced when their
 * underlying facts come from eligible sources:
 * - dictation: Extracted from the dictation text
 * - user: Explicitly confirmed by user answer
 * - settings: From practice settings/policy
 *
 * NOT eligible (blocked from billing):
 * - inferred: Inferred by rules without confirmation
 * - default: Default values
 */

import type { FactSource } from '../types';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ChipWithProvenance {
    chipId: string;
    emittedByRuleId: string;
    factSources: FactSource[];
    scope: 'session' | 'tooth';
    toothScope?: string;
    billingCodes?: string[];
}

export interface BillingGuardResult {
    /** Chips allowed to produce billing codes */
    allowed: ChipWithProvenance[];
    /** Chips blocked from producing billing codes (text-only allowed) */
    blocked: ChipWithProvenance[];
    /** Trace line for debugging */
    traceLine: string;
}

// ═══════════════════════════════════════════════════════════════
// ELIGIBLE SOURCES
// ═══════════════════════════════════════════════════════════════

/**
 * Sources that are eligible for billing
 * These represent "confirmed" facts that can justify billing codes.
 */
const BILLING_ELIGIBLE_SOURCES: ReadonlySet<FactSource> = new Set([
    'dictation',
    'user',
    'settings',
]);

/**
 * Check if a chip is billing-eligible based on its fact sources.
 *
 * A chip is billing-eligible if ALL of its fact sources are eligible.
 * If any source is 'inferred' or 'default', the chip is NOT billing-eligible.
 */
export function isChipBillingEligible(chip: ChipWithProvenance): boolean {
    if (!chip.factSources || chip.factSources.length === 0) {
        // No sources = not eligible (conservative default)
        return false;
    }

    return chip.factSources.every(source => BILLING_ELIGIBLE_SOURCES.has(source));
}

// ═══════════════════════════════════════════════════════════════
// GUARD IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════

/**
 * Apply the billing eligibility guard to a set of chips.
 *
 * Returns:
 * - allowed: Chips that can produce billing codes
 * - blocked: Chips that are blocked from billing (text-only allowed)
 * - traceLine: Summary for debugging
 */
export function applyBillingGuard(
    chips: ChipWithProvenance[]
): BillingGuardResult {
    const allowed: ChipWithProvenance[] = [];
    const blocked: ChipWithProvenance[] = [];

    for (const chip of chips) {
        if (isChipBillingEligible(chip)) {
            allowed.push(chip);
        } else {
            blocked.push(chip);
        }
    }

    // Sort for determinism
    allowed.sort((a, b) => a.chipId.localeCompare(b.chipId));
    blocked.sort((a, b) => a.chipId.localeCompare(b.chipId));

    const blockedIds = blocked.map(c => c.chipId).join(',');
    const traceLine = `billing_guard:blocked=${blocked.length};allowed=${allowed.length}${blocked.length > 0 ? `;blockedIds=${blockedIds}` : ''}`;

    return {
        allowed,
        blocked,
        traceLine,
    };
}

/**
 * Format a billing guard result for logging.
 */
export function formatBillingGuardResult(result: BillingGuardResult): string {
    const lines = [
        `Billing Guard: ${result.allowed.length} allowed, ${result.blocked.length} blocked`,
    ];

    if (result.blocked.length > 0) {
        lines.push('  Blocked chips:');
        for (const chip of result.blocked) {
            lines.push(`    - ${chip.chipId} (sources: ${chip.factSources.join(', ')})`);
        }
    }

    return lines.join('\n');
}
