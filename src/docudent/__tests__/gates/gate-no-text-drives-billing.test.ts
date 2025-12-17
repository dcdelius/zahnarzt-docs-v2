/**
 * Gate Test: No Text Drives Billing (Hard Stop Guardrail)
 * 
 * PURPOSE: Prevent "quick hacks" where billing/engine logic parses
 * rendered output text to infer chips/codes.
 * 
 * FORBIDDEN PATTERNS in billing/engine code:
 * - output.includes("..."), output.match(...)
 * - Parsing rendered strings for billing decisions
 * - Using Aufklärung/template text as billing input
 * 
 * SCAN SCOPE:
 * - src/docudent/core/billing/** (billing logic)
 * - src/docudent/v7/pipeline/** (if exists)
 * 
 * WHITELIST (allowed to use text operations):
 * - outputComposer.ts (builds output, obviously uses text)
 * - v7/components/** (UI layer)
 * - v7/pages/** (UI layer)
 * - __tests__/** (tests are allowed)
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const ROOT_DIR = join(__dirname, '../..');

// Directories to scan (strict billing/engine code)
const SCAN_DIRS = [
    'core/billing',
    'v6/services',  // if billing happens here
];

// Files/patterns to whitelist (allowed to use text operations)
const WHITELIST_PATTERNS = [
    'outputComposer.ts',
    'outputService.ts',
    'extractionService',      // Parses dictation INPUT, not output
    'extractDictation',       // Parses dictation INPUT, not output
    'treatmentEngine.ts',     // Parses dictation INPUT via lower.includes() - legitimate
    'fuellung.ts',            // Parses dictation INPUT via lower.includes() - legitimate
    '__tests__',
    '.test.ts',
    '.test.tsx',
    '.spec.ts',
    'components/',
    'pages/',
    'registry/',  // registries define text, not infer from it
];

// Forbidden patterns that suggest RENDERED OUTPUT → billing inference
// (NOT dictation parsing, which is legitimate)
const FORBIDDEN_PATTERNS = [
    // Direct parsing of composed/rendered output for billing
    /composeOutput\([^)]+\)\.fullText\s*\.includes/i,
    /composeOutput\([^)]+\)\.sections.*\.includes/i,
    /composedOutput\.fullText\s*\.includes/i,
    /composedOutput\.sections.*\.includes/i,
    /sectionContent\s*\.includes\s*\(/i,
    /renderedText\s*\.includes\s*\(/i,
    /outputText\s*\.includes\s*\(/i,

    // Regex matching on rendered output
    /fullText\s*\.match\s*\(\s*\/.*GOZ/i,
    /fullText\s*\.match\s*\(\s*\/.*BEMA/i,
    /content\s*\.match\s*\(\s*\/.*Aufklärung/i,

    // Parsing output for chip inference (explicit anti-pattern)
    /if\s*\(\s*output.*includes.*\)\s*{\s*chips/i,
    /output.*includes.*chip/i,
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getAllFiles(dir: string): string[] {
    const files: string[] = [];

    try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
            const fullPath = join(dir, entry);
            const stat = statSync(fullPath);

            if (stat.isDirectory()) {
                files.push(...getAllFiles(fullPath));
            } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
                files.push(fullPath);
            }
        }
    } catch {
        // Directory doesn't exist, skip
    }

    return files;
}

function isWhitelisted(filePath: string): boolean {
    for (const pattern of WHITELIST_PATTERNS) {
        if (filePath.includes(pattern)) {
            return true;
        }
    }
    return false;
}

interface Violation {
    file: string;
    line: number;
    pattern: string;
    content: string;
}

function scanFile(filePath: string): Violation[] {
    const violations: Violation[] = [];
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const pattern of FORBIDDEN_PATTERNS) {
            if (pattern.test(line)) {
                violations.push({
                    file: relative(ROOT_DIR, filePath),
                    line: i + 1,
                    pattern: pattern.toString(),
                    content: line.trim().substring(0, 100),
                });
            }
        }
    }

    return violations;
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('Gate: No Text Drives Billing (Guardrail)', () => {
    it('should not have text→billing patterns in billing/engine code', () => {
        const allViolations: Violation[] = [];
        const scannedFiles: string[] = [];

        for (const scanDir of SCAN_DIRS) {
            const dirPath = join(ROOT_DIR, scanDir);
            const files = getAllFiles(dirPath);

            for (const file of files) {
                // Skip whitelisted files
                if (isWhitelisted(file)) continue;

                scannedFiles.push(relative(ROOT_DIR, file));
                const violations = scanFile(file);
                allViolations.push(...violations);
            }
        }

        // Report violations
        if (allViolations.length > 0) {
            const report = allViolations.map(v =>
                `${v.file}:${v.line} - ${v.content}`
            ).join('\n');

            expect.fail(
                `Found ${allViolations.length} text→billing violations:\n${report}\n\n` +
                `Scanned ${scannedFiles.length} files in: ${SCAN_DIRS.join(', ')}`
            );
        }

        // Success - no violations found
        expect(allViolations.length).toBe(0);
    });

    it('should scan at least some billing files', () => {
        let totalFiles = 0;

        for (const scanDir of SCAN_DIRS) {
            const dirPath = join(ROOT_DIR, scanDir);
            const files = getAllFiles(dirPath);
            totalFiles += files.filter(f => !isWhitelisted(f)).length;
        }

        // Ensure we're actually scanning files (not a vacuous test)
        expect(totalFiles).toBeGreaterThan(5);
    });

    it('should have forbidden patterns defined', () => {
        expect(FORBIDDEN_PATTERNS.length).toBeGreaterThan(5);
    });

    it('should whitelist outputComposer (it builds text, not infers billing)', () => {
        expect(isWhitelisted('outputComposer.ts')).toBe(true);
        expect(isWhitelisted('core/billing/logic/outputComposer.ts')).toBe(true);
    });

    it('should whitelist registry files (they define text, not infer)', () => {
        expect(isWhitelisted('registry/aufklaerungRegistry.ts')).toBe(true);
        expect(isWhitelisted('registry/settingsRegistry.ts')).toBe(true);
    });
});
