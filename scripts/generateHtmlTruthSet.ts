/**
 * HTML Truth Set Generator
 * 
 * Extracts constraints from pre-parsed comment indexes and generates
 * a consolidated truth set for comparison with billing DB/KB.
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
        filePath: string;
        fileHash: string;
    };
    sections: Array<{
        kind: string;
        snippet: string;
    }>;
    softRules?: Array<{
        type: string;
        match: string;
        evidenceSnippet: string;
    }>;
}

interface CommentIndex {
    meta: {
        version: string;
        generatedAt: string;
        count: number;
    };
    cards: CommentCard[];
}

interface TruthSetCode {
    codeSystem: string;
    rawFiles: string[];
    constraints: {
        exclusions: string[];
        requires: string[];
        maxCount: { value: number; scope: string } | null;
        notes: string[];
    };
}

interface TruthSet {
    meta: {
        sourceRoots: string[];
        generatedAt: string;
        parser: { name: string; version: string };
        stats: {
            totalCards: number;
            totalCodes: number;
            codesWithExclusions: number;
            codesWithMaxCount: number;
        };
    };
    codes: Record<string, TruthSetCode>;
}

// ═══════════════════════════════════════════════════════════════
// CONSTRAINT EXTRACTION
// ═══════════════════════════════════════════════════════════════

const EXCLUSION_PATTERNS = [
    /nicht neben\s+(?:der\s+)?(?:L-Nr\.\s*)?(\d+\s*\d*)/gi,
    /nicht abrechnungsfähig neben/gi,
    /ausgeschlossen.*?neben/gi,
];

const MAX_COUNT_PATTERNS = [
    /nur einmal je (\w+)/gi,
    /maximal (\d+)x? (?:je|pro) (\w+)/gi,
    /(\d+)x? je (\w+) abrechenbar/gi,
];

function extractExclusions(text: string): string[] {
    const exclusions: string[] = [];

    // Look for "nicht neben" patterns
    const nichtNebenMatch = text.match(/nicht neben[^.]+/gi);
    if (nichtNebenMatch) {
        for (const m of nichtNebenMatch) {
            // Extract code references
            const codeRefs = m.match(/(?:L-Nr\.\s*)?(\d{3}\s*\d)/g);
            if (codeRefs) {
                exclusions.push(...codeRefs.map(c => c.replace(/\s+/g, '_')));
            }
        }
    }

    return [...new Set(exclusions)];
}

function extractMaxCount(text: string): { value: number; scope: string } | null {
    const patterns = [
        { regex: /nur einmal je (\w+)/i, value: 1 },
        { regex: /maximal (\d+) je (\w+)/i, value: null },
        { regex: /(\d+)x je (\w+)/i, value: null },
    ];

    for (const { regex, value } of patterns) {
        const match = text.match(regex);
        if (match) {
            const count = value ?? parseInt(match[1], 10);
            const scope = match[value !== null ? 1 : 2];
            return { value: count, scope };
        }
    }

    return null;
}

function extractNotes(sections: CommentCard['sections']): string[] {
    const notes: string[] = [];

    for (const section of sections) {
        if (section.kind === 'plausibility' || section.kind === 'billing') {
            const snippet = section.snippet.slice(0, 200);
            if (snippet.length > 10) {
                notes.push(snippet);
            }
        }
    }

    return notes.slice(0, 5); // Max 5 notes
}

// ═══════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════

function generateTruthSet(): TruthSet {
    const secondaryDir = path.join(
        process.cwd(),
        'src/docudent/core/billing/knowledgeBase/secondary'
    );

    const indexFiles = [
        'commentIndex.json',
        'commentIndex_bema.json',
        'commentIndex_goz.json',
        'commentIndex_analog.json',
    ];

    const codes: Record<string, TruthSetCode> = {};
    let totalCards = 0;

    for (const indexFile of indexFiles) {
        const indexPath = path.join(secondaryDir, indexFile);
        if (!fs.existsSync(indexPath)) continue;

        const data: CommentIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        totalCards += data.cards.length;

        for (const card of data.cards) {
            const codeKey = `${card.system}_${card.code.replace(/\s+/g, '')}`;

            if (!codes[codeKey]) {
                codes[codeKey] = {
                    codeSystem: card.system,
                    rawFiles: [],
                    constraints: {
                        exclusions: [],
                        requires: [],
                        maxCount: null,
                        notes: [],
                    },
                };
            }

            // Add source file
            if (card.source.filePath && !codes[codeKey].rawFiles.includes(card.source.filePath)) {
                codes[codeKey].rawFiles.push(card.source.filePath);
            }

            // Extract constraints from sections
            const fullText = card.sections.map(s => s.snippet).join(' ');

            // Exclusions
            const exclusions = extractExclusions(fullText);
            codes[codeKey].constraints.exclusions.push(...exclusions);

            // Max count
            const maxCount = extractMaxCount(fullText);
            if (maxCount && !codes[codeKey].constraints.maxCount) {
                codes[codeKey].constraints.maxCount = maxCount;
            }

            // Notes
            const notes = extractNotes(card.sections);
            codes[codeKey].constraints.notes.push(...notes);

            // From soft rules
            if (card.softRules) {
                for (const rule of card.softRules) {
                    if (rule.type === 'contraHint') {
                        codes[codeKey].constraints.notes.push(rule.evidenceSnippet.slice(0, 150));
                    }
                }
            }
        }
    }

    // Dedupe
    for (const code of Object.values(codes)) {
        code.constraints.exclusions = [...new Set(code.constraints.exclusions)];
        code.constraints.notes = [...new Set(code.constraints.notes)].slice(0, 5);
    }

    // Stats
    const codesWithExclusions = Object.values(codes).filter(c => c.constraints.exclusions.length > 0).length;
    const codesWithMaxCount = Object.values(codes).filter(c => c.constraints.maxCount !== null).length;

    return {
        meta: {
            sourceRoots: [
                'src/docudent/core/billing/knowledgeBase/secondary/commentIndex*.json'
            ],
            generatedAt: new Date().toISOString(),
            parser: {
                name: 'truthSetGenerator',
                version: '1.0.0',
            },
            stats: {
                totalCards,
                totalCodes: Object.keys(codes).length,
                codesWithExclusions,
                codesWithMaxCount,
            },
        },
        codes,
    };
}

// ═══════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════

const truthSet = generateTruthSet();

// Stable stringify (sorted keys)
const sortedCodes: Record<string, TruthSetCode> = {};
for (const key of Object.keys(truthSet.codes).sort()) {
    sortedCodes[key] = truthSet.codes[key];
}
truthSet.codes = sortedCodes;

const outputPath = path.join(process.cwd(), 'docs/audit/html_truthset.v1.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(truthSet, null, 2));

console.log('Generated:', outputPath);
console.log('Stats:', truthSet.meta.stats);
