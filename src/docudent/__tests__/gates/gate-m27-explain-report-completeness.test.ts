/**
 * Gate M27: ExplainRun Report Completeness
 *
 * Verifies that ExplainRun reports have no null holes or undefined fields.
 */

import { describe, it, expect } from 'vitest';
import { explainRunV10 } from '../../v10/qa/explainRunV10';
import type { V10PipelineInput, V10PipelineOutput } from '../../v10/pipeline/runV10';

describe('gate-m27-explain-report-completeness', () => {
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

    it('report has all required top-level fields', () => {
        const result = explainRunV10(mockInput, mockOutput);
        const report = result.reportJson;

        const requiredFields = [
            'version',
            'generatedAt',
            'stableHash',
            'input',
            'extraction',
            'facts',
            'firedRules',
            'askbacks',
            'chips',
            'billingCodes',
            'combinability',
            'textBlocks',
            'kbMeta',
            'traceLines',
        ];

        for (const field of requiredFields) {
            expect(report[field as keyof typeof report], `Missing field: ${field}`).toBeDefined();
        }
    });

    it('no null values in report', () => {
        const result = explainRunV10(mockInput, mockOutput);
        const jsonStr = JSON.stringify(result.reportJson);

        // Check for literal null values (not "null" in strings)
        const nullMatches = jsonStr.match(/:null[,}]/g);
        expect(nullMatches, `Found null values: ${nullMatches?.join(', ')}`).toBeNull();
    });

    it('version is v1', () => {
        const result = explainRunV10(mockInput, mockOutput);
        expect(result.reportJson.version).toBe('v1');
    });

    it('stableHash is non-empty', () => {
        const result = explainRunV10(mockInput, mockOutput);
        expect(result.stableHash.length).toBeGreaterThan(0);
        expect(result.reportJson.stableHash).toBe(result.stableHash);
    });

    it('combinability has verdict', () => {
        const result = explainRunV10(mockInput, mockOutput);
        expect(['pass', 'warn', 'block']).toContain(result.reportJson.combinability.verdict);
    });

    it('kbMeta has all KB entries', () => {
        const result = explainRunV10(mockInput, mockOutput);
        const kbMeta = result.reportJson.kbMeta;

        expect(kbMeta.medical).toBeDefined();
        expect(kbMeta.treatment).toBeDefined();
        expect(kbMeta.combinability).toBeDefined();

        for (const [key, meta] of Object.entries(kbMeta)) {
            expect(meta.source, `${key} missing source`).toBeDefined();
            expect(meta.version, `${key} missing version`).toBeDefined();
            expect(meta.hash, `${key} missing hash`).toBeDefined();
        }
    });
});
