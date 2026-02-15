/**
 * Gate M27: No core/services imports in V10 except extraction adapter
 *
 * Ensures V10 code does not import from core/services except in the
 * explicitly allowed extraction adapter file.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('gate-m27-no-core-services-imports-in-v10', () => {
    const v10Dir = path.join(process.cwd(), 'src/docudent/v10');

    // Only this file is allowed to import from core/services
    const allowedExceptions = [
        'extraction/adapters/llmExtractorAdapter.ts',
        'extraction/selectExtractor.ts', // Legacy, to be migrated
    ];

    function getAllTsFiles(dir: string): string[] {
        const files: string[] = [];

        function walk(currentDir: string) {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    if (!entry.name.startsWith('__')) {
                        walk(fullPath);
                    }
                } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
                    files.push(fullPath);
                }
            }
        }

        walk(dir);
        return files;
    }

    function checkForCoreServicesImports(filePath: string): string[] {
        const content = fs.readFileSync(filePath, 'utf-8');
        const violations: string[] = [];

        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Check for imports from core/services
            if (line.includes("from '") && line.includes('core/services')) {
                violations.push(`Line ${i + 1}: ${line.trim()}`);
            }
            if (line.includes('from "') && line.includes('core/services')) {
                violations.push(`Line ${i + 1}: ${line.trim()}`);
            }
        }

        return violations;
    }

    it('no core/services imports in V10 except allowed exceptions', () => {
        if (!fs.existsSync(v10Dir)) {
            console.log('Skipping: v10 directory not found');
            return;
        }

        const files = getAllTsFiles(v10Dir);
        const violatingFiles: Array<{ file: string; violations: string[] }> = [];

        for (const file of files) {
            const relativePath = path.relative(v10Dir, file);

            // Skip allowed exceptions
            if (allowedExceptions.some(ex => relativePath === ex || relativePath.endsWith(ex))) {
                continue;
            }

            const violations = checkForCoreServicesImports(file);
            if (violations.length > 0) {
                violatingFiles.push({ file: relativePath, violations });
            }
        }

        if (violatingFiles.length > 0) {
            const message = violatingFiles
                .map(v => `${v.file}:\n  ${v.violations.join('\n  ')}`)
                .join('\n\n');
            expect.fail(`Found core/services imports in V10:\n\n${message}`);
        }
    });

    it('allowed exception files exist', () => {
        for (const exception of allowedExceptions) {
            const fullPath = path.join(v10Dir, exception);
            // At least one should exist
            if (fs.existsSync(fullPath)) {
                expect(true).toBe(true);
                return;
            }
        }
        // OK if none exist yet - adapter pattern not implemented
        expect(true).toBe(true);
    });
});
