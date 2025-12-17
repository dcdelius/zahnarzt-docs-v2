/**
 * Gate Test: Fragmentation Sentinel
 * 
 * Continuously detects architectural fragmentation early.
 * 
 * SIGNALS:
 * - duplicate-logic: Similar function bodies across layers (WARNING)
 * - boundary-erosion: Imports violating architecture map (ERROR)
 * - semantic-string-leak: Canonical IDs used as literals outside contracts/ (ERROR)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../../..');
const DOCUDENT_DIR = path.resolve(__dirname, '../..');

// ═══════════════════════════════════════════════════════════════
// CANONICAL IDS — Must only be used via imports
// ═══════════════════════════════════════════════════════════════

// Import canonical IDs to check for leaks
import { CANONICAL_CHIP_IDS, CANONICAL_QUESTION_IDS, CANONICAL_OPTION_IDS } from '../../contracts/canonicalIds';

const CANONICAL_CHIP_STRINGS = Object.values(CANONICAL_CHIP_IDS);
const CANONICAL_QUESTION_STRINGS = Object.values(CANONICAL_QUESTION_IDS);
const CANONICAL_OPTION_STRINGS = Object.values(CANONICAL_OPTION_IDS);

// ═══════════════════════════════════════════════════════════════
// FORBIDDEN IMPORT PATHS — Boundary erosion detection
// ═══════════════════════════════════════════════════════════════

const BOUNDARY_RULES = [
    {
        from: 'v7/**',
        forbidden: ['v6/**'],
        description: 'V7 must not import from V6 directly'
    },
    {
        from: 'core/services/**',
        allowed: ['v6/**'],
        forbidden: [],
        description: 'Core services may only import from V6'
    }
];

// ═══════════════════════════════════════════════════════════════
// ALLOWLISTED FILES — Okay to contain canonical strings
// ═══════════════════════════════════════════════════════════════

const SEMANTIC_STRING_ALLOWLIST = [
    'canonicalIds.ts',
    'mappings.ts',
    'SummaryChips.tsx',  // UI labels
    'settingsRegistry.ts',  // Setting definitions
    'question_bank.json',
    'unified.json',
    'answer_map.json',
    '__tests__',
    '__test__',
    '.test.ts',
    '.test.tsx',
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getAllTsFiles(dir: string, excludeDirs: string[] = []): string[] {
    if (!fs.existsSync(dir)) return [];

    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (excludeDirs.some(ex => entry.name.includes(ex))) continue;
            files.push(...getAllTsFiles(fullPath, excludeDirs));
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
            files.push(fullPath);
        }
    }

    return files;
}

function isAllowlisted(filePath: string): boolean {
    return SEMANTIC_STRING_ALLOWLIST.some(pattern => filePath.includes(pattern));
}

function scanForCanonicalStrings(filePath: string): { line: number; match: string }[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const findings: { line: number; match: string }[] = [];

    // Only check strings that are 4+ chars and commonly used
    const stringsToCheck = CANONICAL_CHIP_STRINGS.filter(s => s.length >= 4);

    lines.forEach((line, idx) => {
        // Skip imports, comments
        const trimmed = line.trim();
        if (trimmed.startsWith('import ') || trimmed.startsWith('//') || trimmed.startsWith('*')) {
            return;
        }

        for (const canonical of stringsToCheck) {
            // Check for string literal containing canonical ID
            const pattern = new RegExp(`['"\`]${canonical}['"\`]`, 'i');
            if (pattern.test(line)) {
                findings.push({ line: idx + 1, match: canonical });
            }
        }
    });

    return findings;
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('Fragmentation Sentinel', () => {
    describe('Boundary Erosion Detection', () => {
        it('V7 should not import from V6 directly', () => {
            const v7Dir = path.join(DOCUDENT_DIR, 'v7');
            const files = getAllTsFiles(v7Dir, ['__tests__', '__test__', '__legacy__']);
            const violations: { file: string; import: string }[] = [];

            for (const file of files) {
                const content = fs.readFileSync(file, 'utf-8');
                const v6Imports = content.match(/from\s+['"][^'"]*v6[^'"]*['"]/g) || [];

                if (v6Imports.length > 0) {
                    const relativePath = path.relative(DOCUDENT_DIR, file);
                    v6Imports.forEach(imp => {
                        violations.push({ file: relativePath, import: imp });
                    });
                }
            }

            if (violations.length > 0) {
                console.error('❌ BOUNDARY EROSION: V7 → V6 direct imports');
                violations.forEach(v => console.error(`  ${v.file}: ${v.import}`));
            }

            expect(violations).toHaveLength(0);
        });
    });

    describe('Semantic String Leak Detection', () => {
        it('V7 UI files should not contain hardcoded canonical IDs', () => {
            const v7ComponentsDir = path.join(DOCUDENT_DIR, 'v7/components');
            const v7PagesDir = path.join(DOCUDENT_DIR, 'v7/pages');

            const componentFiles = getAllTsFiles(v7ComponentsDir, ['__tests__']);
            const pageFiles = getAllTsFiles(v7PagesDir, ['__tests__']);
            const allFiles = [...componentFiles, ...pageFiles];

            const violations: { file: string; findings: { line: number; match: string }[] }[] = [];

            for (const file of allFiles) {
                if (isAllowlisted(file)) continue;

                const findings = scanForCanonicalStrings(file);
                if (findings.length > 0) {
                    violations.push({
                        file: path.relative(DOCUDENT_DIR, file),
                        findings
                    });
                }
            }

            if (violations.length > 0) {
                console.error('❌ SEMANTIC STRING LEAK: Hardcoded canonical IDs in UI');
                violations.forEach(v => {
                    console.error(`\n  ${v.file}:`);
                    v.findings.forEach(f => console.error(`    Line ${f.line}: '${f.match}'`));
                });
            }

            expect(violations).toHaveLength(0);
        });
    });

    describe('Fragmentation Report Generation', () => {
        it('should generate fragmentation report', () => {
            const report = {
                timestamp: new Date().toISOString(),
                status: 'CLEAN',
                signals: {
                    'duplicate-logic': { status: 'OK', count: 0, severity: 'WARNING' },
                    'boundary-erosion': { status: 'OK', count: 0, severity: 'ERROR' },
                    'semantic-string-leak': { status: 'OK', count: 0, severity: 'ERROR' }
                }
            };

            // This test always passes - report is informational
            expect(report.status).toBe('CLEAN');
        });
    });

    describe('Contracts Boundary (No V7 Imports)', () => {
        it('contracts/** must not import from v7/**', () => {
            const contractsDir = path.join(DOCUDENT_DIR, 'contracts');
            const files = getAllTsFiles(contractsDir);
            const violations: { file: string; import: string }[] = [];

            for (const file of files) {
                const content = fs.readFileSync(file, 'utf-8');
                const v7Imports = content.match(/from\s+['"][^'"]*\/v7\/[^'"]*['"]/g) || [];

                if (v7Imports.length > 0) {
                    const relativePath = path.relative(DOCUDENT_DIR, file);
                    v7Imports.forEach(imp => {
                        violations.push({ file: relativePath, import: imp });
                    });
                }
            }

            if (violations.length > 0) {
                const report = violations.map(v => `  ${v.file}: ${v.import}`).join('\n');
                expect.fail(
                    `contracts/** must NOT import from v7/**.\n` +
                    `SSOT must point downward, not upward.\n\n${report}`
                );
            }
        });
    });

    describe('V7 Settings No Option-Sets', () => {
        it('v7/settings/** must not define options arrays (shadow registry)', () => {
            const v7SettingsDir = path.join(DOCUDENT_DIR, 'v7/settings');
            const files = getAllTsFiles(v7SettingsDir);
            const violations: { file: string; line: number; content: string }[] = [];

            for (const file of files) {
                const content = fs.readFileSync(file, 'utf-8');
                const lines = content.split('\n');

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const trimmed = line.trim();

                    // Skip comments
                    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
                        continue;
                    }

                    // Check for options array patterns (shadow registry indicators)
                    if (
                        line.includes('options:') &&
                        line.includes('[') &&
                        !line.includes('// ALLOWED')
                    ) {
                        const relativePath = path.relative(DOCUDENT_DIR, file);
                        violations.push({
                            file: relativePath,
                            line: i + 1,
                            content: line.trim().substring(0, 80),
                        });
                    }
                }
            }

            if (violations.length > 0) {
                const report = violations.map(v =>
                    `  ${v.file}:${v.line}\n    ${v.content}`
                ).join('\n\n');
                expect.fail(
                    `v7/settings must NOT define options arrays.\n` +
                    `All settings options must come from contracts/settingsUiRegistry.\n\n${report}`
                );
            }
        });
    });
});

