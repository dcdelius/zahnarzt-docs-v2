/**
 * End-to-End Workflow Audit: Dentist Perspective
 * 
 * 5 Test Scenarios simulating real filling cases
 * Testing: chips, suggestions, billing codes, output quality
 */

import { describe, it, expect } from 'vitest';
import { resolveCaseState } from '../sonia/resolver/resolveCaseState';
import { generateSmartSuggestions } from '../sonia/suggestions/generateSmartSuggestions';
import { generateBillingFromState } from '../sonia/suggestions/billingEngine';
import { applyStandards } from '../sonia/standards/applyStandards';
import { renderTemplateV3 } from '../sonia/render/renderTemplateV3';
import { getRuleCatalog } from '../sonia/rules/catalog';
import { MASTER_FILL_V3_BLUEPRINT } from '../sonia/templates/catalog/master_fill_v3_blueprint';

const FILLING_TEMPLATE = MASTER_FILL_V3_BLUEPRINT;

// Helper to simulate the full workflow
function simulateFullWorkflow({
    dictation,
    extractedData,
    activeChipIds,
    insuranceType = 'GKV',
    treatmentType = 'filling'
}: {
    dictation: string;
    extractedData: Record<string, any>;
    activeChipIds: string[];
    insuranceType?: string;
    treatmentType?: string;
}) {
    // 1. Apply Standards (Chips)
    const standardsResult = applyStandards({
        activeStandards: activeChipIds,
        treatmentType,
        insuranceType
    });

    // 2. Merge: defaults + chips + extracted
    const mergedData = {
        ...FILLING_TEMPLATE.defaults,
        ...standardsResult.dataPatches,
        ...extractedData,
        _rawDictation: dictation
    };

    // 3. Build CaseState
    const caseState = {
        data: mergedData,
        sources: {},
        conflicts: [],
        meta: { acceptedSuggestions: [] }
    };

    // 4. Generate Suggestions (what's missing?)
    const suggestions = generateSmartSuggestions({
        template: FILLING_TEMPLATE,
        caseState: caseState as any,
        insuranceType,
        treatmentType
    });

    // 5. Generate Billing Codes
    const billingItems = generateBillingFromState({
        caseState: caseState as any,
        insuranceType,
        treatmentType
    });

    // 6. Combine billing from chips + billing engine
    const allBilling = [
        ...standardsResult.billingItems,
        ...billingItems
    ];

    // Dedupe
    const uniqueBilling = allBilling.filter((item, index, self) =>
        index === self.findIndex(b => b.code === item.code)
    );

    // 7. Render
    const renderResult = renderTemplateV3({
        template: FILLING_TEMPLATE,
        caseState: mergedData,
        validation: { isValid: true, issues: [] },
        acceptedSuggestions: uniqueBilling.map(b => ({
            id: b.sourceRuleId || b.code,
            label: b.label,
            billingCode: b.code,
            billingItems: [b]
        })),
        injectedText: [],
        dictationRaw: dictation,
        dictationExtras: []
    });

    return {
        mergedData,
        suggestions,
        billingItems: uniqueBilling,
        renderedText: renderResult.fullText,
        summary: renderResult.summary
    };
}

describe('Dentist Workflow: Filling Scenarios', () => {

    // =============================================
    // SCENARIO 1: Simple Filling (GKV)
    // Dictation: "16 okklusal Komposit"
    // Expected: F1 code, standard chips applied
    // =============================================
    it('Scenario 1: Simple 1-surface filling (GKV)', () => {
        const result = simulateFullWorkflow({
            dictation: '16 okklusal Komposit',
            extractedData: {
                tooth: '16',
                surfaces: ['o'],
                material: 'Komposit',
                diagnosis: 'Caries'
            },
            activeChipIds: [
                'chip_infiltration_anesthesia',
                'chip_adhesive',
                'chip_layering',
                'chip_occlusion_check'
            ],
            insuranceType: 'GKV'
        });

        console.log('\n=== SCENARIO 1: Simple Filling ===');
        console.log('Billing:', result.billingItems.map(b => b.code).join(', '));
        console.log('Output:\n', result.renderedText);

        // Assertions
        expect(result.billingItems.map(b => b.code)).toContain('BEMA 13'); // F1
        expect(result.billingItems.map(b => b.code)).toContain('BEMA 40'); // LA
        expect(result.renderedText).toContain('16');
        expect(result.renderedText).toContain('Komposit');
    });

    // =============================================
    // SCENARIO 2: Deep Filling with Cp (GKV)
    // Dictation: "36 MOD tiefe Karies pulpanah"
    // Expected: F3 code, Cp suggestion should appear
    // =============================================
    it('Scenario 2: Deep 3-surface filling, pulpanah (GKV)', () => {
        const result = simulateFullWorkflow({
            dictation: '36 MOD tiefe Karies pulpanah',
            extractedData: {
                tooth: '36',
                surfaces: ['m', 'o', 'd'],
                material: 'Komposit',
                diagnosis: 'Caries profunda',
                caries_depth: 'pulpanah'
            },
            activeChipIds: [
                'chip_infiltration_anesthesia',
                'chip_kofferdam',
                'chip_adhesive',
                'chip_layering'
            ],
            insuranceType: 'GKV'
        });

        console.log('\n=== SCENARIO 2: Deep Filling (pulpanah) ===');
        console.log('Billing:', result.billingItems.map(b => b.code).join(', '));
        console.log('Suggestions:', result.suggestions.map(s => s.label).join(', '));
        console.log('Output:\n', result.renderedText);

        // Assertions
        expect(result.billingItems.map(b => b.code)).toContain('BEMA 13c'); // F3
        expect(result.billingItems.map(b => b.code)).toContain('BEMA 12'); // Kofferdam
        expect(result.renderedText).toContain('36');
        expect(result.renderedText).toContain('MOD');

        // Check if Cp suggestion is generated
        const cpSuggestion = result.suggestions.find(s =>
            s.label?.toLowerCase().includes('überkappung') ||
            s.id?.includes('pulp_capping')
        );
        console.log('Cp Suggestion present:', !!cpSuggestion);
    });

    // =============================================
    // SCENARIO 3: PKV Patient (all extras)
    // Dictation: "14 MO Komposit Teilmatrize"
    // Expected: GOZ codes, Matrix code
    // =============================================
    it('Scenario 3: PKV patient with all extras', () => {
        const result = simulateFullWorkflow({
            dictation: '14 MO Komposit Teilmatrize Kofferdam',
            extractedData: {
                tooth: '14',
                surfaces: ['m', 'o'],
                material: 'Komposit',
                diagnosis: 'Caries',
                matrix_system: 'Sectional Matrix System'
            },
            activeChipIds: [
                'chip_infiltration_anesthesia',
                'chip_kofferdam',
                'chip_adhesive',
                'chip_layering',
                'chip_occlusion_check',
                'chip_polishing',
                'chip_fluoridation'
            ],
            insuranceType: 'PKV'
        });

        console.log('\n=== SCENARIO 3: PKV Full Treatment ===');
        console.log('Billing:', result.billingItems.map(b => b.code).join(', '));
        console.log('Output:\n', result.renderedText);

        // Assertions - PKV should have GOZ codes
        expect(result.billingItems.map(b => b.code)).toContain('GOZ 2100'); // F2
        expect(result.billingItems.map(b => b.code)).toContain('GOZ 0090'); // LA
        expect(result.billingItems.map(b => b.code)).toContain('GOZ 2040'); // Kofferdam
        expect(result.renderedText).toContain('14');
    });

    // =============================================
    // SCENARIO 4: Minimal Dictation
    // Dictation: "26 mesial"
    // Expected: Defaults fill in the rest
    // =============================================
    it('Scenario 4: Minimal dictation (tooth + surface only)', () => {
        const result = simulateFullWorkflow({
            dictation: '26 mesial',
            extractedData: {
                tooth: '26',
                surfaces: ['m']
            },
            activeChipIds: [
                'chip_infiltration_anesthesia',
                'chip_adhesive',
                'chip_layering',
                'chip_polishing'
            ],
            insuranceType: 'GKV'
        });

        console.log('\n=== SCENARIO 4: Minimal Dictation ===');
        console.log('Merged Data:', JSON.stringify(result.mergedData, null, 2));
        console.log('Billing:', result.billingItems.map(b => b.code).join(', '));
        console.log('Output:\n', result.renderedText);

        // Assertions - defaults should fill in
        expect(result.mergedData.material).toBeTruthy(); // Should have default material
        expect(result.billingItems.map(b => b.code)).toContain('BEMA 13'); // F1
        expect(result.renderedText).toContain('26');
    });

    // =============================================
    // SCENARIO 5: Dictation Override
    // Chip: Infiltration active, but dictated "Leitungsanästhesie"
    // Expected: Dictation wins
    // =============================================
    it('Scenario 5: Dictation overrides chip default', () => {
        const result = simulateFullWorkflow({
            dictation: '46 MOD Leitungsanästhesie',
            extractedData: {
                tooth: '46',
                surfaces: ['m', 'o', 'd'],
                anesthesia: 'Leitungsanästhesie',
                material: 'Komposit'
            },
            activeChipIds: [
                'chip_infiltration_anesthesia', // This should be overridden
                'chip_adhesive'
            ],
            insuranceType: 'GKV'
        });

        console.log('\n=== SCENARIO 5: Dictation Override ===');
        console.log('Anesthesia in data:', result.mergedData.anesthesia);
        console.log('Output:\n', result.renderedText);

        // Assertions - dictation should override chip
        expect(result.mergedData.anesthesia).toBe('Leitungsanästhesie');
        expect(result.renderedText).toContain('Leitungsanästhesie');
    });

    // =============================================
    // SCENARIO 6: Output Quality Check
    // Verify: readable, forensic, structured
    // =============================================
    it('Scenario 6: Output quality and structure', () => {
        const result = simulateFullWorkflow({
            dictation: '24 MOD Komposit tiefe Karies',
            extractedData: {
                tooth: '24',
                surfaces: ['m', 'o', 'd'],
                material: 'Tetric EvoCeram',
                diagnosis: 'Caries profunda'
            },
            activeChipIds: [
                'chip_infiltration_anesthesia',
                'chip_kofferdam',
                'chip_adhesive',
                'chip_layering',
                'chip_occlusion_check',
                'chip_polishing',
                'chip_fluoridation'
            ],
            insuranceType: 'GKV'
        });

        console.log('\n=== SCENARIO 6: Output Quality Check ===');
        console.log('Full Output:\n', result.renderedText);

        // Quality assertions
        const output = result.renderedText;

        // 1. Has clear sections
        expect(output).toContain('==='); // Section headers

        // 2. Contains tooth info
        expect(output).toContain('24');
        expect(output).toMatch(/MOD|M.*O.*D/i);

        // 3. Contains billing codes
        expect(output).toContain('BEMA');

        // 4. Contains forensic elements (Aufklärung)
        expect(output).toMatch(/aufgeklärt|einwilligung/i);

        // 5. Contains procedure steps
        expect(output).toMatch(/exkavation|kofferdam|politur/i);

        // 6. Has material
        expect(output).toContain('Tetric');
    });

});
