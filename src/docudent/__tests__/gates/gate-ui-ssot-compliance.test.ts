/**
 * Gate Test: P13 UI SSOT Compliance
 *
 * Ensures UI components use SSOT APIs and cannot bypass billing-referenced compose.
 *
 * INVARIANTS:
 * - OutputFlow uses copyText prop for copy, not ad-hoc fullText
 * - QuestionsFlow uses QuestionBundle, not flat list
 * - Copy text is ONLY from ComposedDocumentV1 or MultiComposedDocumentV1
 * - No medical logic in UI components
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('GATE: P13 UI SSOT Compliance', () => {

    const uiDir = path.join(__dirname, '../../v7/components');

    describe('OutputFlow SSOT', () => {
        const outputFlowPath = path.join(uiDir, 'OutputFlow.tsx');

        it('OutputFlow.tsx should exist', () => {
            expect(fs.existsSync(outputFlowPath)).toBe(true);
        });

        it('OutputFlow should accept copyText prop for SSOT copy', () => {
            const content = fs.readFileSync(outputFlowPath, 'utf-8');
            // Must have copyText prop in interface
            expect(content).toContain('copyText?:');
        });

        it('OutputFlow should use textToCopy (from copyText prop) for clipboard', () => {
            const content = fs.readFileSync(outputFlowPath, 'utf-8');
            // Must use textToCopy variable
            expect(content).toContain('textToCopy');
            expect(content).toContain('writeText(textToCopy)');
        });

        it('OutputFlow should NOT directly use fullText for copy (without fallback)', () => {
            const content = fs.readFileSync(outputFlowPath, 'utf-8');
            // Should NOT have direct writeText(output.fullText) - should use textToCopy instead
            expect(content).not.toMatch(/writeText\(output\.fullText\)/);
        });
    });

    describe('QuestionsFlowV2 SSOT', () => {
        const questionsFlowV2Path = path.join(uiDir, 'QuestionsFlowV2.tsx');

        it('QuestionsFlowV2.tsx should exist', () => {
            expect(fs.existsSync(questionsFlowV2Path)).toBe(true);
        });

        it('QuestionsFlowV2 should import QuestionBundle type', () => {
            const content = fs.readFileSync(questionsFlowV2Path, 'utf-8');
            expect(content).toContain('QuestionBundle');
        });

        it('QuestionsFlowV2 should accept bundle prop (not flat questions)', () => {
            const content = fs.readFileSync(questionsFlowV2Path, 'utf-8');
            // Must have bundle prop in interface
            expect(content).toMatch(/bundle:\s*QuestionBundle/);
        });

        it('QuestionsFlowV2 should render required section', () => {
            const content = fs.readFileSync(questionsFlowV2Path, 'utf-8');
            expect(content).toContain('required-section');
            expect(content).toContain('bundle.required');
        });

        it('QuestionsFlowV2 should render optional section with toggle', () => {
            const content = fs.readFileSync(questionsFlowV2Path, 'utf-8');
            expect(content).toContain('optional-section');
            expect(content).toContain('optional-toggle');
            expect(content).toContain('optionalExpanded');
        });

        it('QuestionsFlowV2 should respect docMode for default expansion', () => {
            const content = fs.readFileSync(questionsFlowV2Path, 'utf-8');
            // forensic mode defaults expanded
            expect(content).toContain("bundle.docMode === 'forensic'");
        });
    });

    describe('No Medical Logic in UI', () => {
        const questionsFlowV2Path = path.join(uiDir, 'QuestionsFlowV2.tsx');

        it('QuestionsFlowV2 should NOT contain medical decision logic', () => {
            const content = fs.readFileSync(questionsFlowV2Path, 'utf-8');
            // Should NOT have direct medical processing
            expect(content).not.toContain('processMedical');
            expect(content).not.toContain('hardAskbacks');
            expect(content).not.toContain('softAskbacks');
            expect(content).not.toContain('minimalDatasetMet');
        });

        it('QuestionsFlowV2 should NOT contain billing logic', () => {
            const content = fs.readFileSync(questionsFlowV2Path, 'utf-8');
            expect(content).not.toContain('inferBillingV2');
            expect(content).not.toContain('BillingInferenceResult');
        });
    });

    describe('Combinability Banner in OutputFlow', () => {
        const outputFlowPath = path.join(uiDir, 'OutputFlow.tsx');

        it('OutputFlow should accept combinability prop', () => {
            const content = fs.readFileSync(outputFlowPath, 'utf-8');
            expect(content).toContain('combinability?:');
        });

        it('OutputFlow should import CombinabilityResult type', () => {
            const content = fs.readFileSync(outputFlowPath, 'utf-8');
            expect(content).toContain('CombinabilityResult');
        });
    });
});
