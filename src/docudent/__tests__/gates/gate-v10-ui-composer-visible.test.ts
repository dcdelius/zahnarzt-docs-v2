/**
 * Gate: V10 UI Composer (M57 lite)
 * 
 * Verifies dictation input exists with ref for focus wiring.
 * (Reverted glass container per user preference)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const V10_PAGE_PATH = join(__dirname, '../../v10/pages/DocudentV10Page.tsx');

describe('Gate: V10 UI Composer (M57)', () => {
    let pageContent: string;

    beforeAll(() => {
        pageContent = readFileSync(V10_PAGE_PATH, 'utf-8');
    });

    describe('Dictation Input with Ref', () => {
        it('textarea has ref={dictationRef}', () => {
            expect(pageContent).toContain('ref={dictationRef}');
        });

        it('dictationRef is created with useRef', () => {
            expect(pageContent).toContain('useRef<HTMLTextAreaElement>');
        });

        it('focusDictation function exists', () => {
            expect(pageContent).toContain('const focusDictation');
            expect(pageContent).toMatch(/dictationRef\.current\?\.focus\(\)/);
        });

        it('has data-testid="v10-dictation-input"', () => {
            expect(pageContent).toContain('data-testid="v10-dictation-input"');
        });
    });
});
