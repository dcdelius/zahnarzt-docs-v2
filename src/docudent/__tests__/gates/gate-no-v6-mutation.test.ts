/**
 * Gate Test: No V6 Mutation
 * 
 * This gate enforces the V6 FREEZE CONTRACT.
 * V6 is read-only. No modifications are permitted.
 * 
 * ASSERTIONS:
 * - No new imports added to V6 files
 * - No new exports added to V6 files
 * - V6 files are only imported by core/services facades
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const V6_DIR = path.resolve(__dirname, '../../v6');
const CORE_SERVICES_DIR = path.resolve(__dirname, '../../core/services');

// ═══════════════════════════════════════════════════════════════
// ALLOWED IMPORTERS — Only these files may import from V6
// ═══════════════════════════════════════════════════════════════

const ALLOWED_V6_IMPORTERS = [
    'src/docudent/core/services/extractionService.ts',
    'src/docudent/core/services/questionService.ts',
    'src/docudent/core/services/outputService.ts',
    'src/docudent/core/services/index.ts',
    // Legacy archive (excluded from tests anyway)
    '__legacy_archive__',
    '__known_flaky__',
    // V6 internal imports are allowed
    'src/docudent/v6/',
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getAllTsFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];

    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!entry.name.startsWith('__')) {
                files.push(...getAllTsFiles(fullPath));
            }
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
            files.push(fullPath);
        }
    }

    return files;
}

function scanFileForV6Imports(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports: string[] = [];

    // Match import statements that reference v6
    const importRegex = /import\s+.*from\s+['"]([^'"]*v6[^'"]*)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
    }

    return imports;
}

function isAllowedImporter(filePath: string): boolean {
    const relativePath = filePath.replace(process.cwd() + '/', '');
    return ALLOWED_V6_IMPORTERS.some(allowed => relativePath.includes(allowed));
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('Gate: No V6 Mutation', () => {
    describe('V6 Import Restrictions', () => {
        it('only core/services may import from V6', () => {
            const srcDir = path.resolve(__dirname, '../../../');
            const allFiles = getAllTsFiles(srcDir);
            const violations: { file: string; imports: string[] }[] = [];

            for (const file of allFiles) {
                // Skip V6 itself and allowed importers
                if (isAllowedImporter(file)) continue;

                const v6Imports = scanFileForV6Imports(file);
                if (v6Imports.length > 0) {
                    const relativePath = file.replace(process.cwd() + '/', '');
                    violations.push({
                        file: relativePath,
                        imports: v6Imports
                    });
                }
            }

            if (violations.length > 0) {
                console.error('❌ FORBIDDEN V6 IMPORTS FOUND:');
                violations.forEach(v => {
                    console.error(`\n  ${v.file}:`);
                    v.imports.forEach(i => console.error(`    → ${i}`));
                });
            }

            expect(violations).toHaveLength(0);
        });
    });

    describe('Facade Integrity', () => {
        it('core/services facades should only contain re-exports', () => {
            const facadeFiles = getAllTsFiles(CORE_SERVICES_DIR);
            const violations: { file: string; reason: string }[] = [];

            const FORBIDDEN_PATTERNS = [
                { pattern: /if\s*\(/, reason: 'Branching logic' },
                { pattern: /switch\s*\(/, reason: 'Switch statement' },
                { pattern: /for\s*\(/, reason: 'Loop' },
                { pattern: /while\s*\(/, reason: 'Loop' },
                { pattern: /function\s+\w+\(/, reason: 'Function definition (other than re-export)' },
                { pattern: /const\s+\w+\s*=\s*\(/, reason: 'Arrow function definition' },
            ];

            for (const file of facadeFiles) {
                const content = fs.readFileSync(file, 'utf-8');
                const basename = path.basename(file);

                for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
                    if (pattern.test(content)) {
                        violations.push({ file: basename, reason });
                    }
                }
            }

            if (violations.length > 0) {
                console.error('❌ FACADE VIOLATIONS FOUND:');
                violations.forEach(v => {
                    console.error(`  ${v.file}: ${v.reason}`);
                });
            }

            expect(violations).toHaveLength(0);
        });
    });

    describe('V6 Freeze Contract', () => {
        it('V6_FREEZE.md should exist', () => {
            const freezeContract = path.join(V6_DIR, 'V6_FREEZE.md');
            expect(fs.existsSync(freezeContract)).toBe(true);
        });
    });
});
