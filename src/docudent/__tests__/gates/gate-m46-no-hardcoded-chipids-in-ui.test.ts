/**
 * Gate M46: No Hardcoded ChipIds in UI
 * 
 * UI must not contain hardcoded chip ID arrays.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('gate-m46-no-hardcoded-chipids-in-ui', () => {
    // UI paths to check
    const uiPaths = [
        'src/docudent/v10/components',
        'src/docudent/v10/ui',
    ];

    // Forbidden hardcoded chip ID patterns in arrays
    const forbiddenPatterns = [
        /\[\s*['"`]la_infiltr['"`]/,
        /\[\s*['"`]la_leitung['"`]/,
        /\[\s*['"`]wf_kalt['"`]/,
        /\[\s*['"`]wf_warm['"`]/,
        /\[\s*['"`]kofferdam['"`]\s*,\s*['"`]la/,  // Array with multiple known chips
    ];

    // Allowed in these paths
    const allowedPaths = [
        '__tests__',
        'packs/',
        'qa/',
        '.test.ts',
        '.test.tsx',
        'settings/', // Settings can reference chip IDs for mapping
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

    it('no hardcoded chip ID arrays in UI code', () => {
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

    it('chip labels come from pack contract (documented)', () => {
        // This gate documents that chip labels should come from contract
        const projectRoot = path.resolve(__dirname, '../../../..');
        const groupedPanel = path.join(projectRoot, 'src/docudent/v10/components/V10ChipsGroupedPanel.tsx');

        const content = fs.readFileSync(groupedPanel, 'utf-8');

        // Should use getPack or contract for labels
        expect(content).toContain('getPack');
    });
});
