/**
 * GATE TEST: No Mock Output Strings in V7 Production Code
 * 
 * Purpose: Prevent hardcoded demo data from appearing in V7 output components.
 * These strings should NEVER appear in production V7 source code.
 * 
 * If this test fails, you have reintroduced mock data — FIX IT IMMEDIATELY.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Forbidden strings that indicate mock/demo data
const FORBIDDEN_MOCK_STRINGS = [
    'Mustermann',           // Demo doctor name
    'Max Müller',           // Demo patient name  
    'Behandlungsblatt',     // Old mock header (replaced with "Dokumentation")
    '19.12.2025',           // Hardcoded date
    '~ 145,20 €',           // Hardcoded price
];

// Files to scan (V7 production source only, not tests)
const V7_SOURCE_DIR = path.join(__dirname, '../../v7');

// Exclude patterns
const EXCLUDE_PATTERNS = [
    '__tests__',
    '__fixtures__',
    '__mocks__',
    '.test.',
    '.spec.',
    'AuthContext.mock.tsx',  // Auth mock is OK
];

/**
 * Recursively get all TypeScript/TSX files in a directory
 */
function getSourceFiles(dir: string): string[] {
    const files: string[] = [];

    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            // Skip excluded directories/files
            if (EXCLUDE_PATTERNS.some(p => fullPath.includes(p))) {
                continue;
            }

            if (entry.isDirectory()) {
                files.push(...getSourceFiles(fullPath));
            } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
                files.push(fullPath);
            }
        }
    } catch (err) {
        // Directory might not exist in test environment
    }

    return files;
}

describe('gate-no-mock-output-strings', () => {
    it('should not contain forbidden mock strings in V7 production source', () => {
        const sourceFiles = getSourceFiles(V7_SOURCE_DIR);
        const violations: { file: string; line: number; match: string }[] = [];

        for (const file of sourceFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                for (const forbidden of FORBIDDEN_MOCK_STRINGS) {
                    if (line.includes(forbidden)) {
                        violations.push({
                            file: path.relative(V7_SOURCE_DIR, file),
                            line: i + 1,
                            match: forbidden
                        });
                    }
                }
            }
        }

        if (violations.length > 0) {
            const report = violations.map(v =>
                `  ${v.file}:${v.line} → "${v.match}"`
            ).join('\n');

            throw new Error(
                `MOCK OUTPUT STRINGS DETECTED IN V7 SOURCE!\n\n` +
                `Found ${violations.length} violation(s):\n${report}\n\n` +
                `These strings indicate hardcoded demo data. Remove them and use real pipeline output.`
            );
        }

        expect(violations).toEqual([]);
    });

    it('should list all scanned files for transparency', () => {
        const sourceFiles = getSourceFiles(V7_SOURCE_DIR);

        console.log(`\n[gate-no-mock-output-strings] Scanned ${sourceFiles.length} V7 source files`);

        // This test always passes, just logs for transparency
        expect(sourceFiles.length).toBeGreaterThan(0);
    });
});
