/**
 * Gate Test: Endo Step Detection V7 E2E
 * 
 * Verifies that endo step detection works through the V7 pipeline:
 * - Keyword detection → no askback → ENDO-SCHRITT in output
 * - Ambiguous dictation → askback required
 * - Answering askback → ENDO-SCHRITT appears
 * - Determinism: same input → same output
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { run } from '../../v7/pipeline';
import { detectEndoStep, ENDO_STEP_LABELS } from '../../core/billing/knowledgeBase/logic/endoStepDetector';
import type { PipelineInput } from '../../v7/pipeline/types';

// ═══════════════════════════════════════════════════════════════
// HELPER: Simulate clipboard text build (matches OutputRenderer L186)
// ═══════════════════════════════════════════════════════════════
function buildClipboardText(sections: Array<{ label: string; content: string }>): string {
    return sections.map(s => `${s.label}:\n${s.content}`).join('\n\n');
}

// ═══════════════════════════════════════════════════════════════
// UNIT TESTS: detectEndoStep() pure function
// ═══════════════════════════════════════════════════════════════
describe('detectEndoStep() — Pure Function', () => {
    it('detects endo_complete from "Guttapercha"', () => {
        const result = detectEndoStep('WF mit Guttapercha');
        expect(result.step).toBe('endo_complete');
        expect(result.evidence).toContain('guttapercha');
    });

    it('detects endo_complete from "Wurzelfüllung"', () => {
        const result = detectEndoStep('Wurzelfüllung eingebracht');
        expect(result.step).toBe('endo_complete');
    });

    it('detects endo_interim from "Einlage erneuert"', () => {
        const result = detectEndoStep('Zahn 26, Einlage erneuert');
        expect(result.step).toBe('endo_interim');
        expect(result.evidence).toContain('einlage erneuert');
    });

    it('detects endo_start from "Trepanation"', () => {
        const result = detectEndoStep('Trepanation Zahn 46, Einlage');
        expect(result.step).toBe('endo_start');
        expect(result.evidence).toContain('trepanation');
    });

    it('detects endo_start from lone "Einlage" (not "erneuert")', () => {
        const result = detectEndoStep('Zahn 36, Einlage Ca(OH)2');
        expect(result.step).toBe('endo_start');
    });

    it('returns null for ambiguous dictation', () => {
        const result = detectEndoStep('WKB Zahn 36');
        expect(result.step).toBeNull();
        expect(result.evidence).toEqual([]);
    });

    it('is deterministic — same input twice returns same output', () => {
        const input = 'Wurzelfüllung Zahn 46 mit Guttapercha';
        const result1 = detectEndoStep(input);
        const result2 = detectEndoStep(input);
        expect(result1).toEqual(result2);
    });
});

// ═══════════════════════════════════════════════════════════════
// E2E TESTS: V7 Pipeline with Endo Step
// ═══════════════════════════════════════════════════════════════
describe('V7 Pipeline — Endo Step E2E', () => {
    // Complete answers for endo treatment (skip forensic questions)
    const fullEndoAnswers = new Map<string, any>([
        ['vitality', '-'],
        ['percussion', '-'],
        ['kanalzahl', 3],
        ['spuelung', 'naocl'],
        ['medikament', 'caoh2'],
    ]);

    const baseInput: Partial<PipelineInput> = {
        insuranceType: 'GKV',
        textLength: 'mittel',
        hasMKV: false,
        treatmentId: 'endo',
        answers: fullEndoAnswers,
    };

    describe('Case A: Complete detection — NO askback', () => {
        it('WF Guttapercha → endo_complete, output contains ENDO-SCHRITT', async () => {
            const result = await run({
                ...baseInput,
                dictation: 'Zahn 36, 3 Kanäle, Wurzelfüllung mit Guttapercha abgeschlossen',
                answers: fullEndoAnswers,
            } as PipelineInput);

            // No askback for endo_step
            const endoStepQuestion = result.questions.find(q => q.id === 'endo_step');
            expect(endoStepQuestion).toBeUndefined();

            // Output has ENDO-SCHRITT section
            expect(result.output).not.toBeNull();
            const endoSection = result.output?.sections.find(s => s.id === 'endo_schritt');
            expect(endoSection).toBeDefined();
            expect(endoSection?.content).toContain('ENDO-SCHRITT');
            expect(endoSection?.content).toContain('Wurzelfüllung');

            // Clipboard text contains ENDO-SCHRITT
            const clipboardText = buildClipboardText(result.output?.sections || []);
            expect(clipboardText).toContain('ENDO-SCHRITT');
        });
    });

    describe('Case B: Interim detection — NO askback', () => {
        it('Einlage erneuert → endo_interim, output contains ENDO-SCHRITT', async () => {
            const result = await run({
                ...baseInput,
                dictation: 'Zahn 26, 2 Kanäle, Einlage erneuert, weiter aufbereitet',
                answers: fullEndoAnswers,
            } as PipelineInput);

            const endoStepQuestion = result.questions.find(q => q.id === 'endo_step');
            expect(endoStepQuestion).toBeUndefined();

            expect(result.output).not.toBeNull();
            const endoSection = result.output?.sections.find(s => s.id === 'endo_schritt');
            expect(endoSection).toBeDefined();
            expect(endoSection?.content).toContain('Zwischensitzung');
        });
    });

    describe('Case C: Ambiguous dictation — ASKBACK required', () => {
        it('WKB Zahn 36 only → endo_step question appears when no keywords', async () => {
            // Use empty answers so pipeline returns questions state
            const result = await run({
                ...baseInput,
                dictation: 'WKB Zahn 36',
                answers: new Map(), // No answers - will return questions
            } as PipelineInput);

            // Askback required - endo_step question should be in the list
            const endoStepQuestion = result.questions.find(q => q.id === 'endo_step');
            expect(endoStepQuestion).toBeDefined();
            expect(endoStepQuestion?.options).toHaveLength(3);
            expect(endoStepQuestion?.options.map(o => o.dataValue)).toEqual([
                'endo_start',
                'endo_interim',
                'endo_complete'
            ]);
        });
    });

    describe('Case D: Answering askback → ENDO-SCHRITT appears', () => {
        it('after selecting endo_interim, output contains ENDO-SCHRITT: Zwischensitzung', async () => {
            const answers = new Map<string, any>([
                ['endo_step', 'endo_interim'],
                ['vitality', '-'],
                ['percussion', '-'],
                ['kanalzahl', 3],
                ['spuelung', 'naocl'],
                ['medikament', 'caoh2'],
            ]);

            const result = await run({
                ...baseInput,
                dictation: 'WKB Zahn 36',
                answers,
            } as PipelineInput);

            // Output should be generated now with all questions answered
            expect(result.output).not.toBeNull();

            // ENDO-SCHRITT section should be present with answered value
            const endoSection = result.output?.sections.find(s => s.id === 'endo_schritt');
            expect(endoSection).toBeDefined();
            expect(endoSection?.content).toContain('Zwischensitzung');
        });
    });

    describe('Case E: Determinism', () => {
        it('same dictation twice → identical output sections', async () => {
            const input: PipelineInput = {
                ...baseInput,
                dictation: 'Zahn 16, 3 Kanäle, Trepanation, Ca(OH)2 Einlage',
                answers: fullEndoAnswers,
            } as PipelineInput;

            const result1 = await run(input);
            const result2 = await run(input);

            // Both should have output
            expect(result1.output).not.toBeNull();
            expect(result2.output).not.toBeNull();

            // Same sections
            expect(result1.output?.sections.map(s => s.id)).toEqual(
                result2.output?.sections.map(s => s.id)
            );

            // Same clipboard text
            const clipboard1 = buildClipboardText(result1.output?.sections || []);
            const clipboard2 = buildClipboardText(result2.output?.sections || []);
            expect(clipboard1).toBe(clipboard2);

            // Both contain ENDO-SCHRITT
            expect(clipboard1).toContain('ENDO-SCHRITT');
        });
    });
});


// ═══════════════════════════════════════════════════════════════
// REGRESSION: Existing endo tests must still pass
// ═══════════════════════════════════════════════════════════════
describe('Regression — Existing Endo Behavior Unchanged', () => {
    it('fuellung treatment is unaffected by endo step logic', async () => {
        const result = await run({
            dictation: 'Zahn 36 mo, Karies entfernt, Komposit',
            insuranceType: 'GKV',
            textLength: 'mittel',
            hasMKV: false,
            treatmentId: 'fuellung',
            answers: new Map(),
        } as PipelineInput);

        // No ENDO-SCHRITT section for fuellung
        const endoSection = result.output?.sections.find(s => s.id === 'endo_schritt');
        expect(endoSection).toBeUndefined();

        // No endo_step question
        const endoStepQuestion = result.questions.find(q => q.id === 'endo_step');
        expect(endoStepQuestion).toBeUndefined();
    });
});
