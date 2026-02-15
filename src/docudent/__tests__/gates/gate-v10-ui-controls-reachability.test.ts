/**
 * Gate: V10 UI Controls Reachability (M55)
 * 
 * Verifies via static analysis that all backend features 
 * are reachable from the UI:
 * 1. Settings link exists
 * 2. Review step is rendered when questions state
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const V10_PAGE_PATH = join(__dirname, '../../v10/pages/DocudentV10Page.tsx');

describe('Gate: V10 UI Controls Reachability (M55)', () => {
    let pageContent: string;

    beforeAll(() => {
        pageContent = readFileSync(V10_PAGE_PATH, 'utf-8');
    });

    describe('Settings Access', () => {
        it('settings link exists', () => {
            expect(pageContent).toContain('Einstellungen');
            expect(pageContent).toContain('/docudent/v10/settings');
        });
    });

    describe('Review Step Rendering', () => {
        it('questions panel has testid', () => {
            expect(pageContent).toContain('data-testid="v10-questions-panel"');
        });

        it('QuestionsFlow is rendered for questions state', () => {
            expect(pageContent).toContain('QuestionsFlow');
            expect(pageContent).toMatch(/currentState\s*===\s*['"]questions['"]/);
        });
    });

    describe('Control Selectors', () => {
        it('insurance selector is present', () => {
            expect(pageContent).toContain('V10InsuranceSelector');
        });

        it('text length selector is present', () => {
            expect(pageContent).toContain('V10TextLengthSelector');
        });

        it('treatment selector is present', () => {
            expect(pageContent).toContain('V10TreatmentSelector');
        });
    });
});
