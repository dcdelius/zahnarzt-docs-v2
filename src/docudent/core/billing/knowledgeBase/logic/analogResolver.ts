/**
 * Analog Resolver v2
 * 
 * When no concrete BEMA/GOZ/FZ billing code can be inferred from dictation,
 * suggests a legally safe ANALOG billing recommendation based on thin index.
 * 
 * IMPORTANT: No imported commentary text is exposed to frontend.
 * Only logic-derived, static safe text is returned.
 * 
 * Uses thin index only (no full index fallback at runtime).
 */

import type { BillingContext, BillingSuggestion } from './billingRegistry';
import * as fs from 'fs';
import * as path from 'path';
import {
    SCORE_THRESHOLD,
    MAX_RESULTS,
    STOPWORDS,
    DOMAIN_TAGS,
    TREATMENT_KEYWORDS,
    KNOWN_ANALOG_TREATMENTS,
} from './analogConfig';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AnalogMatch {
    analogCode: string;
    score: number; // 0..1
    matchedBy: Array<'title' | 'tags' | 'sections' | 'crossRef'>;
    suggestedGozCodes: string[];
    chapter?: string;
}

export interface AnalogResolverResult {
    suggestions: BillingSuggestion[];
    debug?: {
        matches: AnalogMatch[];
        query: string;
    };
}

interface AnalogCard {
    code: string;
    title: string;
    tags?: string[];
    analogChapter?: string;
    analogHint?: { allowed?: boolean };
    crossReferences?: Array<{ system: string; code: string }>;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS (from config)
// ═══════════════════════════════════════════════════════════════

// Re-export for backward compatibility
export { SCORE_THRESHOLD, MAX_RESULTS, STOPWORDS };

// ═══════════════════════════════════════════════════════════════
// SAFE STATIC TEXT (NO IMPORTED CONTENT)
// ═══════════════════════════════════════════════════════════════

const SAFE_DESCRIPTION =
    'This treatment may not exist as a standalone GOZ position. ' +
    'Please verify analog billing according to §6 GOZ ' +
    'and select a comparable reference service.';

const SAFE_CROSSREF_PREFIX = 'Possible reference services: ';

// ═══════════════════════════════════════════════════════════════
// THIN INDEX TYPES
// ═══════════════════════════════════════════════════════════════

interface ThinAnalogEntry {
    id: string;
    title?: string;
    chapter?: string;            // From analogChapter - needed for filtering
    tags?: string[];
    hasAnalogHint: boolean;
    referencedCodes?: string[];  // GOZ codes from crossReferences
    topSnippets?: string[];      // Max 3, max 160 chars each
}

interface ThinAnalogIndex {
    meta: { version: string; generatedAt: string; count: number };
    codes: Record<string, ThinAnalogEntry>;
}

// ═══════════════════════════════════════════════════════════════
// LIGHTWEIGHT STANDALONE LOADER (uses thin index ONLY)
// ═══════════════════════════════════════════════════════════════

let _analogCardsCache: AnalogCard[] | null = null;
let _thinIndexMissing = false;

function loadAnalogCardsStandalone(): AnalogCard[] {
    if (_analogCardsCache !== null) {
        return _analogCardsCache;
    }

    try {
        // ONLY use thin index (no full index fallback for performance)
        const thinPath = path.resolve(
            __dirname,
            '../secondary/commentIndex_analog_thin.json'
        );

        if (!fs.existsSync(thinPath)) {
            console.warn('[AnalogResolver] Thin index not found - run: npx tsx scripts/build_analog_thin_index.ts');
            _analogCardsCache = [];
            _thinIndexMissing = true;
            return _analogCardsCache;
        }

        const raw = fs.readFileSync(thinPath, 'utf-8');
        const thin: ThinAnalogIndex = JSON.parse(raw);

        // Convert code-keyed map to array format expected by scorer
        _analogCardsCache = Object.entries(thin.codes).map(([code, entry]) => ({
            code,
            title: entry.title || '',
            tags: entry.tags,
            analogChapter: entry.chapter,
            analogHint: entry.hasAnalogHint ? { allowed: true } : undefined,
            crossReferences: entry.referencedCodes?.map(refCode => ({
                system: 'GOZ',
                code: refCode,
            })),
        }));
        return _analogCardsCache;
    } catch (e) {
        console.error('[AnalogResolver] Failed to load analog cards:', e);
        _analogCardsCache = [];
        return _analogCardsCache;
    }
}

/** Check if thin index is missing (for graceful fallback) */
export function isThinIndexMissing(): boolean {
    loadAnalogCardsStandalone(); // Ensure loaded
    return _thinIndexMissing;
}

export function clearAnalogCache(): void {
    _analogCardsCache = null;
    _thinIndexMissing = false;
}

// ═══════════════════════════════════════════════════════════════
// QUERY BUILDER
// ═══════════════════════════════════════════════════════════════

function buildQueryString(context: BillingContext): string {
    const parts: string[] = [];

    const ext = context.extracted as Record<string, unknown>;

    if (ext.treatment && typeof ext.treatment === 'string') {
        parts.push(ext.treatment);
    }
    if (ext.diagnosis && typeof ext.diagnosis === 'string') {
        parts.push(ext.diagnosis);
    }
    if (ext.versorgungsart && typeof ext.versorgungsart === 'string') {
        parts.push(ext.versorgungsart);
    }
    if (context.rawDictation) {
        // Extract key terms, skip common words
        const terms = context.rawDictation
            .toLowerCase()
            .split(/\s+/)
            .filter(t => t.length > 3)
            .slice(0, 10);
        parts.push(...terms);
    }

    return parts.join(' ').trim();
}

// ═══════════════════════════════════════════════════════════════
// SCORING LOGIC
// ═══════════════════════════════════════════════════════════════

function scoreMatch(
    card: AnalogCard,
    query: string,
    domain: string | undefined
): AnalogMatch | null {
    let score = 0;
    const matchedBy: AnalogMatch['matchedBy'] = [];
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

    // +0.40 if treatment keyword in card.title
    const titleLower = (card.title || '').toLowerCase();
    for (const term of queryTerms) {
        if (titleLower.includes(term)) {
            score += 0.40;
            matchedBy.push('title');
            break;
        }
    }

    // Also check mapped treatment keywords
    for (const [keyword, titleMatches] of Object.entries(TREATMENT_KEYWORDS)) {
        if (queryLower.includes(keyword)) {
            for (const match of titleMatches) {
                if (titleLower.includes(match.toLowerCase())) {
                    score += 0.40;
                    if (!matchedBy.includes('title')) matchedBy.push('title');
                    break;
                }
            }
            break;
        }
    }

    // +0.20 if tags intersect extracted domain
    const cardTags: string[] = card.tags || [];
    if (domain && DOMAIN_TAGS[domain]) {
        const domainTags = DOMAIN_TAGS[domain];
        const hasTagMatch = cardTags.some(t =>
            domainTags.some(dt => t.toLowerCase().includes(dt.toLowerCase()))
        );
        if (hasTagMatch) {
            score += 0.20;
            matchedBy.push('tags');
        }
    }

    // +0.20 if card contains analogHint
    if (card.analogHint && card.analogHint.allowed === true) {
        score += 0.20;
    }

    // +0.20 if card has GOZ crossReferences
    const gozRefs: string[] = [];
    if (card.crossReferences && Array.isArray(card.crossReferences)) {
        for (const ref of card.crossReferences) {
            if (ref.system === 'GOZ' && ref.code) {
                gozRefs.push(ref.code);
            }
        }
        if (gozRefs.length > 0) {
            score += 0.20;
            matchedBy.push('crossRef');
        }
    }

    // Clamp to max 1.0
    score = Math.min(score, 1.0);

    if (score < SCORE_THRESHOLD) {
        return null;
    }

    return {
        analogCode: card.code,
        score,
        matchedBy,
        suggestedGozCodes: gozRefs.slice(0, 5), // Limit to 5
        chapter: card.analogChapter,
    };
}

// ═══════════════════════════════════════════════════════════════
// MAIN RESOLVER
// ═══════════════════════════════════════════════════════════════

export function resolveAnalogSuggestions(
    context: BillingContext
): AnalogResolverResult {
    // Graceful fallback if thin index is missing
    if (isThinIndexMissing()) {
        return {
            suggestions: [{
                id: 'analog_index_missing',
                type: 'warning' as any,
                label: 'Analog index missing',
                description: 'Run: npx tsx scripts/build_analog_thin_index.ts',
                priority: 'niedrig',
                autoAccept: false,
            }],
            debug: { matches: [], query: '' }
        };
    }

    const ext = context.extracted as Record<string, unknown>;
    const query = buildQueryString(context);
    const treatmentLower = (ext.treatment as string || '').toLowerCase().trim();
    const dictationLower = (context.rawDictation || '').toLowerCase();

    // 1. Direct mapping: known analog treatments get immediate match
    const directCode = KNOWN_ANALOG_TREATMENTS[treatmentLower];
    if (directCode) {
        const card = loadAnalogCardsStandalone().find(c => c.code === directCode);
        if (card) {
            const gozRefs = card.crossReferences
                ?.filter(r => r.system === 'GOZ')
                .map(r => r.code) || [];

            return {
                suggestions: [{
                    id: `analog_${directCode}`,
                    type: 'goz',
                    label: `Analog billing: ${card.title || directCode}`,
                    description: SAFE_DESCRIPTION + (gozRefs.length > 0
                        ? ' ' + SAFE_CROSSREF_PREFIX + gozRefs.join(', ')
                        : ''),
                    priority: 'hoch',
                    autoAccept: false,
                    meta: {
                        analogCode: directCode,
                        suggestedComparisonCodes: gozRefs,
                        requiresJustification: true,
                        shortRationaleTags: card.tags?.slice(0, 3) || [],
                    },
                }],
                debug: {
                    matches: [{
                        analogCode: directCode,
                        score: 1.0,
                        matchedBy: ['title'],
                        suggestedGozCodes: gozRefs,
                        chapter: card.analogChapter,
                    }],
                    query: treatmentLower
                }
            };
        }
    }

    // 2. If user explicitly mentions "analog", search more broadly
    const explicitAnalog = dictationLower.includes('analog');

    // 3. Standard search if query is valid
    if (!query || query.length < 3) {
        return { suggestions: [] };
    }

    // Load ANALOG cards
    const allAnalogCards = loadAnalogCardsStandalone();

    // Simple text filter on query terms (exclude stopwords)
    const queryTerms = query.toLowerCase().split(/\s+/)
        .filter(t => t.length > 2 && !STOPWORDS.has(t));

    // If no valid terms after stopword filtering and no explicit analog, skip
    if (queryTerms.length === 0 && !explicitAnalog) {
        return { suggestions: [], debug: { matches: [], query } };
    }

    const filteredCards = allAnalogCards.filter(card => {
        const titleLower = (card.title || '').toLowerCase();
        const tagsLower = (card.tags || []).join(' ').toLowerCase();
        const chapterLower = (card.analogChapter || '').toLowerCase();
        const searchText = `${titleLower} ${tagsLower} ${chapterLower}`;

        return queryTerms.some(term => searchText.includes(term));
    }).slice(0, MAX_RESULTS);

    if (filteredCards.length === 0) {
        return { suggestions: [], debug: { matches: [], query } };
    }

    // Determine domain from context
    const domain = (ext.versorgungsart as string) || undefined;

    // Score and filter matches
    const matches: AnalogMatch[] = [];
    for (const card of filteredCards) {
        const match = scoreMatch(card, query, domain);
        if (match) {
            matches.push(match);
        }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    // Build suggestions with enhanced structure
    const suggestions: BillingSuggestion[] = [];

    for (const match of matches) {
        const label = `Check analog billing: ${match.chapter || 'Analog service'}`;
        let description = SAFE_DESCRIPTION;

        if (match.suggestedGozCodes.length > 0) {
            description += ' ' + SAFE_CROSSREF_PREFIX + match.suggestedGozCodes.join(', ');
        }

        suggestions.push({
            id: `analog_${match.analogCode}`,
            type: 'optimierung',
            label,
            description,
            priority: match.score >= 0.75 ? 'hoch' : 'mittel',
            autoAccept: false,
            meta: {
                analogCode: match.analogCode,
                suggestedComparisonCodes: match.suggestedGozCodes,
                requiresJustification: true,
                shortRationaleTags: match.matchedBy,
            },
        });
    }

    return { suggestions, debug: { matches, query } };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
    resolveAnalogSuggestions,
    clearAnalogCache,
};
