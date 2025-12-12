/**
 * CHIP ACTIVATION LOGIC TEST
 * Verifies: Active chips → output, Inactive chips → NO output
 */

import { describe, it, expect } from 'vitest';
import { renderTemplateV3 } from '../sonia/render/renderTemplateV3';
import { MASTER_FILL_V3_BLUEPRINT } from '../sonia/templates/catalog/master_fill_v3_blueprint';
import { CONSERVATIVE_RULES } from '../sonia/rules/catalog/conservative';

const TEMPLATE = MASTER_FILL_V3_BLUEPRINT;

// Helper: Simulate chip activation by applying patches
function applyChipPatches(chipIds: string[], baseData: Record<string, any> = {}): Record<string, any> {
    const data = { ...baseData };

    for (const chipId of chipIds) {
        const chip = CONSERVATIVE_RULES.find(r => r.id === chipId);
        if (chip?.then?.patches) {
            for (const patch of chip.then.patches) {
                data[patch.path] = patch.value;
            }
        }
    }

    return data;
}

// Helper: Render with specific chips active
function renderWithChips(activeChips: string[], extraData: Record<string, any> = {}): string {
    // Chip patches first, then extraData overrides (dictation wins)
    const caseState = {
        tooth: '36',
        surfaces: ['m', 'o', 'd'],
        ...applyChipPatches(activeChips),
        ...extraData  // Dictation overrides chip values!
    };

    const result = renderTemplateV3({
        template: TEMPLATE,
        caseState,
        validation: { isValid: true, issues: [] },
        acceptedSuggestions: [],
        injectedText: [],
        dictationRaw: '36 MOD',
        dictationExtras: []
    });

    return result.fullText;
}

describe('Chip Activation Logic', () => {

    it('ALL chips active → ALL lines appear', () => {
        const output = renderWithChips([
            'chip_infiltration_anesthesia',
            'chip_kofferdam_bmf',
            'chip_adhesive',
            'chip_layering'
        ]);

        console.log('\n=== ALL CHIPS ACTIVE ===\n', output);

        // All should appear
        expect(output).toContain('Lokalanästhesie');
        expect(output).toContain('Kofferdam');
        expect(output).toContain('Adhäsivtechnik');
        expect(output).toContain('Schichttechnik'); // New text
    });

    it('KOFFERDAM deactivated → Kofferdam NOT in output', () => {
        const output = renderWithChips([
            'chip_infiltration_anesthesia',
            // NO chip_kofferdam_bmf!
            'chip_adhesive',
            'chip_layering'
        ]);

        console.log('\n=== KOFFERDAM DEACTIVATED ===\n', output);

        // Should appear
        expect(output).toContain('Lokalanästhesie');
        expect(output).toContain('Adhäsivtechnik');

        // Should NOT appear
        expect(output).not.toContain('Kofferdam');
        expect(output).not.toContain('Trockenlegung');
    });

    it('ANESTHESIA deactivated → Anesthesia NOT in output', () => {
        const output = renderWithChips([
            // NO anesthesia chip!
            'chip_kofferdam_bmf',
            'chip_adhesive'
        ]);

        console.log('\n=== ANESTHESIA DEACTIVATED ===\n', output);

        // Should appear
        expect(output).toContain('Kofferdam');

        // Should NOT appear
        expect(output).not.toContain('Lokalanästhesie');
        expect(output).not.toContain('Infiltration');
        expect(output).not.toContain('Ultracain');
    });

    it('NO chips active → Only base data in output', () => {
        const output = renderWithChips([], {
            material: 'Komposit',
            diagnosis: 'Karies'
        });

        console.log('\n=== NO CHIPS ACTIVE ===\n', output);

        // Base data should appear
        expect(output).toContain('36');
        expect(output).toContain('MOD');
        expect(output).toContain('Komposit');

        // Chip-specific lines should NOT appear
        expect(output).not.toContain('Lokalanästhesie');
        expect(output).not.toContain('Kofferdam');
        expect(output).not.toContain('Adhäsivtechnik');
        expect(output).not.toContain('Mehrschichtfüllung');
    });

    it('DICTATED value overrides chip → Uses dictated value', () => {
        // User dictates "Leitung" but chip is Infiltration
        const output = renderWithChips(['chip_infiltration_anesthesia'], {
            anesthesia_line: '• Leitungsanästhesie (diktiert vom Arzt)'
        });

        console.log('\n=== DICTATED OVERRIDE ===\n', output);

        // Dictated value should appear, not chip default
        expect(output).toContain('Leitungsanästhesie');
        expect(output).toContain('diktiert vom Arzt');
    });

    it('Chip patches correct fields', () => {
        const data = applyChipPatches(['chip_kofferdam_bmf']);

        console.log('\n=== CHIP PATCHES ===\n', JSON.stringify(data, null, 2));

        expect(data.isolation).toBe('Kofferdam');
        expect(data.bmf).toBe(true);
        expect(data.isolation_line).toContain('Kofferdam');
    });

    it('Multiple anesthesia chips → Last one wins', () => {
        // User activates both by mistake
        const data = applyChipPatches([
            'chip_infiltration_anesthesia',
            'chip_conduction_anesthesia' // This should override
        ]);

        console.log('\n=== MULTIPLE ANESTHESIA ===\n', JSON.stringify(data, null, 2));

        // Last one should win
        expect(data.anesthesia_short).toBe('Leitungsanästhesie');
        expect(data.anesthesia_line).toContain('Leitungsanästhesie');
    });

});

describe('Output Structure Validation', () => {

    it('Output has correct sections', () => {
        const output = renderWithChips(['chip_infiltration_anesthesia']);

        expect(output).toContain('=== ÜBERSICHT & ABRECHNUNG ===');
        expect(output).toContain('=== BEHANDLUNGSABLAUF');
    });

    it('Empty _line fields are removed from output', () => {
        const output = renderWithChips([]); // No chips

        // Should not have bullet points for missing items
        const lines = output.split('\n');
        const bulletLines = lines.filter(l => l.trim().startsWith('•'));

        console.log('\n=== BULLET LINES ===\n', bulletLines);

        // Should have zero bullet points if no chips active
        expect(bulletLines.length).toBe(0);
    });

    it('Billing codes appear in output', () => {
        const caseState = applyChipPatches(['chip_infiltration_anesthesia', 'chip_kofferdam_bmf']);

        const result = renderTemplateV3({
            template: TEMPLATE,
            caseState: { tooth: '36', surfaces: ['m', 'o', 'd'], ...caseState },
            validation: { isValid: true, issues: [] },
            acceptedSuggestions: [
                { id: 'test', label: 'Test', billingCode: 'BEMA 40', billingItems: [{ code: 'BEMA 40', label: 'LA' }] }
            ],
            injectedText: [],
            dictationRaw: '36 MOD',
            dictationExtras: []
        });

        console.log('\n=== BILLING OUTPUT ===\n', result.fullText);

        expect(result.fullText).toContain('BEMA 40');
    });

});
