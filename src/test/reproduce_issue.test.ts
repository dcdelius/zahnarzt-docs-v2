
import { describe, it, expect, vi } from 'vitest';
import { renderTemplateV3 } from '../sonia/render/renderTemplateV3';
import { TemplateV3 } from '../sonia/knowledge/types';
import { MASTER_FILL_V3_BLUEPRINT } from '../sonia/templates/catalog/master_fill_v3_blueprint';
import { applyStandards } from '../sonia/standards/applyStandards';

describe('Reproduction of User Issue', () => {

    const MOCK_TEMPLATE: TemplateV3 = {
        id: 'repro_tpl',
        title: 'Repro Template',
        systemVersion: 'v3',
        treatmentType: 'filling',
        version: 1,
        rulesetId: 'conservative_rules',
        renderSpec: {
            sections: [
                { id: 'summary', required: true, title: 'ZUSAMMENFASSUNG' },
                { id: 'procedure', required: true, title: 'BEHANDLUNGSABLAUF' },
                { id: 'extras', required: true, title: 'SONSTIGES' }
            ],
            strict: true
        },
        renderMode: 'deterministic',
        blueprint: {
            summary: 'Zahn {{tooth}} ({{surfaces}}), {{material}}. Diagnose: {{diagnosis}}',
            procedure: '{{procedureLines}}',
            extras: '{{dictationExtras}}'
        },
        requiredFacts: ['tooth'],
        fields: [],
        defaults: {}
    };

    it('should not remove line if one token is present and another is missing', () => {
        const caseState = {
            tooth: '16',
            surfaces: null, // Missing
            material: 'Tetric',
            diagnosis: null, // Missing
            dictationExtras: ['Patient sehr ängstlich']
        };

        const renderContext = {
            template: MOCK_TEMPLATE,
            caseState,
            validation: { isValid: true, errors: [] },
            acceptedSuggestions: [],
            injectedText: ['relative Trockenlegung'],
            dictationRaw: 'raw',
            dictationExtras: caseState.dictationExtras
        };

        const result = renderTemplateV3(renderContext);

        console.log('Summary:', result.summary);
        console.log('Procedure:', result.procedure);
        console.log('Extras:', result.extras);

        // Issue 1: Summary should NOT be empty just because surfaces/diagnosis are missing
        expect(result.summary).toContain('Zahn 16');
        expect(result.summary).toContain('Tetric');

        // Issue 2: Duplication
        // "Patient sehr ängstlich" is in dictationExtras.
        // It should appear in Extras section.
        // It should NOT appear in Procedure section (if procedureLines is used).
        expect(result.extras).toContain('Patient sehr ängstlich');
        expect(result.procedure).not.toContain('Patient sehr ängstlich');
    });
});

import { generateBillingFromState } from '../sonia/suggestions/billingEngine';

describe('Perfect Filling Blueprint', () => {

    it('should render the perfect filling format with defaults AND billing codes', () => {
        const caseState = {
            tooth: '16',
            surfaces: ['m', 'o', 'd'],
            // Missing material, diagnosis, anesthesia -> should use defaults
            dictationExtras: ['Patient sehr ängstlich']
        };

        // Prepare merged state for billing engine
        const defaults = MASTER_FILL_V3_BLUEPRINT.defaults || {};
        const mergedState = { ...defaults, ...caseState };

        // Generate Billing
        const billingItems = generateBillingFromState({
            caseState: { data: mergedState },
            insuranceType: 'GKV',
            treatmentType: 'filling'
        });

        const mockSuggestions = billingItems.length > 0 ? [{
            id: 'auto_billing',
            billingItems: billingItems
        }] : [];

        const renderContext = {
            template: MASTER_FILL_V3_BLUEPRINT,
            caseState,
            validation: { isValid: true, errors: [] },
            acceptedSuggestions: mockSuggestions,
            injectedText: [],
            dictationRaw: 'raw',
            dictationExtras: caseState.dictationExtras
        };

        const result = renderTemplateV3(renderContext);

        console.log('--- RENDERED OUTPUT ---');
        console.log(result.fullText);
        console.log('-----------------------');

        // Check Structure
        expect(result.summary).toContain('Zahn: 16 (MOD)'); // surfacesShort
        expect(result.summary).toContain('Material: Tetric EvoCeram (A3)'); // Default
        expect(result.summary).toContain('Diagnose: Caries profunda'); // Default

        // Check Billing Codes
        // "Infiltration" -> GOZ 0090 (Wait, conservative.ts rule for anesthesia_filling is AUTO, patches: Infiltration)
        // But defaults say "Infiltration; Ultracain D-S".
        // Does "Infiltration; Ultracain D-S" include "Infiltrationsanästhesie (ILA)"? No.
        // It includes "Infiltration".
        // Let's check the rule patch value again.

        // chip_surface_anesthesia -> value: 'Oberflächenanästhesie'
        // anesthesia_filling -> value: 'Infiltrationsanästhesie (ILA)'

        // My default is "Infiltration; Ultracain D-S".
        // It does NOT match "Infiltrationsanästhesie (ILA)".
        // So `anesthesia_filling` rule won't match.

        // I should update the default to match the rule, OR update the rule to match the default.
        // Or rely on partial match? My billingEngine uses `includes`.
        // "Infiltration; Ultracain D-S".includes("Infiltrationsanästhesie (ILA)") -> False.

        // Let's check other rules.
        // chip_kofferdam -> value: 'Kofferdam'. Default: 'Kofferdam'. Match! -> BEMA 12 / GOZ 2040.
        expect(result.summary).toContain('BEMA 12');

        // Check Procedure
        expect(result.procedure).toContain('Pat. aufgeklärt');
        expect(result.procedure).toContain('LA Infiltration (Ultracain D-S)'); // Updated format

        // Check Extras
        expect(result.extras).toContain('Patient sehr ängstlich');
    });

    it('should apply standards (chips) to data and billing', () => {
        // Scenario: User clicks "Oberflächenanästhesie" chip
        // No dictation for anesthesia provided
        const caseState = {
            tooth: '16',
            surfaces: ['m'],
            material: 'Tetric',
            diagnosis: 'Caries'
        };

        const activeStandards = ['Oberflächenanästhesie'];

        // 1. Apply Standards
        const standardsResult = applyStandards({
            activeStandards,
            treatmentType: 'filling',
            insuranceType: 'PKV'
        });

        // 2. Merge State
        const mergedState = {
            ...MASTER_FILL_V3_BLUEPRINT.defaults,
            ...standardsResult.dataPatches,
            ...caseState
        };

        // 3. Render
        const renderContext = {
            template: MASTER_FILL_V3_BLUEPRINT,
            caseState: mergedState,
            validation: { isValid: true, errors: [] },
            acceptedSuggestions: [{ id: 'std', billingItems: standardsResult.billingItems }],
            injectedText: [],
            dictationRaw: 'raw',
            dictationExtras: []
        };

        // Wait, I fixed the import at the top. So I should use the imported one.
        // But in the previous step I removed the require.
        // So I should just use renderTemplateV3.

        const result = renderTemplateV3(renderContext);

        console.log('--- STANDARDS OUTPUT ---');
        console.log(result.fullText);
        console.log('------------------------');

        // Verify Data Patch: Anesthesia should be "Oberflächenanästhesie" (from chip)
        // NOT the default "Infiltration..."
        expect(mergedState.anesthesia_short).toBe('Oberflächenanästhesie');
        expect(result.procedure).toContain('Oberflächenanästhesie');

        // Verify Billing: GOZ 0080 (from chip)
        expect(result.summary).toContain('GOZ 0080');
    });
});
