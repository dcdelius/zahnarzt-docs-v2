/**
 * COMPREHENSIVE PIPELINE VERIFICATION
 * 
 * Tests the ENTIRE pipeline with realistic dental cases
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

/**
 * Helper to run full pipeline and return structured output
 */
function runPipeline(dictation: string, extracted: Record<string, any>, insuranceType: InsuranceType = 'GKV') {
    // Step 1: Infer chips from dictation
    const inferredChips = inferChipsFromDictation(dictation, FILLING_TREATMENT, extracted);

    // Step 2: Resolve chip states
    const chipStates = resolveChipStates(FILLING_TREATMENT, inferredChips, new Map(), {});
    const activeChips = getActiveChipIds(chipStates);

    // Step 3: Process treatment
    const result = processTreatment({
        treatment: FILLING_TREATMENT,
        insuranceType,
        activeChips,
        extractedData: extracted,
        acceptedUpsells: [],
        textLength: 'mittel' as TextLength
    });

    // Step 4: Generate final documentation
    const doc = generateFinalDocumentation(
        FILLING_TREATMENT,
        insuranceType,
        activeChips,
        extracted,
        [],
        'mittel' as TextLength
    );

    return {
        inferredChips,
        activeChips,
        billingCodes: result.billingCodes,
        textLines: result.textLines,
        procedureSnippets: result.procedureSnippets,
        header: doc.uebersicht.header,
        fliesstext: doc.fliesstext,
        codes: doc.uebersicht.codes
    };
}

describe('Comprehensive Pipeline Tests', () => {

    // ═══════════════════════════════════════════════════════════════
    // FALL 1: Standard GKV Füllung mit Infiltration
    // ═══════════════════════════════════════════════════════════════
    it('Fall 1: Standard GKV MOD mit Infiltration', () => {
        const dictation = 'Füllung Zahn 16 mesial okklusal distal, Infiltrationsanästhesie, relative Trockenlegung, Karies exkaviert, Teilmatrize, Komposit mehrschichtig, Politur';
        const extracted = {
            tooth: '16',
            surfaces: ['m', 'o', 'd'],
            diagnosis: 'Caries media'
        };

        const result = runPipeline(dictation, extracted, 'GKV');

        console.log('\n=== FALL 1: Standard GKV MOD ===');
        console.log('Chips:', result.inferredChips);
        console.log('Billing:', result.billingCodes);
        console.log('Header:', result.header);

        // Erwartungen
        expect(result.inferredChips).toContain('la_infiltr');
        expect(result.inferredChips).toContain('rel_trocken');
        expect(result.inferredChips).toContain('exkavation');
        expect(result.inferredChips).toContain('matrize');
        expect(result.inferredChips).toContain('mehrschicht');

        expect(result.billingCodes).toContain('BEMA 13c'); // 3-flächig
        expect(result.billingCodes).toContain('BEMA 40');  // Infiltration
        expect(result.billingCodes).toContain('GOZ 2197 (Zuzahlung)'); // Mehrschicht

        // Kein Widerspruch
        expect(result.fliesstext).not.toContain('Ohne Lokalanästhesie');
        expect(result.fliesstext).toContain('Infiltration');
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 2: Tiefe Karies im UK mit Leitung und Cp
    // ═══════════════════════════════════════════════════════════════
    it('Fall 2: Tiefe Karies UK mit Leitung und Cp', () => {
        const dictation = 'Füllung 46 MOD, Leitungsanästhesie N. alv. inf., Kofferdam, tiefe Karies bis pulpanah, indirekte Überkappung mit Calxyl, Teilmatrize verkeilt, Komposit Tetric, Politur';
        const extracted = {
            tooth: '46',
            surfaces: ['m', 'o', 'd'],
            diagnosis: 'Caries profunda'
        };

        const result = runPipeline(dictation, extracted, 'GKV');

        console.log('\n=== FALL 2: Tiefe Karies UK mit Cp ===');
        console.log('Chips:', result.inferredChips);
        console.log('Billing:', result.billingCodes);

        // Erwartungen
        expect(result.inferredChips).toContain('la_leitung');
        expect(result.inferredChips).toContain('kofferdam');
        expect(result.inferredChips).toContain('cp');
        expect(result.inferredChips).toContain('matrize');

        expect(result.billingCodes).toContain('BEMA 13c'); // 3-flächig
        expect(result.billingCodes).toContain('BEMA 41a'); // Leitung
        expect(result.billingCodes).toContain('BEMA 12');  // Kofferdam
        expect(result.billingCodes).toContain('BEMA 25');  // Cp

        // Text muss Leitung enthalten
        expect(result.fliesstext).toContain('Leitungsanästhesie');
        expect(result.fliesstext).not.toContain('Ohne Lokalanästhesie');
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 3: Direkte Überkappung (P) mit Pulpaeröffnung
    // ═══════════════════════════════════════════════════════════════
    it('Fall 3: Direkte Überkappung mit Pulpaeröffnung', () => {
        const dictation = 'Füllung 36 O, Leitungsanästhesie, Kofferdam, bei Exkavation punktförmige Pulpaeröffnung, direkte Überkappung mit MTA, Komposit';
        const extracted = {
            tooth: '36',
            surfaces: ['o'],
            diagnosis: 'Caries profunda c. pulpae apertae'
        };

        const result = runPipeline(dictation, extracted, 'GKV');

        console.log('\n=== FALL 3: Direkte Überkappung P ===');
        console.log('Chips:', result.inferredChips);
        console.log('Billing:', result.billingCodes);

        // P statt Cp
        expect(result.inferredChips).toContain('p');
        expect(result.inferredChips).not.toContain('cp'); // Mutual exclusivity

        expect(result.billingCodes).toContain('BEMA 26'); // P
        expect(result.billingCodes).not.toContain('BEMA 25'); // Nicht Cp!
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 4: PKV Füllung mit allen Extras
    // ═══════════════════════════════════════════════════════════════
    it('Fall 4: PKV mit allen Extras', () => {
        const dictation = 'Füllung 15 DO, Infiltrationsanästhesie, Kofferdam, Kariesdetektor, Exkavation, Adhäsivtechnik Mehrschicht, Fluoridierung';
        const extracted = {
            tooth: '15',
            surfaces: ['d', 'o'],
            diagnosis: 'Caries media'
        };

        const result = runPipeline(dictation, extracted, 'PKV');

        console.log('\n=== FALL 4: PKV mit Extras ===');
        console.log('Chips:', result.inferredChips);
        console.log('Billing:', result.billingCodes);

        // PKV Codes
        expect(result.billingCodes).toContain('GOZ 2080'); // 2-flächig
        expect(result.billingCodes).toContain('GOZ 0090'); // Infiltration
        expect(result.billingCodes).toContain('GOZ 2040'); // Kofferdam
        expect(result.billingCodes).toContain('GOZ 2020a'); // Kariesdetektor analog
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 5: Ohne Anästhesie (explizit)
    // ═══════════════════════════════════════════════════════════════
    it('Fall 5: Ohne Anästhesie explizit', () => {
        const dictation = 'Füllung 24 O, Ohne Anästhesie, Pat. wünscht keine LA, relative Trockenlegung, kleine Kavität, Komposit';
        const extracted = {
            tooth: '24',
            surfaces: ['o'],
            diagnosis: 'Caries superficialis'
        };

        const result = runPipeline(dictation, extracted, 'GKV');

        console.log('\n=== FALL 5: Ohne Anästhesie ===');
        console.log('Chips:', result.inferredChips);
        console.log('Billing:', result.billingCodes);

        expect(result.inferredChips).toContain('ohne_la');
        expect(result.inferredChips).not.toContain('la_infiltr');
        expect(result.inferredChips).not.toContain('la_leitung');

        // Keine Anästhesie-Codes
        expect(result.billingCodes).not.toContain('BEMA 40');
        expect(result.billingCodes).not.toContain('BEMA 41a');

        // Text sagt "Ohne LA"
        expect(result.fliesstext).toContain('Ohne Lok');
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 6: 4-flächige Füllung
    // ═══════════════════════════════════════════════════════════════
    it('Fall 6: 4-flächige Füllung MODB', () => {
        const dictation = 'Füllung 26 mesial okklusal distal bukkal, Infiltration, Kofferdam, Komposit';
        const extracted = {
            tooth: '26',
            surfaces: ['m', 'o', 'd', 'b'],
            diagnosis: 'Caries media'
        };

        const result = runPipeline(dictation, extracted, 'GKV');

        console.log('\n=== FALL 6: 4-flächig ===');
        console.log('Billing:', result.billingCodes);

        // 4+ Flächen = BEMA 13d
        expect(result.billingCodes).toContain('BEMA 13d');
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 7: Einflächige Füllung
    // ═══════════════════════════════════════════════════════════════
    it('Fall 7: Einflächige Füllung O', () => {
        const dictation = 'Füllung 17 okklusal, Infiltration, Komposit';
        const extracted = {
            tooth: '17',
            surfaces: ['o'],
            diagnosis: 'Caries media'
        };

        const result = runPipeline(dictation, extracted, 'GKV');

        console.log('\n=== FALL 7: Einflächig ===');
        console.log('Billing:', result.billingCodes);

        expect(result.billingCodes).toContain('BEMA 13'); // 1-flächig
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 8: Mit Röntgenkontrolle
    // ═══════════════════════════════════════════════════════════════
    it('Fall 8: Mit Röntgenkontrolle', () => {
        const dictation = 'Füllung 36 MOD, Leitung, Kofferdam, tiefe Karies, Cp, nach Füllung Röntgenkontrolle';
        const extracted = {
            tooth: '36',
            surfaces: ['m', 'o', 'd'],
            diagnosis: 'Caries profunda'
        };

        const result = runPipeline(dictation, extracted, 'GKV');

        console.log('\n=== FALL 8: Mit Röntgen ===');
        console.log('Chips:', result.inferredChips);
        console.log('Text enthält Rö?:', result.fliesstext.includes('Rö'));

        expect(result.inferredChips).toContain('rö_kontrolle');
        // Text sollte was mit Röntgen haben
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 9: OHNE Röntgen (kein Keyword)
    // ═══════════════════════════════════════════════════════════════
    it('Fall 9: Ohne Röntgen im Diktat', () => {
        const dictation = 'Füllung 16 DO, Infiltration, Kofferdam, Komposit mehrschichtig, Politur';
        const extracted = {
            tooth: '16',
            surfaces: ['d', 'o'],
            diagnosis: 'Caries media'
        };

        const result = runPipeline(dictation, extracted, 'GKV');

        console.log('\n=== FALL 9: Ohne Röntgen ===');
        console.log('Chips:', result.inferredChips);
        console.log('Text enthält Rö?:', result.fliesstext.includes('Rö'));

        expect(result.inferredChips).not.toContain('rö_kontrolle');
        // Text sollte KEIN Röntgen haben
        expect(result.fliesstext).not.toContain('Rö-Kontrolle');
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 10: Komplexfall - alles zusammen
    // ═══════════════════════════════════════════════════════════════
    it('Fall 10: Komplexfall mit allem', () => {
        const dictation = `
            Kompositfüllung 46 MOD, 
            Leitungsanästhesie N. alv. inferior rechts,
            Kofferdam angelegt,
            Exkavation kariöser Hartsubstanz bis sondenhart,
            bei Exkavation sehr pulpanah,
            indirekte Überkappung Cp mit Calxyl,
            Teilmatrize und Holzkeil,
            Adhäsivtechnik Schmelz-Dentin-Bonding,
            Komposit Tetric mehrschichtig appliziert,
            Okklusionskontrolle, Politur,
            Fluoridierung Elmex
        `;
        const extracted = {
            tooth: '46',
            surfaces: ['m', 'o', 'd'],
            material: 'Tetric',
            diagnosis: 'Caries profunda'
        };

        const result = runPipeline(dictation, extracted, 'GKV');

        console.log('\n=== FALL 10: Komplexfall ===');
        console.log('Inferred Chips:', result.inferredChips);
        console.log('Active Chips:', result.activeChips);
        console.log('Billing Codes:', result.billingCodes);
        console.log('\nHeader:', result.header);
        console.log('\nFließtext:', result.fliesstext);

        // Alle wichtigen Chips erkannt
        expect(result.inferredChips).toContain('la_leitung');
        expect(result.inferredChips).toContain('kofferdam');
        expect(result.inferredChips).toContain('exkavation');
        expect(result.inferredChips).toContain('cp');
        expect(result.inferredChips).toContain('matrize');
        expect(result.inferredChips).toContain('mehrschicht');
        expect(result.inferredChips).toContain('fluor');

        // Alle Billing Codes
        expect(result.billingCodes).toContain('BEMA 13c'); // 3-flächig
        expect(result.billingCodes).toContain('BEMA 41a'); // Leitung
        expect(result.billingCodes).toContain('BEMA 12');  // Kofferdam
        expect(result.billingCodes).toContain('BEMA 25');  // Cp

        // Keine Widersprüche
        expect(result.fliesstext).not.toContain('Ohne Lokalanästhesie');
        expect(result.fliesstext).toContain('Leitungsanästhesie');
    });
});
