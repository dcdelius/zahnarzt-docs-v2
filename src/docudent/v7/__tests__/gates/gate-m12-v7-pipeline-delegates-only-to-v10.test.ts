/**
 * Gate M12: V7 Pipeline Delegates Only to V10
 *
 * GATE DEFINITION:
 * The V7 pipeline/index.ts must import ONLY from:
 * - ../../v10/** (V10 orchestrators)
 * - ./adapters/** (V7 adapters)
 * - ./types (V7 types)
 * - ../../contracts/** (shared contracts)
 *
 * FORBIDDEN imports (direct business logic):
 * - ../../core/services/** (extraction, questions, output services)
 * - ../../core/questions/** (question generation)
 * - ../../core/billing/** (billing logic)
 * - ../medical/** (medical engine, facts, askbacks)
 * - ../output/** (output rendering)
 * - ../../medical_kb/** (medical knowledge base)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const V7_PIPELINE_PATH = path.resolve(__dirname, '../../pipeline/index.ts');

/**
 * Patterns that V7 pipeline is ALLOWED to import.
 */
const ALLOWED_IMPORT_PATTERNS = [
    // V10 orchestrators (THE authority)
    /from ['"]\.\.\/\.\.\/v10/,
    /from ['"]\.\.\/\.\.\/\.\.\/docudent\/v10/,

    // V7 adapters (shape conversion only)
    /from ['"]\.\/adapters/,

    // V7 local utilities (trace, normalize, test fixtures)
    /from ['"]\.\/types/,
    /from ['"]\.\/normalizeAnswers/,
    /from ['"]\.\/trace/,
    /from ['"]\.\/traceStages/,
    /from ['"]\.\/traceCollector/,
    /from ['"]\.\/applyUserDefaults/,
    /from ['"]\.\/testOnly/,

    // Shared contracts (types only)
    /from ['"]\.\.\/\.\.\/contracts/,
    /from ['"]\.\.\/\.\.\/\.\.\/contracts/,

    // Type-only imports (allowed)
    /import type/,
];

/**
 * Patterns that V7 pipeline must NOT import (business logic).
 */
const FORBIDDEN_IMPORT_PATTERNS = [
    // Core services (extraction, questions, output)
    { pattern: /from ['"]\.\.\/\.\.\/core\/services\/extractionService/, reason: 'Use V10 extraction' },
    { pattern: /from ['"]\.\.\/\.\.\/core\/services\/questionService/, reason: 'Use V10 question generation' },
    { pattern: /from ['"]\.\.\/\.\.\/core\/services\/outputService/, reason: 'Use V10 output generation' },
    { pattern: /from ['"]\.\.\/\.\.\/core\/questions\/questionServiceV2/, reason: 'Use V10 question generation' },
    { pattern: /from ['"]\.\.\/\.\.\/core\/services\/dictationSanitizer/, reason: 'Should be in V10' },

    // Medical engine (V10 has applyMedicalKb)
    { pattern: /from ['"]\.\.\/medical/, reason: 'Medical logic is in V10' },
    { pattern: /from ['"]\.\.\/\.\.\/v7\/medical/, reason: 'Medical logic is in V10' },

    // Output rendering (V10 has renderFromKbChips)
    { pattern: /from ['"]\.\.\/output/, reason: 'Output rendering is in V10' },
    { pattern: /from ['"]\.\.\/\.\.\/v7\/output/, reason: 'Output rendering is in V10' },

    // Medical KB engine (V10 orchestrates this)
    { pattern: /from ['"]\.\.\/\.\.\/medical_kb/, reason: 'Medical KB is V10 internal' },

    // Billing (V10 should handle billing)
    { pattern: /from ['"]\.\.\/\.\.\/core\/billing\/combinability/, reason: 'Combinability should be in V10' },
];

describe('Gate M12: V7 Pipeline Delegates Only to V10', () => {
    it('V7 pipeline file exists', () => {
        expect(fs.existsSync(V7_PIPELINE_PATH), `V7 pipeline not found at ${V7_PIPELINE_PATH}`).toBe(true);
    });

    /**
     * M12.3: V7 pipeline is now refactored to delegate to V10.
     * This test verifies no forbidden imports remain.
     */
    it('V7 pipeline does not import forbidden patterns', () => {
        const content = fs.readFileSync(V7_PIPELINE_PATH, 'utf-8');
        const lines = content.split('\n');

        const violations: string[] = [];

        lines.forEach((line, lineNumber) => {
            // Skip comments and empty lines
            if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim() === '') {
                return;
            }

            // Check if line is an import statement
            if (!line.includes('import ')) {
                return;
            }

            // Check against forbidden patterns
            for (const { pattern, reason } of FORBIDDEN_IMPORT_PATTERNS) {
                if (pattern.test(line)) {
                    violations.push(`Line ${lineNumber + 1}: ${line.trim()}\n  Reason: ${reason}`);
                }
            }
        });

        if (violations.length > 0) {
            expect.fail(
                `V7 pipeline has ${violations.length} forbidden import(s):\n\n${violations.join('\n\n')}\n\n` +
                'V7 pipeline must delegate to V10, not import business logic directly.'
            );
        }
    });

    it('V10 public.ts exists and exports runV10/runV10Bundle', async () => {
        const v10PublicPath = path.resolve(__dirname, '../../../v10/public.ts');
        expect(fs.existsSync(v10PublicPath), 'V10 public.ts not found').toBe(true);

        const content = fs.readFileSync(v10PublicPath, 'utf-8');
        expect(content).toContain('runV10');
        expect(content).toContain('runV10Bundle');
    });

    it('V7 adapters exist', () => {
        const adaptersDir = path.resolve(__dirname, '../../pipeline/adapters');
        expect(fs.existsSync(adaptersDir), 'V7 adapters directory not found').toBe(true);

        const toV10Input = path.resolve(adaptersDir, 'toV10Input.ts');
        const fromV10Output = path.resolve(adaptersDir, 'fromV10Output.ts');

        expect(fs.existsSync(toV10Input), 'toV10Input.ts not found').toBe(true);
        expect(fs.existsSync(fromV10Output), 'fromV10Output.ts not found').toBe(true);
    });
});
