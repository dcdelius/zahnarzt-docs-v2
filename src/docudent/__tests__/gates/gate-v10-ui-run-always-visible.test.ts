/**
 * Gate: V10 UI Run Button Always Visible (M56)
 * 
 * Verifies via static analysis that:
 * 1. Run button is always rendered (not conditionally)
 * 2. Has disabled state when dictation empty or processing
 * 3. Changes visual style based on state
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const V10_PAGE_PATH = join(__dirname, '../../v10/pages/DocudentV10Page.tsx');

describe('Gate: V10 UI Run Button Always Visible (M56)', () => {
    let pageContent: string;

    beforeAll(() => {
        pageContent = readFileSync(V10_PAGE_PATH, 'utf-8');
    });

    describe('Always Visible Pattern', () => {
        it('run button is NOT conditionally hidden on dictation length', () => {
            // Old pattern: {dictation.length > 0 && ... <button data-testid="v10-run-button">
            // Should NOT exist
            const conditionalPattern = /\{dictation\.length\s*>\s*0[\s\S]*&&[\s\S]*\([\s\S]*v10-run-button/;
            expect(pageContent).not.toMatch(conditionalPattern);
        });

        it('run button has disabled attribute based on dictation', () => {
            expect(pageContent).toMatch(/data-testid="v10-run-button"[\s\S]*disabled=\{/);
            expect(pageContent).toContain('dictation.trim().length === 0');
        });

        it('run button has disabled state for isProcessing', () => {
            expect(pageContent).toContain('|| isProcessing');
        });
    });

    describe('Visual Disabled State', () => {
        it('button changes style/opacity when disabled', () => {
            // Look for conditional styling near run button
            expect(pageContent).toMatch(/v10-run-button[\s\S]{0,500}rgba\(255, 255, 255, 0\.4\)/);
        });

        it('button has tooltip/title when disabled', () => {
            expect(pageContent).toContain("title={dictation.trim().length === 0 ? 'Bitte Text eingeben'");
        });
    });

    describe('Processing State', () => {
        it('button shows loading text when processing', () => {
            expect(pageContent).toContain("isProcessing ? 'Läuft…'");
        });
    });
});
