/**
 * Gate M12: No Forbidden Imports in V7 Pipeline
 *
 * GATE DEFINITION:
 * The V7 pipeline directory (src/docudent/v7/pipeline/**) must NOT import from:
 * - v7/medical (medical engine, facts, askbacks)
 * - medical_kb (medical knowledge base)
 * - v7/output (output rendering)
 * - v6/ (legacy)
 *
 * V7 pipeline may ONLY import from:
 * - v10/public (V10 orchestrators)
 * - ./adapters (V7 adapters)
 * - contracts (shared types)
 * - ./types (local types)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const V7_PIPELINE_DIR = path.resolve(__dirname, '../../pipeline');

/**
 * Forbidden import patterns with reasons.
 */
const FORBIDDEN_PATTERNS = [
    { pattern: 'v7/medical', reason: 'Medical logic must stay in V10' },
    { pattern: '../medical', reason: 'Medical logic must stay in V10' },
    { pattern: 'medical_kb', reason: 'Medical KB must stay in V10' },
    { pattern: 'v7/output', reason: 'Output rendering must stay in V10' },
    { pattern: '../output', reason: 'Output rendering must stay in V10' },
    { pattern: '/v6/', reason: 'V6 legacy is forbidden' },
    { pattern: 'core/services/extractionService', reason: 'Extraction must be in V10' },
    { pattern: 'core/services/questionService', reason: 'Question generation must be in V10' },
    { pattern: 'core/services/outputService', reason: 'Output generation must be in V10' },
    { pattern: 'core/questions/questionServiceV2', reason: 'Question generation must be in V10' },
    { pattern: 'core/billing/combinability', reason: 'Combinability must be in V10' },
];

describe('Gate M12: No Forbidden Imports in V7 Pipeline', () => {
    it('V7 pipeline directory exists', () => {
        expect(fs.existsSync(V7_PIPELINE_DIR)).toBe(true);
    });

    /**
     * M12.3: V7 pipeline is now refactored.
     */
    it('V7 pipeline/index.ts has no forbidden imports', () => {
        const indexPath = path.join(V7_PIPELINE_DIR, 'index.ts');
        expect(fs.existsSync(indexPath)).toBe(true);

        const content = fs.readFileSync(indexPath, 'utf-8');
        const violations: string[] = [];

        for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
            if (content.includes(pattern)) {
                violations.push(`Found '${pattern}': ${reason}`);
            }
        }

        if (violations.length > 0) {
            expect.fail(
                `V7 pipeline/index.ts has ${violations.length} forbidden import(s):\n${violations.join('\n')}`
            );
        }
    });

    it('V7 pipeline/adapters have no forbidden imports', () => {
        const adaptersDir = path.join(V7_PIPELINE_DIR, 'adapters');
        if (!fs.existsSync(adaptersDir)) {
            return; // No adapters dir yet
        }

        const adapterFiles = fs.readdirSync(adaptersDir).filter(f => f.endsWith('.ts'));

        for (const file of adapterFiles) {
            const filePath = path.join(adaptersDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const violations: string[] = [];

            for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
                // Adapters ARE allowed to import from ../types and v10/public
                // But NOT from medical, medical_kb, output
                if (['v7/medical', '../medical', 'medical_kb', 'v7/output', '../output', '/v6/'].some(p => p === pattern)) {
                    if (content.includes(pattern)) {
                        violations.push(`Found '${pattern}' in ${file}: ${reason}`);
                    }
                }
            }

            if (violations.length > 0) {
                expect.fail(
                    `V7 pipeline/adapters has forbidden import(s):\n${violations.join('\n')}`
                );
            }
        }
    });

    /**
     * M12.3: V7 pipeline is now refactored.
     */
    it('grep confirms no medical imports in V7 pipeline/index.ts', () => {
        const indexPath = path.join(V7_PIPELINE_DIR, 'index.ts');
        const content = fs.readFileSync(indexPath, 'utf-8');

        // Critical patterns that MUST NOT appear
        const criticalPatterns = [
            /from\s+['"]\.\.\/medical/,
            /from\s+['"]\.\.\/\.\.\/medical_kb/,
            /from\s+['"]\.\.\/output/,
        ];

        for (const pattern of criticalPatterns) {
            const match = content.match(pattern);
            if (match) {
                expect.fail(`Found forbidden import pattern: ${match[0]}`);
            }
        }
    });

    /**
     * M12.3: V7 pipeline is now refactored.
     */
    it('V7 pipeline only uses V10 and adapters', () => {
        const indexPath = path.join(V7_PIPELINE_DIR, 'index.ts');
        const content = fs.readFileSync(indexPath, 'utf-8');

        // Extract all import statements
        const importLines = content.split('\n').filter(line =>
            line.includes('import ') && line.includes('from ')
        );

        // All imports must be from allowed sources
        const allowedSources = [
            './types',
            './adapters',
            '../../v10/public',
            '../../contracts',
            '../../../contracts',
        ];

        for (const line of importLines) {
            // Skip type-only imports (they don't count as runtime dependencies)
            if (line.includes('import type')) continue;

            const isAllowed = allowedSources.some(src => line.includes(src));
            if (!isAllowed) {
                // Check if it's a V10 import (allowed)
                if (line.includes('v10')) continue;
                if (line.includes('adapters')) continue;

                expect.fail(`Unexpected import in V7 pipeline:\n  ${line.trim()}`);
            }
        }
    });
});
