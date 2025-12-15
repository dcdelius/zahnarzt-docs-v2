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
