/**
 * Gate: V10 Must Not Import From V7
 * 
 * HARD RULE: V10 is the runtime SSOT. No V7 code may be imported into V10.
 * Zero allowlist - all dependencies must be V10-native.
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as path from 'path';

describe('Gate: V10 No V7 Imports', () => {
    it('should have ZERO V7 imports in V10 runtime code', () => {
        const v10Dir = path.join(process.cwd(), 'src/docudent/v10');

        let grepOutput = '';
        try {
            grepOutput = execSync(
                `grep -rn "from.*v7" "${v10Dir}" --include="*.ts" --include="*.tsx" 2>/dev/null || true`,
                { encoding: 'utf-8' }
            );
        } catch (e) {
            grepOutput = '';
        }

        const lines = grepOutput.trim().split('\n').filter(l => l.length > 0);

        // Filter out test files
        const nonTestLines = lines.filter(l =>
            !l.includes('__tests__') &&
            !l.includes('.test.') &&
            !l.includes('.spec.')
        );

        if (nonTestLines.length > 0) {
            const errorMessage = [
                '❌ GATE FAIL: V10 has V7 imports!',
                '',
                'V7 imports found:',
                ...nonTestLines.map(l => `  - ${l}`),
                '',
                'V10 must be fully standalone with ZERO V7 imports.',
                'To fix: Move the imported code to V10 or contracts/.',
            ].join('\n');

            expect(nonTestLines).toEqual([], errorMessage);
        }

        expect(nonTestLines.length).toBe(0);
    });

    it('should have all V10 core modules in place', () => {
        const v10Modules = [
            'src/docudent/v10/facts/index.ts',
            'src/docudent/v10/renderer/index.ts',
            'src/docudent/v10/pipeline/runV10.ts',
            'src/docudent/v10/styles/tokens.ts',
            'src/docudent/v10/multitreatment/types.ts',
        ];

        const fs = require('fs');
        for (const modulePath of v10Modules) {
            const fullPath = path.join(process.cwd(), modulePath);
            expect(fs.existsSync(fullPath), `Missing: ${modulePath}`).toBe(true);
        }
    });

    it('should not have V7 imports in V10 pipeline', () => {
        const pipelineDir = path.join(process.cwd(), 'src/docudent/v10/pipeline');

        let grepOutput = '';
        try {
            grepOutput = execSync(
                `grep -rn "from.*v7" "${pipelineDir}" --include="*.ts" 2>/dev/null || true`,
                { encoding: 'utf-8' }
            );
        } catch (e) {
            grepOutput = '';
        }

        const lines = grepOutput.trim().split('\n').filter(l => l.length > 0);
        expect(lines).toEqual([]);
    });

    it('should not have V7 imports in V10 components', () => {
        const componentsDir = path.join(process.cwd(), 'src/docudent/v10/components');

        let grepOutput = '';
        try {
            grepOutput = execSync(
                `grep -rn "from.*v7" "${componentsDir}" --include="*.tsx" 2>/dev/null || true`,
                { encoding: 'utf-8' }
            );
        } catch (e) {
            grepOutput = '';
        }

        const lines = grepOutput.trim().split('\n').filter(l => l.length > 0);
        expect(lines).toEqual([]);
    });

    it('should report V7 import count as zero', () => {
        const v10Dir = path.join(process.cwd(), 'src/docudent/v10');

        let grepOutput = '';
        try {
            grepOutput = execSync(
                `grep -rn "from.*v7" "${v10Dir}" --include="*.ts" --include="*.tsx" 2>/dev/null || true`,
                { encoding: 'utf-8' }
            );
        } catch (e) {
            grepOutput = '';
        }

        const lines = grepOutput.trim().split('\n').filter(l =>
            l.length > 0 &&
            !l.includes('__tests__') &&
            !l.includes('.test.')
        );

        console.log(`\n📊 V7 Import Status: ${lines.length} imports (target: 0)`);
        expect(lines.length).toBe(0);
    });
});
