/**
 * Gate: V10 UI Treatment Dropdown (M55)
 * 
 * Verifies via static analysis that:
 * 1. Treatment selector is dropdown style (not toggle pills)
 * 2. Uses pack registry for options
 * 3. Has correct data-testids
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const TREATMENT_SELECTOR_PATH = join(__dirname, '../../v10/components/V10TreatmentSelector.tsx');
const V10_PAGE_PATH = join(__dirname, '../../v10/pages/DocudentV10Page.tsx');

describe('Gate: V10 UI Treatment Dropdown (M55)', () => {
    let selectorContent: string;
    let pageContent: string;

    beforeAll(() => {
        selectorContent = readFileSync(TREATMENT_SELECTOR_PATH, 'utf-8');
        pageContent = readFileSync(V10_PAGE_PATH, 'utf-8');
    });

    describe('Dropdown Structure', () => {
        it('has dropdown trigger with data-testid="v10-treatment-dropdown"', () => {
            expect(selectorContent).toContain('data-testid="v10-treatment-dropdown"');
        });

        it('has per-option testids with packId', () => {
            expect(selectorContent).toContain('data-testid={`v10-treatment-option-${pack.id}`}');
        });

        it('uses useState for open/closed state', () => {
            expect(selectorContent).toContain('useState(false)');
            expect(selectorContent).toContain('isOpen');
            expect(selectorContent).toContain('setIsOpen');
        });

        it('has AnimatePresence for dropdown animation', () => {
            expect(selectorContent).toContain('AnimatePresence');
        });
    });

    describe('Pack Registry Integration', () => {
        it('imports listPacks from registry', () => {
            expect(selectorContent).toContain("from '../packs'");
            expect(selectorContent).toContain('listPacks');
        });

        it('uses useMemo for packs', () => {
            expect(selectorContent).toContain('useMemo(() => listPacks()');
        });
    });

    describe('V8 Jeton Aesthetic', () => {
        it('uses gradient background', () => {
            expect(selectorContent).toContain('linear-gradient');
        });

        it('uses backdrop blur for dropdown', () => {
            expect(selectorContent).toContain('backdropFilter');
            expect(selectorContent).toContain('blur');
        });

        it('uses pill shape (borderRadius)', () => {
            expect(selectorContent).toContain("borderRadius: '999px'");
        });
    });

    describe('Page Integration', () => {
        it('V10TreatmentSelector is imported in page', () => {
            expect(pageContent).toContain('V10TreatmentSelector');
        });

        it('treatment selector is used in page', () => {
            expect(pageContent).toMatch(/<V10TreatmentSelector/);
        });
    });

    describe('Keyboard Navigation', () => {
        it('handles keyboard events', () => {
            expect(selectorContent).toContain('onKeyDown');
            expect(selectorContent).toContain('ArrowDown');
            expect(selectorContent).toContain('ArrowUp');
            expect(selectorContent).toContain('Escape');
        });
    });
});
