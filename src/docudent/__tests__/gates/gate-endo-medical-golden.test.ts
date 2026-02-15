/**
 * Gate Test: Endo Medical Golden Tests
 * 
 * Verifies that Endo question generation follows clinical logic:
 * - vitality/percussion always asked if missing
 * - endo_step inferred from keywords when possible
 * - medikament only asked for start/interim steps
 * - settings-based skipping works
 */

import { describe, it, expect } from 'vitest';

// Note: This tests the question bank structure and when-conditions.
// Full integration tests require the V7 pipeline which depends on browser APIs.

// Import directly from question bank for structure validation
import { loadQuestionBank } from '../../core/billing/knowledgeBase/questions/questionBank';

const endoBank = loadQuestionBank('endo');
type QuestionDef = typeof endoBank.questions[0];

// Helper to check if question has when-condition
function hasWhenCondition(question: QuestionDef): boolean {
    return 'when' in question && question.when !== undefined;
}

// Helper to get question by key
function getQuestion(key: string): QuestionDef | undefined {
    return endoBank.questions.find(q => q.key === key);
}

describe('Gate: Endo Medical Golden Tests', () => {
    // ════════════════════════════════════════════════════════════════
    // CASE 1: "Zahn 36 Trepanation"
    // Expected: endo_step skip (keyword), vitality+percussion, medikament yes
    // ════════════════════════════════════════════════════════════════
    describe('Case 1: Trepanation', () => {
        it('endo_step should have when.noneKeywords including "trepanation"', () => {
            const endoStep = getQuestion('endo_step');
            expect(endoStep).toBeDefined();
            // @ts-expect-error - when may not be in type
            const noneKeywords = endoStep?.when?.noneKeywords || [];
            expect(noneKeywords).toContain('trepanation');
        });

        it('medikament should have when.anyOf with endo_step=start condition', () => {
            const medikament = getQuestion('medikament');
            expect(medikament).toBeDefined();
            expect(hasWhenCondition(medikament!)).toBe(true);
            // @ts-expect-error - when may not be in type
            const anyOf = medikament?.when?.anyOf || [];
            const hasStartCondition = anyOf.some((cond: Record<string, unknown>) =>
                cond.requiresAnswers &&
                (cond.requiresAnswers as Record<string, string>).endo_step === 'endo_start'
            );
            expect(hasStartCondition).toBe(true);
        });
    });

    // ════════════════════════════════════════════════════════════════
    // CASE 2: "Zwischensitzung Einlagenwechsel"
    // Expected: endo_step skip (keyword), medikament yes
    // ════════════════════════════════════════════════════════════════
    describe('Case 2: Zwischensitzung', () => {
        it('endo_step should have when.noneKeywords including "zwischensitzung"', () => {
            const endoStep = getQuestion('endo_step');
            // @ts-expect-error - when may not be in type
            const noneKeywords = endoStep?.when?.noneKeywords || [];
            expect(noneKeywords).toContain('zwischensitzung');
        });

        it('endo_step should have when.noneKeywords including "einlage"', () => {
            const endoStep = getQuestion('endo_step');
            // @ts-expect-error - when may not be in type
            const noneKeywords = endoStep?.when?.noneKeywords || [];
            expect(noneKeywords).toContain('einlage');
        });

        it('medikament should have keyword trigger for "einlage"', () => {
            const medikament = getQuestion('medikament');
            // @ts-expect-error - when may not be in type
            const anyOf = medikament?.when?.anyOf || [];
            const hasEinlageKeyword = anyOf.some((cond: Record<string, unknown>) =>
                cond.anyKeywords &&
                (cond.anyKeywords as string[]).includes('einlage')
            );
            expect(hasEinlageKeyword).toBe(true);
        });
    });

    // ════════════════════════════════════════════════════════════════
    // CASE 3: "Wurzelfüllung 4 Kanäle thermoplastisch"
    // Expected: endo_step skip, kanalzahl skip (extracted), obturation skip (extracted)
    // ════════════════════════════════════════════════════════════════
    describe('Case 3: Wurzelfüllung', () => {
        it('endo_step should have when.noneKeywords including "wurzelfüllung"', () => {
            const endoStep = getQuestion('endo_step');
            // @ts-expect-error - when may not be in type
            const noneKeywords = endoStep?.when?.noneKeywords || [];
            expect(noneKeywords.some((kw: string) =>
                kw.includes('wurzelfüll') || kw.includes('wf')
            )).toBe(true);
        });

        it('obturation should have when condition for endo_step=complete', () => {
            const obturation = getQuestion('obturation');
            expect(obturation).toBeDefined();
            expect(hasWhenCondition(obturation!)).toBe(true);
            // @ts-expect-error - when may not be in type
            const anyOf = obturation?.when?.anyOf || [];
            const hasCompleteCondition = anyOf.some((cond: Record<string, unknown>) =>
                cond.requiresAnswers &&
                (cond.requiresAnswers as Record<string, string>).endo_step === 'endo_complete'
            );
            expect(hasCompleteCondition).toBe(true);
        });

        it('obturation should have keyword trigger for "thermoplastisch"', () => {
            const obturation = getQuestion('obturation');
            // @ts-expect-error - when may not be in type
            const anyOf = obturation?.when?.anyOf || [];
            const hasThermoplastischKeyword = anyOf.some((cond: Record<string, unknown>) =>
                cond.anyKeywords &&
                (cond.anyKeywords as string[]).includes('thermoplastisch')
            );
            expect(hasThermoplastischKeyword).toBe(true);
        });
    });

    // ════════════════════════════════════════════════════════════════
    // CASE 4: "Endo" (minimal)
    // Expected: endo_step asked (no keyword), vitality+percussion asked
    // ════════════════════════════════════════════════════════════════
    describe('Case 4: Minimal "Endo"', () => {
        it('endo_step should be asked when no keywords present', () => {
            const endoStep = getQuestion('endo_step');
            expect(endoStep).toBeDefined();
            // The when.noneKeywords means: skip if ANY of these are present
            // If none are present, question is asked
        });

        it('vitality should NOT have settings-based skip', () => {
            const vitality = getQuestion('vitality');
            expect(vitality).toBeDefined();
            // @ts-expect-error - settingsSkip may not be in type
            expect(vitality?.settingsSkip).toBeUndefined();
        });

        it('percussion should NOT have settings-based skip', () => {
            const percussion = getQuestion('percussion');
            expect(percussion).toBeDefined();
            // @ts-expect-error - settingsSkip may not be in type
            expect(percussion?.settingsSkip).toBeUndefined();
        });
    });

    // ════════════════════════════════════════════════════════════════
    // CASE 5: Settings-based skipping
    // Expected: spuelprotokoll/obturation skip if settings !== 'fragen'
    // ════════════════════════════════════════════════════════════════
    describe('Case 5: Settings-based skipping', () => {
        it('spuelprotokoll should have settingsSkip configuration', () => {
            const spuelprotokoll = getQuestion('spuelprotokoll');
            expect(spuelprotokoll).toBeDefined();
            // @ts-expect-error - settingsSkip may not be in type
            expect(spuelprotokoll?.settingsSkip).toBeDefined();
            // @ts-expect-error - settingsSkip may not be in type
            expect(spuelprotokoll?.settingsSkip?.settingsPath).toBe('endo.defaults.spuelprotokoll');
            // @ts-expect-error - settingsSkip may not be in type
            expect(spuelprotokoll?.settingsSkip?.skipIfNot).toBe('fragen');
        });

        it('obturation should have settingsSkip configuration', () => {
            const obturation = getQuestion('obturation');
            expect(obturation).toBeDefined();
            // @ts-expect-error - settingsSkip may not be in type
            expect(obturation?.settingsSkip).toBeDefined();
            // @ts-expect-error - settingsSkip may not be in type
            expect(obturation?.settingsSkip?.settingsPath).toBe('endo.defaults.obturation');
        });
    });

    // ════════════════════════════════════════════════════════════════
    // CASE 6: "EAL, ultraschall aktiviert"
    // Expected: these are settings-driven, not questions
    // ════════════════════════════════════════════════════════════════
    describe('Case 6: EAL/Aktivierung (settings-driven)', () => {
        it('should NOT have eal as a question (settings-driven only)', () => {
            const eal = getQuestion('eal');
            // EAL should be settings-driven, not a question
            expect(eal).toBeUndefined();
        });

        it('should NOT have aktivierung as a question (settings-driven only)', () => {
            const aktivierung = getQuestion('aktivierung');
            // Aktivierung should be settings-driven, not a question
            expect(aktivierung).toBeUndefined();
        });
    });

    // ════════════════════════════════════════════════════════════════
    // Forensic questions: vitality/percussion always relevant
    // ════════════════════════════════════════════════════════════════
    describe('Forensic always-ask questions', () => {
        it('vitality should be category=forensic', () => {
            const vitality = getQuestion('vitality');
            expect(vitality?.category).toBe('forensic');
        });

        it('percussion should be category=forensic', () => {
            const percussion = getQuestion('percussion');
            expect(percussion?.category).toBe('forensic');
        });

        it('kanalzahl should be category=forensic', () => {
            const kanalzahl = getQuestion('kanalzahl');
            expect(kanalzahl?.category).toBe('forensic');
        });
    });
});
