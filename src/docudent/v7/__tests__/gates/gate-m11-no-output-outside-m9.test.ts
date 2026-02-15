/**
 * Gate M11: No Output Outside M9
 *
 * Ensures all output text/billing comes from M9 renderer only.
 * No new text snippets or billing mappings in code.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Gate M11: No Output Outside M9', () => {
    // ═══════════════════════════════════════════════════════════════
    // TEST: Bundle orchestrator uses M9 renderer
    // ═══════════════════════════════════════════════════════════════

    describe('Bundle uses M9 renderer', () => {
        it('runV10Bundle.ts imports renderFromKbChips', () => {
            const bundlePath = path.join(
                process.cwd(),
                'src/docudent/v10/pipeline/runV10Bundle.ts'
            );
            const content = fs.readFileSync(bundlePath, 'utf-8');
            expect(content).toContain('renderFromKbChips');
        });

        it('runV10Bundle.ts does not contain hardcoded text', () => {
            const bundlePath = path.join(
                process.cwd(),
                'src/docudent/v10/pipeline/runV10Bundle.ts'
            );
            const content = fs.readFileSync(bundlePath, 'utf-8');

            // Skip comment lines
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.trim().startsWith('//') ||
                    line.trim().startsWith('*') ||
                    line.includes('interface') ||
                    line.includes('type ')) {
                    continue;
                }

                // No hardcoded German procedure text
                const hasHardcodedText =
                    line.includes('Überkappung') ||
                    line.includes('Anästhesie') ||
                    line.includes('Kofferdam') ||
                    line.includes('Füllung');

                expect(
                    hasHardcodedText,
                    `Line ${i + 1} has hardcoded text: ${line.substring(0, 50)}`
                ).toBe(false);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: V10 pipeline directory clean
    // ═══════════════════════════════════════════════════════════════

    describe('V10 pipeline is clean', () => {
        it('no textSnippets in V10 pipeline', () => {
            const pipelineDir = path.join(
                process.cwd(),
                'src/docudent/v10/pipeline'
            );

            const files = fs.readdirSync(pipelineDir);
            for (const file of files) {
                if (!file.endsWith('.ts')) continue;
                const content = fs.readFileSync(path.join(pipelineDir, file), 'utf-8');
                expect(content).not.toContain('"textSnippets"');
            }
        });

        it('no billingRef definitions in V10 pipeline', () => {
            const pipelineDir = path.join(
                process.cwd(),
                'src/docudent/v10/pipeline'
            );

            const files = fs.readdirSync(pipelineDir);
            for (const file of files) {
                if (!file.endsWith('.ts')) continue;
                const content = fs.readFileSync(path.join(pipelineDir, file), 'utf-8');
                // Allow import of billingRef lookup, but not definition
                const defPattern = /billingRef\s*:\s*\{/;
                expect(defPattern.test(content)).toBe(false);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: M9 gates still valid
    // ═══════════════════════════════════════════════════════════════

    describe('M9 SSOT contract intact', () => {
        it('renderFromKbChips exists', () => {
            const rendererPath = path.join(
                process.cwd(),
                'src/docudent/v7/output/renderFromKbChips.ts'
            );
            expect(fs.existsSync(rendererPath)).toBe(true);
        });
    });
});
