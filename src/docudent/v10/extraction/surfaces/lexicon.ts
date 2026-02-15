/**
 * Surface Lexicon — Synonyms and Patterns for Surface Detection
 * 
 * SSOT for surface term mappings. No guessing for ambiguous terms.
 */

// ═══════════════════════════════════════════════════════════════
// CANONICAL SURFACE TYPE
// ═══════════════════════════════════════════════════════════════

export type CanonicalSurface = 'm' | 'o' | 'd' | 'b' | 'l';

export const ALL_CANONICAL_SURFACES: readonly CanonicalSurface[] = ['m', 'o', 'd', 'b', 'l'] as const;

// ═══════════════════════════════════════════════════════════════
// UNAMBIGUOUS MAPPINGS (can safely map to canonical)
// ═══════════════════════════════════════════════════════════════

/**
 * Terms that unambiguously map to a single canonical surface.
 * Key: lowercase term, Value: canonical surface
 */
export const UNAMBIGUOUS_TERMS: Record<string, CanonicalSurface> = {
    // Mesial
    'm': 'm',
    'mesial': 'm',
    'mesiall': 'm',

    // Okklusal
    'o': 'o',
    'okklusal': 'o',
    'okklusall': 'o',
    'occlusal': 'o',
    'okkl': 'o',
    'kaufläche': 'o',
    'kauffläche': 'o',
    'inzisal': 'o',
    'inzisall': 'o',
    'incisal': 'o',
    'incisall': 'o',

    // Distal  
    'd': 'd',
    'distal': 'd',
    'distall': 'd',

    // Bukkal (includes labial for anteriors)
    'b': 'b',
    'bukkal': 'b',
    'buccal': 'b',
    'bukk': 'b',
    'labial': 'b',  // labial → b (for anterior teeth)

    // Lingual (includes palatinal for upper jaw)
    'l': 'l',
    'lingual': 'l',
    'linguall': 'l',
    'palatinal': 'l',  // palatinal → l 
    'palat': 'l',
};

/**
 * Compound terms that unambiguously map to multiple surfaces.
 * Key: lowercase compound, Value: array of canonical surfaces
 */
export const UNAMBIGUOUS_COMPOUNDS: Record<string, CanonicalSurface[]> = {
    // 2-surface compounds
    'od': ['o', 'd'],
    'do': ['d', 'o'],
    'mo': ['m', 'o'],
    'om': ['o', 'm'],
    'md': ['m', 'd'],
    'dm': ['d', 'm'],
    'ob': ['o', 'b'],
    'bo': ['b', 'o'],
    'ol': ['o', 'l'],
    'lo': ['l', 'o'],
    'distookklusal': ['d', 'o'],
    'mesiookklusal': ['m', 'o'],
    'distalinzisal': ['d', 'o'],
    'distoinzisal': ['d', 'o'],
    'disto-inzisal': ['d', 'o'],
    'okkluso-distal': ['o', 'd'],
    'o-d': ['o', 'd'],
    'm-o': ['m', 'o'],
    'd-o': ['d', 'o'],

    // 3-surface compounds
    'mod': ['m', 'o', 'd'],
    'dom': ['d', 'o', 'm'],
    'omd': ['o', 'm', 'd'],
    'm-o-d': ['m', 'o', 'd'],
    'mesio-okkluso-distal': ['m', 'o', 'd'],
    'mesiookklusodistal': ['m', 'o', 'd'],

    // 4-surface compounds
    'modb': ['m', 'o', 'd', 'b'],
    'modl': ['m', 'o', 'd', 'l'],

    // 5-surface (all)
    'modbl': ['m', 'o', 'd', 'b', 'l'],
};

// ═══════════════════════════════════════════════════════════════
// AMBIGUOUS TERMS (NO GUESSING - trigger unknown)
// ═══════════════════════════════════════════════════════════════

/**
 * Terms that are inherently ambiguous and should NOT be mapped.
 * These trigger surfaceSource='none' and require L1 askback.
 */
export const AMBIGUOUS_TERMS: readonly string[] = [
    'approximal',
    'approximale',
    'approx',
    'seitlich',
    'seitliche',
    'großflächig',
    'großflächige',
    'mehrflächig',
    'mehrflächige',
    'zwischenzahn',
    'zwischenzähnig',
    'interproximal',
    'kontaktpunkt',
    'kontaktfläche',
] as const;

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a term is ambiguous (should not be guessed)
 */
export function isAmbiguousTerm(term: string): boolean {
    const lower = term.toLowerCase().trim();
    return AMBIGUOUS_TERMS.some(amb => lower.includes(amb));
}

/**
 * Normalize a canonical surface array: dedupe, sort in standard order
 */
export function sortCanonical(surfaces: CanonicalSurface[]): CanonicalSurface[] {
    const order = ALL_CANONICAL_SURFACES;
    const unique = [...new Set(surfaces)];
    return order.filter(s => unique.includes(s));
}
