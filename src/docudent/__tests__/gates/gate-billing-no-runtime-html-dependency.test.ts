/**
 * Gate: Billing No Runtime HTML Dependency
 *
 * Ensures runtime code (v7/v10) does not depend on HTML files.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Gate: Billing No Runtime HTML Dependency', () => {
    const forbiddenPatterns = [
        /\.html['"`]/,
        /Analogleistungen/,
        /from\s+['"].*secondary\//,
        /require\s*\(\s*['"].*secondary\//,
    ];

    function scanDirectory(dirPath: string): string[] {
        const violations: string[] = [];

        if (!fs.existsSync(dirPath)) return violations;

        const files = fs.readdirSync(dirPath, { recursive: true }) as string[];

        for (const file of files) {
            if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
            if (file.includes('__tests__') || file.includes('__test__')) continue;
            if (file.includes('.test.')) continue;

            const fullPath = path.join(dirPath, file);
            const stat = fs.statSync(fullPath);
            if (!stat.isFile()) continue;

            const content = fs.readFileSync(fullPath, 'utf-8');

            for (const pattern of forbiddenPatterns) {
                if (pattern.test(content)) {
                    violations.push(`${file}: matches ${pattern.source}`);
                }
            }
        }

        return violations;
    }

    it('v7 runtime has no HTML dependencies', () => {
        const v7Path = path.join(process.cwd(), 'src/docudent/v7');
        const violations = scanDirectory(v7Path);

        expect(violations, `HTML dependencies found:\n${violations.join('\n')}`).toHaveLength(0);
    });

    it('v10 runtime has no HTML dependencies', () => {
        const v10Path = path.join(process.cwd(), 'src/docudent/v10');
        const violations = scanDirectory(v10Path);

        expect(violations, `HTML dependencies found:\n${violations.join('\n')}`).toHaveLength(0);
    });

    it('v7/v10 do not import from secondary/', () => {
        const v7Path = path.join(process.cwd(), 'src/docudent/v7');
        const v10Path = path.join(process.cwd(), 'src/docudent/v10');

        const v7Violations = scanDirectory(v7Path).filter(v => v.includes('secondary'));
        const v10Violations = scanDirectory(v10Path).filter(v => v.includes('secondary'));

        const allViolations = [...v7Violations, ...v10Violations];

        expect(allViolations, `secondary/ imports found:\n${allViolations.join('\n')}`).toHaveLength(0);
    });
});
