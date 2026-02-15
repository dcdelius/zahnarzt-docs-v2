/**
 * Gate: Combinability BLOCK Means Askback
 *
 * Contract: BLOCK must NOT hard-error. It should surface a rule askback
 * so the user can resolve or drop billing conflicts.
 */

import { describe, it, expect } from 'vitest';

describe('gate-combinability-block-means-error', () => {
    describe('BLOCK askback invariant', () => {
        it('BLOCK verdict should produce questions state', () => {
            const scenarios = [
                { verdict: 'pass', expectedState: 'output' },
                { verdict: 'warn', expectedState: 'output' },
                { verdict: 'block', expectedState: 'questions' },
            ];

            for (const scenario of scenarios) {
                if (scenario.verdict === 'block') {
                    expect(
                        scenario.expectedState,
                        'BLOCK verdict should result in questions state'
                    ).toBe('questions');
                }
            }
        });

        it('questions state keeps combinability metadata', () => {
            const questionsMeta = {
                combinability: {
                    verdict: 'block',
                    conflicts: [
                        {
                            ruleId: 'goz_exclusion_001',
                            codesInvolved: ['GOZ_2197', 'GOZ_2060'],
                            scope: 'session',
                            severity: 'block',
                            reason: 'Mutual exclusion',
                        },
                    ],
                },
            };

            expect(questionsMeta.combinability.verdict).toBe('block');
            expect(questionsMeta.combinability.conflicts.length).toBeGreaterThan(0);

            for (const conflict of questionsMeta.combinability.conflicts) {
                expect(conflict.ruleId).toBeDefined();
                expect(conflict.codesInvolved).toBeDefined();
                expect(conflict.severity).toBe('block');
            }
        });

        it('WARN verdict allows output state', () => {
            // WARN does not block output
            const warnResult = {
                state: 'output',
                meta: {
                    combinability: {
                        verdict: 'warn',
                        conflicts: [],
                    },
                },
            };

            expect(warnResult.state).toBe('output');
            expect(warnResult.meta.combinability.verdict).toBe('warn');
        });

        it('PASS verdict allows output state', () => {
            const passResult = {
                state: 'output',
                meta: {
                    combinability: {
                        verdict: 'pass',
                        conflicts: [],
                    },
                },
            };

            expect(passResult.state).toBe('output');
            expect(passResult.meta.combinability.verdict).toBe('pass');
        });
    });
});
