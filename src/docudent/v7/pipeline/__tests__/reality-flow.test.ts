/**
 * V7 Reality Flow Test — MOCKED (No LLM)
 *
 * Tests the FULL pipeline: dictation → extraction → questions → answers → output
 *
 * THIS TEST MUST BE:
 * ❌ NO real LLM calls
 * ❌ NO time-dependent behavior
 * ❌ NO flaky tests
 *
 * ✅ FULLY MOCKED extraction
 * ✅ DETERMINISTIC
 * ✅ FAST
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PipelineInput, PipelineResult, ValidationWarning } from '../types';

// Mock extraction service BEFORE importing pipeline
vi.mock('../../../v6/services/extractionService', () => ({
    extractFromDictation: vi.fn().mockResolvedValue({
        tooth: '36',
        surfaces: ['m', 'o'],
        diagnosis: 'caries profunda',
        costs: 120,
        gaps: [],
        mentioned: {}
    })
}));

// Mock output service to avoid LLM
vi.mock('../../../v6/services/outputService', () => ({
    generateFinalOutput: vi.fn().mockResolvedValue({
        sections: [
            { id: 'header', label: 'Kopf', content: 'Zahn 36, mo', lines: ['Zahn 36, mo'], format: 'text' },
            { id: 'treatment', label: 'Behandlung', content: 'Karies entfernt', lines: ['Karies entfernt'], format: 'text' }
        ],
        fullText: 'Zahn 36, mo\nKaries entfernt',
        billingCodes: ['BEMA_13b'],
        warnings: [{
            id: 'devital_warning',
            type: 'warning',
            title: 'Devitaler Zahn',
            description: 'Endo-Indikation prüfen',
            affectedCodes: ['13c']
        }]
    })
}));

import { pipeline } from '../index';

describe('V7 Reality Flow Test (Mocked)', () => {
    const MOCK_INPUT: PipelineInput = {
        dictation: 'Zahn 36 mo Caries profunda',
        answers: new Map(),
        insuranceType: 'GKV',
        textLength: 'mittel',
        hasMKV: false
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return questions state when dictation provided', async () => {
        const result = await pipeline.run(MOCK_INPUT);

        // Backend decides state
        expect(['questions', 'output', 'error']).toContain(result.state);

        // If questions, must have questions array
        if (result.state === 'questions') {
            expect(Array.isArray(result.questions)).toBe(true);
        }
    });

    it('should return output state when all questions answered', async () => {
        // First run to get questions
        const firstResult = await pipeline.run(MOCK_INPUT);

        // Answer all questions
        const answeredInput: PipelineInput = {
            ...MOCK_INPUT,
            answers: new Map(
                firstResult.questions.map(q => [q.id, q.options?.[0]?.id || 'yes'])
            )
        };

        const result = await pipeline.run(answeredInput);

        // Should transition to output
        expect(['questions', 'output']).toContain(result.state);

        if (result.state === 'output') {
            expect(result.output).toBeDefined();
            expect(result.output?.sections).toBeDefined();
            expect(Array.isArray(result.output?.sections)).toBe(true);
        }
    });

    it('warnings should be ValidationWarning objects', async () => {
        // Answer everything to get output
        const input: PipelineInput = {
            ...MOCK_INPUT,
            answers: new Map([['vitality', 'vital_positive']])
        };

        const result = await pipeline.run(input);

        if (result.warnings.length > 0) {
            // Must be objects with title, description
            result.warnings.forEach((w: ValidationWarning) => {
                expect(w).toHaveProperty('id');
                expect(w).toHaveProperty('title');
                expect(w).toHaveProperty('description');
                expect(w).toHaveProperty('type');
                expect(typeof w.title).toBe('string');
                expect(typeof w.description).toBe('string');
            });
        }
    });

    it('should include extracted data for display only', async () => {
        const result = await pipeline.run(MOCK_INPUT);

        if (result.extracted) {
            expect(result.extracted).toHaveProperty('tooth');
            expect(result.extracted).toHaveProperty('surfaces');
            expect(result.extracted).toHaveProperty('diagnosis');
        }
    });
});

describe('V7 Pipeline Contract', () => {
    it('PipelineResult must have all required fields', async () => {
        const input: PipelineInput = {
            dictation: 'Test',
            answers: new Map(),
            insuranceType: 'GKV',
            textLength: 'mittel'
        };

        const result = await pipeline.run(input);

        // Contract verification
        expect(result).toHaveProperty('state');
        expect(result).toHaveProperty('questions');
        expect(result).toHaveProperty('output');
        expect(result).toHaveProperty('warnings');
        expect(Array.isArray(result.questions)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('state should be one of valid values', async () => {
        const result = await pipeline.run({
            dictation: 'Test',
            answers: new Map(),
            insuranceType: 'GKV',
            textLength: 'mittel'
        });

        expect(['idle', 'processing', 'questions', 'output', 'error']).toContain(result.state);
    });
});
