/**
 * Gate M27: ExplainRun Report Determinism 100x
 *
 * Verifies that ExplainRun reports are deterministic.
 * Same input must produce identical stableHash across 100 runs.
 */

import { describe, it, expect } from 'vitest';
import { explainRunV10 } from '../../v10/qa/explainRunV10';
import type { V10PipelineInput, V10PipelineOutput } from '../../v10/pipeline/runV10';

describe('gate-m27-explain-report-determinism-100x', () => {
    // Mock input
    const mockInput: V10PipelineInput = {
        dictation: 'Füllung Zahn 36 mesial-okklusal Komposit',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
    };

    // Mock output (minimal)
    const mockOutput: V10PipelineOutput = {
        state: 'output',
        output: {
            fullText: 'Füllung am Zahn 36 durchgeführt.',
            billingCodes: ['BEMA_25'],
            chips: [{ id: 'cp', ruleId: 'deep_caries' }],
        },
        meta: {
            traceLines: [
                { key: 'extract', value: { engine: 'stub', tooth: '36' } },
                { key: 'kb_medical', value: { version: 'v1', hash: 'abc123' } },
                { key: 'kb_treatment', value: { version: 'v1', hash: 'def456' } },
            ],
            combinability: { verdict: 'pass', conflicts: [] },
        },
    };

    it('produces identical hash across 100 runs', () => {
        const hashes: string[] = [];

        for (let i = 0; i < 100; i++) {
            const result = explainRunV10(mockInput, mockOutput);
            hashes.push(result.stableHash);
        }

        // All hashes should be identical
        const uniqueHashes = new Set(hashes);
        expect(
            uniqueHashes.size,
            `Expected 1 unique hash, got ${uniqueHashes.size}: ${[...uniqueHashes].join(', ')}`
        ).toBe(1);
    });

    it('hash changes when input changes', () => {
        const result1 = explainRunV10(mockInput, mockOutput);

        const modifiedInput: V10PipelineInput = {
            ...mockInput,
            dictation: 'Different dictation',
        };
        const result2 = explainRunV10(modifiedInput, mockOutput);

        expect(result1.stableHash).not.toBe(result2.stableHash);
    });

    it('hash changes when output changes', () => {
        const result1 = explainRunV10(mockInput, mockOutput);

        const modifiedOutput: V10PipelineOutput = {
            ...mockOutput,
            output: {
                ...mockOutput.output!,
                billingCodes: ['BEMA_25', 'BEMA_12'],
            },
        };
        const result2 = explainRunV10(mockInput, modifiedOutput);

        expect(result1.stableHash).not.toBe(result2.stableHash);
    });
});
