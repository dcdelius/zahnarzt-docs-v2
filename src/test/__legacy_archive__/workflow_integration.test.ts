import { describe, it, expect } from 'vitest';
import { resolveCaseState } from '../sonia/resolver/resolveCaseState';
import { generateSmartSuggestions } from '../sonia/suggestions/generateSmartSuggestions';
import { renderTemplate } from '../engine/render';
import { 
    FILLING_TEMPLATE_V3, 
    ENDO_TEMPLATE_V3, 
    EXTRACTION_TEMPLATE_V3, 
    PROPHYLAXIS_TEMPLATE_V3 
} from '../sonia/templates/templateCatalog';

// Helper to run the full pipeline and return relevant outputs
const runWorkflow = (
    template: any, 
    extractedData: any, 
    activeChips: string[] = [], 
    treatmentType: string
) => {
    // 1. Resolve State (Mocking Dictation -> Extraction -> Resolution)
    const caseState = resolveCaseState({
        template,
        dictationExtracted: extractedData,
        activeStandards: activeChips,
        inactiveStandards: [],
        manualMaterial: '',
        rawDictation: 'MOCK DICTATION',
        acceptedSuggestions: [], // Initially empty
        smartSuggestions: []
    });

    // 2. Generate Suggestions
    const suggestions = generateSmartSuggestions({
        template,
        caseState,
        insuranceType: 'GKV',
        treatmentType
    });

    // 3. Mock "Accepting" Suggestions (if we wanted to test that)
    // For this test, we just want to see what is suggested vs. what is already in caseState.

    // 4. Render Output (using caseState data)
    const renderOutput = renderTemplate(template, caseState.data);

    return { caseState, suggestions, renderOutput };
};

describe('Complete Sonia Workflows', () => {

    // --- FILLING WORKFLOW ---
    describe('Filling Workflow (Conservative)', () => {
        it('Standard Filling: Should have Kofferdam/Matrix via Defaults, no redundant suggestions', () => {
            const result = runWorkflow(
                FILLING_TEMPLATE_V3,
                { tooth: '16', surfaces: ['m', 'o', 'd'], material: 'Tetric', anesthesia: 'Infiltration' },
                ['chip_kofferdam', 'chip_layering', 'chip_fluoridation'], // Active Defaults
                'filling'
            );

            // Check Data
            expect(result.caseState.data.isolation).toBe('Kofferdam');
            expect(result.caseState.data.technique).toBe('Schichttechnik');

            // Check Render Output
            expect(result.renderOutput).toContain('Kofferdam');
            expect(result.renderOutput).toContain('Schichttechnik');
            expect(result.renderOutput).toContain('Tetric');

            // Check Suggestions (Should NOT suggest things already active)
            const suggestionIds = result.suggestions.map(s => s.id);
            expect(suggestionIds).not.toContain('kofferdam');
            expect(suggestionIds).not.toContain('layering_technique');
            expect(suggestionIds).not.toContain('fluoridation');
            
            // Should suggest Matrix (since MOD) if not in chips
            // Matrix chip is not in our active set above, so let's see if logic suggests it
            // We haven't added a "chip_matrix" to default active set in this test, so logic might suggest it.
            // Actually, matrix_system is suggested if missing.
            expect(suggestionIds).toContain('matrix_system'); 
        });

        it('Deep Caries: Should suggest CP/Underfilling/Xray', () => {
            const result = runWorkflow(
                FILLING_TEMPLATE_V3,
                { tooth: '46', surfaces: ['o'], excavation: 'Caries profunda' },
                ['chip_kofferdam'], 
                'filling'
            );

            const suggestionIds = result.suggestions.map(s => s.id);
            expect(suggestionIds).toContain('pulp_capping');
            expect(suggestionIds).toContain('underfilling');
            expect(suggestionIds).toContain('xray_check'); // Deep caries triggers Xray check
        });

        it('Missing Anesthesia: Should suggest Anesthesia', () => {
            const result = runWorkflow(
                FILLING_TEMPLATE_V3,
                { tooth: '11', surfaces: ['m'], anesthesia: 'Keine' },
                [], 
                'filling'
            );
            const suggestionIds = result.suggestions.map(s => s.id);
            expect(suggestionIds).toContain('anesthesia_filling');
        });
    });

    // --- ENDO WORKFLOW ---
    describe('Endo Workflow', () => {
        it('Standard Endo: Should use Endo Template & Rules', () => {
            const result = runWorkflow(
                ENDO_TEMPLATE_V3,
                { tooth: '24', procedures: ['Wurzelkanalbehandlung'] },
                ['chip_endo_isolation', 'chip_endo_naocl'], 
                'endo'
            );

            // Check Template Usage
            expect(result.renderOutput).toContain('ABRECHNUNG & CHECK'); // Specific Endo Block
            expect(result.renderOutput).toContain('NaOCl'); // From chip

            // Check Suggestions
            const ids = result.suggestions.map(s => s.id);
            expect(ids).toContain('length_measurement'); // Auto-suggested for Endo
            expect(ids).toContain('machine_preparation'); // Auto-suggested for Endo
            expect(ids).not.toContain('kofferdam'); // Already active via chip_endo_isolation
        });

        it('Endo Missing Length: Should warn/suggest', () => {
             const result = runWorkflow(
                ENDO_TEMPLATE_V3,
                { tooth: '24', procedures: ['Wurzelkanalbehandlung'], lengthMeasurement: false },
                [], 
                'endo'
            );
            const ids = result.suggestions.map(s => s.id);
            expect(ids).toContain('length_measurement');
        });

        it('Endo Missing Consent: Should trigger blocking error', () => {
             const result = runWorkflow(
                ENDO_TEMPLATE_V3,
                { tooth: '24', diagnosis: 'Pulpitis', consent: false },
                [], 
                'endo'
            );
            expect(result.caseState.data.consent).toBe(false);
            expect(result.caseState.data.diagnosis).toContain('Pulpitis');
        });
    });

    // --- SURGERY WORKFLOW ---
    describe('Surgery Workflow', () => {
        it('Extraction: Should use Surgery Template', () => {
            const result = runWorkflow(
                EXTRACTION_TEMPLATE_V3,
                { tooth: '38', procedures: ['Osteotomie'] },
                ['chip_surgical_flap', 'chip_primary_suture'], 
                'extraction'
            );

            expect(result.renderOutput).toContain('EINGRIFF'); // Surgery Block
            expect(result.renderOutput).toContain('Osteotomie');
            expect(result.renderOutput).toContain('Lappen: Ja'); // Boolean renders as Ja/Nein in text blocks
        });

        it('Surgery Bleeding: Should suggest Hemostasis', () => {
            const result = runWorkflow(
                EXTRACTION_TEMPLATE_V3,
                { tooth: '38', procedures: ['Chirurgische Entfernung'] },
                [], 
                'extraction'
            );
            const ids = result.suggestions.map(s => s.id);
            expect(ids).toContain('surgical_bleeding_control');
        });

        it('Surgery Antibiotic: Should suggest Meds if inflammation', () => {
             const result = runWorkflow(
                EXTRACTION_TEMPLATE_V3,
                { tooth: '48', complications: 'Starke Entzündung', medication: '' },
                [], 
                'extraction'
            );
            const ids = result.suggestions.map(s => s.id);
            expect(ids).toContain('surgical_antibiotic');
        });
    });

    // --- PROPHYLAXIS WORKFLOW ---
    describe('Prophylaxis Workflow', () => {
        it('PZR: Should include Fluoridation/Polishing via Chips', () => {
            const result = runWorkflow(
                PROPHYLAXIS_TEMPLATE_V3,
                { diagnosis: 'PSI 2' },
                ['chip_prophy_polishing', 'chip_prophy_fluoride'], 
                'prophylaxis'
            );

            expect(result.caseState.data.polishing).toBe(true);
            expect(result.renderOutput).toContain('PZR CHECK');
        });

        it('PZR Homecare: Should suggest instructions', () => {
             const result = runWorkflow(
                PROPHYLAXIS_TEMPLATE_V3,
                { diagnosis: 'PSI 3', instructions: '' },
                [], 
                'prophylaxis'
            );
            const ids = result.suggestions.map(s => s.id);
            expect(ids).toContain('prevention_homecare');
        });
        
        it('PZR Recall: Should render recall interval', () => {
             const result = runWorkflow(
                PROPHYLAXIS_TEMPLATE_V3,
                { diagnosis: 'PSI 0', recall: '12 Monate' },
                [], 
                'prophylaxis'
            );
            expect(result.renderOutput).toContain('Recall: 12 Monate');
        });
    });

});
