/**
 * Gate: No Runtime Imports from V6
 *
 * Scans transitive imports from entry points (DocudentV10Page, runV10, v7/pipeline/index)
 * and FAILs if any runtime-reached file imports from src/docudent/v6/**.
 *
 * V6 is legacy code and MUST NOT be in the runtime path.
 * Test-only and __archive__ imports are allowed.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src/docudent');

// Files to exclude from scanning (test files, archives)
const EXCLUDED_PATTERNS = [
    /__tests__/,
    /\.test\./,
    /\.spec\./,
    /__e2e__/,
    /__fixtures__/,
    /__archive__/,
    /\.d\.ts$/,
];

// Entry points that define "runtime reached"
const ENTRY_POINTS = [
    'src/docudent/v10/pages/DocudentV10Page.tsx',
    'src/docudent/v10/pipeline/runV10.ts',
    'src/docudent/v7/pipeline/index.ts',
    'src/docudent/v10/public.ts',
    'src/docudent/v7/hooks/useV7Pipeline.ts',
];

function isExcluded(filePath: string): boolean {
    return EXCLUDED_PATTERNS.some(pattern => pattern.test(filePath));
}

function extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
    }
    return imports;
}

function scanFileForV6Imports(filePath: string): { file: string; line: number; import: string }[] {
    const violations: { file: string; line: number; import: string }[] = [];

    if (!fs.existsSync(filePath)) return violations;

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        // Check for v6 imports
        if (line.includes('from') && (line.includes('/v6/') || line.includes("'v6/") || line.includes('"v6/'))) {
            // Skip type-only imports
            if (line.trim().startsWith('import type')) return;

            violations.push({
                file: filePath,
                line: index + 1,
                import: line.trim().substring(0, 100),
            });
        }
    });

    return violations;
}

function getAllRuntimeFiles(): string[] {
    const files: string[] = [];

    function walk(dir: string) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                // Skip excluded directories
                if (entry.name === '__tests__' || entry.name === '__e2e__' ||
                    entry.name === '__fixtures__' || entry.name === '__archive__') {
                    continue;
                }
                walk(fullPath);
            } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
                const relativePath = path.relative(ROOT, fullPath);
                if (!isExcluded(relativePath)) {
                    files.push(relativePath);
                }
            }
        }
    }

    walk(SRC);
    return files;
}

describe('gate-no-runtime-imports-from-v6', () => {
    it('should not have any runtime files importing from v6/**', () => {
        const runtimeFiles = getAllRuntimeFiles();
        const allViolations: { file: string; line: number; import: string }[] = [];

        for (const file of runtimeFiles) {
            const filePath = path.join(ROOT, file);
            const violations = scanFileForV6Imports(filePath);
            allViolations.push(...violations);
        }

        if (allViolations.length > 0) {
            const violationReport = allViolations.map(v =>
                `  ${v.file}:${v.line}\n    ${v.import}`
            ).join('\n\n');

            expect.fail(
                `Found ${allViolations.length} runtime file(s) importing from v6/**.\n` +
                `V6 is legacy and MUST NOT be in the runtime path.\n\n` +
                `${violationReport}\n\n` +
                `Fix: Replace v6 imports with V10/core equivalents.`
            );
        }
    });

    it('should have all entry points existing', () => {
        for (const entry of ENTRY_POINTS) {
            const fullPath = path.join(ROOT, entry);
            expect(fs.existsSync(fullPath), `Entry point missing: ${entry}`).toBe(true);
        }
    });
});
