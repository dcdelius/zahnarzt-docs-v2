/**
 * Gate M12: No V7 Orchestration Left
 *
 * GATE DEFINITION:
 * V7 pipeline/index.ts must NOT contain any orchestration function calls.
 * All orchestration is delegated to V10.
 *
 * Forbidden function calls:
 * - extractFromDictation (use V10 extraction)
 * - generateQuestions / generateQuestionsV2Bundle (use V10)
 * - generateFinalOutput (use V10)
 * - applyMedicalKb (use V10)
 * - compileAskbacksToQuestions (use V10)
 * - renderFromKbChips (use V10)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const V7_PIPELINE_PATH = path.resolve(__dirname, '../../pipeline/index.ts');

/**
 * Function calls that indicate orchestration is still in V7.
 */
const FORBIDDEN_FUNCTION_CALLS = [
    { pattern: /extractFromDictation\s*\(/, reason: 'Extraction should be in V10' },
    { pattern: /generateQuestions\s*\(/, reason: 'Question generation should be in V10' },
    { pattern: /generateQuestionsV2Bundle\s*\(/, reason: 'Question generation should be in V10' },
    { pattern: /generateFinalOutput\s*\(/, reason: 'Output generation should be in V10' },
    { pattern: /applyMedicalKb\s*\(/, reason: 'Medical KB should be in V10' },
    { pattern: /compileAskbacksToQuestions\s*\(/, reason: 'Askback compilation should be in V10' },
    { pattern: /renderFromKbChips\s*\(/, reason: 'Chip rendering should be in V10' },
    { pattern: /buildFactsFromExtraction\s*\(/, reason: 'Facts building should be in V10' },
    { pattern: /applyAnswersToFacts\s*\(/, reason: 'Answer application should be in V10' },
];

/**
 * Allowed function calls that are NOT orchestration.
 */
const ALLOWED_ORCHESTRATION_PATTERNS = [
    // V10 delegation
    /runV10\s*\(/,
    /runV10Bundle\s*\(/,
    // Adapters
    /toV10Input\s*\(/,
    /toV10BundleInput\s*\(/,
    /fromV10Output\s*\(/,
    /fromV10BundleOutput\s*\(/,
];

describe('Gate M12: No V7 Orchestration Left', () => {
    it('V7 pipeline file exists', () => {
        expect(fs.existsSync(V7_PIPELINE_PATH)).toBe(true);
    });

    /**
     * M12.3: V7 pipeline is now refactored to delegate to V10.
     * This test verifies no direct orchestration calls remain.
     */
    it('V7 pipeline does not contain forbidden orchestration calls', () => {
        const content = fs.readFileSync(V7_PIPELINE_PATH, 'utf-8');
        const lines = content.split('\n');

        const violations: string[] = [];

        lines.forEach((line, lineNumber) => {
            // Skip comments
            if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
                return;
            }

            // Skip if it's a V10 delegation call
            const isAllowedCall = ALLOWED_ORCHESTRATION_PATTERNS.some(p => p.test(line));
            if (isAllowedCall) {
                return;
            }

            // Check for forbidden calls
            for (const { pattern, reason } of FORBIDDEN_FUNCTION_CALLS) {
                if (pattern.test(line)) {
                    violations.push(`Line ${lineNumber + 1}: ${line.trim()}\n  Reason: ${reason}`);
                }
            }
        });

        if (violations.length > 0) {
            expect.fail(
                `V7 pipeline has ${violations.length} forbidden orchestration call(s):\n\n${violations.join('\n\n')}\n\n` +
                'All orchestration should be delegated to V10.'
            );
        }
    });

    it('V10 runV10 exists and is callable', async () => {
        const { runV10 } = await import('../../../v10');
        expect(typeof runV10).toBe('function');
    });

    it('V10 runV10Bundle exists and is callable', async () => {
        const { runV10Bundle } = await import('../../../v10');
        expect(typeof runV10Bundle).toBe('function');
    });

    it('V7 adapters export required functions', async () => {
        const adaptersPath = path.resolve(__dirname, '../../pipeline/adapters/index.ts');
        expect(fs.existsSync(adaptersPath)).toBe(true);

        const adapters = await import('../../pipeline/adapters');

        expect(typeof adapters.toV10Input).toBe('function');
        expect(typeof adapters.fromV10Output).toBe('function');
        expect(typeof adapters.toV10BundleInput).toBe('function');
        expect(typeof adapters.fromV10BundleOutput).toBe('function');
    });
});
