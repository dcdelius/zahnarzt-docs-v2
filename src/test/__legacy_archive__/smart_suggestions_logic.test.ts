import { describe, it, expect } from 'vitest';
import { generateSmartSuggestions } from '../sonia/suggestions/generateSmartSuggestions';
import { MASTER_TEMPLATE_V3 } from '../data/masterTemplate';

describe('Smart Suggestions Logic', () => {

    const baseCaseState = {
        data: {},
        meta: { insuranceType: 'GKV', templateId: 'master-v3', createdAt: '' },
        sources: {},
        conflicts: []
    };

    it('should suggest injection if filling is present but only topical anesthesia is mentioned', () => {
        const caseState = {
            ...baseCaseState,
            data: {
                procedures: ['Füllung 16'],
                anesthesia: 'Oberflächenanästhesie', // Only topical!
            },
        };

        const suggestions = generateSmartSuggestions({
            template: MASTER_TEMPLATE_V3 as any,
            caseState: caseState as any,
            insuranceType: 'GKV',
            treatmentType: 'filling'
        });

        // Should find the anesthesia suggestion
        const anesthesiaSuggestion = suggestions.find(s => s.id === 'anesthesia_filling');
        expect(anesthesiaSuggestion).toBeDefined();
        expect(anesthesiaSuggestion?.value).toContain('Infiltrationsanästhesie');
        expect(anesthesiaSuggestion?.reasoning).toContain('Oberflächenanästhesie reicht nicht');
    });

    it('should NOT suggest injection if injection is already present', () => {
        const caseState = {
            ...baseCaseState,
            data: {
                procedures: ['Füllung 16'],
                anesthesia: 'Infiltrationsanästhesie + Oberflächenanästhesie', // Injection present
            },
        };

        const suggestions = generateSmartSuggestions({
            template: MASTER_TEMPLATE_V3 as any,
            caseState: caseState as any,
            insuranceType: 'GKV',
            treatmentType: 'filling'
        });

        const anesthesiaSuggestion = suggestions.find(s => s.id === 'anesthesia');
        expect(anesthesiaSuggestion).toBeUndefined();
    });

    it('should suggest Kofferdam for fillings if not mentioned', () => {
        const caseState = {
            ...baseCaseState,
            data: {
                procedures: ['Füllung 16'],
                isolation: 'relativ',
            },
        };

        const suggestions = generateSmartSuggestions({
            template: MASTER_TEMPLATE_V3 as any,
            caseState: caseState as any,
            insuranceType: 'GKV'
        });

        const suggestion = suggestions.find(s => s.id === 'kofferdam');
        expect(suggestion).toBeDefined();
        expect(suggestion?.value).toBe('Kofferdam');
    });

    it('should suggest Conditioning for composite fillings if not mentioned', () => {
        const caseState = {
            ...baseCaseState,
            data: {
                procedures: ['Füllung 16'],
                material: 'Komposit',
                conditioning: null,
            },
        };

        const suggestions = generateSmartSuggestions({
            template: MASTER_TEMPLATE_V3 as any,
            caseState: caseState as any,
            insuranceType: 'GKV'
        });

        const suggestion = suggestions.find(s => s.id === 'conditioning');
        expect(suggestion).toBeDefined();
    });

    it('should suggest Bite Registration for multi-surface fillings (>=3)', () => {
        const caseState = {
            ...baseCaseState,
            data: {
                procedures: ['Füllung 16'],
                surfaces: ['m', 'o', 'd'], // 3 surfaces
                bite_registration: null,
            },
        };

        const suggestions = generateSmartSuggestions({
            template: MASTER_TEMPLATE_V3 as any,
            caseState: caseState as any,
            insuranceType: 'GKV'
        });

        const suggestion = suggestions.find(s => s.id === 'bite_registration');
        expect(suggestion).toBeDefined();
    });

    it('should suggest Fluoridation after fillings if not mentioned', () => {
        const caseState = {
            ...baseCaseState,
            data: {
                procedures: ['Füllung 16'],
                fluoridation: null,
            },
        };

        const suggestions = generateSmartSuggestions({
            template: MASTER_TEMPLATE_V3 as any,
            caseState: caseState as any,
            insuranceType: 'GKV'
        });

        const suggestion = suggestions.find(s => s.id === 'fluoridation');
        expect(suggestion).toBeDefined();
    });

    it('should suggest Layering Technique for composite if not mentioned', () => {
        const caseState = {
            ...baseCaseState,
            data: {
                procedures: ['Füllung 16'],
                material: 'Komposit',
                technique: null, // not documented
            },
        };

        const suggestions = generateSmartSuggestions({
            template: MASTER_TEMPLATE_V3 as any,
            caseState: caseState as any,
            insuranceType: 'GKV',
            treatmentType: 'filling'
        });

        const suggestion = suggestions.find(s => s.id === 'layering_technique');
        expect(suggestion).toBeDefined();
    });

    it('should suggest X-Ray Control for deep caries if not mentioned', () => {
        const caseState = {
            ...baseCaseState,
            data: {
                caries_depth: 'tief (Caries profunda)',
                xray: null,
            },
        };

        const suggestions = generateSmartSuggestions({
            template: MASTER_TEMPLATE_V3 as any,
            caseState: caseState as any,
            insuranceType: 'GKV',
            treatmentType: 'filling'
        });

        const suggestion = suggestions.find(s => s.id === 'xray_check');
        expect(suggestion).toBeDefined();
    });

    it('should suggest Underfilling for deep caries + filling if not mentioned', () => {
        const caseState = {
            ...baseCaseState,
            data: {
                procedures: ['Füllung 16'],
                caries_depth: 'tief',
                underfilling: null,
            },
        };

        const suggestions = generateSmartSuggestions({
            template: MASTER_TEMPLATE_V3 as any,
            caseState: caseState as any,
            insuranceType: 'GKV'
        });

        const suggestion = suggestions.find(s => s.id === 'underfilling');
        expect(suggestion).toBeDefined();
    });

    it('should suggest Matrix System for approximal fillings', () => {
        const caseState = {
            ...baseCaseState,
            data: {
                procedures: ['Füllung 16'],
                material: 'Komposit',
                surfaces: ['m'], // mesial is approximal
                matrix_system: null,
            },
        };

        const suggestions = generateSmartSuggestions({
            template: MASTER_TEMPLATE_V3 as any,
            caseState: caseState as any,
            insuranceType: 'GKV'
        });

        const suggestion = suggestions.find(s => s.id === 'matrix_system');
        expect(suggestion).toBeDefined();
    });

    it('should suggest Electronic Length Measurement for Endo', () => {
        const caseState = {
            ...baseCaseState,
            data: {
                procedures: ['Wurzelkanalbehandlung 16'],
                length_measurement: null,
            },
        };

        const suggestions = generateSmartSuggestions({
            template: MASTER_TEMPLATE_V3 as any,
            caseState: caseState as any,
            insuranceType: 'GKV',
            treatmentType: 'endo'
        });

        const suggestion = suggestions.find(s => s.id === 'length_measurement');
        expect(suggestion).toBeDefined();
    });

    it('should suggest Machine Preparation for Endo', () => {
        const caseState = {
            ...baseCaseState,
            data: {
                procedures: ['Wurzelkanalbehandlung 16'],
                machine_preparation: null,
            },
        };

        const suggestions = generateSmartSuggestions({
            template: MASTER_TEMPLATE_V3 as any,
            caseState: caseState as any,
            insuranceType: 'GKV',
            treatmentType: 'endo'
        });

        const suggestion = suggestions.find(s => s.id === 'machine_preparation');
        expect(suggestion).toBeDefined();
    });

    it('should suggest Pulp Capping (Cp) if procedure contains "tiefe Füllung"', () => {
        const caseState = {
            ...baseCaseState,
            data: {
                procedures: ['tiefe Füllung 16'], // "tiefe" is in procedure, not caries_depth
                caries_depth: null,
                pulp_capping: null
            },
        };

        const suggestions = generateSmartSuggestions({
            template: MASTER_TEMPLATE_V3 as any,
            caseState: caseState as any,
            insuranceType: 'GKV'
        });

        const cpSuggestion = suggestions.find(s => s.id === 'pulp_capping');
        expect(cpSuggestion).toBeDefined();
    });
});
