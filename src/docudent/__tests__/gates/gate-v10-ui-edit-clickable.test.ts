/**
 * Gate: V10 UI Edit/Bearbeiten Clickable Test (M51)
 * 
 * Verifies via static code analysis that:
 * 1. "Bearbeiten" button exists with correct data-testid
 * 2. goToQuestions function exists and transitions state
 * 3. OutputFlow correctly passes through onEdit
 * 
 * Uses file content analysis to avoid DOM dependency.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const USE_V7_PIPELINE_PATH = join(__dirname, '../../v7/hooks/useV7Pipeline.ts');
const OUTPUT_FLOW_PATH = join(__dirname, '../../v7/components/OutputFlow.tsx');
const V10_PAGE_PATH = join(__dirname, '../../v10/pages/DocudentV10Page.tsx');

describe('Gate: V10 UI Edit Clickable (M51)', () => {
    let hookContent: string;
    let outputFlowContent: string;
    let v10PageContent: string;

    beforeAll(() => {
        hookContent = readFileSync(USE_V7_PIPELINE_PATH, 'utf-8');
        outputFlowContent = readFileSync(OUTPUT_FLOW_PATH, 'utf-8');
        v10PageContent = readFileSync(V10_PAGE_PATH, 'utf-8');
    });

    describe('goToQuestions Implementation', () => {
        it('goToQuestions function is defined in useV7Pipeline', () => {
            expect(hookContent).toContain('const goToQuestions');
            expect(hookContent).toContain('goToQuestions');
        });

        it('goToQuestions sets state to questions', () => {
            // Pattern: goToQuestions sets result.state to 'questions'
            expect(hookContent).toMatch(/goToQuestions.*=.*useCallback.*\(\)/s);
            expect(hookContent).toMatch(/state:\s*['"]questions['"]/);
        });

        it('goToQuestions is exported from hook', () => {
            expect(hookContent).toMatch(/return\s*\{[\s\S]*goToQuestions[\s\S]*\}/);
        });
    });

    describe('OutputFlow Edit Button', () => {
        it('edit button has data-testid="edit-button"', () => {
            expect(outputFlowContent).toContain('data-testid="edit-button"');
        });

        it('edit button calls handleEdit which uses onEdit', () => {
            expect(outputFlowContent).toContain('onClick={handleEdit}');
            expect(outputFlowContent).toContain('const handleEdit');
            expect(outputFlowContent).toMatch(/handleEdit.*=.*\(\).*=>.*\{[\s\S]*onEdit\(\)[\s\S]*\}/);
        });

        it('edit button is disabled only when onEdit is undefined', () => {
            expect(outputFlowContent).toContain('const editDisabled = !onEdit');
            expect(outputFlowContent).toContain('disabled={editDisabled}');
        });

        it('button says "Bearbeiten"', () => {
            // JSX content - look for the button text
            expect(outputFlowContent).toContain('Bearbeiten');
        });
    });

    describe('V10 Page Wiring (M52)', () => {
        it('V10 page defines goToReview handler', () => {
            expect(v10PageContent).toContain('goToReview');
        });

        it('V10 page uses uiStepOverride for stepper control', () => {
            expect(v10PageContent).toContain('uiStepOverride');
            expect(v10PageContent).toMatch(/setUiStepOverride.*'review'/);
        });

        it('V10 page passes goToReview to OutputFlow', () => {
            // Check for pattern: <OutputFlow ... onEdit={goToReview} .../>
            expect(v10PageContent).toMatch(/OutputFlow[\s\S]*onEdit\s*=\s*\{.*goToReview/);
        });
    });
});
