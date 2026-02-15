/**
 * Gate: V10 UI No Silent Empty Billing (M52)
 * 
 * Verifies the M52 contract:
 * 1. Output with billingCodes=[] and no explanation → diagnostic set
 * 2. Output with guard-block-all or insurance-filter → allowed (diagnostic null)
 */

import { describe, it, expect } from 'vitest';
import {
    normalizePipelineResultForUi,
} from '../../v7/ui/normalizePipelineResultForUi';
import type { PipelineResult } from '../../v7/pipeline/types';

describe('Gate: V10 UI No Silent Empty Billing (M52)', () => {
    describe('Empty Billing Contract', () => {
        it('empty billing without explanation → diagnostic set', () => {
            const result: PipelineResult = {
                state: 'output',
                questions: [],
                output: {
                    fullText: 'Some output text',
                    sections: [],
                    billingCodes: [],  // Empty!
                    warnings: []
                },
                warnings: []
            };

            const normalized = normalizePipelineResultForUi(result);

            // State stays output but diagnostic is set
            expect(normalized.state).toBe('output');
            expect(normalized.diagnostic).toBe('empty_billing_unexplained');
        });

        it('empty billing with billing guard block → no diagnostic (explained)', () => {
            const result: PipelineResult = {
                state: 'output',
                questions: [],
                output: {
                    fullText: 'Filtered output',
                    sections: [],
                    billingCodes: [],
                    warnings: []
                },
                warnings: [],
                debug: {
                    trace: [],
                    traceEnabled: true,
                    billingGuard: { allowed: 0, blocked: 5 }  // Explanation!
                } as any
            };

            const normalized = normalizePipelineResultForUi(result);

            expect(normalized.state).toBe('output');
            expect(normalized.diagnostic).toBeNull();
            expect(normalized.trace.billingGuard?.blocked).toBe(5);
        });

        it('output with billing codes → no diagnostic', () => {
            const result: PipelineResult = {
                state: 'output',
                questions: [],
                output: {
                    fullText: 'Documentation',
                    sections: [],
                    billingCodes: ['BEMA_13', 'GOZ_2330'],
                    warnings: []
                },
                warnings: []
            };

            const normalized = normalizePipelineResultForUi(result);

            expect(normalized.state).toBe('output');
            expect(normalized.diagnostic).toBeNull();
            expect(normalized.billingCodes).toEqual(['BEMA_13', 'GOZ_2330']);
        });
    });

    describe('Output State Contract', () => {
        it('output state with missing output object → error', () => {
            const result: PipelineResult = {
                state: 'output',
                questions: [],
                output: null,  // Missing!
                warnings: []
            };

            const normalized = normalizePipelineResultForUi(result);

            expect(normalized.state).toBe('error');
            expect(normalized.diagnostic).toBe('output_state_without_output');
        });
    });

    describe('New UiModel Fields (M52)', () => {
        it('step is derived from state', () => {
            const output: PipelineResult = {
                state: 'output',
                questions: [],
                output: { fullText: 'Test', sections: [], billingCodes: ['13'], warnings: [] },
                warnings: []
            };

            const normalized = normalizePipelineResultForUi(output);

            expect(normalized.step).toBe('output');
            expect(normalized.canEdit).toBe(true);
        });

        it('questions state → step=review', () => {
            const questions: PipelineResult = {
                state: 'questions',
                questions: [{ id: 'q1', category: 'test', question: 'Q?' }],
                output: null,
                warnings: []
            };

            const normalized = normalizePipelineResultForUi(questions);

            expect(normalized.step).toBe('review');
            expect(normalized.canEdit).toBe(false);
        });

        it('idle → step=dictation', () => {
            const normalized = normalizePipelineResultForUi(null);

            expect(normalized.step).toBe('dictation');
            expect(normalized.state).toBe('idle');
        });
    });
});
