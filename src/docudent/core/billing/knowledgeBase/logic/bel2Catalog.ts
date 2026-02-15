/**
 * BEL II Catalog Loader
 * 
 * Single-source-of-truth for BEL II (Bundeseinheitliches Leistungsverzeichnis)
 * zahntechnische Laborleistungen. Stand 01.01.2022.
 * 
 * Usage:
 *   import { lookupBel2 } from '../../logic';
 *   const entry = lookupBel2('BEL_0202'); // or '0202'
 */

import bel2Data from '../kataloge/bel2_2022.json';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface Bel2PageRange {
    start: number;
    end: number;
}

export interface Bel2Entry {
    /** 4-digit code without prefix (e.g., "0202") */
    code: string;
    /** Prefixed code ID (e.g., "BEL_0202") */
    codeId: string;
    /** Page range in source PDF (1-indexed) */
    page: Bel2PageRange;
    /** Full description of the service */
    leistungsinhalt: string;
    /** Short text / summary */
    kurztext: string;
    /** Additional notes/explanations (may be null) */
    erlaeuterungen: string | null;
}

export interface Bel2Meta {
    schema: string;
    source: {
        title: string;
        publisher: string;
        file: string;
        pages: number;
    };
    extractedOn: string;
    extractionNotes: string[];
    counts: {
        entries: number;
        uniqueCodes: number;
    };
}

export interface Bel2Catalog {
    _meta: Bel2Meta;
    entries: Bel2Entry[];
}

// ═══════════════════════════════════════════════════════════════
// CATALOG LOADER
// ═══════════════════════════════════════════════════════════════

let _catalogCache: Record<string, Bel2Entry> | null = null;

/**
 * Load the BEL II catalog as a Record keyed by codeId.
 * Results are cached for subsequent calls.
 */
export function loadBel2Catalog(): Record<string, Bel2Entry> {
    if (_catalogCache !== null) {
        return _catalogCache;
    }

    const catalog = bel2Data as Bel2Catalog;
    const result: Record<string, Bel2Entry> = {};

    for (const entry of catalog.entries) {
        result[entry.codeId] = entry;
    }

    _catalogCache = result;
    return result;
}

/**
 * Get the catalog metadata.
 */
export function getBel2Meta(): Bel2Meta {
    return (bel2Data as Bel2Catalog)._meta;
}

/**
 * Get all entries as an array (useful for iteration).
 */
export function getBel2Entries(): Bel2Entry[] {
    return (bel2Data as Bel2Catalog).entries;
}

// ═══════════════════════════════════════════════════════════════
// LOOKUP API
// ═══════════════════════════════════════════════════════════════

/**
 * Normalize a BEL code to the canonical format BEL_XXXX.
 * Accepts both "BEL_0202" and "0202" formats.
 */
export function normalizeBel2Code(code: string): string {
    if (code.startsWith('BEL_')) {
        return code;
    }
    // Assume raw 4-digit code
    return `BEL_${code}`;
}

/**
 * Look up a BEL II entry by code.
 * 
 * @param codeId - Either "BEL_0202" (preferred) or "0202" (raw)
 * @returns The entry or null if not found
 */
export function lookupBel2(codeId: string): Bel2Entry | null {
    const catalog = loadBel2Catalog();
    const normalized = normalizeBel2Code(codeId);
    return catalog[normalized] ?? null;
}

/**
 * Check if a BEL II code exists in the catalog.
 */
export function hasBel2Code(codeId: string): boolean {
    return lookupBel2(codeId) !== null;
}

/**
 * Search BEL II entries by kurztext (case-insensitive partial match).
 */
export function searchBel2ByKurztext(query: string): Bel2Entry[] {
    const entries = getBel2Entries();
    const lowerQuery = query.toLowerCase();
    return entries.filter(
        (entry) => entry.kurztext.toLowerCase().includes(lowerQuery)
    );
}

// ═══════════════════════════════════════════════════════════════
// BATCH LOOKUP API (Runtime Wiring) — Catalog-Driven
// ═══════════════════════════════════════════════════════════════

export interface Bel2LookupResult {
    /** Original input code */
    rawCode: string;
    /** Resolved code (BEL_XXXX) or null if not resolvable */
    resolvedCode: string | null;
    /** Short text from catalog (if found) */
    kurztext: string | null;
    /** Whether the code was resolved and found in catalog */
    found: boolean;
    /** Reason for failure if not resolved */
    reason?: 'invalid' | 'notFound' | 'ambiguous';
    /** Candidates tried (for debugging) */
    candidatesTried?: string[];
}

export interface Bel2BatchResult {
    results: Bel2LookupResult[];
    warnings: string[];
}

export interface Bel2ResolveResult {
    /** Resolved canonical code or null */
    code: string | null;
    /** Reason for failure */
    reason?: 'invalid' | 'notFound' | 'ambiguous';
    /** Candidates tried during resolution */
    candidatesTried?: string[];
    /** Short text if found */
    kurztext?: string;
}

/**
 * Normalize a raw BEL code to canonical BEL_XXXX format.
 * STRICT: Only accepts fully-qualified formats.
 * 
 * Accepts:
 * - "BEL_XXXX" (4 digits) → returns as-is
 * - "XXXX" (exactly 4 digits) → returns "BEL_XXXX"
 * 
 * Rejects (returns null):
 * - 1-3 digit codes (must use resolveBel2CodeFromRaw for candidate expansion)
 * - Invalid formats
 */
export function normalizeBel2CodeSafe(rawCode: string): string | null {
    if (!rawCode || typeof rawCode !== 'string') {
        return null;
    }

    const trimmed = rawCode.trim();
    if (!trimmed) {
        return null;
    }

    // Already in BEL_XXXX format (exactly 4 digits)
    if (/^BEL_\d{4}$/.test(trimmed)) {
        return trimmed;
    }

    // Exactly 4 digits → normalize to BEL_XXXX
    if (/^\d{4}$/.test(trimmed)) {
        return `BEL_${trimmed}`;
    }

    // Reject 1-3 digits and other formats (require catalog-driven resolution)
    return null;
}

/**
 * Catalog-driven BEL code resolution.
 * 
 * NEVER invents a BEL code that doesn't exist in catalog.
 * 
 * For 4-digit or BEL_XXXX inputs: validates existence in catalog.
 * For 1-3 digit inputs: tries candidate expansions and returns ONLY if exactly one exists.
 */
export function resolveBel2CodeFromRaw(raw: string): Bel2ResolveResult {
    if (!raw || typeof raw !== 'string') {
        return { code: null, reason: 'invalid' };
    }

    const trimmed = raw.trim();
    if (!trimmed) {
        return { code: null, reason: 'invalid' };
    }

    // Case 1: Already in BEL_XXXX format
    if (/^BEL_\d{4}$/.test(trimmed)) {
        const entry = lookupBel2(trimmed);
        if (entry) {
            return { code: trimmed, kurztext: entry.kurztext };
        }
        return { code: null, reason: 'notFound', candidatesTried: [trimmed] };
    }

    // Case 2: Exactly 4 digits
    if (/^\d{4}$/.test(trimmed)) {
        const candidate = `BEL_${trimmed}`;
        const entry = lookupBel2(candidate);
        if (entry) {
            return { code: candidate, kurztext: entry.kurztext };
        }
        return { code: null, reason: 'notFound', candidatesTried: [candidate] };
    }

    // Case 3: 1-3 digits — candidate expansion with catalog validation
    if (/^\d{1,3}$/.test(trimmed)) {
        const candidates: string[] = [];

        // Strategy 1: Left-pad to 4 digits (e.g., '1' → 'BEL_0001')
        const leftPadded = `BEL_${trimmed.padStart(4, '0')}`;
        candidates.push(leftPadded);

        // Check which candidates exist in catalog
        const foundCandidates: { code: string; kurztext: string }[] = [];
        for (const candidate of candidates) {
            const entry = lookupBel2(candidate);
            if (entry) {
                foundCandidates.push({ code: candidate, kurztext: entry.kurztext });
            }
        }

        if (foundCandidates.length === 0) {
            return { code: null, reason: 'notFound', candidatesTried: candidates };
        }

        if (foundCandidates.length === 1) {
            return {
                code: foundCandidates[0].code,
                kurztext: foundCandidates[0].kurztext,
                candidatesTried: candidates
            };
        }

        // Multiple matches — ambiguous
        return { code: null, reason: 'ambiguous', candidatesTried: candidates };
    }

    // Case 4: BEL:XXXX or BEL-XXXX variants
    const colonMatch = trimmed.match(/^BEL[:_-](\d{1,4})$/i);
    if (colonMatch) {
        const digits = colonMatch[1];
        // Recurse with just the digits
        return resolveBel2CodeFromRaw(digits);
    }

    // Invalid format
    return { code: null, reason: 'invalid' };
}

/**
 * Batch lookup for BEL2 codes with catalog-driven resolution.
 * Uses resolveBel2CodeFromRaw() to ensure no invented codes.
 * Never throws - returns warnings for unresolvable codes.
 * 
 * @param rawCodes - Array of raw BEL codes in any accepted format
 * @returns Results per code plus any warnings (sorted deterministically)
 */
export function getBel2ForCodes(rawCodes: string[]): Bel2BatchResult {
    const results: Bel2LookupResult[] = [];
    const warnings: string[] = [];

    for (const rawCode of rawCodes) {
        const resolved = resolveBel2CodeFromRaw(rawCode);

        if (resolved.code) {
            results.push({
                rawCode,
                resolvedCode: resolved.code,
                kurztext: resolved.kurztext ?? null,
                found: true
            });
        } else {
            results.push({
                rawCode,
                resolvedCode: null,
                kurztext: null,
                found: false,
                reason: resolved.reason,
                candidatesTried: resolved.candidatesTried
            });

            // Generate human-readable warning
            let warning = `BEL code "${rawCode}"`;
            switch (resolved.reason) {
                case 'invalid':
                    warning += ' has invalid format';
                    break;
                case 'notFound':
                    if (resolved.candidatesTried?.length) {
                        warning += ` not found (tried: ${resolved.candidatesTried.join(', ')})`;
                    } else {
                        warning += ' not found in catalog';
                    }
                    break;
                case 'ambiguous':
                    warning += ` is ambiguous (candidates: ${resolved.candidatesTried?.join(', ')})`;
                    break;
            }
            warnings.push(warning);
        }
    }

    // Sort warnings deterministically
    warnings.sort();

    return { results, warnings };
}

