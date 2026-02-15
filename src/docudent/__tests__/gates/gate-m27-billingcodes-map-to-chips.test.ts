/**
 * Gate M27: Billing Codes Map to Chips
 *
 * Ensures every billing code has a source chip reference.
 */

import { describe, it, expect } from 'vitest';
import { explainRunV10 } from '../../v10/qa/explainRunV10';
import type { V10PipelineInput, V10PipelineOutput } from '../../v10/pipeline/runV10';

describe('gate-m27-billingcodes-map-to-chips', () => {
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
            chips: [{ id: 'cp', ruleId: 'test' }],
        },
        meta: {
            traceLines: [],
            combinability: { verdict: 'pass', conflicts: [] },
        },
    };

    it('every billing code has sourceChipId', () => {
        const result = explainRunV10(mockInput, mockOutput);

        for (const code of result.reportJson.billingCodes) {
            expect(code.sourceChipId, `Code ${code.code} missing sourceChipId`).toBeDefined();
        }
    });

    it('billing codes have code system', () => {
        const result = explainRunV10(mockInput, mockOutput);
        const validSystems = ['BEMA', 'GOZ', 'GOÄ', 'BEL2'];

        for (const code of result.reportJson.billingCodes) {
            expect(
                validSystems,
                `Code ${code.code} has invalid system: ${code.codeSystem}`
            ).toContain(code.codeSystem);
        }
    });

    it('billing codes have scope', () => {
        const result = explainRunV10(mockInput, mockOutput);
        const validScopes = ['session', 'tooth'];

        for (const code of result.reportJson.billingCodes) {
            expect(
                validScopes,
                `Code ${code.code} has invalid scope: ${code.scope}`
            ).toContain(code.scope);
        }
    });
});
