/**
 * billingRefNormalization.ts — BillingRef ID Normalization Layer
 * 
 * Ensures consistent lookup of billing codes across different ID formats.
 * Primary use case: BEL_II_XXXX → BEL_XXXX normalization.
 * 
 * Mismatch Analysis (G25):
 * - Code uses: BEL_II_XXXX (e.g., BEL_II_8010)
 * - Catalog has: BEL_XXXX (e.g., BEL_8010)
 * 
 * This module provides:
 * 1. normalizeBillingRefId() — canonical ID conversion
 * 2. BEL_II_ALIAS_MAP — explicit alias mappings
 * 3. lookupBillingRef() — unified lookup with normalization
 */

// ═══════════════════════════════════════════════════════════════
// ALIAS MAP (Explicit mappings for edge cases)
// ═══════════════════════════════════════════════════════════════

export const BEL_II_ALIAS_MAP: Record<string, string> = {
    // Pattern: BEL_II_XXXX → BEL_XXXX (catalog ID)
    'BEL_II_0010': 'BEL_0010',
    'BEL_II_0120': 'BEL_0120',
    'BEL_II_1220': 'BEL_1220',
    'BEL_II_2031': 'BEL_2031',
    'BEL_II_2120': 'BEL_2120',
    'BEL_II_3010': 'BEL_3010',
    'BEL_II_8010': 'BEL_8010',
    'BEL_II_8022': 'BEL_8022',
    'BEL_II_8023': 'BEL_8023',
    'BEL_II_8025': 'BEL_8025',
    'BEL_II_8027': 'BEL_8027',
    'BEL_II_8030': 'BEL_8030',
    'BEL_II_8040': 'BEL_8040',
    'BEL_II_8070': 'BEL_8070',
};

// Reverse map for display purposes
export const BEL_CANONICAL_TO_DISPLAY: Record<string, string> = Object.fromEntries(
    Object.entries(BEL_II_ALIAS_MAP).map(([display, canonical]) => [canonical, display])
);

// ═══════════════════════════════════════════════════════════════
// NORMALIZATION FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Normalizes a billing reference ID to its canonical form for catalog lookup.
 * 
 * Normalization rules:
 * 1. BEL_II_XXXX → BEL_XXXX (remove "II_" portion)
 * 2. BEMA_41 → BEMA_41a (alias for legacy code)
 * 3. All other codes: pass through unchanged
 * 
 * @param refId - The billing reference ID to normalize
 * @returns Normalized (canonical) ID for catalog lookup
 */
export function normalizeBillingRefId(refId: string): string {
    if (!refId) return refId;

    // Check explicit alias map first
    if (BEL_II_ALIAS_MAP[refId]) {
        return BEL_II_ALIAS_MAP[refId];
    }

    // Pattern-based normalization: BEL_II_XXXX → BEL_XXXX
    if (refId.startsWith('BEL_II_')) {
        return refId.replace('BEL_II_', 'BEL_');
    }

    // BEMA alias: 41 → 41a
    if (refId === 'BEMA_41') {
        return 'BEMA_41a';
    }

    // GOZ aliases: ensure leading zeros
    if (refId.startsWith('GOZ_') && !refId.match(/^GOZ_\d{4}$/)) {
        // GOZ_1 → PHANTOM_REMOVED, PHANTOM_REMOVED → GOZ_0090
        const numPart = refId.replace('GOZ_', '');
        if (/^\d+$/.test(numPart) && numPart.length < 4) {
            return `GOZ_${numPart.padStart(4, '0')}`;
        }
    }

    return refId;
}

/**
 * Gets the display form of a billing reference (inverse of normalization).
 * Used for UI rendering where the original format is expected.
 */
export function getBillingRefDisplayId(canonicalId: string): string {
    return BEL_CANONICAL_TO_DISPLAY[canonicalId] || canonicalId;
}

/**
 * Extracts the billing system from a reference ID.
 */
export function getBillingSystem(refId: string): 'BEMA' | 'GOZ' | 'GOÄ' | 'BEL' | 'BEL_II' | 'FZ' | 'UNKNOWN' {
    if (refId.startsWith('BEMA_')) return 'BEMA';
    if (refId.startsWith('GOZ_')) return 'GOZ';
    if (refId.startsWith('GOÄ_')) return 'GOÄ';
    if (refId.startsWith('BEL_II_')) return 'BEL_II'; // Before BEL_ check
    if (refId.startsWith('BEL_')) return 'BEL';
    if (refId.startsWith('FZ_')) return 'FZ';
    return 'UNKNOWN';
}

/**
 * Validates whether a billing ref ID follows expected format.
 */
export function isValidBillingRefFormat(refId: string): boolean {
    const patterns = [
        /^BEMA_\w+$/,
        /^GOZ_\d{4}$/,
        /^GOÄ_\d+$/,
        /^BEL_II_\d{4}$/,
        /^BEL_\d{4}$/,
        /^FZ_[\d.]+$/,
    ];
    return patterns.some(p => p.test(refId));
}

// ═══════════════════════════════════════════════════════════════
// CATALOG INTEGRATION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Returns the catalog file name for a given billing system.
 */
export function getCatalogFileForSystem(system: ReturnType<typeof getBillingSystem>): string | null {
    const catalogMap: Record<string, string> = {
        'BEMA': 'bema.json',
        'GOZ': 'goz.json',
        'GOÄ': 'goa.json',
        'BEL': 'bel2_2022.json',
        'BEL_II': 'bel2_2022.json', // Same catalog, different ID format
        'FZ': 'festzuschuesse.json',
    };
    return catalogMap[system] || null;
}
