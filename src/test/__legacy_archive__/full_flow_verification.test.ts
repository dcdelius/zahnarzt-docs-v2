/**
 * FULL FLOW VERIFICATION TEST
 * Tests the complete workflow from dentist perspective
 */

import { describe, it, expect } from 'vitest';
import { resolveCaseState } from '../sonia/resolver/resolveCaseState';
import { generateSmartSuggestions } from '../sonia/suggestions/generateSmartSuggestions';
import { generateBillingFromState } from '../sonia/suggestions/billingEngine';
import { applyStandards } from '../sonia/standards/applyStandards';
import { renderTemplateV3 } from '../sonia/render/renderTemplateV3';
import { getRuleCatalog } from '../sonia/rules/catalog';
import { MASTER_FILL_V3_BLUEPRINT } from '../sonia/templates/catalog/master_fill_v3_blueprint';
import { SettingsManager } from '../sonia/settings/settingsManager';

const TEMPLATE = MASTER_FILL_V3_BLUEPRINT;

describe('Full Flow Verification', () => {

    it('Step 1: Template has correct fields', () => {
        console.log('\n=== TEMPLATE FIELDS ===');
        console.log('Fields:', TEMPLATE.fields.map(f => f.id).join(', '));
        console.log('Defaults:', Object.keys(TEMPLATE.defaults || {}).join(', '));

        // Verify essential fields exist
        expect(TEMPLATE.fields.find(f => f.id === 'tooth')).toBeDefined();
        expect(TEMPLATE.fields.find(f => f.id === 'surfaces')).toBeDefined();
        expect(TEMPLATE.fields.find(f => f.id === 'material')).toBeDefined();
        expect(TEMPLATE.fields.find(f => f.id === 'anesthesia_short')).toBeDefined();

        // Verify defaults exist
        expect(TEMPLATE.defaults?.material).toBeDefined();
        expect(TEMPLATE.defaults?.anesthesia_short).toBeDefined();
    });

    it('Step 2: Chips load correctly for filling treatment', () => {
        console.log('\n=== CHIPS FOR FILLING ===');
        const rules = getRuleCatalog('conservative_rules');
        const chips = rules.filter(r => r.mode === 'chip');

        console.log('Chip count:', chips.length);
        console.log('Chips:', chips.map(c => c.id).join(', '));

        // Should have anesthesia chips
        expect(chips.find(c => c.id === 'chip_infiltration_anesthesia')).toBeDefined();
        expect(chips.find(c => c.id === 'chip_kofferdam_bmf')).toBeDefined();
        expect(chips.find(c => c.id === 'chip_adhesive')).toBeDefined();
    });

    it('Step 3: Minimal dictation produces complete output', () => {
        console.log('\n=== MINIMAL DICTATION TEST ===');

        // Simulate: Only dictate "36 MOD"
        const extractedData = {
            tooth: '36',
            surfaces: ['m', 'o', 'd']
        };

        // Apply active chips
        const standardsResult = applyStandards({
            activeStandards: ['chip_infiltration_anesthesia', 'chip_kofferdam', 'chip_adhesive'],
            treatmentType: 'filling',
            insuranceType: 'GKV'
        });

        // Merge: defaults + chips + extracted
        const mergedData = {
            ...TEMPLATE.defaults,
            ...standardsResult.dataPatches,
            ...extractedData
        };

        console.log('Merged Data:', JSON.stringify(mergedData, null, 2));

        // Verify complete data despite minimal dictation
        expect(mergedData.tooth).toBe('36');
        expect(mergedData.surfaces).toEqual(['m', 'o', 'd']);
        expect(mergedData.material).toBeDefined(); // From defaults
        expect(mergedData.anesthesia_short).toBeDefined(); // From chip or defaults
        expect(mergedData.isolation).toBe('Kofferdam'); // From chip
    });

    it('Step 4: Billing codes generate correctly', () => {
        console.log('\n=== BILLING CODE TEST ===');

        const caseState = {
            data: {
                tooth: '36',
                surfaces: ['m', 'o', 'd'],
                isolation: 'Kofferdam',
                anesthesia_short: 'Infiltration'
            }
        };

        const billing = generateBillingFromState({
            caseState: caseState as any,
            insuranceType: 'GKV',
            treatmentType: 'filling'
        });

        console.log('Billing Items:', billing.map(b => b.code).join(', '));

        // F3 for 3 surfaces
        expect(billing.find(b => b.code === 'BEMA 13c')).toBeDefined();
    });

    it('Step 5: Suggestions filter correctly', () => {
        console.log('\n=== SUGGESTIONS FILTER TEST ===');

        // Simulate: Already dictated "fluoridiert"
        const caseState = {
            data: {
                tooth: '36',
                surfaces: ['m', 'o', 'd'],
                fluoridation: 'Elmex Gelee' // Already dictated!
            }
        };

        const suggestions = generateSmartSuggestions({
            template: TEMPLATE,
            caseState: caseState as any,
            insuranceType: 'GKV',
            treatmentType: 'filling'
        });

        console.log('Suggestions:', suggestions.map(s => s.label).join(', '));

        // Should NOT suggest fluoridation since it's already present
        const fluorSuggestion = suggestions.find(s =>
            s.label?.toLowerCase().includes('fluorid') ||
            s.id?.includes('fluorid')
        );
        expect(fluorSuggestion).toBeUndefined();
    });

    it('Step 6: Final output is correct and complete', () => {
        console.log('\n=== FINAL OUTPUT TEST ===');

        // caseState now includes _line fields that chips would patch
        const caseState = {
            tooth: '36',
            surfaces: ['m', 'o', 'd'],
            material: 'Tetric EvoCeram (A3)',
            diagnosis: 'Caries profunda',
            findings: 'ViPr + / Perk −',
            // Dynamic lines set by chips:
            anesthesia_line: '• Lokalanästhesie (Infiltration; Ultracain D-S)',
            isolation_line: '• Trockenlegung: Kofferdam (absolut)',
            adhesive_line: '• Ätz-/Adhäsivtechnik (OptiBond FL)',
            layering_line: '• Komposit-Mehrschichtfüllung, lichthärtend',
            excavation_line: '• Exkavation bis sondenhart',
            occlusion_line: '• Okklusionskontrolle/Einschleifen',
            polishing_line: '• Politur'
        };

        const billing = [
            { code: 'BEMA 13c', label: 'F3 (Dreiflächig)', sourceRuleId: 'auto' },
            { code: 'BEMA 40', label: 'Infiltrationsanästhesie', sourceRuleId: 'chip' },
            { code: 'BEMA 12', label: 'bMF', sourceRuleId: 'chip' }
        ];

        const result = renderTemplateV3({
            template: TEMPLATE,
            caseState,
            validation: { isValid: true, issues: [] },
            acceptedSuggestions: billing.map(b => ({
                id: b.sourceRuleId,
                label: b.label,
                billingCode: b.code,
                billingItems: [b]
            })),
            injectedText: [],
            dictationRaw: '36 MOD Komposit',
            dictationExtras: []
        });

        console.log('=== FINAL OUTPUT ===\n');
        console.log(result.fullText);

        // Verify structure
        expect(result.fullText).toContain('=== ÜBERSICHT & ABRECHNUNG ===');
        expect(result.fullText).toContain('=== BEHANDLUNGSABLAUF');

        // Verify key content
        expect(result.fullText).toContain('36');
        expect(result.fullText).toContain('MOD');
        expect(result.fullText).toContain('Mehrschichtfüllung');
        expect(result.fullText).toContain('BEMA 13c');
        expect(result.fullText).toContain('aufgeklärt');

        // Verify dynamic lines appear when activated
        expect(result.fullText).toContain('Lokalanästhesie');
        expect(result.fullText).toContain('Kofferdam');

        // Verify proper line breaks
        const lines = result.fullText.split('\n');
        expect(lines.length).toBeGreaterThan(10);
    });

    it('Step 7: Learning system works', () => {
        console.log('\n=== LEARNING SYSTEM TEST ===');

        // Simulate 3 clicks
        SettingsManager.recordChipClick('filling', 'test_chip_1');
        SettingsManager.recordChipClick('filling', 'test_chip_1');
        const result = SettingsManager.recordChipClick('filling', 'test_chip_1');

        console.log('Promoted after 3 clicks:', result.promoted);
        expect(result.promoted).toBe(true);

        // Check it's now auto-active
        const autoActive = SettingsManager.getAutoActivatedChips('filling');
        console.log('Auto-activated chips:', autoActive);
        expect(autoActive).toContain('test_chip_1');
    });

});
