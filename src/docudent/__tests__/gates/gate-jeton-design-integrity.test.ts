/**
 * Gate: Jeton Design Integrity — JETON_UI_DIREKTIV_V1 Enforcement
 *
 * ═══════════════════════════════════════════════════════════════
 * Enforces design DNA: no card grids, no magic colors/motion,
 * all pages use designTokens.
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const V7_APP_DIR = path.join(__dirname, '../../v7/app');
const V7_PAGES_DIR = path.join(__dirname, '../../v7/pages');
const DESIGN_TOKENS_PATH = path.join(V7_APP_DIR, 'designTokens.ts');

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getAllTsxFiles(dir: string): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...getAllTsxFiles(fullPath));
        } else if (entry.name.endsWith('.tsx')) {
            files.push(fullPath);
        }
    }
    return files;
}

function getRelativePath(filePath: string): string {
    return path.relative(path.join(__dirname, '../..'), filePath);
}

interface Violation {
    file: string;
    line: number;
    issue: string;
    match: string;
}

function scanFileForPattern(filePath: string, pattern: RegExp, issueType: string): Violation[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const violations: Violation[] = [];

    lines.forEach((line, idx) => {
        const matches = line.match(pattern);
        if (matches) {
            violations.push({
                file: getRelativePath(filePath),
                line: idx + 1,
                issue: issueType,
                match: matches[0],
            });
        }
    });

    return violations;
}

// ═══════════════════════════════════════════════════════════════
// GATE: No Card Grid Patterns
// ═══════════════════════════════════════════════════════════════

describe('Gate: No Card Grid Patterns', () => {
    const allFiles = [...getAllTsxFiles(V7_APP_DIR), ...getAllTsxFiles(V7_PAGES_DIR)];

    it('should not use display: grid (card grid forbidden)', () => {
        const violations: Violation[] = [];
        const pattern = /display:\s*['"]grid['"]/gi;

        for (const file of allFiles) {
            violations.push(...scanFileForPattern(file, pattern, 'display: grid (card grid)'));
        }

        if (violations.length > 0) {
            const message = formatViolations('Card Grid Pattern', violations,
                'Use flex or list layouts instead of grid for Jeton style.');
            expect.fail(message);
        }
    });

    it('should not use raw boxShadow with px values (use shadows tokens)', () => {
        const violations: Violation[] = [];
        // Match boxShadow with raw px values, exclude references to shadows.*
        const pattern = /boxShadow:\s*['"][^'"]*\d+px[^'"]*['"]/gi;

        for (const file of allFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');

            lines.forEach((line, idx) => {
                // Skip if using token reference (shadows.*)
                if (line.includes('shadows.')) return;
                // Skip if it's in designTokens.ts
                if (file.includes('designTokens.ts')) return;

                const matches = line.match(pattern);
                if (matches) {
                    violations.push({
                        file: getRelativePath(file),
                        line: idx + 1,
                        issue: 'Raw boxShadow (use shadows token)',
                        match: matches[0],
                    });
                }
            });
        }

        if (violations.length > 0) {
            const message = formatViolations('Raw BoxShadow', violations,
                'Use shadows.soft, shadows.medium, etc. from designTokens.');
            expect.fail(message);
        }
    });

    it('should not use Tailwind gray border (#e5e7eb)', () => {
        const violations: Violation[] = [];
        const pattern = /#e5e7eb/gi;

        for (const file of allFiles) {
            if (file.includes('designTokens.ts')) continue;
            violations.push(...scanFileForPattern(file, pattern, 'Tailwind gray (#e5e7eb)'));
        }

        if (violations.length > 0) {
            const message = formatViolations('Tailwind Gray Border', violations,
                'Use colors.hairline or colors.hairlineSubtle from designTokens.');
            expect.fail(message);
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GATE: No Magic Colors
// ═══════════════════════════════════════════════════════════════

describe('Gate: No Magic Colors', () => {
    const allFiles = [...getAllTsxFiles(V7_APP_DIR), ...getAllTsxFiles(V7_PAGES_DIR)];

    it('should not use raw hex colors (use designTokens)', () => {
        const violations: Violation[] = [];
        const hexPattern = /#[0-9a-fA-F]{3,8}/g;

        for (const file of allFiles) {
            // Skip designTokens.ts - that's where colors are defined
            if (file.includes('designTokens.ts')) continue;
            // Skip AuthContext.mock - dev-only file
            if (file.includes('AuthContext.mock')) continue;
            // Skip legacy DocudentV7Page - predates design system
            if (file.includes('DocudentV7Page')) continue;

            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');

            lines.forEach((line, idx) => {
                // Skip comments
                if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
                // Skip import statements
                if (line.includes('import ')) return;

                const matches = line.match(hexPattern);
                if (matches) {
                    matches.forEach(match => {
                        violations.push({
                            file: getRelativePath(file),
                            line: idx + 1,
                            issue: 'Raw hex color',
                            match,
                        });
                    });
                }
            });
        }

        if (violations.length > 0) {
            const message = formatViolations('Raw Hex Color', violations,
                'Import and use colors from designTokens.ts instead of raw hex values.');
            expect.fail(message);
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GATE: No Magic Motion
// ═══════════════════════════════════════════════════════════════

describe('Gate: No Magic Motion', () => {
    const allFiles = [...getAllTsxFiles(V7_APP_DIR), ...getAllTsxFiles(V7_PAGES_DIR)];

    it('should not use raw duration numbers for standard transitions (loops allowed)', () => {
        const violations: Violation[] = [];
        // Match duration: followed by a number (not a token reference)
        const pattern = /duration:\s*\d+\.?\d*/g;

        for (const file of allFiles) {
            if (file.includes('designTokens.ts')) continue;
            // Exclude legacy DocudentV7Page - it predates the design system
            if (file.includes('DocudentV7Page')) continue;
            // Exclude ComingSoonBillingPage - to be removed
            if (file.includes('ComingSoonBillingPage')) continue;

            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');

            lines.forEach((line, idx) => {
                // Skip if using token reference (motionTokens.* or motion.*)
                if (line.includes('motionTokens.') || line.includes('motion.fast') ||
                    line.includes('motion.normal') || line.includes('motion.slow')) return;
                // Skip if it's a loop animation (has 'repeat' nearby)
                if (line.includes('repeat') || line.includes('Infinity')) return;
                // Skip if it's in a transition block for looping animations (check context)
                const context = lines.slice(Math.max(0, idx - 3), idx + 3).join(' ');
                if (context.includes('repeat') || context.includes('Infinity')) return;

                const matches = line.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        violations.push({
                            file: getRelativePath(file),
                            line: idx + 1,
                            issue: 'Raw duration number',
                            match,
                        });
                    });
                }
            });
        }

        if (violations.length > 0) {
            const message = formatViolations('Raw Motion Duration', violations,
                'Use motionTokens.fast, motionTokens.normal, etc. from designTokens.');
            expect.fail(message);
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GATE: Pages Must Import designTokens
// ═══════════════════════════════════════════════════════════════

describe('Gate: Pages Must Import designTokens', () => {
    it('every page in v7/pages must import from designTokens', () => {
        const pageFiles = getAllTsxFiles(V7_PAGES_DIR);
        const violations: string[] = [];

        for (const file of pageFiles) {
            // Skip legacy DocudentV7Page - predates design system
            if (file.includes('DocudentV7Page')) continue;
            // Skip ComingSoonBillingPage - to be removed
            if (file.includes('ComingSoonBillingPage')) continue;

            const content = fs.readFileSync(file, 'utf8');

            // Check for designTokens import
            if (!content.includes("from '../app/designTokens'") &&
                !content.includes("from './designTokens'") &&
                !content.includes('designTokens')) {
                violations.push(getRelativePath(file));
            }
        }

        if (violations.length > 0) {
            const message = [
                '',
                '═══════════════════════════════════════════════════════════════',
                'GATE FAILURE: Pages Missing designTokens Import',
                '═══════════════════════════════════════════════════════════════',
                '',
                'Every page in v7/pages must import and use designTokens.',
                '',
                'Missing import in:',
                ...violations.map(v => `  ❌ ${v}`),
                '',
                'Fix: Add import { colors, typography, ... } from "../app/designTokens"',
                '',
            ].join('\n');

            expect.fail(message);
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// HELPER: Format Violations
// ═══════════════════════════════════════════════════════════════

function formatViolations(title: string, violations: Violation[], fix: string): string {
    return [
        '',
        '═══════════════════════════════════════════════════════════════',
        `GATE FAILURE: ${title}`,
        '═══════════════════════════════════════════════════════════════',
        '',
        fix,
        '',
        'Violations:',
        ...violations.map(v => `  ❌ ${v.file}:${v.line} — ${v.issue}: ${v.match}`),
        '',
    ].join('\n');
}
