/**
 * Gate: V10 UI Overlay Non-Blocking Test (M51)
 * 
 * Verifies that decorative overlays do not block user interaction:
 * 1. When not in running state, no blocking overlays
 * 2. Background layers must have pointer-events: none
 * 
 * This is a static analysis gate - we check the code patterns.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const V10_PAGE_PATH = join(__dirname, '../../v10/pages/DocudentV10Page.tsx');
const OUTPUT_FLOW_PATH = join(__dirname, '../../v7/components/OutputFlow.tsx');

describe('Gate: V10 UI Overlay Non-Blocking (M51)', () => {
    let v10PageContent: string;
    let outputFlowContent: string;

    beforeAll(() => {
        v10PageContent = readFileSync(V10_PAGE_PATH, 'utf-8');
        outputFlowContent = readFileSync(OUTPUT_FLOW_PATH, 'utf-8');
    });

    describe('V10 Page Overlay Safety', () => {
        it('HeroSculpture has pointerEvents: none', () => {
            // The hero sculpture wrapper should have pointer-events: none
            expect(v10PageContent).toMatch(/HeroSculpture.*pointerEvents.*none|pointer-events.*none.*HeroSculpture/is);
        });

        it('background layers have pointer-events disabled', () => {
            // Check for patterns like pointerEvents: 'none' or pointer-events: none
            // near background-related elements
            const hasPointerEventsNone =
                v10PageContent.includes("pointerEvents: 'none'") ||
                v10PageContent.includes('pointerEvents:"none"') ||
                v10PageContent.includes('pointer-events: none');

            expect(hasPointerEventsNone).toBe(true);
        });

        it('edit button has data-testid for targeting', () => {
            expect(outputFlowContent).toContain('data-testid="edit-button"');
        });

        it('edit button is not unconditionally disabled', () => {
            // The edit button should only be disabled when onEdit is undefined
            expect(outputFlowContent).toContain('disabled={editDisabled}');
            expect(outputFlowContent).toContain('const editDisabled = !onEdit');
        });
    });

    describe('OutputFlow Edit Button Safety', () => {
        it('onEdit prop is optional (allows passing from parent)', () => {
            // Check that onEdit is typed as optional
            expect(outputFlowContent).toMatch(/onEdit\?\s*:/);
        });

        it('handleEdit guard exists', () => {
            // handleEdit should check if onEdit exists before calling
            expect(outputFlowContent).toMatch(/if\s*\(\s*onEdit\s*\)/);
        });
    });

    describe('V10 Page passes onEdit when in output state', () => {
        it('OutputFlow receives goToReview as onEdit (M52)', () => {
            // Check that OutputFlow is rendered with onEdit={goToReview}
            expect(v10PageContent).toMatch(/OutputFlow[\s\S]*onEdit\s*=\s*\{.*goToReview.*\}/);
        });
    });
});
