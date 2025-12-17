/**
 * Gate Test: No Hardcoded Chip IDs
 * 
 * HARD-STOP GATE: Scans production files for hardcoded chip ID strings.
 * All chip IDs MUST use CANONICAL_CHIP_IDS from contracts/canonicalIds.ts.
 * 
 * ════════════════════════════════════════════════════════════════
 * WHITELIST (allowed to contain raw chip strings):
 * ════════════════════════════════════════════════════════════════
 * - Test files (__tests__)
 * - canonicalIds.ts (defines the constants)
 * - settingsStore.ts (type unions, not chip IDs)
 * - SummaryChips.tsx (UI labels, not chip IDs)
 * - outputComposer.ts (GOZ billing codes, not chip IDs)
 * - settingsRegistry.ts (uses CANONICAL_CHIP_IDS.*)
 * - V5 legacy files (deprecated, will be removed)
 * - _shared/engine.ts (deprecated, to be deleted)
 * - JSON files (question_bank.json, fuellung_unified.json)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ════════════════════════════════════════════════════════════════
// SCAN CONFIGURATION
// ════════════════════════════════════════════════════════════════

// Production code directories to scan
const SCAN_DIRS = [
    'src/docudent/v6/services',
    'src/docudent/v7',
    'src/docudent/core/billing/knowledgeBase/logic',
    'src/docudent/core/billing/knowledgeBase/registry',
];

// Files to whitelist (SSOT sources, type definitions, deprecated)
const WHITELIST_FILES = [
    'canonicalIds.ts',           // SSOT - defines the constants
    'settingsStore.ts',          // Type unions, not chip ID strings
    'SummaryChips.tsx',          // UI labels, not chip IDs
    'outputComposer.ts',         // GOZ billing codes, not chip IDs
    'settingsRegistry.ts',       // Uses CANONICAL_CHIP_IDS.* (verified)
    'mappings.ts',               // Answer translation mapping
    'stubExtractor.ts',          // Test stub
    'normalizeExtractedData.ts', // Normalization maps
    'extractionService.ts',      // Dictation keyword detection
    'extractionServiceV2.ts',    // Dictation keyword detection
    'answerEffectiveness.ts',    // Uses question keys, not chip IDs
];

// Directories to skip entirely (V5 legacy, deprecated)
const SKIP_DIRS = [
    'v5',                         // Legacy, to be removed
    '_shared',                    // Contains deprecated engine.ts
    '__tests__',                  // Test files
    'tests',                      // Test files
    '__test__',                   // Test files
];

// ════════════════════════════════════════════════════════════════
// CHIP ID PATTERNS (violations)
// ════════════════════════════════════════════════════════════════

// All canonical chip IDs that must not be hardcoded
const CANONICAL_CHIP_STRINGS = [
    'mehrschicht',
    'adhasiv',
    'adhaesiv',
    'la_infiltr',
    'la_leitung',
    'ohne_la',
    'kofferdam',
    'rel_trocken',
    'exkavation',
    'komposit_basic',
    'finishing',
    'cp',
    'vipr_pos',
    'vipr_neg',
    'perk_pos',
    'perk_neg',
    'fluor',
];

// Build regex patterns for chip ID violations
function buildViolationPatterns(): RegExp[] {
    const patterns: RegExp[] = [];

    for (const chipId of CANONICAL_CHIP_STRINGS) {
        // Skip very short chip IDs that might have false positives
        if (chipId === 'cp' || chipId === 'p') continue;

        // Match .push('chipId') or .add('chipId')
        patterns.push(new RegExp(`\\.push\\(['"\`]${chipId}['"\`]\\)`));
        patterns.push(new RegExp(`\\.add\\(['"\`]${chipId}['"\`]\\)`));

        // Match array literals ['chipId', ...] or [..., 'chipId']
        patterns.push(new RegExp(`\\[['"\`]${chipId}['"\`]`));
        patterns.push(new RegExp(`,\\s*['"\`]${chipId}['"\`]\\s*\\]`));

        // Match = ['chipId'] assignments
        patterns.push(new RegExp(`=\\s*\\[['"\`]${chipId}['"\`]`));
    }

    return patterns;
}

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
            // Skip whitelisted directories
            if (SKIP_DIRS.includes(entry.name)) continue;
            files.push(...getTypeScriptFiles(entryPath));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            // Skip whitelisted files
            if (WHITELIST_FILES.includes(entry.name)) continue;
            files.push(entryPath);
        }
    }
    return files;
}

// ════════════════════════════════════════════════════════════════
// GATE TESTS
// ════════════════════════════════════════════════════════════════

describe('Gate: No Hardcoded Chip IDs (Hard-Stop)', () => {
    const VIOLATION_PATTERNS = buildViolationPatterns();

    it('production files should not contain hardcoded chip ID strings', () => {
        const violations: Array<{ file: string; line: number; content: string }> = [];

        for (const dir of SCAN_DIRS) {
            const files = getTypeScriptFiles(dir);

            for (const file of files) {
                const fullPath = path.join(process.cwd(), file);
                const content = fs.readFileSync(fullPath, 'utf-8');
                const lines = content.split('\n');

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];

                    // Skip comments
                    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

                    // Skip lines that USE CANONICAL_CHIP_IDS (correct usage!)
                    if (line.includes('CANONICAL_CHIP_IDS.')) continue;

                    for (const pattern of VIOLATION_PATTERNS) {
                        if (pattern.test(line)) {
                            violations.push({
                                file,
                                line: i + 1,
                                content: line.trim().substring(0, 100),
                            });
                            break; // Don't double-count same line
                        }
                    }
                }
            }
        }

        if (violations.length > 0) {
            const violationReport = violations.map(v =>
                `  ${v.file}:${v.line}\n    ${v.content}`
            ).join('\n\n');

            expect.fail(
                `Found ${violations.length} hardcoded chip ID(s). Use CANONICAL_CHIP_IDS instead.\n\n` +
                `${violationReport}\n\n` +
                `Fix: Import { CANONICAL_CHIP_IDS } from '../../contracts/canonicalIds'`
            );
        }

        expect(violations).toHaveLength(0);
    });

    it('canonicalIds.ts should exist and define required chip IDs', () => {
        const canonicalPath = path.join(process.cwd(), 'src/docudent/contracts/canonicalIds.ts');
        expect(fs.existsSync(canonicalPath)).toBe(true);

        const content = fs.readFileSync(canonicalPath, 'utf-8');

        // Verify required chip IDs are defined
        expect(content).toContain('MEHRSCHICHT:');
        expect(content).toContain('ADHAESIV:');
        expect(content).toContain('LA_INFILTR:');
        expect(content).toContain('LA_LEITUNG:');
        expect(content).toContain('KOFFERDAM:');
        expect(content).toContain('REL_TROCKEN:');
        expect(content).toContain('EXKAVATION:');
        expect(content).toContain('KOMPOSIT_BASIC:');
        expect(content).toContain('FINISHING:');
    });

    it('ANSWER_TO_CHIP mapping should exist for MKV chips', () => {
        const canonicalPath = path.join(process.cwd(), 'src/docudent/contracts/canonicalIds.ts');
        const content = fs.readFileSync(canonicalPath, 'utf-8');

        expect(content).toContain('ANSWER_TO_CHIP');
        expect(content).toContain('CANONICAL_QUESTION_IDS.MEHRSCHICHT');
        expect(content).toContain('CANONICAL_QUESTION_IDS.ADHAESIV');
    });

    it('settingsRegistry should use CANONICAL_CHIP_IDS constants', () => {
        const registryPath = path.join(
            process.cwd(),
            'src/docudent/core/billing/knowledgeBase/registry/settingsRegistry.ts'
        );
        expect(fs.existsSync(registryPath)).toBe(true);

        const content = fs.readFileSync(registryPath, 'utf-8');

        // Must import CANONICAL_CHIP_IDS
        expect(content).toContain('import { CANONICAL_CHIP_IDS }');

        // Must use constants, not raw strings
        expect(content).toContain('CANONICAL_CHIP_IDS.KOFFERDAM');
        expect(content).toContain('CANONICAL_CHIP_IDS.REL_TROCKEN');
        expect(content).toContain('CANONICAL_CHIP_IDS.LA_LEITUNG');
        expect(content).toContain('CANONICAL_CHIP_IDS.LA_INFILTR');
    });
});
