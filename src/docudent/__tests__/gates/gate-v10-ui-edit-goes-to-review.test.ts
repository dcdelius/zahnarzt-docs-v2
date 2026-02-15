/**
 * Gate: V10 UI Edit Goes To Review (M64)
 * 
 * Verifies the Bearbeiten button behavior:
 * 1. Clicking "Bearbeiten" sets uiStepOverride to 'review'
 * 2. Review step shows v10-review-step panel
 * 3. Dictation input is NOT the primary panel in review step
 * 
 * Uses static code analysis (no DOM dependency).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const V10_PAGE_PATH = join(__dirname, '../../v10/pages/DocudentV10Page.tsx');
const OUTPUT_FLOW_PATH = join(__dirname, '../../v7/components/OutputFlow.tsx');

describe('Gate: V10 UI Edit Goes To Review (M64)', () => {
    let v10PageContent: string;
    let outputFlowContent: string;

    beforeAll(() => {
        v10PageContent = readFileSync(V10_PAGE_PATH, 'utf-8');
        outputFlowContent = readFileSync(OUTPUT_FLOW_PATH, 'utf-8');
    });

    describe('Stepper Contract', () => {
        it('goToReview sets uiStepOverride to review', () => {
            expect(v10PageContent).toContain("setUiStepOverride('review')");
        });

        it('goToReview handler is passed to OutputFlow', () => {
            expect(v10PageContent).toMatch(/OutputFlow[\s\S]*onEdit\s*=\s*\{.*goToReview/);
        });

        it('OutputFlow has Bearbeiten button that calls onEdit', () => {
            expect(outputFlowContent).toContain('Bearbeiten');
            expect(outputFlowContent).toContain('onClick={handleEdit}');
        });
    });

    describe('Review Step Rendering', () => {
        it('v10-review-step testid exists in page', () => {
            expect(v10PageContent).toContain('data-testid="v10-review-step"');
        });

        it('review step renders when effectiveStep is review AND currentState is output', () => {
            // Pattern: if (effectiveStep === 'review' && currentState === 'output')
            expect(v10PageContent).toMatch(/effectiveStep\s*===\s*['"]review['"]\s*&&\s*currentState\s*===\s*['"]output['"]/);
        });

        it('M64 comment is present for review step', () => {
            expect(v10PageContent).toContain('M64: Review step');
        });
    });

    describe('Dictation NOT shown in Review', () => {
        it('idle check does NOT include review step', () => {
            // The pattern should be: currentState === 'idle' ? (dictation...)
            // NOT: currentState === 'idle' || (effectiveStep === 'review' && ...)
            const oldBrokenPattern = /currentState\s*===\s*['"]idle['"]\s*\|\|\s*\(effectiveStep\s*===\s*['"]review['"]/;
            expect(v10PageContent).not.toMatch(oldBrokenPattern);
        });

        it('dictation input only shows for idle state', () => {
            // Pattern: {currentState === 'idle' ? (
            expect(v10PageContent).toMatch(/\{.*currentState\s*===\s*['"]idle['"]\s*\?\s*\(/);
        });

        it('M64 comment explains the fix', () => {
            expect(v10PageContent).toContain('M64: Only show dictation input for idle state');
        });
    });

    describe('Review Step Controls', () => {
        it('back-to-output button exists', () => {
            expect(v10PageContent).toContain('data-testid="v10-back-to-output"');
        });

        it('apply-changes button exists', () => {
            expect(v10PageContent).toContain('data-testid="v10-apply-changes"');
        });

        it('backToOutput handler resets uiStepOverride to null', () => {
            expect(v10PageContent).toContain('setUiStepOverride(null)');
        });
    });
});
