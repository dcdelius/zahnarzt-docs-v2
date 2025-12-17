import { describe, it, expect } from 'vitest';
import { resolveCaseState } from '../sonia/resolver/resolveCaseState';
import { generateSmartSuggestions } from '../sonia/suggestions/generateSmartSuggestions';
import { MASTER_TEMPLATE_V3 } from '../data/masterTemplate';

describe('Practice defaults vs. suggestions', () => {
    it('applies chip defaults before suggestion pass', () => {
        const caseState = resolveCaseState({
            template: MASTER_TEMPLATE_V3 as any,
            dictationExtracted: {
                tooth: '16',
                material: 'Tetric'
            },
            activeStandards: [
                'chip_kofferdam',
                'chip_layering',
                'chip_fluoridation'
            ],
            inactiveStandards: [],
            manualMaterial: '',
            rawDictation: ''
        });

        expect(caseState.data.isolation).toBe('Kofferdam');
        expect(caseState.sources.isolation).toBe('chip');

        const suggestions = generateSmartSuggestions({
            template: MASTER_TEMPLATE_V3 as any,
            caseState: caseState as any,
            insuranceType: 'GKV',
            treatmentType: 'filling'
        });

        const redundantIds = ['kofferdam', 'layering_technique', 'fluoridation'];
        redundantIds.forEach(id => {
            expect(suggestions.find(s => s.id === id)).toBeUndefined();
        });
    });
});


