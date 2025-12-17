/**
 * CLINICAL VALIDATION TEST
 * 
 * Prüft ob der Output zahnmedizinisch sinnvoll ist:
 * 1. Korrekte Abfolge der Handlungen
 * 2. Nur dokumentierte/eingestellte Dinge erscheinen
 * 3. Keine Widersprüche
 */

import { describe, it, expect } from 'vitest';
import { FILLING_TREATMENT } from '../docudent/core/behandlungen/konservierend/fuellung/definition';
import {
    inferChipsFromDictation,
    resolveChipStates,
    getActiveChipIds,
    generateFinalDocumentation
} from '../docudent/core/behandlungen/_shared/engine';
import type { InsuranceType, TextLength } from '../docudent/core/behandlungen/_shared/types';

function runFullPipeline(dictation: string, extracted: Record<string, any>, insuranceType: InsuranceType = 'GKV') {
    const inferredChips = inferChipsFromDictation(dictation, FILLING_TREATMENT, extracted);
    const chipStates = resolveChipStates(FILLING_TREATMENT, inferredChips, new Map(), {});
    const activeChips = getActiveChipIds(chipStates);

    const doc = generateFinalDocumentation(
        FILLING_TREATMENT,
        insuranceType,
        activeChips,
        extracted,
        [],
        'mittel' as TextLength
    );

    return { inferredChips, activeChips, doc };
}

describe('Clinical Validation: Zahnmedizinisch korrekter Output', () => {

    // ════════════════════════════════════════════════════════════════
    // TEST 1: Korrekte klinische Abfolge
    // ════════════════════════════════════════════════════════════════
    it('should follow correct clinical sequence', () => {
        const dictation = 'Füllung 46 MOD, Leitungsanästhesie, Kofferdam, tiefe Karies exkaviert bis sondenhart, Cp Calxyl, Teilmatrize, Komposit Schichttechnik, Politur';
        const extracted = { tooth: '46', surfaces: ['m', 'o', 'd'], diagnosis: 'Caries profunda' };

        const { doc, activeChips } = runFullPipeline(dictation, extracted, 'GKV');

        console.log('\n=== KLINISCHE ABFOLGE TEST ===');
        console.log('Active Chips:', activeChips);
        console.log('\nFließtext:\n', doc.fliesstext);

        // Die Abfolge im Fließtext muss zahnmedizinisch sinnvoll sein:
        // 1. Aufklärung (VOR Behandlung)
        // 2. Anästhesie (BEVOR invasive Maßnahmen)
        // 3. Trockenlegung (BEVOR Exkavation)
        // 4. Exkavation
        // 5. Überkappung (NACH Exkavation, VOR Füllung)
        // 6. Matrize
        // 7. Adhäsiv/Komposit
        // 8. Politur/Finishing (AM ENDE)
        // 9. Entlassung (GANZ AM ENDE)

        const text = doc.fliesstext;

        // Positionen im Text finden
        const posAufklaerung = text.indexOf('aufgeklärt');
        const posAnaesthesie = text.indexOf('anästhesie');
        const posKofferdam = text.indexOf('Kofferdam');
        const posExkavation = text.indexOf('Exkavation');
        const posCp = text.indexOf('Überkappung');
        const posMatrize = text.indexOf('Matrize');
        const posKomposit = text.indexOf('Komposit');
        const posPolitur = text.indexOf('Politur');
        const posEntlassen = text.indexOf('entlassen');

        console.log('\nPositionen im Text:');
        console.log('  Aufklärung:', posAufklaerung);
        console.log('  Anästhesie:', posAnaesthesie);
        console.log('  Kofferdam:', posKofferdam);
        console.log('  Exkavation:', posExkavation);
        console.log('  Cp/Überkappung:', posCp);
        console.log('  Matrize:', posMatrize);
        console.log('  Komposit:', posKomposit);
        console.log('  Politur:', posPolitur);
        console.log('  Entlassen:', posEntlassen);

        // Prüfe korrekte Reihenfolge
        expect(posAufklaerung).toBeLessThan(posAnaesthesie); // Aufklärung VOR Anästhesie
        expect(posAnaesthesie).toBeLessThan(posKofferdam);   // Anästhesie VOR Kofferdam
        expect(posKofferdam).toBeLessThan(posExkavation);    // Kofferdam VOR Exkavation
        expect(posExkavation).toBeLessThan(posCp);           // Exkavation VOR Cp
        expect(posCp).toBeLessThan(posKomposit);             // Cp VOR Komposit
        expect(posKomposit).toBeLessThan(posPolitur);        // Komposit VOR Politur
        expect(posPolitur).toBeLessThan(posEntlassen);       // Politur VOR Entlassung
    });

    // ════════════════════════════════════════════════════════════════
    // TEST 2: Nur dokumentierte Dinge erscheinen
    // ════════════════════════════════════════════════════════════════
    it('should ONLY contain documented/toggled items', () => {
        // Diktat OHNE: Röntgen, Kariesdetektor, Fluorid, Blutstillung
        const dictation = 'Füllung 26 O, Infiltration, Kofferdam, Komposit';
        const extracted = { tooth: '26', surfaces: ['o'], diagnosis: 'Caries media' };

        const { doc, activeChips } = runFullPipeline(dictation, extracted, 'GKV');

        console.log('\n=== NUR DOKUMENTIERTES TEST ===');
        console.log('Active Chips:', activeChips);
        console.log('\nFließtext:\n', doc.fliesstext);
        console.log('\nBilling Codes:', doc.uebersicht.codes);

        const text = doc.fliesstext;

        // Dinge die NICHT im Diktat waren, dürfen NICHT erscheinen
        expect(text).not.toContain('Röntgen');
        expect(text).not.toContain('Rö-Kontrolle');
        expect(text).not.toContain('Kariesdetektor');
        expect(text).not.toContain('Anfärbung');
        expect(text).not.toContain('Fluorid');
        expect(text).not.toContain('Blutstillung');
        expect(text).not.toContain('Überkappung'); // Cp/P nicht diktiert
        expect(text).not.toContain('Matrize'); // Keine Matrize diktiert

        // Was diktiert wurde, muss erscheinen
        expect(text).toContain('Infiltration');
        expect(text).toContain('Kofferdam');
        expect(text).toContain('Komposit');
    });

    // ════════════════════════════════════════════════════════════════
    // TEST 3: Keine Widersprüche im Output
    // ════════════════════════════════════════════════════════════════
    it('should have NO contradictions', () => {
        const dictation = 'Füllung 16 DO, Leitungsanästhesie, Kofferdam, Komposit';
        const extracted = { tooth: '16', surfaces: ['d', 'o'], diagnosis: 'Caries media' };

        const { doc, activeChips } = runFullPipeline(dictation, extracted, 'GKV');

        console.log('\n=== KEINE WIDERSPRÜCHE TEST ===');
        console.log('Active Chips:', activeChips);
        console.log('Billing:', doc.uebersicht.codes);
        console.log('\nFließtext:\n', doc.fliesstext);

        const text = doc.fliesstext;
        const codes = doc.uebersicht.codes;

        // Widerspruch 1: LA in Billing aber "Ohne LA" im Text
        if (codes.includes('BEMA 41a') || codes.includes('BEMA 40')) {
            expect(text).not.toContain('Ohne Lokalanästhesie');
        }

        // Widerspruch 2: Kofferdam in Billing aber "Relative" im Text
        if (codes.includes('BEMA 12')) {
            expect(text).not.toContain('Relative Trockenlegung');
            expect(text).not.toContain('Watterollen');
        }

        // Widerspruch 3: Cp in Billing aber P im Text (oder umgekehrt)
        if (codes.includes('BEMA 25')) {
            expect(text).toContain('indirekt');
            expect(text).not.toContain('direkte Überkappung');
        }
    });

    // ════════════════════════════════════════════════════════════════
    // TEST 4: Abrechnung nur mit dokumentierter Leistung
    // ════════════════════════════════════════════════════════════════
    it('should bill ONLY documented services', () => {
        // Minimales Diktat
        const dictation = 'Füllung 36 O, Infiltration, Komposit';
        const extracted = { tooth: '36', surfaces: ['o'], diagnosis: 'Caries media' };

        const { doc, activeChips } = runFullPipeline(dictation, extracted, 'GKV');

        console.log('\n=== ABRECHNUNG NUR DOKUMENTIERT TEST ===');
        console.log('Active Chips:', activeChips);
        console.log('Billing:', doc.uebersicht.codes);

        const codes = doc.uebersicht.codes;

        // Muss enthalten:
        expect(codes).toContain('BEMA 13');  // Füllung 1-flächig
        expect(codes).toContain('BEMA 40');  // Infiltration

        // Darf NICHT enthalten (nicht diktiert):
        expect(codes).not.toContain('BEMA 12');  // Kofferdam
        expect(codes).not.toContain('BEMA 25');  // Cp
        expect(codes).not.toContain('BEMA 26');  // P
        expect(codes).not.toContain('BEMA 41a'); // Leitung
        expect(codes).not.toContain('BEMA IP4'); // Fluorid
    });

    // ════════════════════════════════════════════════════════════════
    // TEST 5: PKV mit vollständiger Dokumentation
    // ════════════════════════════════════════════════════════════════
    it('should produce complete PKV documentation', () => {
        const dictation = 'Füllung 15 MOD, Infiltrationsanästhesie, Kofferdam, Exkavation bis sondenhart, Kariesdetektor, Adhäsivtechnik, Komposit mehrschichtig, Fluoridierung, Politur';
        const extracted = { tooth: '15', surfaces: ['m', 'o', 'd'], diagnosis: 'Caries media', material: 'Venus Diamond' };

        const { doc, activeChips } = runFullPipeline(dictation, extracted, 'PKV');

        console.log('\n=== PKV VOLLSTÄNDIG TEST ===');
        console.log('Active Chips:', activeChips);
        console.log('Header:', doc.uebersicht.header);
        console.log('Leistungen:', doc.uebersicht.leistungen);
        console.log('Billing:', doc.uebersicht.codes);
        console.log('\nFließtext:\n', doc.fliesstext);

        const codes = doc.uebersicht.codes;

        // PKV typische Codes
        expect(codes).toContain('GOZ 2100');   // 3-flächig
        expect(codes).toContain('GOZ 0090');   // Infiltration
        expect(codes).toContain('GOZ 2040');   // Kofferdam
        expect(codes).toContain('GOZ 2020a');  // Kariesdetektor (analog)
        expect(codes).toContain('GOZ 1020');   // Fluorid

        // Header mit Diagnose
        expect(doc.uebersicht.header).toContain('15');
        expect(doc.uebersicht.header).toContain('M/O/D');
    });

    // ════════════════════════════════════════════════════════════════
    // TEST 6: Detaillierte Fließtext-Analyse
    // ════════════════════════════════════════════════════════════════
    it('should produce clinically coherent prose', () => {
        const dictation = 'Kompositfüllung Zahn 46 mesial okklusal distal, Leitungsanästhesie N. alv. inf., nach Wirkeintritt Kofferdam angelegt, Exkavation kariöser Hartsubstanz bis sondenhart, Kavität pulpanah, indirekte Überkappung mit Ca(OH)2, Teilmatrize mit Holzkeil, Adhäsivtechnik, Komposit Tetric in Schichttechnik, Aushärtung, Okklusion eingeschliffen, Politur';
        const extracted = {
            tooth: '46',
            surfaces: ['m', 'o', 'd'],
            diagnosis: 'Caries profunda',
            material: 'Tetric'
        };

        const { doc, activeChips } = runFullPipeline(dictation, extracted, 'GKV');

        console.log('\n=== DETAILLIERTE FLIESSTEXT ANALYSE ===');
        console.log('Active Chips:', activeChips);
        console.log('\n--- LEISTUNGEN ---');
        doc.uebersicht.leistungen.forEach((l, i) => console.log(`${i + 1}. ${l}`));
        console.log('\n--- BILLING ---');
        doc.uebersicht.codes.forEach((c, i) => console.log(`${i + 1}. ${c}`));
        console.log('\n--- FLIESSTEXT ---');
        console.log(doc.fliesstext);

        // Strukturanalyse
        const text = doc.fliesstext;

        // 1. Muss mit Aufklärung beginnen
        expect(text.startsWith('Pat. aufgeklärt')).toBe(true);

        // 2. Muss mit Entlassung enden
        expect(text).toMatch(/entlassen.*Sensibilität\.?$/);

        // 3. Keine doppelten Sätze
        const sentences = text.split('. ').filter(s => s.length > 5);
        const uniqueSentences = [...new Set(sentences)];
        console.log('\n--- Satzanalyse ---');
        console.log('Gesamtzahl Sätze:', sentences.length);
        console.log('Einzigartige Sätze:', uniqueSentences.length);

        expect(sentences.length).toBe(uniqueSentences.length); // Keine Duplikate

        // 4. Klinisch sinnvolle Begriffe
        expect(text).toContain('Leitungsanästhesie');
        expect(text).toContain('Kofferdam');
        expect(text).toContain('Exkavation');
        expect(text).toContain('Überkappung');
        expect(text).toContain('Ca(OH)');
        expect(text).toContain('Teilmatrize');
        expect(text).toContain('Komposit');
        expect(text).toContain('Politur');
    });

    // ════════════════════════════════════════════════════════════════
    // TEST 7: Leistungen Liste vs Fließtext Konsistenz
    // ════════════════════════════════════════════════════════════════
    it('should have consistent Leistungen list and prose', () => {
        const dictation = 'Füllung 36 MOD, Leitung, Kofferdam, Cp mit Calxyl, Komposit';
        const extracted = { tooth: '36', surfaces: ['m', 'o', 'd'], diagnosis: 'Caries profunda' };

        const { doc, activeChips } = runFullPipeline(dictation, extracted, 'GKV');

        console.log('\n=== KONSISTENZ TEST ===');
        console.log('Leistungen:', doc.uebersicht.leistungen);
        console.log('Codes:', doc.uebersicht.codes);
        console.log('Fließtext:', doc.fliesstext);

        // Wenn Leitung in Leistungen steht, muss es auch im Text und Billing sein
        if (doc.uebersicht.leistungen.some(l => l.includes('Leitung'))) {
            expect(doc.fliesstext).toContain('Leitungsanästhesie');
            expect(doc.uebersicht.codes).toContain('BEMA 41a');
        }

        // Wenn Kofferdam in Leistungen, muss es auch im Text und Billing sein
        if (doc.uebersicht.leistungen.some(l => l.includes('Kofferdam'))) {
            expect(doc.fliesstext).toContain('Kofferdam');
            expect(doc.uebersicht.codes).toContain('BEMA 12');
        }

        // Wenn Cp in Leistungen, muss es auch im Text und Billing sein
        if (doc.uebersicht.leistungen.some(l => l.includes('Cp') || l.includes('indirekt'))) {
            expect(doc.fliesstext).toMatch(/indirekte? Überkappung/);
            expect(doc.uebersicht.codes).toContain('BEMA 25');
        }
    });
});
