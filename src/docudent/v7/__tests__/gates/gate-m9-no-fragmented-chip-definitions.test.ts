/**
 * Gate M9: No Fragmented Chip Definitions
 *
 * Ensures chip text/billing is ONLY defined in unified.json (SSOT).
 * No shadow registries or duplicate definitions allowed.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Gate M9: No Fragmented Chip Definitions', () => {
    // ═══════════════════════════════════════════════════════════════
    // TEST: Medical KB does NOT contain textSnippets or billingRef
    // ═══════════════════════════════════════════════════════════════

    describe('Medical KB contains only rules, not text/billing', () => {
        it('medical_kb.v1.json has no textSnippets', () => {
            const kbPath = path.join(
                process.cwd(),
                'src/docudent/medical_kb/medical_kb.v1.json'
            );
            const content = fs.readFileSync(kbPath, 'utf-8');

            expect(content).not.toContain('"textSnippets"');
        });

        it('medical_kb.v1.json has no billingRef', () => {
            const kbPath = path.join(
                process.cwd(),
                'src/docudent/medical_kb/medical_kb.v1.json'
            );
            const content = fs.readFileSync(kbPath, 'utf-8');

            expect(content).not.toContain('"billingRef"');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Chip definitions only in unified.json
    // ═══════════════════════════════════════════════════════════════

    describe('Chip definitions are SSOT in unified.json', () => {
        it('fuellung has unified.json as chip SSOT', () => {
            const unifiedPath = path.join(
                process.cwd(),
                'src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json'
            );
            expect(fs.existsSync(unifiedPath)).toBe(true);

            const unified = JSON.parse(fs.readFileSync(unifiedPath, 'utf-8'));
            expect(unified.chips).toBeDefined();
            expect(Array.isArray(unified.chips)).toBe(true);
            expect(unified.chips.length).toBeGreaterThan(0);
        });

        it('no chip textSnippets in v7/medical directory', () => {
            const medicalDir = path.join(process.cwd(), 'src/docudent/v7/medical');

            // Recursively scan for textSnippets in medical files
            const scanDir = (dir: string): string[] => {
                const files: string[] = [];
                try {
                    const entries = fs.readdirSync(dir, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path.join(dir, entry.name);
                        if (entry.isDirectory()) {
                            files.push(...scanDir(fullPath));
                        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.json')) {
                            files.push(fullPath);
                        }
                    }
                } catch {
                    // Directory might not exist
                }
                return files;
            };

            const medicalFiles = scanDir(medicalDir);
            for (const file of medicalFiles) {
                const content = fs.readFileSync(file, 'utf-8');
                const hasTextSnippets = content.includes('"textSnippets"') ||
                    content.includes("'textSnippets'");
                const hasBillingRef = content.includes('"billingRef"') ||
                    content.includes("'billingRef'");

                // Allow only in test files or type definitions
                if (!file.includes('__test') && !file.includes('.d.ts')) {
                    expect(
                        hasTextSnippets,
                        `File ${file} has textSnippets (should be in unified.json)`
                    ).toBe(false);
                    expect(
                        hasBillingRef,
                        `File ${file} has billingRef (should be in unified.json)`
                    ).toBe(false);
                }
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: No legacy text paths in output module
    // ═══════════════════════════════════════════════════════════════

    describe('Output module uses only KB', () => {
        it('renderFromKbChips.ts has no hardcoded text strings', () => {
            const rendererPath = path.join(
                process.cwd(),
                'src/docudent/v7/output/renderFromKbChips.ts'
            );
            const content = fs.readFileSync(rendererPath, 'utf-8');

            // Check for suspicious hardcoded German text (except comments)
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Skip comment lines and type/interface definitions
                if (line.trim().startsWith('//') ||
                    line.trim().startsWith('*') ||
                    line.includes('interface') ||
                    line.includes('type ')) {
                    continue;
                }

                // No hardcoded German procedure text allowed
                const hasHardcodedText =
                    line.includes('Überkappung') ||
                    line.includes('Anästhesie') ||
                    line.includes('Kofferdam') ||
                    line.includes('Füllung');

                expect(
                    hasHardcodedText,
                    `Line ${i + 1} has hardcoded German text: ${line.substring(0, 50)}`
                ).toBe(false);
            }
        });
    });
});
