/**
 * Billing Scope Resolver (P14 MF1)
 * 
 * Resolves billing code scope from DB rules (comment_rules_v1.json)
 * instead of hardcoded tables.
 * 
 * Scope determines how billing codes are aggregated in multi-treatment:
 * - TOOTH: duplicates allowed if tooth differs
 * - SESSION: dedupe per session (first wins)
 * - JAW: dedupe per jaw (Kiefer)
 * - CASE: dedupe per treatment case (Behandlung)
 * - UNKNOWN: no DB scope found, conservative handling
 */

import commentRules from '../rules/comment_rules_v1.json';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Normalized billing scope (English).
 * Extended from the original P14 types to include all DB-backed scopes.
 */
export type BillingScopeNormalized = 'TOOTH' | 'SESSION' | 'JAW' | 'CASE' | 'UNKNOWN';

/**
 * German scope terms as found in comment_rules_v1.json payload.scope
 */
type GermanScope = 'Zahn' | 'Sitzung' | 'Kiefer' | 'Behandlung';

/**
 * Rule structure from comment_rules_v1.json
 */
interface CommentRule {
    ruleId: string;
    system: string;
    codePattern: string;
    payload?: {
        scope?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

interface CommentRulesFile {
    meta: { version: string; totalRules: number };
    rules: CommentRule[];
}

// ═══════════════════════════════════════════════════════════════
// NORMALIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Map German scope terms to normalized English.
 */
const SCOPE_NORMALIZATION: Record<GermanScope, BillingScopeNormalized> = {
    'Zahn': 'TOOTH',
    'Sitzung': 'SESSION',
    'Kiefer': 'JAW',
    'Behandlung': 'CASE',
};

/**
 * Normalize German scope to English.
 */
function normalizeScope(germanScope: string): BillingScopeNormalized {
    const normalized = SCOPE_NORMALIZATION[germanScope as GermanScope];
    return normalized || 'UNKNOWN';
}

// ═══════════════════════════════════════════════════════════════
// SCOPE CACHE (built from DB at module load)
// ═══════════════════════════════════════════════════════════════

/**
 * Cache: code pattern -> scope
 * Built once at module load from comment_rules_v1.json
 */
const scopeCache: Map<string, BillingScopeNormalized> = new Map();

/**
 * Build the scope cache from DB rules.
 * Called once at module initialization.
 */
function buildScopeCache(): void {
    const rules = (commentRules as CommentRulesFile).rules || [];

    for (const rule of rules) {
        const scope = rule.payload?.scope;
        if (scope && typeof scope === 'string') {
            const normalized = normalizeScope(scope);
            if (normalized !== 'UNKNOWN') {
                // Store with the codePattern as key
                scopeCache.set(rule.codePattern, normalized);

                // Also store with SYSTEM_CODE format (e.g., BEMA_13a)
                // The codePattern may already be in this format
                if (!rule.codePattern.includes('_')) {
                    // If codePattern is just a number, add system prefix
                    scopeCache.set(`${rule.system}_${rule.codePattern}`, normalized);
                }
            }
        }
    }
}

// Initialize cache at module load
buildScopeCache();

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Get billing scope for a code from DB rules.
 * 
 * @param code - Billing code (e.g., 'BEMA_13c', 'GOZ_2060', 'BEL_8060')
 * @returns Normalized scope or 'UNKNOWN' if not found in DB
 * 
 * Lookup order:
 * 1. Exact match (BEMA_13c)
 * 2. Base code without suffix (BEMA_13)
 * 3. Pattern match (prefix-based)
 */
export function getBillingScope(code: string): BillingScopeNormalized {
    // 1. Exact match
    if (scopeCache.has(code)) {
        return scopeCache.get(code)!;
    }

    // 2. Try without letter suffix (BEMA_13c → BEMA_13)
    const baseCode = code.replace(/[a-zA-Z]$/, '');
    if (scopeCache.has(baseCode)) {
        return scopeCache.get(baseCode)!;
    }

    // 3. Try system_number pattern (for 4-digit GOZ codes like GOZ_2060)
    // Pattern: Look for any code that starts with same prefix
    const prefix = code.split('_')[0]; // BEMA, GOZ, BEL, etc.
    const number = code.split('_')[1]?.replace(/[a-zA-Z]$/, '');
    if (prefix && number) {
        const altKey = `${prefix}_${number}`;
        if (scopeCache.has(altKey)) {
            return scopeCache.get(altKey)!;
        }
    }

    // 4. Not found in DB
    return 'UNKNOWN';
}

/**
 * Check if a code has scope data in the DB.
 */
export function hasScopeInDB(code: string): boolean {
    return getBillingScope(code) !== 'UNKNOWN';
}

/**
 * Get all codes with a specific scope.
 * Useful for debugging and gate tests.
 */
export function getCodesByScope(scope: BillingScopeNormalized): string[] {
    const codes: string[] = [];
    for (const [code, s] of scopeCache.entries()) {
        if (s === scope) {
            codes.push(code);
        }
    }
    return codes;
}

/**
 * Get scope cache stats for debugging.
 */
export function getScopeCacheStats(): {
    total: number;
    byScope: Record<BillingScopeNormalized, number>;
} {
    const byScope: Record<BillingScopeNormalized, number> = {
        TOOTH: 0,
        SESSION: 0,
        JAW: 0,
        CASE: 0,
        UNKNOWN: 0,
    };

    for (const scope of scopeCache.values()) {
        byScope[scope]++;
    }

    return {
        total: scopeCache.size,
        byScope,
    };
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK TABLE (TEMP - to be removed when DB coverage complete)
// ═══════════════════════════════════════════════════════════════

/**
 * TEMP: Fallback table for codes not yet in DB.
 * This should be removed once DB coverage is complete.
 * Mark with TEMP flag so it's clear this is transitional.
 */
const TEMP_FALLBACK_SCOPE_TABLE: Record<string, BillingScopeNormalized> = {
    // Filling codes are per-tooth
    'BEMA_13a': 'TOOTH',
    'BEMA_13b': 'TOOTH',
    'BEMA_13c': 'TOOTH',
    'BEMA_13d': 'TOOTH',
    'BEMA_13e': 'TOOTH',
    'BEMA_13f': 'TOOTH',
    'BEMA_13g': 'TOOTH',
    'BEMA_13h': 'TOOTH',
    'GOZ_2060': 'TOOTH',
    'GOZ_2080': 'TOOTH',
    'GOZ_2100': 'TOOTH',
    'GOZ_2120': 'TOOTH',
    'GOZ_2197': 'TOOTH',
    // Endo codes are per-tooth
    'BEMA_32': 'TOOTH',
    'BEMA_35': 'TOOTH',
    'GOZ_2360': 'TOOTH',
    'GOZ_2380': 'TOOTH',
    'GOZ_2390': 'TOOTH',
    'GOZ_2400': 'TOOTH',
    'GOZ_2410': 'TOOTH',
    'GOZ_2440': 'TOOTH',
    // Anesthesia is typically per-session
    'BEMA_12': 'SESSION',
    'BEMA_40': 'SESSION',
    'BEMA_41a': 'SESSION',
    'BEMA_41b': 'SESSION',
    'GOZ_0080': 'SESSION',
    'GOZ_0090': 'SESSION',
    // X-rays per session
    'BEMA_1': 'SESSION',
    'BEMA_925': 'SESSION',
    'GOZ_5000': 'SESSION',
    'GOZ_5002': 'SESSION',
};

/**
 * Get billing scope with fallback to TEMP table.
 * Use this during transition period until DB coverage is complete.
 * 
 * @param code - Billing code
 * @param useFallback - If true, use TEMP fallback table when DB has no data
 */
export function getBillingScopeWithFallback(
    code: string,
    useFallback: boolean = true
): BillingScopeNormalized {
    // First try DB
    const dbScope = getBillingScope(code);
    if (dbScope !== 'UNKNOWN') {
        return dbScope;
    }

    // Then try fallback if enabled
    if (useFallback) {
        const fallbackScope = TEMP_FALLBACK_SCOPE_TABLE[code];
        if (fallbackScope) {
            return fallbackScope;
        }

        // Try base code in fallback
        const baseCode = code.replace(/[a-zA-Z]$/, '');
        if (TEMP_FALLBACK_SCOPE_TABLE[baseCode]) {
            return TEMP_FALLBACK_SCOPE_TABLE[baseCode];
        }
    }

    return 'UNKNOWN';
}

export default {
    getBillingScope,
    getBillingScopeWithFallback,
    hasScopeInDB,
    getCodesByScope,
    getScopeCacheStats,
};
