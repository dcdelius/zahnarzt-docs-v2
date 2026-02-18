/**
 * Surface Normalization Layer — SSOT for Surface Extraction
 * 
 * Single source of truth for extracting and normalizing surfaces.
 * NO GUESSING: Ambiguous terms result in empty surfaces + warning.
 */

import {
    type CanonicalSurface,
    ALL_CANONICAL_SURFACES,
    UNAMBIGUOUS_TERMS,
    UNAMBIGUOUS_COMPOUNDS,
    isAmbiguousTerm,
    sortCanonical,
} from './lexicon';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type SurfaceSource = 'extraction' | 'dictation' | 'none';

export interface SurfaceNormalizationResult {
    /** Normalized canonical surfaces: ['m', 'o', 'd', 'b', 'l'] subset */
    surfaces: CanonicalSurface[];

    /** Where the surfaces came from */
    source: SurfaceSource;

    /** Warnings about ambiguous or unparseable input */
    warnings: string[];

    /** True if input contained ambiguous terms (no guessing) */
    hasAmbiguity: boolean;
}

export interface SurfaceNormalizationInput {
    /** Extracted surfaces from LLM (string or array) */
    extracted?: string | string[] | null;

    /** Raw dictation text as fallback */
    dictation?: string | null;
}

// ═══════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Normalize surfaces from extraction or dictation.
 * 
 * SSOT Rule: This is the ONLY function that should be used to derive
 * canonical surfaces. No other parser should exist in renderer/billing.
 * 
 * NO GUESSING Rule: Ambiguous terms (approximal, seitlich, großflächig)
 * result in empty surfaces with hasAmbiguity=true.
 */
export function normalizeSurfaces(input: SurfaceNormalizationInput): SurfaceNormalizationResult {
    const warnings: string[] = [];
    let hasAmbiguity = false;

    // Try extraction first
    if (input.extracted) {
        const extractionResult = parseExtractedSurfaces(input.extracted);
        if (extractionResult.hasAmbiguity) {
            hasAmbiguity = true;
            warnings.push(...extractionResult.warnings);
            // Do NOT return surfaces for ambiguous input
            return {
                surfaces: [],
                source: 'none',
                warnings,
                hasAmbiguity: true,
            };
        }
        if (extractionResult.surfaces.length > 0) {
            // SSOT / NO-GUESSING: if dictation contains ambiguous surface terms (e.g. "approximal"),
            // we MUST not trust extracted surfaces either. Force "unknown" surfaces so the pipeline
            // can ask back deterministically.
            if (input.dictation) {
                const dictationResult = parseDictationSurfaces(input.dictation);
                if (dictationResult.hasAmbiguity) {
                    return {
                        surfaces: [],
                        source: 'none',
                        warnings: [
                            ...extractionResult.warnings,
                            ...dictationResult.warnings,
                            'Dictation surface terms are ambiguous; ignoring extracted surfaces',
                        ],
                        hasAmbiguity: true,
                    };
                }
            }
            // If dictation has a clear superset, prefer dictation (prevents missed surfaces)
            if (input.dictation) {
                const dictationResult = parseDictationSurfaces(input.dictation);
                if (!dictationResult.hasAmbiguity && dictationResult.surfaces.length > 0) {
                    const extractionSet = new Set(extractionResult.surfaces);
                    const dictationSet = new Set(dictationResult.surfaces);
                    const extractionIsSubset = extractionResult.surfaces.every(s => dictationSet.has(s));
                    const dictationHasMore = dictationResult.surfaces.length > extractionResult.surfaces.length;
                    const sameSurfaceSet =
                        extractionResult.surfaces.length === dictationResult.surfaces.length
                        && extractionResult.surfaces.every(s => dictationSet.has(s));
                    if (extractionIsSubset && dictationHasMore) {
                        return {
                            surfaces: dictationResult.surfaces,
                            source: 'dictation',
                            warnings: [
                                ...extractionResult.warnings,
                                'Extraction surfaces were incomplete; using dictation surfaces instead',
                            ],
                            hasAmbiguity: false,
                        };
                    }
                    // If explicit dictation surfaces conflict with extraction, prefer dictation.
                    if (!sameSurfaceSet) {
                        return {
                            surfaces: dictationResult.surfaces,
                            source: 'dictation',
                            warnings: [
                                ...extractionResult.warnings,
                                'Extraction/dictation surface conflict; using dictation surfaces',
                            ],
                            hasAmbiguity: false,
                        };
                    }
                }
            }
            return {
                surfaces: extractionResult.surfaces,
                source: 'extraction',
                warnings: extractionResult.warnings,
                hasAmbiguity: false,
            };
        }
        warnings.push(...extractionResult.warnings);
    }

    // Fallback to dictation
    if (input.dictation) {
        const dictationResult = parseDictationSurfaces(input.dictation);
        if (dictationResult.hasAmbiguity) {
            hasAmbiguity = true;
            warnings.push(...dictationResult.warnings);
            return {
                surfaces: [],
                source: 'none',
                warnings,
                hasAmbiguity: true,
            };
        }
        if (dictationResult.surfaces.length > 0) {
            return {
                surfaces: dictationResult.surfaces,
                source: 'dictation',
                warnings: dictationResult.warnings,
                hasAmbiguity: false,
            };
        }
        warnings.push(...dictationResult.warnings);
    }

    // No surfaces found
    return {
        surfaces: [],
        source: 'none',
        warnings: warnings.length > 0 ? warnings : ['No surfaces found in input'],
        hasAmbiguity,
    };
}

// ═══════════════════════════════════════════════════════════════
// PARSING HELPERS
// ═══════════════════════════════════════════════════════════════

interface ParseResult {
    surfaces: CanonicalSurface[];
    warnings: string[];
    hasAmbiguity: boolean;
}

function parseExtractedSurfaces(extracted: string | string[]): ParseResult {
    const warnings: string[] = [];

    // Convert to tokens
    const tokens = Array.isArray(extracted)
        ? extracted.map(s => s.toLowerCase().trim()).filter(Boolean)
        : tokenizeString(extracted);

    // Check for ambiguous terms first
    for (const token of tokens) {
        if (isAmbiguousTerm(token)) {
            return {
                surfaces: [],
                warnings: [`Ambiguous term detected: "${token}" - cannot determine surfaces`],
                hasAmbiguity: true,
            };
        }
    }

    // Parse unambiguous tokens
    const surfaces: CanonicalSurface[] = [];
    for (const token of tokens) {
        const parsed = parseToken(token);
        if (parsed.length > 0) {
            surfaces.push(...parsed);
        } else if (token.length > 0) {
            warnings.push(`Unknown surface term: "${token}"`);
        }
    }

    return {
        surfaces: sortCanonical(surfaces),
        warnings,
        hasAmbiguity: false,
    };
}

function parseDictationSurfaces(dictation: string): ParseResult {
    const lower = dictation.toLowerCase();

    // Try to find compound patterns first (mod, od, modb, etc.)
    const compoundPattern = /\b(modbl|modb|modl|mob|mod|dom|omd|od|do|mo|om|md|dm|ob|bo|ol|lo)\b/gi;
    const compoundMatches = lower.match(compoundPattern);
    if (compoundMatches) {
        const surfaces: CanonicalSurface[] = [];
        for (const match of compoundMatches) {
            const compound = UNAMBIGUOUS_COMPOUNDS[match.toLowerCase()];
            if (compound) {
                surfaces.push(...compound);
            }
        }
        if (surfaces.length > 0) {
            return {
                surfaces: sortCanonical(surfaces),
                warnings: [],
                hasAmbiguity: false,
            };
        }
    }

    // Try longer compound terms (e.g., distalinzisal, mesiookklusal)
    const compoundSurfaces: CanonicalSurface[] = [];
    for (const [term, canonical] of Object.entries(UNAMBIGUOUS_COMPOUNDS)) {
        if (term.length <= 3) continue;
        const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
        if (regex.test(lower)) {
            compoundSurfaces.push(...canonical);
        }
    }
    if (compoundSurfaces.length > 0) {
        return {
            surfaces: sortCanonical(compoundSurfaces),
            warnings: [],
            hasAmbiguity: false,
        };
    }

    // Try individual surface terms (word boundaries)
    const surfaces: CanonicalSurface[] = [];
    for (const [term, canonical] of Object.entries(UNAMBIGUOUS_TERMS)) {
        if (term.length > 1) {  // Skip single letters (might match randomly)
            // Use word boundary matching for longer terms
            const regex = new RegExp(`\\b${term}\\b`, 'i');
            if (regex.test(lower)) {
                surfaces.push(canonical);
            }
        }
    }

    // Fallback: token-based scan for hyphenated phrases (e.g., "distal-okklusal-mesial")
    if (surfaces.length === 0) {
        const tokenized = lower
            .replace(/[^a-zäöüß]+/gi, ' ')
            .split(/\s+/)
            .filter(Boolean);
        for (const token of tokenized) {
            const parsed = parseToken(token);
            if (parsed.length > 0) {
                surfaces.push(...parsed);
            }
        }
    }

    // Only treat terms as ambiguous if we still have no explicit surfaces.
    if (surfaces.length === 0 && isAmbiguousTerm(lower)) {
        const ambiguousMatches = [
            'approximal', 'seitlich', 'großflächig', 'mehrflächig',
            'zwischenzahn', 'interproximal', 'kontaktpunkt'
        ].filter(term => lower.includes(term));

        return {
            surfaces: [],
            warnings: [`Ambiguous terms in dictation: ${ambiguousMatches.join(', ')}`],
            hasAmbiguity: true,
        };
    }

    return {
        surfaces: sortCanonical(surfaces),
        warnings: surfaces.length === 0 ? ['No surface terms found in dictation'] : [],
        hasAmbiguity: false,
    };
}

function tokenizeString(str: string): string[] {
    const lower = str.toLowerCase().trim();

    // Check if it's a pure single-letter compound (like "mod", "od")
    if (/^[modbli]+$/.test(lower)) {
        // Return as single token for compound lookup
        return [lower];
    }

    // Split on spaces, commas, and common separators
    return lower.split(/[\s,;]+/).filter(Boolean);
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseToken(token: string): CanonicalSurface[] {
    const normalizeIncisal = (value: string) => value.replace(/i/g, 'o');
    const normalizedToken = normalizeIncisal(token.toLowerCase());

    // Check compounds first
    const compound = UNAMBIGUOUS_COMPOUNDS[normalizedToken];
    if (compound) {
        return [...compound];
    }

    // Check single terms
    const single = UNAMBIGUOUS_TERMS[normalizedToken];
    if (single) {
        return [single];
    }

    // Check if it's a sequence of surface letters (incisal 'i' aliases to 'o')
    if (/^[modbli]+$/.test(normalizedToken)) {
        return normalizedToken.split('').filter(
            (c): c is CanonicalSurface => ALL_CANONICAL_SURFACES.includes(c as CanonicalSurface)
        );
    }

    return [];
}

// ═══════════════════════════════════════════════════════════════
// RE-EXPORTS
// ═══════════════════════════════════════════════════════════════

export { type CanonicalSurface, ALL_CANONICAL_SURFACES } from './lexicon';
