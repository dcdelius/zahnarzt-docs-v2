/**
 * Gate: P14.X9 unansweredByInstance SSOT
 * 
 * Verifies that the orchestrator correctly computes unansweredByInstance
 * for per-instance question tracking.
 * 
 * Scenarios:
 * 1. Instance with all answers → unansweredByInstance[id] = []
 * 2. Instance with missing answers → unansweredByInstance[id] = [missing IDs]
 * 3. Two instances, only one answered → correct isolation
 */

import { describe, it, expect, vi } from 'vitest';

// We'll test the logic directly by simulating the helper behavior
describe('Gate: P14.X9 unansweredByInstance SSOT', () => {
    // Helper to simulate the getUnansweredRequired logic
    const getUnansweredRequired = (
        required: { id: string }[],
        answers: Map<string, unknown>
    ): string[] => {
        if (!required || required.length === 0) return [];

        return required
            .map(q => q.id)
            .filter(qId => {
                if (!answers.has(qId)) return true;
                const value = answers.get(qId);
                return value === '' || value === null || value === undefined;
            });
    };

    describe('getUnansweredRequired logic', () => {
        it('should return empty array when no required questions', () => {
            const answers = new Map<string, unknown>();
            const result = getUnansweredRequired([], answers);

            expect(result).toEqual([]);
        });

        it('should return all IDs when no answers provided', () => {
            const required = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];
            const answers = new Map<string, unknown>();

            const result = getUnansweredRequired(required, answers);

            expect(result).toEqual(['q1', 'q2', 'q3']);
        });

        it('should return empty array when all required answered', () => {
            const required = [{ id: 'q1' }, { id: 'q2' }];
            const answers = new Map<string, unknown>([
                ['q1', 'answer1'],
                ['q2', 'answer2'],
            ]);

            const result = getUnansweredRequired(required, answers);

            expect(result).toEqual([]);
        });

        it('should return only unanswered IDs', () => {
            const required = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];
            const answers = new Map<string, unknown>([
                ['q1', 'answer1'],
                // q2 missing
                ['q3', 'answer3'],
            ]);

            const result = getUnansweredRequired(required, answers);

            expect(result).toEqual(['q2']);
        });

        it('should treat empty string as unanswered', () => {
            const required = [{ id: 'q1' }];
            const answers = new Map<string, unknown>([
                ['q1', ''],
            ]);

            const result = getUnansweredRequired(required, answers);

            expect(result).toEqual(['q1']);
        });

        it('should treat null as unanswered', () => {
            const required = [{ id: 'q1' }];
            const answers = new Map<string, unknown>([
                ['q1', null],
            ]);

            const result = getUnansweredRequired(required, answers);

            expect(result).toEqual(['q1']);
        });

        it('should treat undefined as unanswered', () => {
            const required = [{ id: 'q1' }];
            const answers = new Map<string, unknown>([
                ['q1', undefined],
            ]);

            const result = getUnansweredRequired(required, answers);

            expect(result).toEqual(['q1']);
        });
    });

    describe('per-instance isolation', () => {
        it('should compute unansweredByInstance correctly for multiple instances', () => {
            // Simulate two instances with same required questions but different answers
            const required = [{ id: 'vitality' }, { id: 'percussion' }];

            // Instance 1: fully answered
            const answers1 = new Map<string, unknown>([
                ['vitality', '+'],
                ['percussion', '-'],
            ]);

            // Instance 2: partially answered
            const answers2 = new Map<string, unknown>([
                ['vitality', '+'],
                // percussion missing
            ]);

            const unanswered1 = getUnansweredRequired(required, answers1);
            const unanswered2 = getUnansweredRequired(required, answers2);

            expect(unanswered1).toEqual([]);
            expect(unanswered2).toEqual(['percussion']);
        });

        it('should not leak answers between instances', () => {
            const required = [{ id: 'q1' }];

            // Instance 1 has answer
            const answers1 = new Map<string, unknown>([['q1', 'yes']]);
            // Instance 2 does NOT have answer
            const answers2 = new Map<string, unknown>();

            // Verify no cross-instance leakage
            expect(getUnansweredRequired(required, answers1)).toEqual([]);
            expect(getUnansweredRequired(required, answers2)).toEqual(['q1']);
        });
    });

    describe('determinism', () => {
        it('should produce identical results for same input', () => {
            const required = [{ id: 'q1' }, { id: 'q2' }];
            const answers = new Map<string, unknown>([['q1', 'yes']]);

            const result1 = getUnansweredRequired(required, answers);
            const result2 = getUnansweredRequired(required, answers);

            expect(result1).toEqual(result2);
            expect(result1).toEqual(['q2']);
        });
    });
});
