/**
 * Gate: V10 UI Dictation Input Visible (M56)
 * 
 * Verifies via static analysis that:
 * 1. Dictation input exists with data-testid
 * 2. Has proper placeholder
 * 3. Is bound to dictation state
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const V10_PAGE_PATH = join(__dirname, '../../v10/pages/DocudentV10Page.tsx');

describe('Gate: V10 UI Dictation Input Visible (M56)', () => {
    let pageContent: string;

    beforeAll(() => {
        pageContent = readFileSync(V10_PAGE_PATH, 'utf-8');
    });

    describe('Input Existence', () => {
        it('has textarea with data-testid="v10-dictation-input"', () => {
            expect(pageContent).toContain('data-testid="v10-dictation-input"');
        });

        it('textarea is bound to dictation state', () => {
            expect(pageContent).toMatch(/value=\{dictation\}/);
        });

        it('textarea has onChange handler', () => {
            expect(pageContent).toMatch(/onChange=.*setDictation/);
        });
    });

    describe('Input Styling', () => {
        it('textarea exists as a block element', () => {
            expect(pageContent).toContain('<textarea');
        });

        it('has placeholder text', () => {
            expect(pageContent).toMatch(/placeholder=/);
        });
    });
});
