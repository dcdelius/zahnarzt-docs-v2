/**
 * Gate: V10 UI Dock Focus Wiring (M57)
 * 
 * Verifies via static analysis that:
 * 1. Aufnahme button calls focusDictation
 * 2. Dock button has data-testid
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const V10_PAGE_PATH = join(__dirname, '../../v10/pages/DocudentV10Page.tsx');

describe('Gate: V10 UI Dock Focus Wiring (M57)', () => {
    let pageContent: string;

    beforeAll(() => {
        pageContent = readFileSync(V10_PAGE_PATH, 'utf-8');
    });

    describe('Aufnahme Button', () => {
        it('has data-testid="v10-dock-aufnahme"', () => {
            expect(pageContent).toContain('data-testid="v10-dock-aufnahme"');
        });

        it('Aufnahme button calls focusDictation', () => {
            expect(pageContent).toMatch(/v10-dock-aufnahme[\s\S]*focusDictation\(\)/);
        });
    });

    describe('Focus Scrolls into View', () => {
        it('focusDictation scrolls into view', () => {
            expect(pageContent).toContain('scrollIntoView');
        });
    });
});
