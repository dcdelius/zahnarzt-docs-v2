/**
 * HTML Truth Set Extractor V2
 *
 * Extracts billing constraints from pre-parsed commentIndex*.json files
 * and produces a canonical, deterministic output for audit comparison.
 *
 * Output: docs/audit/html_extract_v2.json + hash file
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface CommentCard {
    id: string;
    system: string;
    code: string;
    title?: string;
    source: {
        provider?: string;
        filePath: string;
        fileHash: string;
        importedAt?: string;
    };
    sections: Array<{
        kind: string;
        snippet: string;
    }>;
    softRules?: Array<{
        type: string;
        severity?: string;
        payload?: Record<string, unknown>;
        evidenceSnippet: string;
    }>;
    tags?: string[];
}

interface CommentIndex {
    meta: {
        version: string;
        generatedAt: string;
        count: number;
        system?: string;
    };
    cards: CommentCard[];
}

interface ExtractedConstraints {
    maxCount: { value: number; scope: string } | null;
    scope: string | null;
    requires: string[];
    excludes: string[];
}

interface ExtractedEntry {
    system: string;
    codeId: string;
    text: string;
    constraints: ExtractedConstraints;
    rawSource: {
        filePath: string;
        anchorOrCardId: string;
        fileHash: string | null;
    };
}

interface ExtractV2Output {
    _meta: {
        version: string;
        generatedAt: string;
        sourceFiles: string[];
        stats: {
            totalEntries: number;
            entriesWithConstraints: number;
            bySystem: Record<string, number>;
        };
    };
    entries: ExtractedEntry[];
}

// ═══════════════════════════════════════════════════════════════
// CONSTRAINT EXTRACTION PATTERNS
// ═══════════════════════════════════════════════════════════════

const EXCLUSION_PATTERNS = [
    /nicht\s+(?:neben|mit|zusammen\s+mit)\s+(?:(?:der\s+)?(?:L-Nr\.|Nr\.|BEMA|GOZ|BEL)[\s-]*)?(\d{3,4}[a-z]?)/gi,
    /nicht\s+abrechnungsfähig\s+neben\s+(?:(?:der\s+)?(?:L-Nr\.|Nr\.|BEMA|GOZ|BEL)[\s-]*)?(\d{3,4}[a-z]?)/gi,
    /ausgeschlossen[^.]*?neben\s+(?:(?:L-Nr\.|Nr\.|BEMA|GOZ|BEL)[\s-]*)?(\d{3,4}[a-z]?)/gi,
    /(?:GOZ|BEMA)[\s-]*(\d{3,4}[a-z]?)\s+(?:nicht\s+)?(?:neben|daneben)/gi,
    /nicht\s+berechnungsfähig\s+(?:neben|mit)/gi,
];

const REQUIRES_PATTERNS = [
    /nur\s+(?:bei|mit|wenn|in\s+Verbindung\s+mit)\s+([^.,]+)/gi,
    /(?:setzt\s+voraus|erfordert)\s+([^.,]+)/gi,
    /Voraussetzung[^:]*:\s*([^.,]+)/gi,
];

const MAX_COUNT_PATTERNS = [
    { regex: /nur\s+einmal\s+(?:je|pro)\s+(\w+)/i, value: 1 },
    { regex: /maximal\s+(\d+)(?:x|mal)?\s+(?:je|pro)\s+(\w+)/i, value: null },
    { regex: /(\d+)(?:x|mal)\s+(?:je|pro)\s+(\w+)\s+abrechenbar/i, value: null },
    { regex: /höchstens\s+(\d+)(?:x|mal)?\s+(?:je|pro)\s+(\w+)/i, value: null },
    { regex: /bis\s+zu\s+(\d+)(?:x|mal)?\s+(?:je|pro|im)\s+(\w+)/i, value: null },
];

const SCOPE_PATTERNS = [
    /je\s+(Zahn|Kiefer|Sitzung|Behandlungsfall|Quadrant|Kanal|Kieferhälfte)/i,
    /pro\s+(Zahn|Kiefer|Sitzung|Behandlungsfall|Quadrant|Kanal|Kieferhälfte)/i,
];

// ═══════════════════════════════════════════════════════════════
// EXTRACTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function extractExclusions(text: string): string[] {
    const exclusions: string[] = [];

    for (const pattern of EXCLUSION_PATTERNS) {
        // Reset lastIndex for global patterns
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            if (match[1]) {
                // Normalize: remove spaces, uppercase
                const code = match[1].replace(/\s+/g, '').toUpperCase();
                if (!exclusions.includes(code)) {
                    exclusions.push(code);
                }
            }
        }
    }

    // Also check for "nicht neben" followed by code references
    const nichtNebenMatch = text.match(/nicht\s+neben[^.]+/gi);
    if (nichtNebenMatch) {
        for (const m of nichtNebenMatch) {
            const codeRefs = m.match(/(\d{3,4}[a-z]?)/g);
            if (codeRefs) {
                for (const code of codeRefs) {
                    const normalized = code.toUpperCase();
                    if (!exclusions.includes(normalized)) {
                        exclusions.push(normalized);
                    }
                }
            }
        }
    }

    return exclusions.sort();
}

function extractRequires(text: string): string[] {
    const requires: string[] = [];

    for (const pattern of REQUIRES_PATTERNS) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            if (match[1]) {
                const requirement = match[1].trim().slice(0, 100); // Limit length
                if (requirement.length > 5 && !requires.includes(requirement)) {
                    requires.push(requirement);
                }
            }
        }
    }

    return requires.slice(0, 5).sort(); // Max 5 requires
}

function extractMaxCount(text: string): { value: number; scope: string } | null {
    for (const { regex, value } of MAX_COUNT_PATTERNS) {
        const match = text.match(regex);
        if (match) {
            const count = value ?? parseInt(match[1], 10);
            const scope = match[value !== null ? 1 : 2] || 'unknown';
            return { value: count, scope: scope.toLowerCase() };
        }
    }
    return null;
}

function extractScope(text: string): string | null {
    for (const pattern of SCOPE_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            return match[1].toLowerCase();
        }
    }
    return null;
}

function extractTextSummary(card: CommentCard): string {
    // Get meaningful text from sections
    const relevantKinds = ['definition', 'billing', 'plausibility', 'limits'];
    const snippets: string[] = [];

    for (const section of card.sections) {
        if (relevantKinds.includes(section.kind) || section.kind === 'unknown') {
            if (section.snippet && section.snippet.length > 10) {
                snippets.push(section.snippet.slice(0, 200));
            }
        }
    }

    return snippets.slice(0, 3).join(' | ').slice(0, 500);
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXTRACTION
// ═══════════════════════════════════════════════════════════════

function extractFromIndex(indexPath: string): ExtractedEntry[] {
    if (!fs.existsSync(indexPath)) {
        console.log(`  [SKIP] ${path.basename(indexPath)} not found`);
        return [];
    }

    const data: CommentIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    const entries: Map<string, ExtractedEntry> = new Map();

    console.log(`  [LOAD] ${path.basename(indexPath)}: ${data.cards.length} cards`);

    for (const card of data.cards) {
        const codeId = `${card.system}_${card.code.replace(/\s+/g, '')}`;
        const fullText = card.sections.map((s) => s.snippet).join(' ');

        // Extract constraints
        const excludes = extractExclusions(fullText);
        const requires = extractRequires(fullText);
        const maxCount = extractMaxCount(fullText);
        const scope = extractScope(fullText);

        // Also check softRules for additional constraints
        if (card.softRules) {
            for (const rule of card.softRules) {
                if (rule.type === 'contraHint' && rule.evidenceSnippet) {
                    const moreExcludes = extractExclusions(rule.evidenceSnippet);
                    for (const ex of moreExcludes) {
                        if (!excludes.includes(ex)) {
                            excludes.push(ex);
                        }
                    }
                }
            }
        }

        // Merge with existing entry for same code
        const existing = entries.get(codeId);
        if (existing) {
            // Merge constraints
            for (const ex of excludes) {
                if (!existing.constraints.excludes.includes(ex)) {
                    existing.constraints.excludes.push(ex);
                }
            }
            for (const req of requires) {
                if (!existing.constraints.requires.includes(req)) {
                    existing.constraints.requires.push(req);
                }
            }
            if (!existing.constraints.maxCount && maxCount) {
                existing.constraints.maxCount = maxCount;
            }
            if (!existing.constraints.scope && scope) {
                existing.constraints.scope = scope;
            }
            // Sort after merge
            existing.constraints.excludes.sort();
            existing.constraints.requires.sort();
        } else {
            entries.set(codeId, {
                system: card.system,
                codeId,
                text: extractTextSummary(card),
                constraints: {
                    maxCount,
                    scope,
                    requires: requires.sort(),
                    excludes: excludes.sort(),
                },
                rawSource: {
                    filePath: card.source.filePath || 'unknown',
                    anchorOrCardId: card.id,
                    fileHash: card.source.fileHash || null,
                },
            });
        }
    }

    return Array.from(entries.values());
}

function generateExtract(): ExtractV2Output {
    const secondaryDir = path.join(
        process.cwd(),
        'src/docudent/core/billing/knowledgeBase/secondary'
    );

    const indexFiles = [
        'commentIndex_bema.json',
        'commentIndex_goz.json',
        'commentIndex_goz_v2.json',
        'commentIndex_analog.json',
        'commentIndex.json', // Legacy fallback
    ];

    console.log('Starting extraction from commentIndex files...');

    const allEntries: ExtractedEntry[] = [];
    const usedFiles: string[] = [];

    for (const indexFile of indexFiles) {
        const indexPath = path.join(secondaryDir, indexFile);
        if (fs.existsSync(indexPath)) {
            const entries = extractFromIndex(indexPath);
            allEntries.push(...entries);
            usedFiles.push(indexFile);
        }
    }

    // Dedupe by codeId, keeping first occurrence
    const deduped = new Map<string, ExtractedEntry>();
    for (const entry of allEntries) {
        if (!deduped.has(entry.codeId)) {
            deduped.set(entry.codeId, entry);
        } else {
            // Merge constraints
            const existing = deduped.get(entry.codeId)!;
            for (const ex of entry.constraints.excludes) {
                if (!existing.constraints.excludes.includes(ex)) {
                    existing.constraints.excludes.push(ex);
                }
            }
            for (const req of entry.constraints.requires) {
                if (!existing.constraints.requires.includes(req)) {
                    existing.constraints.requires.push(req);
                }
            }
            if (!existing.constraints.maxCount && entry.constraints.maxCount) {
                existing.constraints.maxCount = entry.constraints.maxCount;
            }
            if (!existing.constraints.scope && entry.constraints.scope) {
                existing.constraints.scope = entry.constraints.scope;
            }
            existing.constraints.excludes.sort();
            existing.constraints.requires.sort();
        }
    }

    // Sort entries by codeId for stability
    const sortedEntries = Array.from(deduped.values()).sort((a, b) =>
        a.codeId.localeCompare(b.codeId)
    );

    // Calculate stats
    const bySystem: Record<string, number> = {};
    let entriesWithConstraints = 0;

    for (const entry of sortedEntries) {
        bySystem[entry.system] = (bySystem[entry.system] || 0) + 1;

        const hasConstraints =
            entry.constraints.maxCount !== null ||
            entry.constraints.scope !== null ||
            entry.constraints.requires.length > 0 ||
            entry.constraints.excludes.length > 0;

        if (hasConstraints) {
            entriesWithConstraints++;
        }
    }

    return {
        _meta: {
            version: '2.0.0',
            generatedAt: new Date().toISOString(),
            sourceFiles: usedFiles,
            stats: {
                totalEntries: sortedEntries.length,
                entriesWithConstraints,
                bySystem,
            },
        },
        entries: sortedEntries,
    };
}

// ═══════════════════════════════════════════════════════════════
// STABLE STRINGIFY (sorted keys)
// ═══════════════════════════════════════════════════════════════

function stableStringify(obj: unknown): string {
    return JSON.stringify(obj, (_, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value)
                .sort()
                .reduce((sorted: Record<string, unknown>, key) => {
                    sorted[key] = (value as Record<string, unknown>)[key];
                    return sorted;
                }, {});
        }
        return value;
    }, 2);
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

const extract = generateExtract();

// Stable stringify for deterministic output
const jsonContent = stableStringify(extract);

// Compute hash
const hash = createHash('sha256').update(jsonContent).digest('hex');

// Write output
const outputDir = path.join(process.cwd(), 'docs/audit');
fs.mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, 'html_extract_v2.json');
const hashPath = path.join(outputDir, 'html_extract_v2.hash.txt');

fs.writeFileSync(outputPath, jsonContent);
fs.writeFileSync(hashPath, hash);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('HTML Extract V2 Generated');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Output:    ${outputPath}`);
console.log(`Hash:      ${hash}`);
console.log(`Total:     ${extract._meta.stats.totalEntries} entries`);
console.log(`With constraints: ${extract._meta.stats.entriesWithConstraints}`);
console.log(`By system:`, extract._meta.stats.bySystem);
console.log('═══════════════════════════════════════════════════════════════');

// Export for testing
export { generateExtract, stableStringify, ExtractV2Output, ExtractedEntry };
