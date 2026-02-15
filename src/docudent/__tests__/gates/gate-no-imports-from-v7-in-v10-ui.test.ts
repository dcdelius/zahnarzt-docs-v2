/**
 * gate-no-imports-from-v7-in-v10-ui.test.ts
 * 
 * GATE: V10 UI must not import from V7 (except via explicit barrel)
 * Ensures V10 is fully decoupled from V7 implementation.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const V10_UI_DIRS = [
    'src/docudent/v10/pages',
    'src/docudent/v10/components',
    'src/docudent/v10/hooks'
];

const FORBIDDEN_PATTERN = /from\s+['"].*\/v7\//;

// Allowlist for transition period
// G50: The barrel (index.ts) is INTENTIONALLY allowed to re-export V7 components
// This is the controlled migration pathway. Actual V10 code must not import v7 directly.
const ALLOWLIST: string[] = [
    'src/docudent/v10/components/index.ts', // Migration barrel - deliberately re-exports V7
];

interface Violation {
    file: string;
    line: number;
    content: string;
}

function scanForV7Imports(dir: string): Violation[] {
    const violations: Violation[] = [];
    const root = process.cwd();
    const fullDir = path.join(root, dir);

    if (!fs.existsSync(fullDir)) return violations;

    const files = fs.readdirSync(fullDir, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(fullDir, file.name);
        const relativePath = path.relative(root, fullPath);

        if (file.isDirectory()) {
            violations.push(...scanForV7Imports(relativePath));
        } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
            // Skip allowlisted files
            if (ALLOWLIST.includes(relativePath)) continue;

            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');

            lines.forEach((line, idx) => {
                if (FORBIDDEN_PATTERN.test(line)) {
                    violations.push({
                        file: relativePath,
                        line: idx + 1,
                        content: line.trim()
                    });
                }
            });
        }
    }

    return violations;
}

describe('gate-no-imports-from-v7-in-v10-ui', () => {
    it('V10 pages must not import from V7', () => {
        const violations = scanForV7Imports('src/docudent/v10/pages');

        if (violations.length > 0) {
            console.error('V7 imports found in V10 pages:');
            violations.forEach(v => console.error(`  ${v.file}:${v.line}: ${v.content}`));
        }

        // G50: Enforce mode - V10 pages must not import from V7
        expect(violations).toHaveLength(0);
    });

    it('V10 components must not import from V7 directly', () => {
        const violations = scanForV7Imports('src/docudent/v10/components');

        // Filter out the barrel file which is allowed to re-export
        const realViolations = violations.filter(v => !v.file.includes('index.ts'));

        if (realViolations.length > 0) {
            console.error('V7 imports found in V10 components:');
            realViolations.forEach(v => console.error(`  ${v.file}:${v.line}: ${v.content}`));
        }

        // G50: Enforce mode for actual components (barrel is allowlisted)
        expect(realViolations).toHaveLength(0);
    });

    it('V10 hooks must not import from V7', () => {
        const violations = scanForV7Imports('src/docudent/v10/hooks');

        if (violations.length > 0) {
            console.error('V7 imports found in V10 hooks:');
            violations.forEach(v => console.error(`  ${v.file}:${v.line}: ${v.content}`));
        }

        // G50: Enforce mode - V10 hooks must not import from V7
        expect(violations).toHaveLength(0);
    });

    it('should count total V7 references in V10 UI', () => {
        let totalViolations = 0;

        for (const dir of V10_UI_DIRS) {
            const violations = scanForV7Imports(dir);
            totalViolations += violations.length;
        }

        console.log(`Total V7 references in V10 UI: ${totalViolations}`);

        // This test always passes but logs the count
        expect(typeof totalViolations).toBe('number');
    });
});
