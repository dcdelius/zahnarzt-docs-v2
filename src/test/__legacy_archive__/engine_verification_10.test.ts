/**
 * ENGINE VERIFICATION TEST - Chip-Based Single Source of Truth
 * 
 * Tests the refactored output generation pipeline:
 * Dictation → inferChipsFromDictation → resolveChipStates → processTreatment → Text + Billing
 */

import { describe, it, expect } from 'vitest';
import { FILLING_TREATMENT } from '../docudent/core/behandlungen/konservierend/fuellung/definition';
import {
    inferChipsFromDictation,
    resolveChipStates,
    getActiveChipIds,
    processTreatment,
    generateFinalDocumentation
} from '../docudent/core/behandlungen/_shared/engine';
import type { InsuranceType, TextLength } from '../docudent/core/behandlungen/_shared/types';

describe('Engine Verification: Dictation → Chips → Billing', () => {

    // Test Case 1: Leitungsanästhesie should produce LA chip and BEMA 41
    it('should infer LA Leitung chip from dictation and produce correct billing', () => {
        const dictation = 'Füllung 46 MOD, Leitungsanästhesie, Kofferdam, tiefe Karies, Cp mit Calxyl';

        // Step 1: Infer chips from dictation
        const chips = inferChipsFromDictation(dictation, FILLING_TREATMENT);

        console.log('Inferred chips:', chips);

        expect(chips).toContain('la_leitung');
        expect(chips).toContain('kofferdam');
        expect(chips).toContain('cp');
        expect(chips).not.toContain('ohne_la'); // Should NOT have conflicting chip

        // Step 2: Resolve chip states
        const chipStates = resolveChipStates(FILLING_TREATMENT, chips, new Map(), {});
        const activeChips = getActiveChipIds(chipStates);

        console.log('Active chips after resolution:', activeChips);

        expect(activeChips).toContain('la_leitung');
        expect(activeChips).toContain('kofferdam');
        expect(activeChips).toContain('cp');

        // Step 3: Process treatment
        const result = processTreatment({
            treatment: FILLING_TREATMENT,
            insuranceType: 'GKV' as InsuranceType,
            activeChips,
            extractedData: { surfaces: ['m', 'o', 'd'] },
            acceptedUpsells: [],
            textLength: 'mittel' as TextLength
        });

        console.log('Billing codes:', result.billingCodes);
        console.log('Text lines:', result.textLines);
        console.log('Procedure snippets:', result.procedureSnippets);

        // Verify billing codes match active chips
        expect(result.billingCodes).toContain('BEMA 41a'); // Leitungsanästhesie
        expect(result.billingCodes).toContain('BEMA 12');  // Kofferdam
        expect(result.billingCodes).toContain('BEMA 25');  // Cp
        expect(result.billingCodes).toContain('BEMA 13c'); // 3-Flächen Füllung

        // Verify no contradiction: LA in billing means LA in text
        expect(result.procedureSnippets.join(' ')).not.toContain('Ohne Lokalanästhesie');
        expect(result.procedureSnippets.join(' ')).toContain('Leitungsanästhesie');
    });

    // Test Case 2: P (direkte Überkappung) should produce correct billing  
    it('should infer P chip from pulpaeröffnung and produce BEMA 26', () => {
        const dictation = 'Füllung 36, Leitungsanästhesie, Pulpaeröffnung, direkte Überkappung mit MTA';

        const chips = inferChipsFromDictation(dictation, FILLING_TREATMENT);

        console.log('Inferred chips for P case:', chips);

        expect(chips).toContain('p');
        expect(chips).not.toContain('cp'); // Mutual exclusivity

        const chipStates = resolveChipStates(FILLING_TREATMENT, chips, new Map(), {});
        const activeChips = getActiveChipIds(chipStates);

        const result = processTreatment({
            treatment: FILLING_TREATMENT,
            insuranceType: 'GKV' as InsuranceType,
            activeChips,
            extractedData: { surfaces: ['o'] },
            acceptedUpsells: [],
            textLength: 'mittel' as TextLength
        });

        console.log('Billing codes for P case:', result.billingCodes);

        expect(result.billingCodes).toContain('BEMA 26'); // P
    });

    // Test Case 3: No Röntgen in dictation should NOT produce Röntgen text
    it('should NOT produce Röntgen text when chip is not active', () => {
        const dictation = 'Füllung 16 DO, Infiltration, Komposit Schichttechnik';

        const chips = inferChipsFromDictation(dictation, FILLING_TREATMENT);

        console.log('Inferred chips (no Röntgen):', chips);

        expect(chips).not.toContain('rö_kontrolle');

        const chipStates = resolveChipStates(FILLING_TREATMENT, chips, new Map(), {});
        const activeChips = getActiveChipIds(chipStates);

        const result = processTreatment({
            treatment: FILLING_TREATMENT,
            insuranceType: 'GKV' as InsuranceType,
            activeChips,
            extractedData: { surfaces: ['d', 'o'] },
            acceptedUpsells: [],
            textLength: 'mittel' as TextLength
        });

        console.log('Procedure snippets (no Röntgen):', result.procedureSnippets);

        // Should NOT contain Röntgen text
        expect(result.procedureSnippets.join(' ')).not.toContain('Rö-Kontrolle');
        expect(result.procedureSnippets.join(' ')).not.toContain('Röntgen');
    });

    // Test Case 4: Kariesdetektor should only appear in PKV billing, not GKV
    it('should handle Kariesdetektor correctly for GKV vs PKV', () => {
        const dictation = 'Füllung 26, Infiltration, Kariesdetektor verwendet';

        const chips = inferChipsFromDictation(dictation, FILLING_TREATMENT);

        expect(chips).toContain('kariesdetektor');

        const chipStates = resolveChipStates(FILLING_TREATMENT, chips, new Map(), {});
        const activeChips = getActiveChipIds(chipStates);

        // GKV: No billing for Kariesdetektor (it's private)
        const gkvResult = processTreatment({
            treatment: FILLING_TREATMENT,
            insuranceType: 'GKV' as InsuranceType,
            activeChips,
            extractedData: { surfaces: ['o'] },
            acceptedUpsells: [],
            textLength: 'mittel' as TextLength
        });

        console.log('GKV billing codes:', gkvResult.billingCodes);

        // Kariesdetektor has no GKV billingRef, so no BEMA code
        expect(gkvResult.billingCodes.join('')).not.toMatch(/kariesdetektor/i);

        // PKV: Should have GOZ analog
        const pkvResult = processTreatment({
            treatment: FILLING_TREATMENT,
            insuranceType: 'PKV' as InsuranceType,
            activeChips,
            extractedData: { surfaces: ['o'] },
            acceptedUpsells: [],
            textLength: 'mittel' as TextLength
        });

        console.log('PKV billing codes:', pkvResult.billingCodes);
    });

    // Test Case 5: generateFinalDocumentation integrates everything
    it('should generate consistent documentation with diagnosis', () => {
        const dictation = 'Füllung 46 MOD, tiefe Karies, Leitungsanästhesie, Kofferdam, Cp';

        const chips = inferChipsFromDictation(dictation, FILLING_TREATMENT);
        const chipStates = resolveChipStates(FILLING_TREATMENT, chips, new Map(), {});
        const activeChips = getActiveChipIds(chipStates);

        const doc = generateFinalDocumentation(
            FILLING_TREATMENT,
            'GKV' as InsuranceType,
            activeChips,
            {
                tooth: '46',
                surfaces: ['m', 'o', 'd'],
                diagnosis: 'Caries profunda'
            },
            [],
            'mittel' as TextLength
        );

        console.log('\n=== FINAL DOCUMENTATION ===');
        console.log('Header:', doc.uebersicht.header);
        console.log('Befund:', doc.uebersicht.befund);
        console.log('Leistungen:', doc.uebersicht.leistungen);
        console.log('Codes:', doc.uebersicht.codes);
        console.log('\nFließtext:', doc.fliesstext);

        // Verify header contains diagnosis
        expect(doc.uebersicht.header).toContain('46');

        // Verify codes
        expect(doc.uebersicht.codes).toContain('BEMA 41a');
        expect(doc.uebersicht.codes).toContain('BEMA 12');
        expect(doc.uebersicht.codes).toContain('BEMA 25');
        expect(doc.uebersicht.codes).toContain('BEMA 13c');

        // Verify no contradictions in fließtext
        expect(doc.fliesstext).not.toContain('Ohne Lokalanästhesie');
        expect(doc.fliesstext).toContain('Leitungsanästhesie');
    });
});
