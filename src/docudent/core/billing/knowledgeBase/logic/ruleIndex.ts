/**
 * Rule Index
 * 
 * Precomputed index for fast candidate rule retrieval.
 * Avoids O(rules × cases) iteration by bucketing rules.
 */

import { extractBk } from './fzCode';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface Rule {
    ruleId: string;
    severity: 'error' | 'warn';
    appliesTo?: {
        category?: string;
        befundklasse?: string[];
        fzCodePattern?: string;
    };
    condition: {
        type: string;
        [key: string]: any;
    };
    [key: string]: any;
}

export interface ImportedCaseLike {
    id: string;
    category?: string;
    befundklasse?: string;
    festzuschuss?: { fzCodes?: string[] };
    [key: string]: any;
}

export interface RuleIndex {
    /** Rules indexed by category ("ZE", "REPAIR", "*") */
    byCategory: Map<string, Rule[]>;
    /** Rules indexed by Befundklasse ("1".."9", "*") */
    byBk: Map<string, Rule[]>;
    /** Rules indexed by FZ prefix ("FZ_6.", "FZ_7.", etc.) */
    byFzPrefix: Map<string, Rule[]>;
    /** All rules for fallback */
    all: Rule[];
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const WILDCARD = '*';

/**
 * Extracts FZ prefix from fzCodePattern regex.
 * E.g. "^FZ_6\\." -> "FZ_6."
 */
function extractFzPrefixFromPattern(pattern: string | undefined): string | null {
    if (!pattern) return null;

    // Match patterns like ^FZ_6\. or ^FZ_6\.8
    const match = pattern.match(/^\^FZ_(\d)\\?\./);
    if (match) {
        return `FZ_${match[1]}.`;
    }
    return null;
}

/**
 * Adds rule to a bucket in the map.
 */
function addToBucket<K>(map: Map<K, Rule[]>, key: K, rule: Rule): void {
    if (!map.has(key)) {
        map.set(key, []);
    }
    map.get(key)!.push(rule);
}

// ═══════════════════════════════════════════════════════════════
// BUILD INDEX
// ═══════════════════════════════════════════════════════════════

/**
 * Builds a precomputed index for fast rule candidate retrieval.
 * 
 * @param rules - Array of rules to index
 * @returns RuleIndex with bucketed access
 */
export function buildRuleIndex(rules: Rule[]): RuleIndex {
    const byCategory = new Map<string, Rule[]>();
    const byBk = new Map<string, Rule[]>();
    const byFzPrefix = new Map<string, Rule[]>();

    for (const rule of rules) {
        const appliesTo = rule.appliesTo ?? {};

        // Category bucket
        const category = appliesTo.category ?? WILDCARD;
        addToBucket(byCategory, category, rule);

        // BK bucket
        const befundklasse = appliesTo.befundklasse;
        if (befundklasse && befundklasse.length > 0) {
            if (befundklasse.includes(WILDCARD)) {
                addToBucket(byBk, WILDCARD, rule);
            } else {
                for (const bk of befundklasse) {
                    addToBucket(byBk, bk, rule);
                }
            }
        } else {
            addToBucket(byBk, WILDCARD, rule);
        }

        // FZ prefix bucket (optional, nice-to-have)
        const fzPrefix = extractFzPrefixFromPattern(appliesTo.fzCodePattern);
        if (fzPrefix) {
            addToBucket(byFzPrefix, fzPrefix, rule);
        }
    }

    return { byCategory, byBk, byFzPrefix, all: rules };
}

// ═══════════════════════════════════════════════════════════════
// GET CANDIDATES
// ═══════════════════════════════════════════════════════════════

/**
 * Gets candidate rules for a case, already deduped by ruleId.
 * Returns rules sorted by ruleId for deterministic ordering.
 * 
 * @param idx - Precomputed rule index
 * @param c - Case to get candidates for
 * @returns Deduped and sorted array of candidate rules
 */
export function getCandidateRules(idx: RuleIndex, c: ImportedCaseLike): Rule[] {
    const seenRuleIds = new Set<string>();
    const candidates: Rule[] = [];

    const caseCategory = c.category ?? WILDCARD;
    const fzCodes = c.festzuschuss?.fzCodes ?? [];

    // Extract distinct BKs from fzCodes
    const caseBks = new Set<string>();
    for (const code of fzCodes) {
        const bk = extractBk(code);
        if (bk) caseBks.add(bk);
    }

    // Collect from category buckets
    const categoryBuckets = [
        idx.byCategory.get(caseCategory),
        idx.byCategory.get(WILDCARD),
    ];

    // Collect from BK buckets
    const bkBuckets = [idx.byBk.get(WILDCARD)];
    for (const bk of caseBks) {
        bkBuckets.push(idx.byBk.get(bk));
    }

    // Union all buckets with dedupe
    const allBuckets = [...categoryBuckets, ...bkBuckets];
    for (const bucket of allBuckets) {
        if (!bucket) continue;
        for (const rule of bucket) {
            if (!seenRuleIds.has(rule.ruleId)) {
                seenRuleIds.add(rule.ruleId);
                // Final applicability check
                if (isRuleApplicable(rule, c)) {
                    candidates.push(rule);
                }
            }
        }
    }

    // Sort by ruleId for deterministic ordering
    candidates.sort((a, b) => a.ruleId.localeCompare(b.ruleId));

    return candidates;
}

/**
 * Checks if a rule is applicable to a case.
 * This is the final filter after bucket collection.
 */
export function isRuleApplicable(rule: Rule, c: ImportedCaseLike): boolean {
    const appliesTo = rule.appliesTo ?? {};
    const fzCodes = c.festzuschuss?.fzCodes ?? [];

    // Category check
    if (appliesTo.category && c.category && appliesTo.category !== c.category) {
        return false;
    }

    // Befundklasse check
    if (appliesTo.befundklasse && appliesTo.befundklasse.length > 0) {
        if (!appliesTo.befundklasse.includes(WILDCARD)) {
            if (!appliesTo.befundklasse.includes(c.befundklasse ?? '')) {
                return false;
            }
        }
    }

    // FZ code pattern check
    if (appliesTo.fzCodePattern) {
        const re = new RegExp(appliesTo.fzCodePattern);
        if (!fzCodes.some(z => re.test(z))) {
            return false;
        }
    }

    return true;
}

// ═══════════════════════════════════════════════════════════════
// STATS (for debugging/testing)
// ═══════════════════════════════════════════════════════════════

/**
 * Returns index statistics for debugging.
 */
export function getIndexStats(idx: RuleIndex): {
    totalRules: number;
    categoryBuckets: number;
    bkBuckets: number;
    fzPrefixBuckets: number;
} {
    return {
        totalRules: idx.all.length,
        categoryBuckets: idx.byCategory.size,
        bkBuckets: idx.byBk.size,
        fzPrefixBuckets: idx.byFzPrefix.size,
    };
}
