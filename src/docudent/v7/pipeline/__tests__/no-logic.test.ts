/**
 * V7 No-Logic Test
 * 
 * This test FAILS if any business logic exists in V7 frontend files.
 * 
 * Forbidden patterns indicate:
 * - Chip inference (UI should not know about chips)
 * - Rule evaluation (UI should not evaluate rules)
 * - Price calculation (UI should not calculate)
 * - Domain knowledge (UI should not know BEMA/GOZ)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const V7_DIR = path.resolve(__dirname, '../..');
const COMPONENTS_DIR = path.join(V7_DIR, 'components');
const PAGES_DIR = path.join(V7_DIR, 'pages');

// ═══════════════════════════════════════════════════════════════
// FORBIDDEN PATTERNS — Build-breaking if found
// ═══════════════════════════════════════════════════════════════

const FORBIDDEN_PATTERNS: { pattern: RegExp; reason: string }[] = [
    // Domain knowledge
    { pattern: /\banästhesie\b/i, reason: 'Clinical logic not allowed' },
    { pattern: /\bkofferdam\b/i, reason: 'Clinical logic not allowed' },
    { pattern: /\bmehrschicht\b/i, reason: 'Treatment logic not allowed' },
    { pattern: /\bupsell\b/i, reason: 'Business logic not allowed' },

    // Billing logic
    { pattern: /\bbilling\b/i, reason: 'Billing logic not allowed' },
    { pattern: /\bGOZ\b/, reason: 'Billing code type not allowed' },
    { pattern: /\bBEMA\b/, reason: 'Billing code type not allowed' },
    { pattern: /\bpunkte\b/i, reason: 'Point calculation not allowed' },
    { pattern: /\bpreis\b/i, reason: 'Price logic not allowed' },

    // Chip logic
    { pattern: /if\s*\(\s*chip/, reason: 'Chip inference not allowed' },
    { pattern: /switch\s*\(\s*chip/, reason: 'Chip switch not allowed' },
    { pattern: /answer.*chip/i, reason: 'Answer-chip mapping not allowed' },

    // Defaults and heuristics
    { pattern: /\bdefaults\b/i, reason: 'Default logic not allowed' },
    { pattern: /\bheuristic\b/i, reason: 'Heuristic logic not allowed' },
    { pattern: /\btextSnippets\b/, reason: 'Text generation not allowed' },

    // String warnings (forbidden)
    { pattern: /warnings\.map\(\(w:\s*string/, reason: 'String warnings not allowed' },
    { pattern: /warning:\s*string/, reason: 'Warning as string type not allowed' },

    // V7 Reality Gate additions
    { pattern: /createWarningFromString/, reason: 'Factory function - backend only' },
    { pattern: /useDocudentV6/, reason: 'V6 hook import forbidden in V7' },
    { pattern: /as\s+any/, reason: 'Type escape not allowed' },

    // ═══════════════════════════════════════════════════════════════
    // HARDENED GATES (build-breaking)
    // ═══════════════════════════════════════════════════════════════

    // Type escape patterns (double cast to bypass TypeScript)
    { pattern: /as\s+unknown\s+as/, reason: 'Double type cast escape forbidden' },

    // Contract drift (inline type definitions that should use contracts)
    { pattern: /interface\s+ValidationWarning/, reason: 'Use contracts/warnings.ts instead of inline' },

    // Warning conversion (V7 receives warnings as objects, NO conversion)
    // Only catch conversion patterns like warnings.map((w: string) or warnings.map(w => ({ ... }))
    { pattern: /warnings\.map\(\s*\(?[a-z]+\s*=>\s*\{/, reason: 'Warning object construction forbidden - use props directly' },

    // Inline extraction types
    { pattern: /interface\s+Extracted/, reason: 'Use contracts/extraction.ts instead of inline' },

    // Direct diagnosis usage (removed from SSOT)
    { pattern: /\.diagnosis\s*=/, reason: 'Diagnosis assignment forbidden - use keywordFlags' },
];

// ═══════════════════════════════════════════════════════════════
// ALLOWLIST FILES — UI components with labels but no logic
// ═══════════════════════════════════════════════════════════════

const ALLOWLIST_FILES = [
    'SummaryChips.tsx',  // Settings UI with labels (kofferdam, anästhesie as display text)
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getAllFiles(dir: string, ext: string = '.tsx'): string[] {
    if (!fs.existsSync(dir)) return [];

    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...getAllFiles(fullPath, ext));
        } else if (entry.name.endsWith(ext)) {
            // Skip allowlisted files
            if (ALLOWLIST_FILES.includes(entry.name)) continue;
            files.push(fullPath);
        }
    }

    return files;
}

function scanFileForPatterns(filePath: string): { pattern: string; reason: string; line: number }[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const violations: { pattern: string; reason: string; line: number }[] = [];

    lines.forEach((line, index) => {
        // Skip comments, imports, and style definitions
        const trimmed = line.trim();
        if (trimmed.startsWith('//') ||
            trimmed.startsWith('*') ||
            trimmed.startsWith('/*') ||
            trimmed.startsWith('{/*') ||  // JSX comments
            line.includes('import ') ||
            // Allow in style object keys and CSS comments
            line.includes('billingSection:') ||
            line.includes('billingCode:') ||
            line.includes('billingCodes') ||
            line.includes('Render billing') ||  // JSX comment content
            // Allow in JSDoc comments
            trimmed.startsWith('❌') ||
            trimmed.startsWith('✅')
        ) {
            return;
        }

        for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
            if (pattern.test(line)) {
                violations.push({
                    pattern: pattern.source,
                    reason,
                    line: index + 1
                });
            }
            // Reset regex lastIndex
            pattern.lastIndex = 0;
        }
    });

    return violations;
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('V7 No-Logic Test', () => {
    it('components/ should contain no business logic', () => {
        const files = getAllFiles(COMPONENTS_DIR);
        const allViolations: { file: string; violations: any[] }[] = [];

        for (const file of files) {
            const violations = scanFileForPatterns(file);
            if (violations.length > 0) {
                allViolations.push({
                    file: path.relative(V7_DIR, file),
                    violations
                });
            }
        }

        if (allViolations.length > 0) {
            console.error('❌ FORBIDDEN PATTERNS FOUND IN COMPONENTS:');
            allViolations.forEach(({ file, violations }) => {
                console.error(`\n  ${file}:`);
                violations.forEach(v => {
                    console.error(`    Line ${v.line}: ${v.reason} (${v.pattern})`);
                });
            });
        }

        expect(allViolations).toHaveLength(0);
    });

    it('pages/ should contain no business logic', () => {
        const files = getAllFiles(PAGES_DIR);
        const allViolations: { file: string; violations: any[] }[] = [];

        for (const file of files) {
            const violations = scanFileForPatterns(file);
            if (violations.length > 0) {
                allViolations.push({
                    file: path.relative(V7_DIR, file),
                    violations
                });
            }
        }

        if (allViolations.length > 0) {
            console.error('❌ FORBIDDEN PATTERNS FOUND IN PAGES:');
            allViolations.forEach(({ file, violations }) => {
                console.error(`\n  ${file}:`);
                violations.forEach(v => {
                    console.error(`    Line ${v.line}: ${v.reason} (${v.pattern})`);
                });
            });
        }

        expect(allViolations).toHaveLength(0);
    });

    it('hooks/ should only contain state management, no business logic', () => {
        const hooksDir = path.join(V7_DIR, 'hooks');
        const files = getAllFiles(hooksDir, '.ts');
        const allViolations: { file: string; violations: any[] }[] = [];

        for (const file of files) {
            const violations = scanFileForPatterns(file);
            if (violations.length > 0) {
                allViolations.push({
                    file: path.relative(V7_DIR, file),
                    violations
                });
            }
        }

        expect(allViolations).toHaveLength(0);
    });
});

describe('V7 Forbidden Patterns List', () => {
    it('should have comprehensive pattern coverage', () => {
        // Minimum patterns after hardening
        expect(FORBIDDEN_PATTERNS.length).toBeGreaterThanOrEqual(20);

        // Verify all critical categories are covered
        const patternStrings = FORBIDDEN_PATTERNS.map(p => p.pattern.source).join(' ');

        expect(patternStrings).toContain('chip');
        expect(patternStrings).toContain('GOZ');
        expect(patternStrings).toContain('BEMA');
        expect(patternStrings).toContain('billing');

        // Hardened gates
        expect(patternStrings).toContain('as\\s+unknown\\s+as');
        expect(patternStrings).toContain('interface\\s+ValidationWarning');
        expect(patternStrings).toContain('warnings\\.map');
    });
});
