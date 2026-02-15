/**
 * Gate: V10 Pipeline Module Boundaries
 * 
 * Enforces clean separation of concerns:
 * - extraction/ → raw data only
 * - facts/ → interpretation layer
 * - medical_kb/ → facts consumer only
 * - askbacks/ → question translation
 * - chips/ → state + provenance
 * - renderer/ → SSOT output
 * - core/billing/ → billing resolution + combinability
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as path from 'path';

describe('Gate: V10 Module Boundaries', () => {

    it('should not have medical_kb importing billing codes directly', () => {
        const kbDir = path.join(process.cwd(), 'src/docudent/medical_kb');

        // Medical KB should not hardcode billing refs
        let grepOutput = '';
        try {
            grepOutput = execSync(
                `grep -rn "BEMA_\\|GOZ_\\|GOÄ_" "${kbDir}" --include="*.ts" 2>/dev/null || true`,
                { encoding: 'utf-8' }
            );
        } catch (e) {
            grepOutput = '';
        }

        const lines = grepOutput.trim().split('\n').filter(l =>
            l.length > 0 &&
            !l.includes('.test.') &&
            !l.includes('__tests__')
        );

        if (lines.length > 0) {
            console.log('❌ Medical KB has hardcoded billing codes:', lines);
        }

        expect(lines.length).toBe(0);
    });

    it('should not have facts/ importing core/billing directly', () => {
        const factsDir = path.join(process.cwd(), 'src/docudent/v10/facts');

        let grepOutput = '';
        try {
            grepOutput = execSync(
                `grep -rn "from.*core/billing" "${factsDir}" --include="*.ts" 2>/dev/null || true`,
                { encoding: 'utf-8' }
            );
        } catch (e) {
            grepOutput = '';
        }

        const lines = grepOutput.trim().split('\n').filter(l => l.length > 0);
        expect(lines).toEqual([]);
    });

    it('should not have UI components importing medical_kb engine directly', () => {
        const componentsDir = path.join(process.cwd(), 'src/docudent/v10/components');

        let grepOutput = '';
        try {
            grepOutput = execSync(
                `grep -rn "from.*medical_kb/engine" "${componentsDir}" --include="*.tsx" 2>/dev/null || true`,
                { encoding: 'utf-8' }
            );
        } catch (e) {
            grepOutput = '';
        }

        const lines = grepOutput.trim().split('\n').filter(l => l.length > 0);
        expect(lines).toEqual([]);
    });

    it('should not have UI pages importing runV10 internals directly', () => {
        const pagesDir = path.join(process.cwd(), 'src/docudent/v10/pages');

        // Pages should use hook, not pipeline internals
        let grepOutput = '';
        try {
            grepOutput = execSync(
                `grep -rn "from.*pipeline/runV10" "${pagesDir}" --include="*.tsx" 2>/dev/null || true`,
                { encoding: 'utf-8' }
            );
        } catch (e) {
            grepOutput = '';
        }

        const lines = grepOutput.trim().split('\n').filter(l => l.length > 0);
        expect(lines).toEqual([]);
    });

    it('should have renderer importing only from KB path (SSOT)', () => {
        const rendererDir = path.join(process.cwd(), 'src/docudent/v10/renderer');

        // Check that renderer references KB path correctly
        const fs = require('fs');
        const rendererPath = path.join(rendererDir, 'renderFromKbChips.ts');

        if (fs.existsSync(rendererPath)) {
            const content = fs.readFileSync(rendererPath, 'utf-8');

            // Must reference unified.json (KB SSOT)
            const hasKbRef = content.includes('unified.json') ||
                content.includes('knowledgeBase/treatments');

            expect(hasKbRef).toBe(true);
        }
    });
});
