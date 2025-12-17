/**
 * SYSTEM DEEP-DIVE TEST
 * 
 * Comprehensive test of: text lengths, chips, billing, logic
 * Tests KZV compliance and output correctness
 */

import { describe, it, expect } from 'vitest';
import { FILLING_TREATMENT } from '../sonia/behandlungen/konservierend/fuellung/definition';
import { processTreatment, generateFinalDocumentation } from '../sonia/behandlungen/_shared/engine';
import { TreatmentContext, TextLength } from '../sonia/behandlungen/_shared/types';

// Helper to create context
function createContext(
    activeChips: string[],
    insuranceType: 'GKV' | 'PKV' = 'GKV',
    textLength: TextLength = 'mittel',
    surfaces: string[] = ['o']
): TreatmentContext {
    return {
        treatment: FILLING_TREATMENT,
        insuranceType,
        activeChips,
        extractedData: { surfaces },
        acceptedUpsells: [],
        textLength
    };
}

describe('System Deep-Dive Tests', () => {

    // ========================================
    // TEST 1-3: TEXT LENGTH VARIANTS
    // ========================================

    describe('1-3: Text Length Variants', () => {
        const standardChips = ['vipr_pos', 'perk_neg', 'spont_neg', 'la_infiltr', 'kofferdam', 'exkavation', 'cp_not_required', 'adhesive', 'schicht'];

        it('1. KURZ: Generates minimal text', () => {
            const ctx = createContext(standardChips, 'GKV', 'kurz');
            const result = processTreatment(ctx);

            // Check snippets are short
            expect(result.procedureSnippets.some(s => s.includes('LA Infiltr.'))).toBe(true);
            expect(result.procedureSnippets.some(s => s.includes('Kofferdam.'))).toBe(true);

            // Final documentation
            const doc = generateFinalDocumentation(
                FILLING_TREATMENT, 'GKV', standardChips,
                { surfaces: ['o'] }, [], 'kurz'
            );

            console.log('\n=== TEST 1: KURZ ===');
            console.log('Fließtext:', doc.fliesstext);
            console.log('Länge:', doc.fliesstext.length, 'Zeichen');

            expect(doc.fliesstext.length).toBeLessThan(300);
        });

        it('2. MITTEL: Generates balanced text', () => {
            const ctx = createContext(standardChips, 'GKV', 'mittel');
            const result = processTreatment(ctx);

            expect(result.procedureSnippets.some(s => s.includes('LA Infiltration (Ultracain D-S)'))).toBe(true);
            expect(result.procedureSnippets.some(s => s.includes('Kofferdam angelegt'))).toBe(true);

            const doc = generateFinalDocumentation(
                FILLING_TREATMENT, 'GKV', standardChips,
                { surfaces: ['o'] }, [], 'mittel'
            );

            console.log('\n=== TEST 2: MITTEL ===');
            console.log('Fließtext:', doc.fliesstext);
            console.log('Länge:', doc.fliesstext.length, 'Zeichen');

            expect(doc.fliesstext.length).toBeGreaterThan(200);
            expect(doc.fliesstext.length).toBeLessThan(600);
        });

        it('3. LANG: Generates detailed text', () => {
            const ctx = createContext(standardChips, 'GKV', 'lang');
            const result = processTreatment(ctx);

            expect(result.procedureSnippets.some(s => s.includes('Oberflächenanästhesie'))).toBe(true);
            expect(result.procedureSnippets.some(s => s.includes('anatomisch angepasster Klammer'))).toBe(true);

            const doc = generateFinalDocumentation(
                FILLING_TREATMENT, 'GKV', standardChips,
                { surfaces: ['o'] }, [], 'lang'
            );

            console.log('\n=== TEST 3: LANG ===');
            console.log('Fließtext:', doc.fliesstext);
            console.log('Länge:', doc.fliesstext.length, 'Zeichen');

            expect(doc.fliesstext.length).toBeGreaterThan(500);
        });
    });

    // ========================================
    // TEST 4-5: CHIP ACTIVATION
    // ========================================

    describe('4-5: Chip Activation', () => {
        it('4. ALL CHIPS: Maximum services', () => {
            const allChips = [
                'vipr_pos', 'perk_neg', 'spont_neg',
                'la_infiltr', 'kofferdam', 'exkavation',
                'cp', 'matrize', 'adhesive', 'schicht', 'fluor', 'rö_kontrolle'
            ];

            const ctx = createContext(allChips, 'GKV', 'mittel', ['m', 'o', 'd']);
            const result = processTreatment(ctx);

            console.log('\n=== TEST 4: ALL CHIPS ===');
            console.log('TextLines:', result.textLines);
            console.log('Billing:', result.billingCodes);

            // Should have many text lines
            expect(result.textLines.length).toBeGreaterThanOrEqual(8);

            // Check Cp is included
            expect(result.textLines.some(l => l.includes('Cp'))).toBe(true);

            // Check Matrize is included
            expect(result.textLines.some(l => l.includes('Teilmatrize'))).toBe(true);
        });

        it('5. MINIMUM CHIPS: Essential only', () => {
            const minChips = ['la_infiltr', 'rel_trocken', 'exkavation', 'adhesive', 'schicht'];

            const ctx = createContext(minChips, 'GKV', 'mittel', ['o']);
            const result = processTreatment(ctx);

            console.log('\n=== TEST 5: MINIMUM CHIPS ===');
            console.log('TextLines:', result.textLines);
            console.log('Billing:', result.billingCodes);

            // Should have fewer text lines
            expect(result.textLines.length).toBeLessThanOrEqual(6);

            // Kofferdam should NOT be in list
            expect(result.textLines.some(l => l.includes('Kofferdam'))).toBe(false);
        });
    });

    // ========================================
    // TEST 6-7: MUTUAL EXCLUSIVITY
    // ========================================

    describe('6-7: Mutual Exclusivity', () => {
        it('6. LA EXCLUSIVITY: Only one anesthesia type', () => {
            const laInfiltr = FILLING_TREATMENT.chips.find(c => c.id === 'la_infiltr');
            const laLeitung = FILLING_TREATMENT.chips.find(c => c.id === 'la_leitung');
            const ohneLa = FILLING_TREATMENT.chips.find(c => c.id === 'ohne_la');

            console.log('\n=== TEST 6: LA EXCLUSIVITY ===');
            console.log('la_infiltr excludes:', laInfiltr?.mutuallyExclusiveWith);
            console.log('la_leitung excludes:', laLeitung?.mutuallyExclusiveWith);
            console.log('ohne_la excludes:', ohneLa?.mutuallyExclusiveWith);

            expect(laInfiltr?.mutuallyExclusiveWith).toContain('la_leitung');
            expect(laInfiltr?.mutuallyExclusiveWith).toContain('ohne_la');
            expect(laLeitung?.mutuallyExclusiveWith).toContain('la_infiltr');
        });

        it('7. ÜBERKAPPUNG EXCLUSIVITY: cp vs p vs cp_not_required', () => {
            const cp = FILLING_TREATMENT.chips.find(c => c.id === 'cp');
            const p = FILLING_TREATMENT.chips.find(c => c.id === 'p');
            const cpNotReq = FILLING_TREATMENT.chips.find(c => c.id === 'cp_not_required');

            console.log('\n=== TEST 7: ÜBERKAPPUNG EXCLUSIVITY ===');
            console.log('cp excludes:', cp?.mutuallyExclusiveWith);
            console.log('p excludes:', p?.mutuallyExclusiveWith);
            console.log('cp_not_required excludes:', cpNotReq?.mutuallyExclusiveWith);

            expect(cp?.mutuallyExclusiveWith).toContain('p');
            expect(cp?.mutuallyExclusiveWith).toContain('cp_not_required');
            expect(p?.mutuallyExclusiveWith).toContain('cp');
        });
    });

    // ========================================
    // TEST 8-9: BILLING CODES
    // ========================================

    describe('8-9: Billing Codes (KZV Compliance)', () => {
        it('8. GKV BILLING: BEMA codes correct', () => {
            const chips = ['la_infiltr', 'kofferdam', 'exkavation', 'cp', 'adhesive', 'schicht', 'fluor'];

            const ctx = createContext(chips, 'GKV', 'mittel', ['o', 'd']);
            const result = processTreatment(ctx);

            console.log('\n=== TEST 8: GKV BILLING ===');
            console.log('BEMA Codes:', result.billingCodes);

            // Check expected BEMA codes
            expect(result.billingCodes).toContain('40');      // LA Infiltration
            expect(result.billingCodes).toContain('bMF');     // Kofferdam
            expect(result.billingCodes).toContain('Cp');      // Indirekte Überkappung
            expect(result.billingCodes).toContain('IP4');     // Fluoridierung

            // F-Code based on surfaces should be first
            expect(result.billingCodes[0]).toMatch(/13[a-d]/);
        });

        it('9. PKV BILLING: GOZ codes correct', () => {
            const chips = ['la_infiltr', 'kofferdam', 'exkavation', 'cp', 'adhesive', 'schicht'];

            const ctx = createContext(chips, 'PKV', 'mittel', ['m', 'o', 'd']);
            const result = processTreatment(ctx);

            console.log('\n=== TEST 9: PKV BILLING ===');
            console.log('GOZ Codes:', result.billingCodes);

            // Check expected GOZ codes
            expect(result.billingCodes).toContain('Ä90');     // LA Infiltration (GOZ 0090 -> Ä90)
            expect(result.billingCodes).toContain('2040');    // Kofferdam
            expect(result.billingCodes).toContain('2330');    // Cp

            // GOZ 2197 should be present for adhesive (but NOT additional to 2100!)
            // This is a known GOZ rule: 2197 is included in 2060-2120
            console.log('⚠️ Check: GOZ 2197 should generally NOT be billed WITH 2100');
        });
    });

    // ========================================
    // TEST 10: EDGE CASE - MEHRFLÄCHIG
    // ========================================

    describe('10: Edge Cases', () => {
        it('10. MEHRFLÄCHIG: 4+ surfaces get correct code', () => {
            const chips = ['la_infiltr', 'kofferdam', 'exkavation', 'adhesive', 'schicht'];

            // 4 surfaces
            const ctx4 = createContext(chips, 'GKV', 'mittel', ['m', 'o', 'd', 'b']);
            const result4 = processTreatment(ctx4);

            // 5 surfaces
            const ctx5 = createContext(chips, 'GKV', 'mittel', ['m', 'o', 'd', 'b', 'l']);
            const result5 = processTreatment(ctx5);

            console.log('\n=== TEST 10: MEHRFLÄCHIG ===');
            console.log('4 Flächen Codes:', result4.billingCodes);
            console.log('5 Flächen Codes:', result5.billingCodes);

            // Both should have 13d (4+ surfaces)
            expect(result4.billingCodes).toContain('13d');
            expect(result5.billingCodes).toContain('13d');
        });
    });
});

// ========================================
// KZV COMPLIANCE ANALYSIS
// ========================================

describe('KZV Compliance Analysis', () => {
    it('Analyzes billing rules against KZV guidelines', () => {
        console.log('\n=== KZV COMPLIANCE ANALYSIS ===\n');

        const issues: string[] = [];
        const warnings: string[] = [];

        // Check BEMA codes exist
        const chipsWithGKV = FILLING_TREATMENT.chips.filter(c => c.billingRefs?.GKV);
        console.log('Chips mit GKV-Abrechnung:', chipsWithGKV.map(c => `${c.id} → ${c.billingRefs?.GKV}`));

        // Check billingRules
        console.log('\nBilling Rules (automatisch):');
        FILLING_TREATMENT.billingRules.forEach(rule => {
            console.log(`  ${rule.description}: ${rule.trigger} →`, Object.keys(rule.logic));
        });

        // ISSUE CHECKS:

        // 1. GOZ 2197 with 2060-2120: Should warn
        const adhesiveChip = FILLING_TREATMENT.chips.find(c => c.id === 'adhesive');
        if (adhesiveChip?.billingRefs?.PKV === 'GOZ_2197') {
            warnings.push('GOZ 2197 (Adhäsiv) wird als separater Code geführt - bei GOZ 2060-2120 ist dies INKLUDIERT!');
        }

        // 2. Check all BEMA codes are valid
        const validBEMA = ['BEMA_13', 'BEMA_13b', 'BEMA_13c', 'BEMA_13d', 'BEMA_40', 'BEMA_41', 'BEMA_12', 'BEMA_CP', 'BEMA_P', 'BEMA_IP4', 'BEMA_925A'];
        chipsWithGKV.forEach(chip => {
            if (!validBEMA.includes(chip.billingRefs?.GKV || '')) {
                issues.push(`Unbekannter BEMA-Code: ${chip.billingRefs?.GKV} (${chip.id})`);
            }
        });

        // 3. Check Cp/P have correct codes
        const cpChip = FILLING_TREATMENT.chips.find(c => c.id === 'cp');
        const pChip = FILLING_TREATMENT.chips.find(c => c.id === 'p');

        if (cpChip?.billingRefs?.GKV !== 'BEMA_CP') {
            issues.push('Cp hat falschen BEMA-Code (sollte BEMA_CP = 25 sein)');
        }
        if (pChip?.billingRefs?.GKV !== 'BEMA_P') {
            issues.push('P hat falschen BEMA-Code (sollte BEMA_P = 26 sein)');
        }

        console.log('\n--- ISSUES ---');
        if (issues.length === 0) {
            console.log('✅ Keine kritischen Issues gefunden');
        } else {
            issues.forEach(i => console.log('❌', i));
        }

        console.log('\n--- WARNINGS ---');
        if (warnings.length === 0) {
            console.log('✅ Keine Warnungen');
        } else {
            warnings.forEach(w => console.log('⚠️', w));
        }

        expect(issues.length).toBe(0);
    });
});
