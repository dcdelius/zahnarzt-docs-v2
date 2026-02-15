import { describe, it, expect } from 'vitest';
import { buildGPTPromptsV3 } from '../buildGPTPromptsV3';
import { BLOCK_REGISTRY } from '../../knowledge/blocks/blockRegistry';

describe('Dynamic Prompt Generation', () => {
    const mockCaseState = {
        data: {
            _rawDictation: "Test dictation",
            _injectedText: [],
            tooth: "16"
        },
        meta: {
            insuranceType: "GKV",
            acceptedSuggestions: []
        },
        conflicts: [],
        sources: {}
    };

    const mockValidation = { issues: [] };

    it('should generate workflow section based on template groups order', () => {
        const template = {
            title: "Test Template",
            groups: ['anesthesia', 'isolation', 'technique']
        };

        const { systemPrompt } = buildGPTPromptsV3({
            template,
            caseState: mockCaseState,
            validation: mockValidation
        });

        const workflowSection = systemPrompt.split('=== BEHANDLUNGSABLAUF (STRUKTURIERT) ===')[1].split('=== DOKUMENTATION')[0];
        const lines = workflowSection.trim().split('\n');

        expect(lines[0]).toContain(BLOCK_REGISTRY['anesthesia'].label);
        expect(lines[1]).toContain(BLOCK_REGISTRY['isolation'].label);
        expect(lines[2]).toContain(BLOCK_REGISTRY['technique'].label);
    });

    it('should respect reordered groups', () => {
        const template = {
            title: "Reordered Template",
            groups: ['technique', 'anesthesia', 'isolation']
        };

        const { systemPrompt } = buildGPTPromptsV3({
            template,
            caseState: mockCaseState,
            validation: mockValidation
        });

        const workflowSection = systemPrompt.split('=== BEHANDLUNGSABLAUF (STRUKTURIERT) ===')[1].split('=== DOKUMENTATION')[0];
        const lines = workflowSection.trim().split('\n');

        expect(lines[0]).toContain(BLOCK_REGISTRY['technique'].label);
        expect(lines[1]).toContain(BLOCK_REGISTRY['anesthesia'].label);
        expect(lines[2]).toContain(BLOCK_REGISTRY['isolation'].label);
    });
});
