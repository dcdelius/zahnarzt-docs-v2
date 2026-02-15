/**
 * Gate Test: Medical SSOT — No Askback Logic Outside core/medical/
 *
 * POLICY ENFORCEMENT TEST
 *
 * Ensures that medical askback logic lives ONLY in core/medical/.
 * No other module should generate, modify, or filter MedicalAskbacks.
 *
 * ALLOWLIST (modules that MAY interact with askbacks):
 * - core/medical/medicalEngine.ts: Generates askbacks (SSOT)
 * - core/questions/questionServiceV2.ts: Consumes askbacks in STEP0 only
 * - contracts/medical.ts: Type definitions only
 * - __tests__/*: Test files
 *
 * BLOCKLIST (patterns forbidden outside core/medical/):
 * - hardAskbacks.push / softAskbacks.push
 * - new MedicalAskback / MedicalAskback[] construction
 * - Importing medicalAskbackMatrix directly (only medicalEngine should)
 *
 * INVARIANTS:
 * - Medical askbacks are SSOT from MEDICAL layer
 * - ASK/UI only renders, never decides
 * - Presentation policy groups, never filters
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

// Test runs from src/docudent/__tests__/gates/
// Go up 4 levels to get to repo root
const REPO_ROOT = path.resolve(__dirname, '../../../..');
const DOCUDENT_ROOT = path.join(REPO_ROOT, 'src/docudent');

function getFilesRecursive(dir: string, extensions: string[]): string[] {
    const files: string[] = [];

    function walk(currentDir: string) {
        if (!fs.existsSync(currentDir)) return;

        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                // Skip node_modules, dist, etc.
                if (!['node_modules', 'dist', '.git', 'coverage'].includes(entry.name)) {
                    walk(fullPath);
                }
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name);
                if (extensions.includes(ext)) {
                    files.push(fullPath);
                }
            }
        }
    }

    walk(dir);
    return files;
}

function isAllowedPath(filePath: string): boolean {
    const relativePath = path.relative(DOCUDENT_ROOT, filePath).replace(/\\/g, '/');

    // Allowlist: files that MAY contain askback logic
    const allowlist = [
        'core/medical/',           // SSOT for askbacks
        'contracts/medical.ts',    // Type definitions
        '__tests__/',              // Test files
        '.test.ts',                // Test files
        '.spec.ts',                // Test files
    ];

    return allowlist.some(allowed => relativePath.includes(allowed));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASKBACK GENERATION PATTERNS (FORBIDDEN outside allowlist)
// ═══════════════════════════════════════════════════════════════════════════════

const FORBIDDEN_PATTERNS = [
    {
        pattern: /hardAskbacks\.push\(/,
        name: 'hardAskbacks.push()',
        reason: 'Only medicalEngine may push to hardAskbacks'
    },
    {
        pattern: /softAskbacks\.push\(/,
        name: 'softAskbacks.push()',
        reason: 'Only medicalEngine may push to softAskbacks'
    },
    {
        pattern: /:\s*MedicalAskback\[\]\s*=\s*\[/,
        name: 'MedicalAskback[] construction',
        reason: 'Only medicalEngine may construct askback arrays'
    },
    {
        pattern: /medicalAskbackMatrix\.v1\.json/,
        name: 'medicalAskbackMatrix import',
        reason: 'Only medicalEngine should import the matrix directly'
    }
];

// Special case: questionServiceV2 may CALL processMedical (consumer, not generator)
const CONSUMER_ALLOWLIST = [
    {
        file: 'core/questions/questionServiceV2.ts',
        allowedPatterns: [
            /processMedical\(/,  // Allowed: calling the medical engine
            /medicalResult\.hardAskbacks/,  // Allowed: consuming result
            /medicalResult\.softAskbacks/,  // Allowed: consuming result
        ]
    }
];

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE: Medical SSOT — No Askback Logic Outside core/medical/', () => {

    it('should not find askback generation patterns outside allowlist', () => {
        const violations: { file: string; pattern: string; line: number }[] = [];

        // Get all TypeScript files in docudent
        const files = getFilesRecursive(
            DOCUDENT_ROOT,
            ['.ts', '.tsx']
        );

        for (const filePath of files) {
            // Skip allowlisted paths
            if (isAllowedPath(filePath)) continue;

            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');

            for (const { pattern, name } of FORBIDDEN_PATTERNS) {
                for (let i = 0; i < lines.length; i++) {
                    if (pattern.test(lines[i])) {
                        // Check if this is a consumer allowlist exception
                        const relativePath = path.relative(DOCUDENT_ROOT, filePath).replace(/\\/g, '/');
                        const isConsumerAllowed = CONSUMER_ALLOWLIST.some(
                            ca => relativePath.includes(ca.file) &&
                                ca.allowedPatterns.some(ap => ap.test(lines[i]))
                        );

                        if (!isConsumerAllowed) {
                            violations.push({
                                file: path.relative(DOCUDENT_ROOT, filePath),
                                pattern: name,
                                line: i + 1
                            });
                        }
                    }
                }
            }
        }

        if (violations.length > 0) {
            const message = violations
                .map(v => `${v.file}:${v.line} — ${v.pattern}`)
                .join('\n');
            expect.fail(`Found askback logic outside core/medical/:\n${message}`);
        }

        expect(violations.length).toBe(0);
    });

    it('medicalEngine.ts must exist as SSOT', () => {
        const enginePath = path.join(DOCUDENT_ROOT, 'core/medical/medicalEngine.ts');
        expect(fs.existsSync(enginePath)).toBe(true);
    });

    it('medicalAskbackMatrix.v1.json must exist', () => {
        const matrixPath = path.join(DOCUDENT_ROOT, 'core/medical/medicalAskbackMatrix.v1.json');
        expect(fs.existsSync(matrixPath)).toBe(true);
    });

    it('questionServiceV2 consumes but does not generate askbacks', () => {
        const servicePath = path.join(DOCUDENT_ROOT, 'core/questions/questionServiceV2.ts');
        const content = fs.readFileSync(servicePath, 'utf-8');

        // Should import processMedical
        expect(content).toContain("import { processMedical }");

        // Should NOT import the matrix directly
        expect(content).not.toContain('medicalAskbackMatrix');

        // Should NOT push to askback arrays
        expect(content).not.toMatch(/hardAskbacks\.push\(/);
        expect(content).not.toMatch(/softAskbacks\.push\(/);
    });

    it('presentation policy does not contain medical logic', () => {
        const policyPath = path.join(DOCUDENT_ROOT, 'core/questions/questionPresentationPolicy.ts');

        if (fs.existsSync(policyPath)) {
            const content = fs.readFileSync(policyPath, 'utf-8');

            // Should NOT import medical types
            expect(content).not.toContain("from '../../contracts/medical'");
            expect(content).not.toContain('MedicalAskback');
            expect(content).not.toContain('MedicalResult');

            // Should NOT reference askback severity decisions
            expect(content).not.toMatch(/severity\s*(?:===|!==)\s*['"]hard['"]/);
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OWNERSHIP DOCUMENTATION CHECK
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE: Medical Ownership Documentation', () => {

    it('MEDICAL_LAYER_OWNERSHIP.md must exist', () => {
        const docPath = path.join(DOCUDENT_ROOT, 'core/medical/MEDICAL_LAYER_OWNERSHIP.md');
        expect(fs.existsSync(docPath)).toBe(true);
    });

    it('ownership doc must mention key policies', () => {
        const docPath = path.join(DOCUDENT_ROOT, 'core/medical/MEDICAL_LAYER_OWNERSHIP.md');

        if (fs.existsSync(docPath)) {
            const content = fs.readFileSync(docPath, 'utf-8');

            // Key policy mentions
            expect(content).toContain('SSOT');
            expect(content).toContain('HARD');
            expect(content).toContain('SOFT');
            expect(content).toContain('settingsSkip');
        }
    });
});
