/**
 * END-TO-END BILLING TEST
 * Simulates the complete flow as it happens in the browser
 */

import { describe, it, expect } from 'vitest';
import { renderTemplateV3 } from '../sonia/render/renderTemplateV3';
import { MASTER_FILL_V3_BLUEPRINT } from '../sonia/templates/catalog/master_fill_v3_blueprint';
import { CONSERVATIVE_RULES } from '../sonia/rules/catalog/conservative';
import { FEE_CATALOG } from '../sonia/rules/feeCatalog';

const TEMPLATE = MASTER_FILL_V3_BLUEPRINT;

// Simulate full controller logic
function simulatePreview(options: {
    activeChips: string[];
    surfaces: string[];
    insuranceType: 'GKV' | 'PKV';
    extraData?: Record<string, any>;
}) {
    const { activeChips, surfaces, insuranceType, extraData = {} } = options;

    // Start with base data
    const patchedData: Record<string, any> = {
        tooth: '36',
        surfaces,
        ...TEMPLATE.defaults,
        ...extraData
    };

    const injectedText: string[] = [];
    const billingItems: any[] = [];

    // 1. Apply AUTO-MODE rules (always applied)
    const autoRules = CONSERVATIVE_RULES.filter(r => r.mode === 'auto');
    for (const rule of autoRules) {
        rule.then.patches?.forEach(patch => {
            patchedData[patch.path] = patch.value;
        });
        if (rule.then.textSnippet) {
            injectedText.push(rule.then.textSnippet);
        }
    }

    // 2. Apply active CHIP rules
    const chipRules = CONSERVATIVE_RULES.filter(r => r.mode === 'chip' && activeChips.includes(r.id));
    for (const rule of chipRules) {
        rule.then.patches?.forEach(patch => {
            patchedData[patch.path] = patch.value;
        });
        if (rule.then.textSnippet) {
            injectedText.push(rule.then.textSnippet);
        }

        // Collect billing codes
        if (rule.then.billingRefs?.length) {
            const items = rule.then.billingRefs
                .map(ref => FEE_CATALOG[ref])
                .filter(def => def !== undefined)
                .filter(def => insuranceType === 'GKV' ? def.code.startsWith('BEMA') : def.code.startsWith('GOZ'));

            items.forEach(item => {
                if (!billingItems.find(b => b.code === item.code)) {
                    billingItems.push(item);
                }
            });
        }
    }

    // 3. Add F-Code based on surfaces
    const count = surfaces.length;
    let fillingCodeKey: string;
    if (insuranceType === 'GKV') {
        if (count === 1) fillingCodeKey = 'BEMA_13';
        else if (count === 2) fillingCodeKey = 'BEMA_13b';
        else if (count === 3) fillingCodeKey = 'BEMA_13c';
        else fillingCodeKey = 'BEMA_13d';
    } else {
        if (count === 1) fillingCodeKey = 'GOZ_2080';
        else if (count === 2) fillingCodeKey = 'GOZ_2100';
        else if (count === 3) fillingCodeKey = 'GOZ_2120';
        else fillingCodeKey = 'GOZ_2130';
    }
    const fillingFee = FEE_CATALOG[fillingCodeKey];
    if (fillingFee) {
        billingItems.unshift(fillingFee); // Primary code first
    }

    // Render
    const result = renderTemplateV3({
        template: TEMPLATE,
        caseState: patchedData,
        validation: { isValid: true, issues: [] },
        acceptedSuggestions: billingItems.map(b => ({
            id: b.code,
            label: b.label,
            billingCode: b.code,
            billingItems: [b]
        })),
        injectedText,
        dictationRaw: `${patchedData.tooth} ${surfaces.join('').toUpperCase()}`,
        dictationExtras: []
    });

    return result.fullText;
}

describe('End-to-End Billing Test', () => {

    it('GKV: Full filling with all chips → Complete output with BEMA codes', () => {
        const output = simulatePreview({
            activeChips: ['chip_infiltration_anesthesia', 'chip_kofferdam_bmf', 'chip_adhesive', 'chip_layering'],
            surfaces: ['m', 'o', 'd'],
            insuranceType: 'GKV'
        });

        console.log('\n=== GKV FULL OUTPUT ===\n', output);

        // Check content
        expect(output).toContain('36 (MOD)');
        expect(output).toContain('Lokalanästhesie');
        expect(output).toContain('Kofferdam');
        expect(output).toContain('Exkavation'); // AUTO rule
        expect(output).toContain('Okklusionskontrolle'); // AUTO rule
        expect(output).toContain('Politur'); // AUTO rule
        expect(output).toContain('Schichttechnik');

        // Check billing codes
        expect(output).toContain('BEMA 13c'); // F3
        expect(output).toContain('BEMA 40'); // LA
        expect(output).toContain('BEMA 12'); // bMF
    });

    it('GKV: Kofferdam OFF → No BEMA 12', () => {
        const output = simulatePreview({
            activeChips: ['chip_infiltration_anesthesia', 'chip_adhesive'], // NO Kofferdam
            surfaces: ['m', 'o'],
            insuranceType: 'GKV'
        });

        console.log('\n=== GKV WITHOUT KOFFERDAM ===\n', output);

        // Kofferdam should NOT appear
        expect(output).not.toContain('Kofferdam');
        expect(output).not.toContain('BEMA 12');

        // But F2 and LA should appear
        expect(output).toContain('BEMA 13b'); // F2
        expect(output).toContain('BEMA 40'); // LA
    });

    it('PKV: Full filling → GOZ codes appear', () => {
        const output = simulatePreview({
            activeChips: ['chip_infiltration_anesthesia', 'chip_kofferdam_bmf', 'chip_adhesive', 'chip_layering'],
            surfaces: ['o', 'd'],
            insuranceType: 'PKV'
        });

        console.log('\n=== PKV FULL OUTPUT ===\n', output);

        // Check GOZ codes
        expect(output).toContain('GOZ 2100'); // F2
        expect(output).toContain('GOZ 0090'); // LA
        expect(output).toContain('GOZ 2040'); // Kofferdam
        expect(output).toContain('GOZ 2197'); // Adhäsiv
        expect(output).toContain('GOZ 2060'); // Schichttechnik
    });

    it('Standard items always appear (Exkavation, Okklusion, Politur)', () => {
        const output = simulatePreview({
            activeChips: [], // NO chips at all!
            surfaces: ['o'],
            insuranceType: 'GKV'
        });

        console.log('\n=== MINIMAL (NO CHIPS) ===\n', output);

        // These should ALWAYS appear (auto-mode)
        expect(output).toContain('Exkavation');
        expect(output).toContain('Okklusionskontrolle');
        expect(output).toContain('Politur');

        // F1 should appear
        expect(output).toContain('BEMA 13');
    });

    it('Surface count determines correct F-code', () => {
        // 1 surface
        let output = simulatePreview({ activeChips: [], surfaces: ['o'], insuranceType: 'GKV' });
        expect(output).toContain('BEMA 13'); // F1
        expect(output).not.toContain('BEMA 13b');

        // 2 surfaces
        output = simulatePreview({ activeChips: [], surfaces: ['m', 'o'], insuranceType: 'GKV' });
        expect(output).toContain('BEMA 13b'); // F2

        // 3 surfaces
        output = simulatePreview({ activeChips: [], surfaces: ['m', 'o', 'd'], insuranceType: 'GKV' });
        expect(output).toContain('BEMA 13c'); // F3

        // 4+ surfaces
        output = simulatePreview({ activeChips: [], surfaces: ['m', 'o', 'd', 'b'], insuranceType: 'GKV' });
        expect(output).toContain('BEMA 13d'); // F4
    });

});
