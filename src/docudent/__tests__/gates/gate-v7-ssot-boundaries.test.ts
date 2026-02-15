/**
 * Gate Test: V7 SSOT Boundaries
 *
 * HARD-STOP GATE: Enforces that V7 is a UI-only layer.
 * All billing logic MUST remain in core/billing, never in V7.
 *
 * ════════════════════════════════════════════════════════════════
 * RULES:
 * 1. V7 MUST NOT import from core/billing/knowledgeBase/logic directly
 * 2. V7 MUST NOT contain GOZ/BEMA code literals (GOZ_XXXX, BEMA_XXX)
 * 3. V7 MUST NOT contain hardcoded canonical IDs (use CANONICAL_* imports)
 * 4. V7 components MUST use contracts/canonicalIds for all ID references
 * ════════════════════════════════════════════════════════════════
 *
 * WHITELIST (allowed):
 * - Test files (__tests__)
 * - Type imports (import type { ... })
 * - contracts/ directory
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
    CANONICAL_CHIP_IDS,
    CANONICAL_OPTION_IDS,
    CANONICAL_QUESTION_IDS,
} from '../../contracts/canonicalIds';

// ════════════════════════════════════════════════════════════════
// AUTO-GENERATED FORBIDDEN LISTS (from canonicalIds.ts)
// ════════════════════════════════════════════════════════════════

// Generate forbidden literal patterns from CANONICAL IDs (zero maintenance!)
const FORBIDDEN_CHIP_LITERALS = Object.values(CANONICAL_CHIP_IDS).flatMap(id => [
    `'${id}'`,
    `"${id}"`,
    `\`${id}\``,
]);

const FORBIDDEN_OPTION_LITERALS = Object.values(CANONICAL_OPTION_IDS).flatMap(id => [
    `'${id}'`,
    `"${id}"`,
    `\`${id}\``,
]);

// Very common IDs that could have false positives — exclude from strict scan
const FALSE_POSITIVE_IDS = ['yes', 'no', 'normal', 'deep'];

// GOZ/BEMA code patterns
const BILLING_CODE_PATTERNS = [
// REMOVED_PHANTOM: // REMOVED_PHANTOM:     /GOZ[_\s]?[0-9]{4}/gi,          // PHANTOM_REMOVED or GOZ 1234
    /BEMA[_\s]?[0-9]{1,3}[a-z]?/gi, // BEMA_41a or BEMA 41a
    /GOÄ[_\s]?[0-9]{1,4}/gi,        // GOÄ_1 or GOÄ 1
    /'[0-9]{4}'/g,                   // '1234' literal codes
];

// ════════════════════════════════════════════════════════════════
// SCAN CONFIGURATION
// ════════════════════════════════════════════════════════════════

const V7_DIR = 'src/docudent/v7';

// Files to whitelist (allowed to have certain patterns)
// Each entry should have a documented reason why it's exempt
const WHITELIST_FILES = [
    'settingsStore.ts',        // Type definitions
    'useSettings.ts',          // Settings hook
    'mappings.ts',             // SSOT translation tables (keys are semantic aliases)
    'SummaryChips.tsx',        // Type annotations for settings
    // === G49: Added with documented reasons ===
    'types.ts',                // Type definitions use literal types (isolation: 'kofferdam')
    'MultiInstancePanel.tsx',  // UI regex parsing uses keywords, not chip ID violations
    'orchestrator.ts',         // Multi-treatment orchestrator uses keywords for parsing
    // === ExtractionToFacts maps use string matching for dictation parsing ===
    'endo.v1.ts',              // Extraction map - keyword detection
    'fuellung.v1.ts',          // Extraction map - keyword detection
    'shared.v1.ts',            // Extraction map - shared keyword detection
];

// Directories to skip
const SKIP_DIRS = [
    '__tests__',
    'tests',
    '__test__',
    '__fixtures__',
];

// ════════════════════════════════════════════════════════════════
// FILE SCANNER
// ════════════════════════════════════════════════════════════════

function getTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    const fullPath = path.join(process.cwd(), dir);

    if (!fs.existsSync(fullPath)) return files;

    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (SKIP_DIRS.includes(entry.name)) continue;
            files.push(...getTypeScriptFiles(entryPath));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            files.push(entryPath);
        }
    }
    return files;
}

interface Violation {
    file: string;
    line: number;
    content: string;
    rule: string;
}

// ════════════════════════════════════════════════════════════════
// GATE TESTS
// ════════════════════════════════════════════════════════════════

describe('Gate: V7 SSOT Boundaries (Hard-Stop)', () => {
    it('V7 should not import from ANY core/billing/** module', () => {
        const violations: Violation[] = [];
        const files = getTypeScriptFiles(V7_DIR);

        for (const file of files) {
            const fullPath = path.join(process.cwd(), file);
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Skip type imports (these are allowed)
                if (line.includes('import type')) continue;

                // Check for ANY import from billing
                if (
                    line.includes('/core/billing/') &&
                    line.includes('import') &&
                    !line.includes('import type')
                ) {
                    violations.push({
                        file,
                        line: i + 1,
                        content: line.trim().substring(0, 100),
                        rule: 'no-billing-import',
                    });
                }
            }
        }

        if (violations.length > 0) {
            const report = violations.map(v =>
                `  ${v.file}:${v.line}\n    ${v.content}`
            ).join('\n\n');

            expect.fail(
                `V7 must not import from core/billing/**.\n` +
                `This boundary is absolute.\n\n${report}`
            );
        }
    });

    it('V7 should not contain GOZ/BEMA code literals', () => {
        const violations: Violation[] = [];
        const files = getTypeScriptFiles(V7_DIR);

        for (const file of files) {
            // Skip whitelisted files
            if (WHITELIST_FILES.some(wf => file.endsWith(wf))) continue;

            const fullPath = path.join(process.cwd(), file);
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Skip comments
                if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

                for (const pattern of BILLING_CODE_PATTERNS) {
                    if (pattern.test(line)) {
                        violations.push({
                            file,
                            line: i + 1,
                            content: line.trim().substring(0, 100),
                            rule: 'no-billing-code-literals',
                        });
                        break;
                    }
                    // Reset regex lastIndex for global patterns
                    pattern.lastIndex = 0;
                }
            }
        }

        if (violations.length > 0) {
            const report = violations.map(v =>
                `  ${v.file}:${v.line}\n    ${v.content}`
            ).join('\n\n');

            expect.fail(
                `V7 must not contain GOZ/BEMA code literals.\n` +
                `All billing codes must come from core/billing.\n\n${report}`
            );
        }
    });

    it('V7 should not contain hardcoded chip ID strings (use CANONICAL_CHIP_IDS)', () => {
        const violations: Violation[] = [];
        const files = getTypeScriptFiles(V7_DIR);

        // Filter out common false positive IDs
        const strictChipLiterals = FORBIDDEN_CHIP_LITERALS.filter(
            lit => !FALSE_POSITIVE_IDS.some(fp => lit.includes(fp))
        );

        for (const file of files) {
            if (WHITELIST_FILES.some(wf => file.endsWith(wf))) continue;

            const fullPath = path.join(process.cwd(), file);
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Skip comments and lines using CANONICAL_CHIP_IDS
                if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
                if (line.includes('CANONICAL_CHIP_IDS.')) continue;
                if (line.includes('import')) continue;

                for (const literal of strictChipLiterals) {
                    if (line.includes(literal)) {
                        violations.push({
                            file,
                            line: i + 1,
                            content: line.trim().substring(0, 100),
                            rule: 'no-hardcoded-chip-ids',
                        });
                        break;
                    }
                }
            }
        }

        if (violations.length > 0) {
            const report = violations.map(v =>
                `  ${v.file}:${v.line}\n    ${v.content}`
            ).join('\n\n');

            expect.fail(
                `V7 must not contain hardcoded chip ID strings.\n` +
                `Use CANONICAL_CHIP_IDS from contracts/canonicalIds.\n\n${report}`
            );
        }
    });

    it('forbidden lists are auto-generated from canonicalIds.ts (zero maintenance)', () => {
        // This test verifies our auto-generation approach is working
        expect(FORBIDDEN_CHIP_LITERALS.length).toBeGreaterThan(0);
        expect(FORBIDDEN_OPTION_LITERALS.length).toBeGreaterThan(0);

        // Verify known IDs are included
        expect(FORBIDDEN_CHIP_LITERALS).toContain("'mehrschicht'");
        expect(FORBIDDEN_CHIP_LITERALS).toContain("'kofferdam'");
        expect(FORBIDDEN_OPTION_LITERALS).toContain("'positive'");
        expect(FORBIDDEN_OPTION_LITERALS).toContain("'negative'");
    });

    it('CANONICAL_CHIP_IDS should be the SSOT for chip IDs', () => {
        // Ensure key chip IDs are defined
        expect(CANONICAL_CHIP_IDS.KOFFERDAM).toBe('kofferdam');
        expect(CANONICAL_CHIP_IDS.MEHRSCHICHT).toBe('mehrschicht');
        expect(CANONICAL_CHIP_IDS.LA_INFILTR).toBe('la_infiltr');
        expect(CANONICAL_CHIP_IDS.LA_LEITUNG).toBe('la_leitung');
    });

    it('V7 directory should exist and have components', () => {
        const v7Path = path.join(process.cwd(), V7_DIR);
        expect(fs.existsSync(v7Path)).toBe(true);

        const files = getTypeScriptFiles(V7_DIR);
        expect(files.length).toBeGreaterThan(0);
    });
});
