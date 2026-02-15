
import { describe, it, expect } from 'vitest';
import { generateSmartSuggestions } from '../sonia/suggestions/generateSmartSuggestions';
import { MASTER_TEMPLATE_V3 } from '../data/masterTemplate';
import { resolveCaseState } from '../sonia/resolver/resolveCaseState';

describe('Regression Debugging', () => {
    it('Should suggest CP and Xray for "tiefe füllung"', () => {
        // 1. Simulate Extracted Data (as if LLM did its job correctly)
        const extractedData = {
            tooth: '16',
            surfaces: ['m', 'o', 'd'],
            material: 'Tetric A3',
            anesthesia: 'Infiltrationsanästhesie',
            excavation: 'Caries profunda', // Prompt should map "tiefe füllung" to this
            procedures: ['Füllung']
        };

        // 2. Resolve Case State (mimic controller)
        const caseState = resolveCaseState({
            template: MASTER_TEMPLATE_V3 as any,
            dictationExtracted: extractedData,
            activeStandards: [],
            inactiveStandards: [],
            manualMaterial: '',
            insuranceType: 'GKV',
            rawDictation: 'zahn 16, mod, tetric a3, infiltrationsanästhesie, tiefe füllung',
            acceptedSuggestions: [],
            smartSuggestions: []
        });

        // 3. Generate Suggestions
        const suggestions = generateSmartSuggestions({
            template: MASTER_TEMPLATE_V3 as any,
            caseState: caseState,
            insuranceType: 'GKV'
        });

        const ids = suggestions.map(s => s.id);
        console.log('Suggestions:', ids);

        // 4. Assertions
        expect(ids).toContain('pulp_capping');
        expect(ids).toContain('xray_check');
    });
});
