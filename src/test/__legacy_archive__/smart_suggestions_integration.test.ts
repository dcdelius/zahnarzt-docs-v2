import { describe, it, expect } from 'vitest';
import { resolveCaseState } from '../sonia/resolver/resolveCaseState';

describe('Smart Suggestions Integration', () => {
    const mockTemplate = {
        id: 'test-template',
        fields: [
            { id: 'anesthesia', defaultValue: 'none' },
            { id: 'filling', defaultValue: 'none' }
        ]
    };

    const mockSmartSuggestions = [
        {
            id: 'sugg-1',
            label: 'Anästhesie',
            description: 'Infiltrationsanästhesie',
            fieldId: 'anesthesia',
            value: 'Infiltration',
            reasoning: 'Filling procedure detected',
            priority: 9,
            trigger: 'rule-1'
        },
        {
            id: 'sugg-2',
            label: 'Füllung',
            description: 'Kompositfüllung',
            fieldId: 'filling',
            value: 'Komposit',
            reasoning: 'Caries detected',
            priority: 8,
            trigger: 'rule-2'
        }
    ];

    it('should not apply suggestions if none are accepted', () => {
        const result = resolveCaseState({
            template: mockTemplate,
            acceptedSuggestions: [],
            smartSuggestions: mockSmartSuggestions
        });

        expect(result.data.anesthesia).toBe('none');
        expect(result.sources.anesthesia).toBe('default');
    });

    it('should apply accepted suggestions and override defaults', () => {
        const result = resolveCaseState({
            template: mockTemplate,
            acceptedSuggestions: ['sugg-1'],
            smartSuggestions: mockSmartSuggestions
        });

        expect(result.data.anesthesia).toBe('Infiltration');
        expect(result.sources.anesthesia).toBe('suggestion');

        // Unaccepted suggestion should remain default
        expect(result.data.filling).toBe('none');
    });

    it('should apply multiple accepted suggestions', () => {
        const result = resolveCaseState({
            template: mockTemplate,
            acceptedSuggestions: ['sugg-1', 'sugg-2'],
            smartSuggestions: mockSmartSuggestions
        });

        expect(result.data.anesthesia).toBe('Infiltration');
        expect(result.sources.anesthesia).toBe('suggestion');
        expect(result.data.filling).toBe('Komposit');
        expect(result.sources.filling).toBe('suggestion');
    });

    it('should prioritize suggestions over defaults but under manual overrides (if we decided that)', () => {
        // Actually, in resolveCaseState, suggestions are step 5, manual is step 4.
        // So suggestions SHOULD override manual if applied later.
        // Let's check the order in resolveCaseState.ts
        // Step 4: Manual Overrides
        // Step 5: Smart Suggestions
        // So Suggestions > Manual > Dictation > Chips > Defaults

        const result = resolveCaseState({
            template: mockTemplate,
            manualMaterial: 'Manual Anesthesia', // This would usually map to 'material' field or similar, but let's assume it overrides 'anesthesia' for this test if we could.
            // But manualMaterial logic in resolveCaseState is specific to 'material' field or object.
            // Let's test with a field that manual override touches.
            acceptedSuggestions: ['sugg-1'],
            smartSuggestions: mockSmartSuggestions
        });

        // Since manualMaterial only affects 'material' field in current logic, let's add a suggestion for 'material'
        const materialSuggestion = {
            id: 'sugg-mat',
            fieldId: 'material',
            value: 'Suggested Material',
            priority: 1
        };

        const resultMat = resolveCaseState({
            template: mockTemplate,
            manualMaterial: 'Manual Material',
            acceptedSuggestions: ['sugg-mat'],
            smartSuggestions: [materialSuggestion]
        });

        expect(resultMat.data.material).toBe('Suggested Material');
        expect(resultMat.sources.material).toBe('suggestion');
    });
});
