/**
 * Combinability KB Loader
 *
 * Loads and provides access to the combinability knowledge base.
 */

import type {
    CombinabilityKb,
    CombinabilityKbMeta,
    CombinabilityRule,
} from './schema.v1';

// Import the compiled KB
import combinabilityKbData from './combinability_kb.v1.json';

// ═══════════════════════════════════════════════════════════════════════════════
// KB SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

let cachedKb: CombinabilityKb | null = null;

/**
 * Load the combinability KB (cached).
 */
export function loadCombinabilityKb(): CombinabilityKb {
    if (!cachedKb) {
        cachedKb = combinabilityKbData as CombinabilityKb;
    }
    return cachedKb;
}

/**
 * Get KB metadata.
 */
export function getCombinabilityMeta(): CombinabilityKbMeta {
    return loadCombinabilityKb()._meta;
}

/**
 * Get all rules.
 */
export function getCombinabilityRules(): CombinabilityRule[] {
    return loadCombinabilityKb().rules;
}

/**
 * Get rules that apply to specific codes.
 */
export function getRulesForCodes(codes: string[]): CombinabilityRule[] {
    const kb = loadCombinabilityKb();
    return kb.rules.filter(rule =>
        rule.betrifft.some(code => codes.includes(code))
    );
}

/**
 * Get only ausschluss (exclusion) rules that can BLOCK.
 */
export function getBlockingRules(): CombinabilityRule[] {
    const kb = loadCombinabilityKb();
    return kb.rules.filter(
        rule => rule.typ === 'ausschluss' && rule.schweregrad === 'regress'
    );
}

// Export types
export type { CombinabilityKb, CombinabilityKbMeta, CombinabilityRule } from './schema.v1';
