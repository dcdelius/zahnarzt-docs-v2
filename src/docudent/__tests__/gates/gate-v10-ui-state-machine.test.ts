/**
 * Gate: V10 UI Questions Render Test (M51)
 * 
 * Verifies the UI state machine contract:
 * 1. state='questions' + questions.length>0 → Questions Panel must render
 * 2. state='questions' + questions.length===0 → Contract violation, error state
 * 3. Exactly one panel visible per state
 */

import { describe, it, expect } from 'vitest';
import {
    normalizePipelineResultForUi,
    hasValidQuestions,
    hasValidOutput
} from '../../v7/ui/normalizePipelineResultForUi';
import type { PipelineResult } from '../../v7/pipeline/types';

describe('Gate: V10 UI Questions Render (M51)', () => {
    describe('Normalized State Machine', () => {
        it('questions state with valid questions → hasValidQuestions=true', () => {
            const result: PipelineResult = {
                state: 'questions',
                questions: [{ id: 'q1', questionKey: 'test_question', label: 'Test?' }],
                output: null,
                warnings: []
            };

            const normalized = normalizePipelineResultForUi(result);

            expect(normalized.state).toBe('questions');
            expect(normalized.questions.length).toBeGreaterThan(0);
            expect(hasValidQuestions(normalized)).toBe(true);
            expect(hasValidOutput(normalized)).toBe(false);
        });

        it('questions state with empty questions → M52 contract enforces error state', () => {
            const result: PipelineResult = {
                state: 'questions',
                questions: [],  // Contract violation → error
                output: null,
                warnings: []
            };

            const normalized = normalizePipelineResultForUi(result);

            // M52: Empty questions is a contract violation → error state
            expect(normalized.state).toBe('error');
            expect(normalized.diagnostic).toBe('questions_state_without_questions');
            expect(hasValidQuestions(normalized)).toBe(false);
        });

        it('output state with valid output → hasValidOutput=true', () => {
            const result: PipelineResult = {
                state: 'output',
                questions: [],
                output: {
                    fullText: 'Documentation text',
                    sections: [],
                    billingCodes: ['13']
                },
                warnings: []
            };

            const normalized = normalizePipelineResultForUi(result);

            expect(normalized.state).toBe('output');
            expect(hasValidOutput(normalized)).toBe(true);
            expect(hasValidQuestions(normalized)).toBe(false);
        });

        it('error state → state=error', () => {
            const result: PipelineResult = {
                state: 'error',
                questions: [],
                output: null,
                warnings: [],
                error: 'Something went wrong'
            };

            const normalized = normalizePipelineResultForUi(result);

            expect(normalized.state).toBe('error');
            expect(normalized.error).toBe('Something went wrong');
        });

        it('null result → idle state', () => {
            const normalized = normalizePipelineResultForUi(null);

            expect(normalized.state).toBe('idle');
        });

        it('isProcessing=true → running state', () => {
            const result: PipelineResult = {
                state: 'output',
                questions: [],
                output: { fullText: 'test', sections: [], billingCodes: [] },
                warnings: []
            };

            const normalized = normalizePipelineResultForUi(result, true);

            expect(normalized.state).toBe('running');
        });
    });

    describe('State Exclusivity', () => {
        it('exactly one state flag is true at any time', () => {
            const states = ['idle', 'running', 'questions', 'output', 'error'] as const;

            const testCases: Array<{ input: PipelineResult | null; isProcessing: boolean; expected: string }> = [
                { input: null, isProcessing: false, expected: 'idle' },
                { input: null, isProcessing: true, expected: 'running' },
                {
                    input: { state: 'questions', questions: [{ id: 'q1' }], output: null, warnings: [] },
                    isProcessing: false,
                    expected: 'questions'
                },
                {
                    input: { state: 'output', questions: [], output: { fullText: '', sections: [], billingCodes: [] }, warnings: [] },
                    isProcessing: false,
                    expected: 'output'
                },
                {
                    input: { state: 'error', questions: [], output: null, warnings: [], error: 'err' },
                    isProcessing: false,
                    expected: 'error'
                },
            ];

            for (const tc of testCases) {
                const normalized = normalizePipelineResultForUi(tc.input, tc.isProcessing);
                expect(normalized.state).toBe(tc.expected);

                // Exactly one state should match
                const matchingStates = states.filter(s => s === normalized.state);
                expect(matchingStates.length).toBe(1);
            }
        });
    });

    describe('Tooth/Surface Preservation', () => {
        it('extracted tooth is preserved in toothSummary', () => {
            const result: PipelineResult = {
                state: 'output',
                questions: [],
                output: { fullText: 'Zahn 26', sections: [], billingCodes: ['13'] },
                warnings: [],
                extracted: {
                    tooth: '26',
                    surfaces: ['mo', 'd'],
                    diagnosis: 'caries'
                }
            };

            const normalized = normalizePipelineResultForUi(result);

            expect(normalized.toothSummary.tooth).toBe('26');
            expect(normalized.toothSummary.surfaces).toEqual(['mo', 'd']);
        });

        it('missing extracted data → null tooth, empty surfaces', () => {
            const result: PipelineResult = {
                state: 'output',
                questions: [],
                output: { fullText: 'Test', sections: [], billingCodes: [] },
                warnings: []
            };

            const normalized = normalizePipelineResultForUi(result);

            expect(normalized.toothSummary.tooth).toBeNull();
            expect(normalized.toothSummary.surfaces).toEqual([]);
        });
    });
});
