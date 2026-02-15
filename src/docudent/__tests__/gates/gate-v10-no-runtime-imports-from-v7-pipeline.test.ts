/**
 * gate-v10-no-runtime-imports-from-v7-pipeline.test.ts
 * 
 * GATE: V10 hooks must not import from v7/hooks or v7/pipeline.
 * This ensures V10 is the independent runtime with no V7 delegation.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const V10_HOOKS_DIR = path.join(__dirname, '../../v10/hooks');
const V10_PIPELINE_DIR = path.join(__dirname, '../../v10/pipeline');

const FORBIDDEN_PATTERNS = [
    /from\s+['"].*v7\/hooks/,
    /from\s+['"].*v7\/pipeline/,
    /import.*useV7Pipeline/,
];

function checkFileForForbiddenImports(filePath: string): { file: string; violations: string[] } {
    const content = fs.readFileSync(filePath, 'utf-8');
    const violations: string[] = [];

    const lines = content.split('\n');
    lines.forEach((line, idx) => {
        for (const pattern of FORBIDDEN_PATTERNS) {
            if (pattern.test(line)) {
                violations.push(`L${idx + 1}: ${line.trim()}`);
            }
        }
    });

    return { file: path.basename(filePath), violations };
}

describe('gate-v10-no-runtime-imports-from-v7-pipeline', () => {
    it('V10 hooks directory must exist', () => {
        expect(fs.existsSync(V10_HOOKS_DIR)).toBe(true);
    });

    it('useV10Pipeline must not import from v7/hooks or v7/pipeline', () => {
        const hookFile = path.join(V10_HOOKS_DIR, 'useV10Pipeline.ts');
        expect(fs.existsSync(hookFile)).toBe(true);

        const result = checkFileForForbiddenImports(hookFile);

        if (result.violations.length > 0) {
            console.error('Forbidden V7 imports found in useV10Pipeline.ts:');
            result.violations.forEach(v => console.error(`  ${v}`));
        }

        expect(result.violations).toHaveLength(0);
    });

    it('V10 pipeline files must not import from v7/hooks', () => {
        const pipelineFiles = fs.readdirSync(V10_PIPELINE_DIR)
            .filter(f => f.endsWith('.ts'))
            .map(f => path.join(V10_PIPELINE_DIR, f));

        const allViolations: string[] = [];

        for (const file of pipelineFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            // Check only for v7/hooks, not v7/medical (which is still needed)
            if (/from\s+['"].*v7\/hooks/.test(content)) {
                allViolations.push(`${path.basename(file)}: imports from v7/hooks`);
            }
        }

        expect(allViolations).toHaveLength(0);
    });

    it('V10 hook must call runV10 directly', () => {
        const hookFile = path.join(V10_HOOKS_DIR, 'useV10Pipeline.ts');
        const content = fs.readFileSync(hookFile, 'utf-8');

        // Must import from V10 public API
        expect(content).toContain("from '../public'");

        // Must call runV10
        expect(content).toContain('runV10(');

        // Must NOT delegate to useV7Pipeline
        expect(content).not.toContain('useV7Pipeline()');
    });
});
