
import { describe, it, expect } from 'vitest';
import { generateSmartSuggestions } from '../sonia/suggestions/generateSmartSuggestions';
import { MASTER_TEMPLATE_V3 } from '../data/masterTemplate';

describe('Debug CP Cap Suggestion', () => {
    it('should suggest CP Cap when excavation is Caries profunda', () => {
        const mockData = {
            tooth: '16',
            surfaces: ['m', 'o', 'd'],
            material: 'Tetric',
            anesthesia: 'Infiltration',
            excavation: 'Caries profunda', // This should trigger it
            procedures: ['Füllung']
        };

        const suggestions = generateSmartSuggestions({
            template: MASTER_TEMPLATE_V3 as any,
            caseState: {
                data: mockData,
                meta: { insuranceType: 'GKV', templateId: 'master_fill_v3' },
                sources: {},
                conflicts: []
            },
            insuranceType: 'GKV'
        });

        const cpSuggestion = suggestions.find(s => s.id === 'pulp_capping');
        expect(cpSuggestion).toBeDefined();
        expect(cpSuggestion?.label).toContain('Überkappung');
    });

    it('should NOT suggest CP Cap when excavation is Vollständig', () => {
        const mockData = {
            tooth: '16',
            surfaces: ['m', 'o', 'd'],
            material: 'Tetric',
            anesthesia: 'Infiltration',
            excavation: 'Vollständig',
            procedures: ['Füllung']
        };

        const suggestions = generateSmartSuggestions({
            template: MASTER_TEMPLATE_V3 as any,
            caseState: {
                data: mockData,
                meta: { insuranceType: 'GKV', templateId: 'master_fill_v3' },
                sources: {},
                conflicts: []
            },
            insuranceType: 'GKV'
        });

        const cpSuggestion = suggestions.find(s => s.id === 'pulp_capping');
        expect(cpSuggestion).toBeUndefined();
    });
});
