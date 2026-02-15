/**
 * Gate M12.3: V7 Pipeline Import Boundaries
 *
 * GATE DEFINITION:
 * V7 pipeline/index.ts must ONLY import from:
 * - ./types (local types)
 * - ./adapters (V7<->V10 converters)
 * - ../../v10/public (V10 API)
 *
 * NO imports from:
 * - medical, medical_kb (M6/M7)
 * - askbacks, output (M8/M9)
 * - core/services (legacy)
 * - v6 (archived)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const V7_PIPELINE_PATH = path.resolve(__dirname, '../../pipeline/index.ts');

describe('Gate M12.3: V7 Pipeline Import Boundaries', () => {
    it('V7 pipeline/index.ts exists', () => {
        expect(fs.existsSync(V7_PIPELINE_PATH)).toBe(true);
    });

    it('V7 pipeline ONLY imports from allowed sources', () => {
        const content = fs.readFileSync(V7_PIPELINE_PATH, 'utf-8');
        const lines = content.split('\n');

        // Extract import statements
        const importLines = lines.filter(line =>
            line.includes('import ') && line.includes(' from ')
        );

        // Define allowed import sources
        const allowedPatterns = [
            /from\s+['"]\.\/types['"]/, // local types
            /from\s+['"]\.\/adapters/, // V7 adapters
            /from\s+['"]\.\.\/\.\.\/v10\/public['"]/, // V10 public API
        ];

        // Define forbidden patterns
        const forbiddenPatterns = [
            { pattern: /from\s+['"]\.\.\/medical/, reason: 'No direct medical imports' },
            { pattern: /from\s+['"]\.\.\/\.\.\/medical_kb/, reason: 'No medical_kb imports' },
            { pattern: /from\s+['"]\.\.\/output/, reason: 'No output imports' },
            { pattern: /from\s+['"]\.\.\/\.\.\/core\/services/, reason: 'No legacy core services' },
            { pattern: /from\s+['"]\.\.\/\.\.\/v6/, reason: 'No V6 imports' },
        ];

        const violations: string[] = [];

        for (const importLine of importLines) {
            // Skip comments
            if (importLine.trim().startsWith('//') || importLine.trim().startsWith('*')) {
                continue;
            }

            // Check against forbidden patterns
            for (const { pattern, reason } of forbiddenPatterns) {
                if (pattern.test(importLine)) {
                    violations.push(`${importLine.trim()}\n  → ${reason}`);
                }
            }
        }

        if (violations.length > 0) {
            expect.fail(
                `V7 pipeline has ${violations.length} forbidden import(s):\n\n${violations.join('\n\n')}`
            );
        }
    });

    it('V7 pipeline delegates to V10 via runV10', () => {
        const content = fs.readFileSync(V7_PIPELINE_PATH, 'utf-8');

        // Must import runV10 from v10/public
        expect(content).toMatch(/import\s+\{[^}]*runV10[^}]*\}\s+from\s+['"]\.\.\/\.\.\/v10\/public['"]/);

        // Must call runV10
        expect(content).toContain('runV10(');
    });

    it('V7 pipeline uses adapters', () => {
        const content = fs.readFileSync(V7_PIPELINE_PATH, 'utf-8');

        // Must import from adapters
        expect(content).toMatch(/from\s+['"]\.\/adapters/);

        // Must use toV10Input
        expect(content).toContain('toV10Input');

        // Must use fromV10Output
        expect(content).toContain('fromV10Output');
    });

    it('V7 pipeline has no extraction logic', () => {
        const content = fs.readFileSync(V7_PIPELINE_PATH, 'utf-8');

        // No extractFromDictation call (V10 handles extraction)
        expect(content).not.toContain('extractFromDictation');

        // No stubExtractFromDictation (V10 handles this)
        expect(content).not.toContain('stubExtractFromDictation');
    });

    it('V7 pipeline has no question generation logic', () => {
        const content = fs.readFileSync(V7_PIPELINE_PATH, 'utf-8');

        // No generateQuestions (V10 handles questions)
        expect(content).not.toContain('generateQuestions');

        // No compileAskbacksToQuestions
        expect(content).not.toContain('compileAskbacksToQuestions');
    });

    it('V7 pipeline has no output generation logic', () => {
        const content = fs.readFileSync(V7_PIPELINE_PATH, 'utf-8');

        // No generateFinalOutput (V10 handles output)
        expect(content).not.toContain('generateFinalOutput');

        // No renderFromKbChips
        expect(content).not.toContain('renderFromKbChips');
    });
});
