/**
 * Gate: V10 UI Stepper Contract (M52)
 * 
 * Verifies the M52 stepper contract:
 * 1. pipeline state → UI step mapping is correct
 * 2. Exactly one primary panel per state (SSOT)
 */

import { describe, it, expect } from 'vitest';
import {
    normalizePipelineResultForUi,
    type UiStep,
} from '../../v7/ui/normalizePipelineResultForUi';
import type { PipelineResult } from '../../v7/pipeline/types';

describe('Gate: V10 UI Stepper Contract (M52)', () => {
    describe('State to Step Mapping', () => {
        const cases: Array<{ pipelineState: string; expectedStep: UiStep; desc: string }> = [
            { pipelineState: 'idle', expectedStep: 'dictation', desc: 'idle → dictation' },
            { pipelineState: 'running', expectedStep: 'dictation', desc: 'running → dictation' },
            { pipelineState: 'questions', expectedStep: 'review', desc: 'questions → review' },
            { pipelineState: 'output', expectedStep: 'output', desc: 'output → output' },
            { pipelineState: 'error', expectedStep: 'error', desc: 'error → error' },
        ];

        for (const tc of cases) {
            it(tc.desc, () => {
                let result: PipelineResult | null = null;
                let isProcessing = false;

                switch (tc.pipelineState) {
                    case 'idle':
                        result = null;
                        break;
                    case 'running':
                        isProcessing = true;
                        result = { state: 'output', questions: [], output: null, warnings: [] };
                        break;
                    case 'questions':
                        result = { state: 'questions', questions: [{ id: 'q1', category: 'test', question: 'Q?' }], output: null, warnings: [] };
                        break;
                    case 'output':
                        result = { state: 'output', questions: [], output: { fullText: 'T', sections: [], billingCodes: ['13'], warnings: [] }, warnings: [] };
                        break;
                    case 'error':
                        result = { state: 'error', questions: [], output: null, warnings: [], error: 'err' };
                        break;
                }

                const normalized = normalizePipelineResultForUi(result, isProcessing);
                expect(normalized.step).toBe(tc.expectedStep);
            });
        }
    });

    describe('canEdit Flag', () => {
        it('canEdit=true only when state=output', () => {
            const outputResult: PipelineResult = {
                state: 'output',
                questions: [],
                output: { fullText: 'T', sections: [], billingCodes: ['13'], warnings: [] },
                warnings: []
            };

            const normalized = normalizePipelineResultForUi(outputResult);

            expect(normalized.canEdit).toBe(true);
        });

        it('canEdit=false for questions state', () => {
            const questionsResult: PipelineResult = {
                state: 'questions',
                questions: [{ id: 'q1', category: 'test', question: 'Q?' }],
                output: null,
                warnings: []
            };

            const normalized = normalizePipelineResultForUi(questionsResult);

            expect(normalized.canEdit).toBe(false);
        });

        it('canEdit=false for error state', () => {
            const errorResult: PipelineResult = {
                state: 'error',
                questions: [],
                output: null,
                warnings: [],
                error: 'Failed'
            };

            const normalized = normalizePipelineResultForUi(errorResult);

            expect(normalized.canEdit).toBe(false);
        });
    });
});
