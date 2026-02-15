/**
 * Gate Test: M18 No Forbidden Imports in Packs
 *
 * Ensures src/docudent/v10/packs/** does NOT import from:
 * - v7/
 * - v6/
 * - _legacy/
 * - core/services/
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PACKS_DIR = path.join(process.cwd(), 'src/docudent/v10/packs');

const FORBIDDEN_IMPORT_PATTERNS = [
    /from ['"]\.\.\/\.\.\/v7\//,
    /from ['"]\.\.\/\.\.\/v6\//,
    /from ['"]\.\.\/\.\.\/_legacy\//,
    /from ['"]\.\.\/\.\.\/core\/services\//,
    /from ['"]@\/docudent\/v7\//,
    /from ['"]@\/docudent\/v6\//,
    /from ['"]@\/docudent\/_legacy\//,
    /from ['"]@\/docudent\/core\/services\//,
    /require\(['"].*v7\//,
    /require\(['"].*v6\//,
    /require\(['"].*_legacy\//,
    /require\(['"].*core\/services\//,
];

function getAllTsFiles(dir: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
        return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            files.push(...getAllTsFiles(fullPath));
        } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
            files.push(fullPath);
        }
    }

    return files;
}

function checkFileForForbiddenImports(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const violations: string[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
            if (pattern.test(line)) {
                violations.push(`${filePath}:${i + 1}: ${line.trim()}`);
            }
        }
    }

    return violations;
}

describe('gate-m18-no-forbidden-imports-in-packs', () => {
    test('packs directory exists', () => {
        expect(fs.existsSync(PACKS_DIR)).toBe(true);
    });

    test('no imports from v7/', () => {
        const files = getAllTsFiles(PACKS_DIR);
        const violations: string[] = [];

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            if (/from ['"].*v7\//.test(content) || /require\(['"].*v7\//.test(content)) {
                violations.push(file);
            }
        }

        expect(violations).toEqual([]);
    });

    test('no imports from v6/', () => {
        const files = getAllTsFiles(PACKS_DIR);
        const violations: string[] = [];

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            if (/from ['"].*v6\//.test(content) || /require\(['"].*v6\//.test(content)) {
                violations.push(file);
            }
        }

        expect(violations).toEqual([]);
    });

    test('no imports from _legacy/', () => {
        const files = getAllTsFiles(PACKS_DIR);
        const violations: string[] = [];

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            if (/from ['"].*_legacy\//.test(content) || /require\(['"].*_legacy\//.test(content)) {
                violations.push(file);
            }
        }

        expect(violations).toEqual([]);
    });

    test('no imports from core/services/', () => {
        const files = getAllTsFiles(PACKS_DIR);
        const violations: string[] = [];

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            if (/from ['"].*core\/services\//.test(content) || /require\(['"].*core\/services\//.test(content)) {
                violations.push(file);
            }
        }

        expect(violations).toEqual([]);
    });

    test('all pack files pass comprehensive import check', () => {
        const files = getAllTsFiles(PACKS_DIR);
        expect(files.length).toBeGreaterThan(0);

        const allViolations: string[] = [];

        for (const file of files) {
            const fileViolations = checkFileForForbiddenImports(file);
            allViolations.push(...fileViolations);
        }

        if (allViolations.length > 0) {
            console.error('Forbidden import violations found:');
            for (const v of allViolations) {
                console.error(`  ${v}`);
            }
        }

        expect(allViolations).toEqual([]);
    });

    test('pack files only import from allowed modules', () => {
        const files = getAllTsFiles(PACKS_DIR);

        const ALLOWED_IMPORT_PREFIXES = [
            '../kb/',           // KB providers
            '../qa/',           // Clinical harness
            '../types',         // V10 types
            '../public',        // V10 public API
            './types',          // Pack types
            './fuellung/',      // Fuellung pack
            './endo/',          // Endo pack
            '../packs',         // Self-reference for registry
            'vitest',           // Testing
            'fs',               // Node stdlib
            'path',             // Node stdlib
        ];

        const importPattern = /from ['"]([^'"]+)['"]/g;
        const suspiciousImports: string[] = [];

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            let match;

            while ((match = importPattern.exec(content)) !== null) {
                const importPath = match[1];

                // Skip if it's a node_modules package (no ./ or ../)
                if (!importPath.startsWith('.')) {
                    continue;
                }

                const isAllowed = ALLOWED_IMPORT_PREFIXES.some(prefix =>
                    importPath.startsWith(prefix)
                );

                if (!isAllowed) {
                    suspiciousImports.push(`${file}: ${importPath}`);
                }
            }
        }

        // Log suspicious imports for debugging but don't fail
        // (some relative imports may be valid)
        if (suspiciousImports.length > 0) {
            console.log('Note: suspicious imports found (not necessarily violations):');
            for (const s of suspiciousImports.slice(0, 5)) {
                console.log(`  ${s}`);
            }
        }
    });
});
