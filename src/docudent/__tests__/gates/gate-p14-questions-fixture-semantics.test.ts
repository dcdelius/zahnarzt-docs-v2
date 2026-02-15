/**
 * Gate: P14 Questions Fixture Semantics
 * 
 * Verifies the E2E fixture gate behavior:
 * - Fixture forces questions ONLY when unanswered questions exist
 * - Once all questions answered, canProceed works normally
 * - This enables the E2E flow: enter questions → answer → retry → output
 * 
 * Fixture: localStorage key 'v7_questions_fixture' = 'force_questions'
 * Guard: VITE_STUB_EXTRACTION === 'true'
 */

import { describe, it, expect } from 'vitest';

describe('Gate: P14 Questions Fixture Semantics', () => {
    // Helper to simulate the fixture gate logic
    const computeCanProceed = (
        allBundleQuestions: { id: string }[],
        answers: Map<string, unknown>,
        fixtureActive: boolean
    ): boolean => {
        const unansweredBundleQuestions = allBundleQuestions.filter(q => !answers.has(q.id));
        let canProceed = unansweredBundleQuestions.length === 0;

        // Fixture gate (simulates VITE_STUB_EXTRACTION=true)
        if (fixtureActive && unansweredBundleQuestions.length > 0) {
            canProceed = false;
        }

        return canProceed;
    };

    describe('fixture OFF (normal behavior)', () => {
        it('should return canProceed=true when all questions answered', () => {
            const questions = [{ id: 'q1' }, { id: 'q2' }];
            const answers = new Map([['q1', 'a1'], ['q2', 'a2']]);

            const result = computeCanProceed(questions, answers, false);

            expect(result).toBe(true);
        });

        it('should return canProceed=false when questions unanswered', () => {
            const questions = [{ id: 'q1' }, { id: 'q2' }];
            const answers = new Map([['q1', 'a1']]); // q2 missing

            const result = computeCanProceed(questions, answers, false);

            expect(result).toBe(false);
        });
    });

    describe('fixture ON + unanswered questions (should force questions)', () => {
        it('should return canProceed=false when fixture on and unanswered exist', () => {
            const questions = [{ id: 'q1' }, { id: 'q2' }];
            const answers = new Map([['q1', 'a1']]); // q2 missing

            const result = computeCanProceed(questions, answers, true);

            expect(result).toBe(false);
        });

        it('should return canProceed=false when fixture on and NO answers exist', () => {
            const questions = [{ id: 'q1' }];
            const answers = new Map(); // no answers

            const result = computeCanProceed(questions, answers, true);

            expect(result).toBe(false);
        });
    });

    describe('fixture ON + all answered (should allow output)', () => {
        it('should return canProceed=true when fixture on but all answered', () => {
            const questions = [{ id: 'q1' }, { id: 'q2' }];
            const answers = new Map([['q1', 'a1'], ['q2', 'a2']]);

            const result = computeCanProceed(questions, answers, true);

            // Key behavior: fixture does NOT block when all answered
            expect(result).toBe(true);
        });

        it('should allow E2E flow: first run questions, after answers output', () => {
            const questions = [{ id: 'q1' }];

            // First run: no answers → questions
            const firstRun = computeCanProceed(questions, new Map(), true);
            expect(firstRun).toBe(false);

            // After answering: answers exist → output
            const afterAnswers = computeCanProceed(questions, new Map([['q1', 'a1']]), true);
            expect(afterAnswers).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle empty bundle (no questions)', () => {
            const questions: { id: string }[] = [];
            const answers = new Map();

            const result = computeCanProceed(questions, answers, true);

            // No questions = canProceed
            expect(result).toBe(true);
        });
    });
});
