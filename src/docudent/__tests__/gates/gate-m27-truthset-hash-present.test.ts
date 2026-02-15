/**
 * Gate M27: Truthset Hash Present
 *
 * Ensures KB hashes are present in ExplainRun reports.
 */

import { describe, it, expect } from 'vitest';
import { explainRunV10 } from '../../v10/qa/explainRunV10';
import type { V10PipelineInput, V10PipelineOutput } from '../../v10/pipeline/runV10';

describe('gate-m27-truthset-hash-present', () => {
    const mockInput: V10PipelineInput = {
        dictation: 'Füllung Zahn 36',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
    };

    const mockOutput: V10PipelineOutput = {
        state: 'output',
        output: {
            fullText: 'Test text',
            billingCodes: ['BEMA_25'],
            chips: [],
        },
        meta: {
            traceLines: [
                { key: 'kb_medical', value: { version: 'v1', hash: 'abc123' } },
                { key: 'kb_treatment', value: { version: 'v1', hash: 'def456' } },
            ],
            combinability: { verdict: 'pass', conflicts: [] },
        },
    };

    it('medical KB hash is present', () => {
        const result = explainRunV10(mockInput, mockOutput);
        expect(result.reportJson.kbMeta.medical.hash).toBeTruthy();
    });

    it('treatment KB hash is present', () => {
        const result = explainRunV10(mockInput, mockOutput);
        expect(result.reportJson.kbMeta.treatment.hash).toBeTruthy();
    });

    it('combinability KB hash is present', () => {
        const result = explainRunV10(mockInput, mockOutput);
        expect(result.reportJson.kbMeta.combinability.hash).toBeTruthy();
    });

    it('all KB sources are defined', () => {
        const result = explainRunV10(mockInput, mockOutput);

        expect(result.reportJson.kbMeta.medical.source).toBeTruthy();
        expect(result.reportJson.kbMeta.treatment.source).toBeTruthy();
        expect(result.reportJson.kbMeta.combinability.source).toBeTruthy();
    });

    it('all KB versions are defined', () => {
        const result = explainRunV10(mockInput, mockOutput);

        expect(result.reportJson.kbMeta.medical.version).toBeTruthy();
        expect(result.reportJson.kbMeta.treatment.version).toBeTruthy();
        expect(result.reportJson.kbMeta.combinability.version).toBeTruthy();
    });
});
