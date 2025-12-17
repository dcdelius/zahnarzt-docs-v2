#!/usr/bin/env npx tsx
/**
 * BEL2 Placeholder Audit Script
 * 
 * Finds all belNr placeholder usages in ZE/HKP/lab generation code
 * and generates a deterministic inventory report.
 * 
 * Usage:
 *   npx tsx scripts/audit_bel2_placeholders.ts
 * 
 * Output:
 *   docs/architecture/BEL2_PLACEHOLDERS.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { lookupBel2 } from '../src/docudent/core/billing/knowledgeBase/logic/bel2Catalog';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface BelNrCandidate {
    normalized: string;
    existsInCatalog: boolean;
}

interface BelNrItem {
    file: string;
    line: number;
    context: string;
    belNrLiteral: string;
    snippet: string;
    candidate: BelNrCandidate | null;
}

interface Bel2PlaceholderReport {
    generatedAt: string;
    items: BelNrItem[];
    countsByBelNrLiteral: Record<string, number>;
    countsByCandidate: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const SEARCH_DIRS = [
    'src/docudent/core/billing',
    'src/docudent/v6',
    'src/docudent/v7',
];

const INCLUDE_PATTERNS = [
    /\.ts$/,
    /\.tsx$/,
];

const EXCLUDE_PATTERNS = [
    /__tests__/,
    /\.test\.ts$/,
    /\.spec\.ts$/,
    /node_modules/,
];

// Regex to find belNr literal assignments
// Matches: belNr: '0010', belNr = '0010', rawBelNr = '0010', etc.
const BEL_NR_PATTERNS = [
    /(\w*belNr\w*)\s*[:=]\s*['"](\d{1,4})['"]/gi,
    /(\w*belNr\w*)\s*[:=]\s*['"]BEL[_:-](\d{1,4})['"]/gi,
];

// ═══════════════════════════════════════════════════════════════
// FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function shouldIncludeFile(filePath: string): boolean {
    if (!INCLUDE_PATTERNS.some(p => p.test(filePath))) {
        return false;
    }
    if (EXCLUDE_PATTERNS.some(p => p.test(filePath))) {
        return false;
    }
    return true;
}

function getAllFiles(dir: string, baseDir: string = dir): string[] {
    const results: string[] = [];

    if (!fs.existsSync(dir)) {
        return results;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);

        if (entry.isDirectory()) {
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                results.push(...getAllFiles(fullPath, baseDir));
            }
        } else if (entry.isFile() && shouldIncludeFile(fullPath)) {
            results.push(fullPath);
        }
    }

    return results;
}

function extractContext(lines: string[], lineIndex: number): string {
    // Look for function name by scanning upward
    for (let i = lineIndex; i >= Math.max(0, lineIndex - 30); i--) {
        const line = lines[i];
        const funcMatch = line.match(/(?:function|export function|const)\s+(\w+)/);
        if (funcMatch) {
            return funcMatch[1];
        }
        // Method definition
        const methodMatch = line.match(/^\s*(\w+)\s*\(/);
        if (methodMatch && !line.includes('if') && !line.includes('for') && !line.includes('while')) {
            return methodMatch[1];
        }
    }
    return 'unknown';
}

function tryNormalizeCandidate(literal: string): BelNrCandidate | null {
    // Only normalize if exactly 4 digits (unambiguous)
    const cleaned = literal.replace(/^BEL[_:-]/i, '');

    if (/^\d{4}$/.test(cleaned)) {
        const normalized = `BEL_${cleaned}`;
        const entry = lookupBel2(normalized);
        return {
            normalized,
            existsInCatalog: entry !== null
        };
    }

    // Too short/ambiguous - no candidate
    return null;
}

function findBelNrInFile(filePath: string, rootDir: string): BelNrItem[] {
    const items: BelNrItem[] = [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(rootDir, filePath);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];

        for (const pattern of BEL_NR_PATTERNS) {
            // Reset regex state
            pattern.lastIndex = 0;
            let match;

            while ((match = pattern.exec(line)) !== null) {
                const varName = match[1];
                const literal = match[2];

                // Skip type definitions and interface fields
                if (line.includes('interface ') || line.includes('type ')) {
                    continue;
                }

                // Skip comments
                if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
                    continue;
                }

                // Create snippet (max 140 chars)
                const snippet = line.trim().substring(0, 140);

                items.push({
                    file: relativePath,
                    line: lineIndex + 1, // 1-indexed
                    context: extractContext(lines, lineIndex),
                    belNrLiteral: literal,
                    snippet,
                    candidate: tryNormalizeCandidate(literal)
                });
            }
        }
    }

    return items;
}

export function generateBel2PlaceholderReport(rootDir: string = process.cwd()): Bel2PlaceholderReport {
    const allItems: BelNrItem[] = [];

    for (const searchDir of SEARCH_DIRS) {
        const fullSearchDir = path.join(rootDir, searchDir);
        const files = getAllFiles(fullSearchDir, rootDir);

        for (const file of files) {
            const items = findBelNrInFile(file, rootDir);
            allItems.push(...items);
        }
    }

    // Sort deterministically: by file, then line, then belNrLiteral
    allItems.sort((a, b) => {
        if (a.file !== b.file) return a.file.localeCompare(b.file);
        if (a.line !== b.line) return a.line - b.line;
        return a.belNrLiteral.localeCompare(b.belNrLiteral);
    });

    // Count by belNrLiteral
    const countsByBelNrLiteral: Record<string, number> = {};
    for (const item of allItems) {
        countsByBelNrLiteral[item.belNrLiteral] = (countsByBelNrLiteral[item.belNrLiteral] || 0) + 1;
    }

    // Count by candidate (only resolved ones)
    const countsByCandidate: Record<string, number> = {};
    for (const item of allItems) {
        if (item.candidate?.normalized) {
            countsByCandidate[item.candidate.normalized] = (countsByCandidate[item.candidate.normalized] || 0) + 1;
        }
    }

    // Sort keys
    const sortedCountsByBelNrLiteral = Object.fromEntries(
        Object.entries(countsByBelNrLiteral).sort(([a], [b]) => a.localeCompare(b))
    );
    const sortedCountsByCandidate = Object.fromEntries(
        Object.entries(countsByCandidate).sort(([a], [b]) => a.localeCompare(b))
    );

    return {
        generatedAt: new Date().toISOString(),
        items: allItems,
        countsByBelNrLiteral: sortedCountsByBelNrLiteral,
        countsByCandidate: sortedCountsByCandidate
    };
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

// ESM-compatible main check
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
    process.argv[1]?.endsWith('audit_bel2_placeholders.ts');

if (isMainModule) {
    const rootDir = process.cwd();
    const report = generateBel2PlaceholderReport(rootDir);

    const outputPath = path.join(rootDir, 'docs/architecture/BEL2_PLACEHOLDERS.json');

    // Ensure directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // Write with stable formatting
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');

    console.log(`✓ BEL2 Placeholder Report generated: ${outputPath}`);
    console.log(`  Items found: ${report.items.length}`);
    console.log(`  Unique literals: ${Object.keys(report.countsByBelNrLiteral).length}`);
    console.log(`  With candidates: ${Object.keys(report.countsByCandidate).length}`);
}
