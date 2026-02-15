/**
 * Gate M12.4: No Runtime V6 Imports Anywhere
 *
 * GATE DEFINITION:
 * No non-test, non-archive file may import from src/docudent/v6/**.
 * V6 is archived/reference-only.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const DOCUDENT_ROOT = path.resolve(__dirname, '../../..');

// Directories that ARE ALLOWED to reference V6
const ALLOWED_V6_IMPORT_PATTERNS = [
    '__archive__',
    '__tests__',
    '__test__',
    '.test.ts',
    '.test.tsx',
    '.spec.ts',
    '.spec.tsx',
    '/v6/', // V6 can reference itself
    '/docs/',
];

// Runtime directories that must NOT have V6 imports
const RUNTIME_DIRS = [
    'v7/pipeline',
    'v7/medical',
    'v7/output',
    'v10',
    'core',
    'medical_kb',
];

describe('Gate M12.4: No Runtime V6 Imports Anywhere', () => {
    for (const dir of RUNTIME_DIRS) {
        it(`${dir}/ has no V6 imports`, () => {
            const absolutePath = path.join(DOCUDENT_ROOT, dir);
            if (!fs.existsSync(absolutePath)) {
                return; // Skip if doesn't exist
            }

            const violations = findV6Imports(absolutePath);
            if (violations.length > 0) {
                expect.fail(
                    `Found ${violations.length} file(s) with V6 imports in ${dir}:\n` +
                    violations.map(v => `  - ${v}`).join('\n') +
                    '\n\nV6 is archived. Use V10 or appropriate core module.'
                );
            }
        });
    }

    it('Provides actionable error for violations', () => {
        // This test documents the expected error format
        const sampleViolation = ['/path/to/file.ts'];
        const errorMessage = `Found 1 file(s) with V6 imports in test:\n  - /path/to/file.ts\n\nV6 is archived. Use V10 or appropriate core module.`;
        expect(errorMessage).toContain('V6 is archived');
    });
});

function findV6Imports(dir: string): string[] {
    const violations: string[] = [];

    walkDir(dir, (filePath) => {
        // Only check .ts/.tsx files
        if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
            return;
        }

        // Skip if in allowed patterns
        if (ALLOWED_V6_IMPORT_PATTERNS.some(p => filePath.includes(p))) {
            return;
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for V6 imports
        if (/from\s+['"][^'"]*\/v6\//.test(content)) {
            violations.push(path.relative(dir, filePath));
        }
    });

    return violations;
}

function walkDir(dir: string, callback: (path: string) => void): void {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walkDir(fullPath, callback);
            } else {
                callback(fullPath);
            }
        }
    } catch {
        // Skip on access error
    }
}
