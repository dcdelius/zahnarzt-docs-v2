/**
 * Gate: No Phantom Billing Codes
 *
 * Proves every billing code in output comes from a chip.
 * This gate validates the SSOT principle: No Billing Without Chip.
 */

import { describe, it, expect } from 'vitest';
import { explainRunV10 } from '../../v10/qa/explainRunV10';
import type { V10PipelineOutput } from '../../v10/pipeline/runV10';

describe('gate-no-phantom-billing-codes', () => {
    describe('SSOT Billing Principle', () => {
        it('every billing code must reference a sourceChipId', () => {
            const mockInput = {
                dictation: 'Test',
                treatmentId: 'fuellung',
                insuranceType: 'GKV' as const,
            };

            const mockOutput: V10PipelineOutput = {
                state: 'output',
                output: {
                    fullText: 'Test',
                    billingCodes: ['BEMA_25'],
                    chips: [{ id: 'cp', ruleId: 'test' }],
                },
                meta: {
                    traceLines: [],
                    combinability: { verdict: 'pass', conflicts: [] },
                },
            };

            const explain = explainRunV10(mockInput, mockOutput);

            for (const code of explain.reportJson.billingCodes) {
                expect(
                    code.sourceChipId,
                    `Billing code ${code.code} has no sourceChipId - phantom code!`
                ).toBeDefined();
                expect(code.sourceChipId).not.toBe('');
            }
        });

        it('billing codes with chips have valid code system', () => {
            const mockInput = {
                dictation: 'Test',
                treatmentId: 'fuellung',
                insuranceType: 'GKV' as const,
            };

            const mockOutput: V10PipelineOutput = {
                state: 'output',
                output: {
                    fullText: 'Test',
                    billingCodes: ['BEMA_25', 'GOZ_2060'],
                    chips: [{ id: 'cp', ruleId: 'test' }],
                },
                meta: {
                    traceLines: [],
                    combinability: { verdict: 'pass', conflicts: [] },
                },
            };

            const explain = explainRunV10(mockInput, mockOutput);
            const validSystems = ['BEMA', 'GOZ', 'GOÄ', 'BEL2'];

            for (const code of explain.reportJson.billingCodes) {
                expect(
                    validSystems,
                    `Invalid code system: ${code.codeSystem}`
                ).toContain(code.codeSystem);
            }
        });

        it('output billingCodes count matches explain report', () => {
            const mockInput = {
                dictation: 'Test',
                treatmentId: 'fuellung',
                insuranceType: 'GKV' as const,
            };

            const mockOutput: V10PipelineOutput = {
                state: 'output',
                output: {
                    fullText: 'Test',
                    billingCodes: ['BEMA_25', 'BEMA_12'],
                    chips: [{ id: 'cp', ruleId: 'test' }],
                },
                meta: {
                    traceLines: [],
                    combinability: { verdict: 'pass', conflicts: [] },
                },
            };

            const explain = explainRunV10(mockInput, mockOutput);

            expect(explain.reportJson.billingCodes.length).toBe(
                mockOutput.output!.billingCodes.length
            );
        });
    });
});
