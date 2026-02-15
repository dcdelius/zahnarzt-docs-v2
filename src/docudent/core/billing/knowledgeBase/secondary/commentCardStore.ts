/**
 * Comment Card Store
 * 
 * Unified loader and retrieval for CommentCards from BEL, BEMA, GOZ, and ANALOG indices.
 * Provides lazy-loaded, cached access to comment data with search capabilities.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { CommentCard, CodeSystem, SoftRule } from './commentParser';

// Re-export types for convenience
export type { CommentCard, CodeSystem, SoftRule };

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CommentIndex {
    meta: {
        version: string;
        generatedAt: string;
        count: number;
        system?: string;
    };
    cards: CommentCard[];
}

export interface SearchFilters {
    system?: CodeSystem | CodeSystem[];
    tags?: string[];
    hasRules?: boolean;
}

export interface SearchResult {
    card: CommentCard;
    score: number;
    matchedSnippets: string[];
}

// ═══════════════════════════════════════════════════════════════
// STORE STATE (Lazy-loaded singleton)
// ═══════════════════════════════════════════════════════════════

let _belCards: CommentCard[] | null = null;
let _bemaCards: CommentCard[] | null = null;
let _gozCards: CommentCard[] | null = null;
let _analogCards: CommentCard[] | null = null;
let _allCards: CommentCard[] | null = null;
let _cardsByCode: Map<string, CommentCard[]> | null = null;

// Get __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BEL_INDEX_PATH = path.resolve(__dirname, 'commentIndex.json');
const BEMA_INDEX_PATH = path.resolve(__dirname, 'commentIndex_bema.json');
const GOZ_V2_INDEX_PATH = path.resolve(__dirname, 'commentIndex_goz_v2.json');
const ANALOG_INDEX_PATH = path.resolve(__dirname, 'commentIndex_analog.json');

// ═══════════════════════════════════════════════════════════════
// LOADER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Load a single comment index file
 */
function loadIndexFile(filePath: string): CommentCard[] {
    if (!fs.existsSync(filePath)) {
        return [];
    }
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data: CommentIndex = JSON.parse(content);
        return data.cards || [];
    } catch (err) {
        console.warn(`Failed to load comment index: ${filePath}`, err);
        return [];
    }
}

/**
 * Load BEL comment cards (lazy, cached)
 */
export function loadBelCards(): CommentCard[] {
    if (_belCards === null) {
        _belCards = loadIndexFile(BEL_INDEX_PATH);
    }
    return _belCards;
}

/**
 * Load BEMA comment cards (lazy, cached)
 */
export function loadBemaCards(): CommentCard[] {
    if (_bemaCards === null) {
        _bemaCards = loadIndexFile(BEMA_INDEX_PATH);
    }
    return _bemaCards;
}

/**
 * Load GOZ v2 comment cards (lazy, cached)
 */
export function loadGozCardsV2(): CommentCard[] {
    if (_gozCards === null) {
        _gozCards = loadIndexFile(GOZ_V2_INDEX_PATH);
    }
    return _gozCards;
}

/**
 * Load ANALOG comment cards (lazy, cached)
 */
export function loadAnalogCards(): CommentCard[] {
    if (_analogCards === null) {
        _analogCards = loadIndexFile(ANALOG_INDEX_PATH);
    }
    return _analogCards;
}

/**
 * Load all comment cards (BEL + BEMA + GOZ v2 + ANALOG merged, lazy, cached)
 */
export function loadAllCards(): CommentCard[] {
    if (_allCards === null) {
        const bel = loadBelCards();
        const bema = loadBemaCards();
        const goz = loadGozCardsV2();
        const analog = loadAnalogCards();
        _allCards = [...bel, ...bema, ...goz, ...analog];
        // Sort for determinism
        _allCards.sort((a, b) => a.id.localeCompare(b.id));
    }
    return _allCards;
}

/**
 * Get cards indexed by normalized code (lazy, cached)
 */
function getCardsByCode(): Map<string, CommentCard[]> {
    if (_cardsByCode === null) {
        _cardsByCode = new Map();
        for (const card of loadAllCards()) {
            const existing = _cardsByCode.get(card.code) || [];
            existing.push(card);
            _cardsByCode.set(card.code, existing);
        }
    }
    return _cardsByCode;
}

/**
 * Clear cache (for testing)
 */
export function clearCache(): void {
    _belCards = null;
    _bemaCards = null;
    _gozCards = null;
    _analogCards = null;
    _allCards = null;
    _cardsByCode = null;
}

// ═══════════════════════════════════════════════════════════════
// RETRIEVAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all comment cards for a specific code
 * 
 * @param code - Normalized code (e.g., "BEMA_12", "BEL_0010", "GOZ_2060")
 * @param system - Optional system filter
 * @returns Array of matching CommentCards (may have multiple variants)
 */
export function getCommentCardsForCode(code: string, system?: CodeSystem): CommentCard[] {
    const normalizedCode = normalizeCodeForLookup(code);
    const cards = getCardsByCode().get(normalizedCode) || [];

    if (system) {
        return cards.filter(c => c.system === system);
    }
    return cards;
}

/**
 * Get the first (primary) comment card for a code
 */
export function getCommentCardForCode(code: string, system?: CodeSystem): CommentCard | null {
    const cards = getCommentCardsForCode(code, system);
    return cards.length > 0 ? cards[0] : null;
}

/**
 * Normalize code for lookup (handle common variations)
 */
function normalizeCodeForLookup(code: string): string {
    // Already normalized (has prefix)
    if (/^(BEMA|BEL|GOZ)_/.test(code)) {
        return code;
    }
    // Plain number - can't determine system, return as-is
    return code;
}

/**
 * Search comment cards by text query with optional filters
 * 
 * @param query - Text to search for in snippets, titles, headings
 * @param filters - Optional filters (system, tags, hasRules)
 * @param limit - Max results (default 10)
 * @returns Sorted search results with scores
 */
export function searchCommentCards(
    query: string,
    filters?: SearchFilters,
    limit: number = 10
): SearchResult[] {
    const allCards = loadAllCards();
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

    const results: SearchResult[] = [];

    for (const card of allCards) {
        // Apply filters first
        if (!matchesFilters(card, filters)) continue;

        // Calculate match score
        const { score, matchedSnippets } = calculateMatchScore(card, queryLower, queryTerms);

        if (score > 0) {
            results.push({ card, score, matchedSnippets });
        }
    }

    // Sort by score descending, then by code for stability
    results.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.card.code.localeCompare(b.card.code);
    });

    return results.slice(0, limit);
}

/**
 * Check if card matches filters
 */
function matchesFilters(card: CommentCard, filters?: SearchFilters): boolean {
    if (!filters) return true;

    // System filter
    if (filters.system) {
        const systems = Array.isArray(filters.system) ? filters.system : [filters.system];
        if (!systems.includes(card.system)) return false;
    }

    // Tags filter (any match)
    if (filters.tags && filters.tags.length > 0) {
        const cardTags = card.tags || [];
        const hasMatch = filters.tags.some(t => cardTags.includes(t));
        if (!hasMatch) return false;
    }

    // Has rules filter
    if (filters.hasRules && (!card.softRules || card.softRules.length === 0)) {
        return false;
    }

    return true;
}

/**
 * Calculate relevance score for search query
 */
function calculateMatchScore(
    card: CommentCard,
    queryLower: string,
    queryTerms: string[]
): { score: number; matchedSnippets: string[] } {
    let score = 0;
    const matchedSnippets: string[] = [];

    // Title match (high weight)
    const titleLower = (card.title || '').toLowerCase();
    if (titleLower.includes(queryLower)) {
        score += 10;
        matchedSnippets.push(card.title || '');
    } else if (queryTerms.some(t => titleLower.includes(t))) {
        score += 5;
    }

    // Code match
    if (card.code.toLowerCase().includes(queryLower)) {
        score += 8;
    }

    // Section snippet matches
    for (const section of card.sections) {
        const snippetLower = section.snippet.toLowerCase();
        if (snippetLower.includes(queryLower)) {
            score += 3;
            if (matchedSnippets.length < 3) {
                matchedSnippets.push(section.snippet.slice(0, 100));
            }
        } else {
            const termMatches = queryTerms.filter(t => snippetLower.includes(t)).length;
            if (termMatches > 0) {
                score += termMatches;
            }
        }

        // Heading match
        const headingLower = (section.heading || '').toLowerCase();
        if (headingLower.includes(queryLower)) {
            score += 2;
        }
    }

    // Tag matches
    for (const tag of card.tags || []) {
        if (tag.toLowerCase().includes(queryLower)) {
            score += 2;
        }
    }

    return { score, matchedSnippets };
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS FOR INTEGRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get top snippets for a code (useful for LLM context)
 */
export function getTopSnippetsForCode(code: string, maxSnippets: number = 3): string[] {
    const cards = getCommentCardsForCode(code);
    const snippets: string[] = [];

    for (const card of cards) {
        for (const section of card.sections) {
            if (snippets.length >= maxSnippets) break;
            if (section.snippet.length > 20) {
                snippets.push(section.snippet);
            }
        }
        if (snippets.length >= maxSnippets) break;
    }

    return snippets;
}

/**
 * Get soft rules for a code (useful for rule extraction)
 */
export function getSoftRulesForCode(code: string): SoftRule[] {
    const cards = getCommentCardsForCode(code);
    const rules: SoftRule[] = [];

    for (const card of cards) {
        if (card.softRules) {
            rules.push(...card.softRules);
        }
    }

    return rules;
}

/**
 * Get tags for a code
 */
export function getTagsForCode(code: string): string[] {
    const cards = getCommentCardsForCode(code);
    const tags = new Set<string>();

    for (const card of cards) {
        for (const tag of card.tags || []) {
            tags.add(tag);
        }
    }

    return Array.from(tags).sort();
}

/**
 * Check if comment data exists for a code
 */
export function hasCommentData(code: string): boolean {
    return getCommentCardsForCode(code).length > 0;
}

// ═══════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════

export interface CommentStoreStats {
    belCards: number;
    bemaCards: number;
    gozCards: number;
    analogCards: number;
    totalCards: number;
    uniqueCodes: number;
    bySystem: Record<string, number>;
}

export function getStats(): CommentStoreStats {
    const allCards = loadAllCards();
    const bySystem: Record<string, number> = { BEL: 0, BEMA: 0, GOZ: 0, ANALOG: 0, UNKNOWN: 0 };

    for (const card of allCards) {
        const sys = card.system as string;
        bySystem[sys] = (bySystem[sys] || 0) + 1;
    }

    return {
        belCards: loadBelCards().length,
        bemaCards: loadBemaCards().length,
        gozCards: loadGozCardsV2().length,
        analogCards: loadAnalogCards().length,
        totalCards: allCards.length,
        uniqueCodes: getCardsByCode().size,
        bySystem,
    };
}
