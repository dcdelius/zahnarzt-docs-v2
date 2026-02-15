/**
 * Gate M45: No Treatment Branching in UI
 * 
 * UI components must not contain if(treatmentId === 'endo') style branching.
 * Treatment logic lives in packs/contracts only.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('gate-m45-no-treatment-branching-in-ui', () => {
    // UI component paths to check (NOT packs, NOT tests)
    const uiPaths = [
        'src/docudent/v10/components',
        'src/docudent/v10/ui',
        'src/docudent/v10/settings',
    ];

    const forbiddenPatterns = [
        /if\s*\(\s*treatmentId\s*===?\s*['"`]endo['"`]\s*\)/,
        /if\s*\(\s*treatmentId\s*===?\s*['"`]fuellung['"`]\s*\)/,
        /treatmentId\s*===?\s*['"`]endo['"`]/,
        /treatmentId\s*===?\s*['"`]fuellung['"`]/,
        /switch\s*\(\s*treatmentId\s*\)/,
    ];

    // Allow in these paths
    const allowedPaths = [
        '__tests__',
        'packs/',
        'qa/',
        '.test.ts',
        '.test.tsx',
    ];

    function isAllowedPath(filePath: string): boolean {
        return allowedPaths.some(p => filePath.includes(p));
    }

    function scanDirectory(dir: string): string[] {
        const files: string[] = [];
        if (!fs.existsSync(dir)) return files;

        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                files.push(...scanDirectory(fullPath));
            } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
                files.push(fullPath);
            }
        }
        return files;
    }

    it('no forbidden treatment branching in UI code', () => {
        const violations: string[] = [];
        const projectRoot = path.resolve(__dirname, '../../../..');

        for (const uiPath of uiPaths) {
            const fullPath = path.join(projectRoot, uiPath);
            const files = scanDirectory(fullPath);

            for (const file of files) {
                if (isAllowedPath(file)) continue;

                const content = fs.readFileSync(file, 'utf-8');
                for (const pattern of forbiddenPatterns) {
                    if (pattern.test(content)) {
                        violations.push(`${file}: matches ${pattern.source}`);
                    }
                }
            }
        }

        expect(violations).toEqual([]);
    });

    it('packs define treatment-specific logic (not UI)', () => {
        // This is the correct place for treatment differences
        const projectRoot = path.resolve(__dirname, '../../../..');
        const endoPack = path.join(projectRoot, 'src/docudent/v10/packs/endo/pack.ts');
        const fuellungPack = path.join(projectRoot, 'src/docudent/v10/packs/fuellung/pack.ts');

        expect(fs.existsSync(endoPack)).toBe(true);
        expect(fs.existsSync(fuellungPack)).toBe(true);
    });
});
