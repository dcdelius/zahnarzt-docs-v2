/**
 * Gate M48: Pack Addition Requires Zero UI Changes
 * 
 * Adding a new pack should work without modifying UI components.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('gate-m48-pack-addition-requires-zero-ui-changes', () => {
    const uiPaths = [
        'src/docudent/v10/components',
        'src/docudent/v10/ui',
    ];

    // Patterns that indicate treatment-specific branching
    const forbiddenPatterns = [
        /treatmentId\s*===?\s*['"`]endo['"`]/,
        /treatmentId\s*===?\s*['"`]fuellung['"`]/,
        /treatmentId\s*===?\s*['"`]extraction['"`]/,
        /switch\s*\(\s*treatmentId\s*\)/,
    ];

    const allowedPaths = ['__tests__', 'packs/', '.test.ts', '.test.tsx'];

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

    it('V10ReviewStep has no treatment branching', () => {
        const projectRoot = path.resolve(__dirname, '../../../..');
        const file = path.join(projectRoot, 'src/docudent/v10/components/V10ReviewStep.tsx');
        if (!fs.existsSync(file)) return; // Skip if not exists

        const content = fs.readFileSync(file, 'utf-8');
        for (const pattern of forbiddenPatterns) {
            expect(pattern.test(content)).toBe(false);
        }
    });

    it('V10ChipsGroupedPanel has no treatment branching', () => {
        const projectRoot = path.resolve(__dirname, '../../../..');
        const file = path.join(projectRoot, 'src/docudent/v10/components/V10ChipsGroupedPanel.tsx');
        if (!fs.existsSync(file)) return;

        const content = fs.readFileSync(file, 'utf-8');
        for (const pattern of forbiddenPatterns) {
            expect(pattern.test(content)).toBe(false);
        }
    });

    it('V10CommandPalette has no treatment branching', () => {
        const projectRoot = path.resolve(__dirname, '../../../..');
        const file = path.join(projectRoot, 'src/docudent/v10/components/V10CommandPalette.tsx');
        if (!fs.existsSync(file)) return;

        const content = fs.readFileSync(file, 'utf-8');
        for (const pattern of forbiddenPatterns) {
            expect(pattern.test(content)).toBe(false);
        }
    });

    it('usePackUiContract has no treatment branching', () => {
        const projectRoot = path.resolve(__dirname, '../../../..');
        const file = path.join(projectRoot, 'src/docudent/v10/ui/usePackUiContract.ts');
        if (!fs.existsSync(file)) return;

        const content = fs.readFileSync(file, 'utf-8');
        for (const pattern of forbiddenPatterns) {
            expect(pattern.test(content)).toBe(false);
        }
    });
});
