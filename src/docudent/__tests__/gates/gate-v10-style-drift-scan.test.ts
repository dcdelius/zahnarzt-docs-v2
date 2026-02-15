/**
 * Gate: V10 Style Drift Scan (M52)
 * 
 * Scans V10 components for patterns that break V8/V10 Jeton aesthetic.
 * Denylist-based: fails if unwanted imports/patterns are found.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const V10_DIR = join(__dirname, '../../v10');

// Denylist of patterns that indicate style drift
const DENYLIST = [
    // shadcn/ui imports (if these sneak in, they override V8 tokens)
    { pattern: /@\/components\/ui\/button/, reason: 'shadcn button import breaks V8 style' },
    { pattern: /@\/components\/ui\/card/, reason: 'shadcn card import breaks V8 style' },
    { pattern: /@\/components\/ui\/input/, reason: 'shadcn input import breaks V8 style' },
    // Tailwind utility clusters that differ from V8 tokens (examples)
    { pattern: /className=["'][^"']*rounded-md[^"']*shadow-md[^"']*bg-white/, reason: 'Generic tailwind cluster, use V8 tokens' },
    // Material UI imports (if used outside intended scope)
    { pattern: /from ['"]@mui\/material/, reason: 'MUI import, use V8 Jeton components' },
];

// Allowlist of files to skip (generated, tests, etc)
const SKIP_PATTERNS = [
    /__tests__/,
    /\.test\./,
    /\.spec\./,
];

function getAllTsxFiles(dir: string): string[] {
    const files: string[] = [];

    try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
            const fullPath = join(dir, entry);
            try {
                const stat = statSync(fullPath);
                if (stat.isDirectory()) {
                    files.push(...getAllTsxFiles(fullPath));
                } else if (entry.endsWith('.tsx')) {
                    // Check skip patterns
                    if (!SKIP_PATTERNS.some(p => p.test(fullPath))) {
                        files.push(fullPath);
                    }
                }
            } catch {
                // Skip inaccessible files
            }
        }
    } catch {
        // Skip inaccessible directories
    }

    return files;
}

describe('Gate: V10 Style Drift Scan (M52)', () => {
    const tsxFiles = getAllTsxFiles(V10_DIR);

    it('found V10 component files to scan', () => {
        expect(tsxFiles.length).toBeGreaterThan(0);
    });

    it('no shadcn/ui imports in V10 components', () => {
        const violations: string[] = [];

        for (const file of tsxFiles) {
            const content = readFileSync(file, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                for (const rule of DENYLIST) {
                    if (rule.pattern.test(line)) {
                        violations.push(`${file}:${i + 1} - ${rule.reason}`);
                    }
                }
            }
        }

        if (violations.length > 0) {
            console.error('Style drift violations found:\n' + violations.join('\n'));
        }

        expect(violations).toEqual([]);
    });

    describe('V8 Jeton Aesthetics Present', () => {
        it('V10DebugDrawer uses Jeton glass style (blur, rgba background)', () => {
            const drawerPath = join(V10_DIR, 'components/V10DebugDrawer.tsx');
            const content = readFileSync(drawerPath, 'utf-8');

            expect(content).toContain('backdropFilter');
            expect(content).toContain('blur');
            expect(content).toContain('rgba');
        });

        it('V10 selectors use gradient Jeton style', () => {
            const selectorFiles = ['V10InsuranceSelector.tsx', 'V10TextLengthSelector.tsx'];

            for (const file of selectorFiles) {
                const path = join(V10_DIR, 'components', file);
                const content = readFileSync(path, 'utf-8');

                // V8 Jeton uses gradients like 'linear-gradient(135deg, #FF6B6B, #FF8E53)'
                expect(content).toMatch(/linear-gradient|gradient/i);
            }
        });
    });
});
