/**
 * Gate Test: No Comment Index in UI
 * 
 * Security test to ensure comment indices are never imported
 * in UI/frontend code paths.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════
// FORBIDDEN PATTERNS IN UI CODE
// ═══════════════════════════════════════════════════════════════

const FORBIDDEN_IMPORTS = [
    'commentIndex_analog.json',
    'commentIndex_bema.json',
    'commentIndex_goz.json',
    'commentIndex_',
    'comment_cards.json',
    'sections":',        // JSON with sections array
    'evidenceSnippet',
];

const UI_DIRECTORIES = [
    'src/docudent/v5/pages',
    'src/docudent/v5/components',
    'src/docudent/v5/hooks',
    'src/pages',
    'src/components',
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function scanDirectory(dir: string, extensions: string[]): string[] {
    const results: string[] = [];
    const baseDir = path.join(process.cwd(), dir);

    if (!fs.existsSync(baseDir)) {
        return results;
    }

    function walkDir(currentDir: string) {
        try {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    walkDir(fullPath);
                } else if (extensions.some(ext => entry.name.endsWith(ext))) {
                    results.push(fullPath);
                }
            }
        } catch {
            // Directory may not exist
        }
    }

    walkDir(baseDir);
    return results;
}

function scanFileForPatterns(filePath: string, patterns: string[]): string[] {
    const violations: string[] = [];

    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        for (const pattern of patterns) {
            if (content.includes(pattern)) {
                violations.push(`${filePath} contains: "${pattern}"`);
            }
        }
    } catch {
        // File may not be readable
    }

    return violations;
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('GATE: No Comment Index in UI', () => {
    it('no UI files import commentIndex_*.json', () => {
        const allViolations: string[] = [];

        for (const dir of UI_DIRECTORIES) {
            const files = scanDirectory(dir, ['.tsx', '.ts', '.jsx', '.js']);
            for (const file of files) {
                const violations = scanFileForPatterns(file, [
                    'commentIndex_analog',
                    'commentIndex_bema',
                    'commentIndex_goz',
                    'comment_cards.json'
                ]);
                allViolations.push(...violations);
            }
        }

        if (allViolations.length > 0) {
            console.error('VIOLATIONS:', allViolations);
        }

        expect(allViolations.length).toBe(0);
    });

    it('no UI files reference evidenceSnippet', () => {
        const allViolations: string[] = [];

        for (const dir of UI_DIRECTORIES) {
            const files = scanDirectory(dir, ['.tsx', '.jsx']);
            for (const file of files) {
                const violations = scanFileForPatterns(file, ['evidenceSnippet']);
                allViolations.push(...violations);
            }
        }

        expect(allViolations.length).toBe(0);
    });

    it('analogResolver exports do not include raw sections', () => {
        // This checks the resolver module directly
        const resolverPath = path.join(process.cwd(), 'src/docudent/core/billing/knowledgeBase/logic/analogResolver.ts');

        if (fs.existsSync(resolverPath)) {
            const content = fs.readFileSync(resolverPath, 'utf-8');

            // Should NOT export sections/snippets fields in return objects
            expect(content).not.toMatch(/sections:\s*\[/);
            expect(content).not.toMatch(/export.*sections/);
        }
    });

    it('thin index is used, not full index', () => {
        const resolverPath = path.join(process.cwd(), 'src/docudent/core/billing/knowledgeBase/logic/analogResolver.ts');

        if (fs.existsSync(resolverPath)) {
            const content = fs.readFileSync(resolverPath, 'utf-8');

            // Should use thin index
            expect(content).toContain('commentIndex_analog_thin.json');
        }
    });

    it('vite config blocks large JSON imports', () => {
        const viteConfigPath = path.join(process.cwd(), 'vite.config.js');

        if (fs.existsSync(viteConfigPath)) {
            const content = fs.readFileSync(viteConfigPath, 'utf-8');

            // Should have the blocker plugin
            expect(content).toContain('blockLargeJsonImports');
        }
    });
});
