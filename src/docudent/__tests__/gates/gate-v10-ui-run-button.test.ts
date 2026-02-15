/**
 * Gate: V10 UI Run Button (M55)
 * 
 * Verifies via static analysis that:
 * 1. Run button exists with correct data-testid
 * 2. Run button triggers runPipeline
 * 3. Button is visible when dictation has content
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const V10_PAGE_PATH = join(__dirname, '../../v10/pages/DocudentV10Page.tsx');
const USE_V7_PIPELINE_PATH = join(__dirname, '../../v7/hooks/useV7Pipeline.ts');

describe('Gate: V10 UI Run Button (M55)', () => {
    let pageContent: string;
    let hookContent: string;

    beforeAll(() => {
        pageContent = readFileSync(V10_PAGE_PATH, 'utf-8');
        hookContent = readFileSync(USE_V7_PIPELINE_PATH, 'utf-8');
    });

    describe('Run Button Existence', () => {
        it('has run button with data-testid="v10-run-button"', () => {
            expect(pageContent).toContain('data-testid="v10-run-button"');
        });

        it('run button triggers runPipeline', () => {
            // Check for pattern: onClick={runPipeline} near v10-run-button
            expect(pageContent).toMatch(/data-testid="v10-run-button"[\s\S]{0,200}onClick=\{runPipeline\}/);
        });

        it('run button uses disabled state for empty dictation (M56)', () => {
            // M56: Button is always visible but disabled when dictation empty
            expect(pageContent).toMatch(/v10-run-button[\s\S]*disabled=\{dictation\.trim\(\)\.length === 0/);
        });
    });

    describe('runPipeline in Hook', () => {
        it('runPipeline is defined in useV7Pipeline', () => {
            expect(hookContent).toContain('const runPipeline');
        });

        it('runPipeline is exported from hook', () => {
            expect(hookContent).toMatch(/return\s*\{[\s\S]*runPipeline[\s\S]*\}/);
        });
    });

    describe('Multi-Mode Button', () => {
        it('has multi-mode button with data-testid="v10-multi-button"', () => {
            expect(pageContent).toContain('data-testid="v10-multi-button"');
        });

        it('multi button appears when isMultiMode is true', () => {
            expect(pageContent).toMatch(/isMultiMode\s*\?[\s\S]*v10-multi-button/);
        });
    });
});
