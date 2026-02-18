/**
 * Gate Test: No Hardcoded Billing Strings in V10 Runtime
 *
 * Contract: V10 runtime code MUST NOT contain hardcoded billing codes like
 * "BEMA_13c" or "GOZ_2060". Billing must flow via BillingRef/DB/KB references.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { resolve, join } from 'path';

const V10_RUNTIME_DIRS = [
    'src/docudent/v10/pipeline',
    'src/docudent/v10/procedure',
    'src/docudent/v10/renderer',
    'src/docudent/v10/output',
    'src/docudent/v10/facts',
    'src/docudent/v10/settings',
    'src/docudent/v10/preanalysis',
    'src/docudent/v10/multitreatment',
    'src/docudent/v10/kzv/registry',
    'src/docudent/v10/billing',
];

// Patterns that indicate hardcoded billing codes in runtime
const FORBIDDEN_PATTERNS = [
    /['"`]BEMA_\w+['"`]/g,   // String literals: "BEMA_13c"
    /['"`]GOZ_\w+['"`]/g,    // String literals: "GOZ_2060"
    /['"`]BEL_\w+['"`]/g,    // String literals: "BEL_001"
    /['"`]GOAE_\w+['"`]/g,   // String literals: "GOAE_1"
];

// Files to skip (tests, configs, etc.)
const SKIP_PATTERNS = [
    /__tests__/,
    /\.test\.ts$/,
    /\.test\.tsx$/,
    /\.spec\.ts$/,
    /fixtures/,
    /golden/,
    /\/qa\//,
    /\/diagnostics\//,
    /\/kb\/combinability\//,
    /\/packs\/.*\/combinability\.ts$/,
];

function getAllTsFiles(dir: string): string[] {
    const files: string[] = [];
    const absDir = resolve(process.cwd(), dir);

    if (!existsSync(absDir)) {
        return files;
    }

    const entries = readdirSync(absDir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = join(absDir, entry.name);

        if (entry.isDirectory()) {
            files.push(...getAllTsFiles(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            // Skip test files
            const shouldSkip = SKIP_PATTERNS.some(p => p.test(fullPath));
            if (!shouldSkip) {
                files.push(fullPath);
            }
        }
    }

    return files;
}

function findForbiddenBillingStrings(filePath: string): string[] {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const violations: string[] = [];

    lines.forEach((line, index) => {
        // Skip comments
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
            return;
        }

        // Skip lines that are clearly type definitions or imports
        if (trimmed.includes('type ') || trimmed.includes('interface ') || trimmed.startsWith('import')) {
            return;
        }

        for (const pattern of FORBIDDEN_PATTERNS) {
            // Reset pattern state for each line
            pattern.lastIndex = 0;
            const matches = line.match(pattern);
            if (matches) {
                violations.push(`${filePath}:${index + 1}: ${matches.join(', ')}`);
            }
        }
    });

    return violations;
}

describe('Gate: No Hardcoded Billing Strings in V10 Runtime', () => {
    it('should NOT contain hardcoded BEMA/GOZ/BEL strings in runtime code', () => {
        const allViolations: string[] = [];

        for (const dir of V10_RUNTIME_DIRS) {
            const files = getAllTsFiles(dir);

            for (const file of files) {
                const violations = findForbiddenBillingStrings(file);
                allViolations.push(...violations);
            }
        }

        if (allViolations.length > 0) {
            console.error('FORBIDDEN BILLING STRINGS FOUND:');
            allViolations.forEach(v => console.error(`  ${v}`));
        }

        expect(allViolations).toEqual([]);
    });

    it('runtime paths should exist', () => {
        // Verify at least the main paths exist
        expect(existsSync('src/docudent/v10/pipeline')).toBe(true);
        expect(existsSync('src/docudent/v10/output')).toBe(true);
    });
});
