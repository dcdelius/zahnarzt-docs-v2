/**
 * END-TO-END WORKFLOW TEST
 * 
 * Testet den kompletten Workflow:
 * Diktat → Extraktion → Suggestions → Chip-Aktivierung → Final Output
 * 
 * 5 realistische Szenarien unter echten Bedingungen
 */

import { describe, it, expect } from 'vitest';
import { FILLING_TREATMENT } from '../sonia/behandlungen/konservierend/fuellung/definition';
import {
    processTreatment,
    generateFinalDocumentation,
    getDefaultActiveChips,
    getActiveUpsells,
    shouldShowUpsell
} from '../sonia/behandlungen/_shared/engine';
import {
    ExtractedDataWithExtras,
    TreatmentContext
} from '../sonia/behandlungen/_shared/types';

// ============================================================================
// SIMULIERTE EXTRAKTION (wie LLM sie machen würde)
// ============================================================================

interface SimulatedExtraction {
    extracted: ExtractedDataWithExtras;
    detectedChips: string[];  // Chips die aus Diktat erkannt wurden
}

/**
 * Simuliert die LLM-Extraktion aus einem Diktat
 */
function simulateExtraction(dictation: string): SimulatedExtraction {
    const extracted: ExtractedDataWithExtras = {};
    const detectedChips: string[] = [];

    // Zahn erkennen
    const toothMatch = dictation.match(/(\d{2})\s*(mesial|distal|okklusal|DO|MO|MOD)?/i);
    if (toothMatch) {
        extracted.tooth = toothMatch[1];
    }

    // Flächen
    const surfaces: string[] = [];
    if (/mesial|MO|MOD/i.test(dictation)) surfaces.push('m');
    if (/okklusal|DO|MO|MOD|O\b/i.test(dictation)) surfaces.push('o');
    if (/distal|DO|MOD/i.test(dictation)) surfaces.push('d');
    extracted.surfaces = surfaces;

    // Diagnose
    if (/tiefe?\s*karies|caries\s*profunda|pulpanah/i.test(dictation)) {
        extracted.diagnosis = 'Caries profunda';
    } else if (/karies|caries/i.test(dictation)) {
        extracted.diagnosis = 'Caries media';
    }

    // Material
    if (/tetric/i.test(dictation)) extracted.material = 'Tetric EvoCeram';
    if (/A2|A3/i.test(dictation)) extracted.shade = dictation.match(/A[23]/i)?.[0]?.toUpperCase();

    // Chips erkennen
    if (/infiltration/i.test(dictation)) detectedChips.push('la_infiltr');
    if (/leitung/i.test(dictation)) detectedChips.push('la_leitung');
    if (/ohne\s*LA|ohne\s*Anästhesie/i.test(dictation)) detectedChips.push('ohne_la');
    if (/kofferdam/i.test(dictation)) detectedChips.push('kofferdam');
    if (/relativ|watteroll/i.test(dictation)) detectedChips.push('rel_trocken');
    if (/exkavation|sondenhart/i.test(dictation)) detectedChips.push('exkavation');
    if (/Cp|Überkappung|Calxyl|Kalziumhydroxid/i.test(dictation)) detectedChips.push('cp');
    if (/matrize|teilmatrize/i.test(dictation)) detectedChips.push('matrize');
    if (/adhäsiv|bonding|ätz/i.test(dictation)) detectedChips.push('adhesive');
    if (/schicht/i.test(dictation)) detectedChips.push('schicht');
    if (/fluor/i.test(dictation)) detectedChips.push('fluor');

    // Befund-Chips (immer setzen wenn erwähnt oder default)
    if (/vital|vipr\+|vitalität\s*pos/i.test(dictation)) detectedChips.push('vipr_pos');
    if (/devital|vipr-|avital/i.test(dictation)) detectedChips.push('vipr_neg');
    if (/perk.*negativ|perk-/i.test(dictation) || !(/perk.*positiv/i.test(dictation))) {
        detectedChips.push('perk_neg');
    }
    detectedChips.push('spont_neg'); // Default

    // Zusatzinfos erkennen
    if (/diabetes|metformin|hba1c/i.test(dictation)) {
        extracted.anamnese = extracted.anamnese || [];
        extracted.anamnese.push(dictation.match(/diabetes[^,.]*/i)?.[0] || 'Diabetes mellitus');
    }
    if (/marcumar|antikoagul|blutverd/i.test(dictation)) {
        extracted.anamnese = extracted.anamnese || [];
        extracted.anamnese.push('Marcumar/Antikoagulation');
    }
    if (/blutung|komplikation/i.test(dictation)) {
        extracted.komplikationen = extracted.komplikationen || [];
        extracted.komplikationen.push('Blutung aufgetreten');
    }
    if (/kontrolle|nachsorge/i.test(dictation)) {
        extracted.hinweise = extracted.hinweise || [];
        extracted.hinweise.push('Kontrolle vereinbart');
    }

    return { extracted, detectedChips };
}

// ============================================================================
// HELPER: Formatierter Output
// ============================================================================

function printE2EResult(
    testName: string,
    dictation: string,
    extraction: SimulatedExtraction,
    activeChips: string[],
    upsells: any[],
    result: ReturnType<typeof generateFinalDocumentation>
) {
    console.log('\n' + '═'.repeat(80));
    console.log(`  ${testName}`);
    console.log('═'.repeat(80));

    console.log('\n📢 DIKTAT:');
    console.log(`   "${dictation}"`);

    console.log('\n🔍 EXTRAKTION:');
    console.log(`   Zahn: ${extraction.extracted.tooth}`);
    console.log(`   Flächen: ${extraction.extracted.surfaces?.join(', ')}`);
    console.log(`   Diagnose: ${extraction.extracted.diagnosis}`);
    console.log(`   Erkannte Chips: ${extraction.detectedChips.join(', ')}`);

    console.log('\n💡 UPSELLS (Vorschläge):');
    if (upsells.length === 0) {
        console.log('   (keine - alles vollständig)');
    } else {
        upsells.forEach(u => console.log(`   • ${u.label}: ${u.reasoning}`));
    }

    console.log('\n✅ AKTIVE CHIPS:');
    console.log(`   ${activeChips.join(', ')}`);

    console.log('\n' + '─'.repeat(80));
    console.log('=== ÜBERSICHT & ABRECHNUNG ===\n');
    console.log(result.uebersicht.header);
    console.log(`Diagnose: ${extraction.extracted.diagnosis}`);
    console.log(result.uebersicht.befund);
    console.log('\nDurchgeführte Leistungen:');
    result.uebersicht.leistungen.forEach(l => console.log(`• ${l}`));
    console.log(`\nCodes: ${result.uebersicht.codes.join(', ')}`);

    if (result.zusatzinfos.length > 0) {
        console.log('\n⚠️ Zusatzinfos:');
        result.zusatzinfos.forEach((z, i) => console.log(`   ${i + 1}. ${z}`));
    }

    console.log('\n⸻\n');
    console.log('=== BEHANDLUNGSABLAUF + AUFKLÄRUNG ===\n');
    const wrapped = result.fliesstext.match(/.{1,75}(\s|$)/g) || [];
    wrapped.forEach(line => console.log(line.trim()));
    console.log('\n' + '─'.repeat(80));
}

// ============================================================================
// E2E TESTS
// ============================================================================

describe('End-to-End Workflow', () => {

    // ========================================================================
    // TEST 1: Standard-Füllung
    // ========================================================================
    it('TEST 1: Standard-Füllung komplett', () => {
        const dictation = "Füllung 16 DO, Infiltration, Kofferdam, Exkavation sondenhart, Teilmatrize, Ätzung, Schichttechnik, Tetric A3, Politur";

        // 1. Extraktion
        const extraction = simulateExtraction(dictation);

        // 2. Aktive Chips = erkannte + befund defaults
        const activeChips = [
            ...extraction.detectedChips,
            'vipr_pos', 'perk_neg', 'spont_neg'
        ].filter((v, i, a) => a.indexOf(v) === i); // dedupe

        // 3. Upsells prüfen
        const upsells = getActiveUpsells(FILLING_TREATMENT, extraction.extracted);

        // 4. Final Output
        const result = generateFinalDocumentation(
            FILLING_TREATMENT, 'GKV', activeChips, extraction.extracted
        );

        printE2EResult('TEST 1: Standard-Füllung', dictation, extraction, activeChips, upsells, result);

        // Assertions
        expect(extraction.extracted.tooth).toBe('16');
        expect(extraction.extracted.surfaces).toContain('d');
        expect(extraction.extracted.surfaces).toContain('o');
        expect(result.uebersicht.codes).toContain('BEMA 13b');
        expect(result.uebersicht.codes).toContain('BEMA 40');
        expect(result.uebersicht.codes).toContain('BEMA 12');
        expect(result.fliesstext).toContain('Kofferdam');
    });

    // ========================================================================
    // TEST 2: Tiefe Karies mit Cp-Suggestion
    // ========================================================================
    it('TEST 2: Tiefe Karies - Cp wird vorgeschlagen', () => {
        const dictation = "Füllung 36 MOD, tiefe Karies fast bis Pulpa, Leitungsanästhesie, Kofferdam, Exkavation sondenhart, Cp mit Calxyl, Teilmatrize, Ätzung Schichttechnik";

        // 1. Extraktion
        const extraction = simulateExtraction(dictation);

        // 2. Aktive Chips
        const activeChips = [
            ...extraction.detectedChips,
            'vipr_pos', 'perk_neg', 'spont_neg'
        ].filter((v, i, a) => a.indexOf(v) === i);

        // 3. Upsells - Cp sollte NICHT vorgeschlagen werden (bereits aktiv)
        const upsells = getActiveUpsells(FILLING_TREATMENT, extraction.extracted);

        // 4. Final Output
        const result = generateFinalDocumentation(
            FILLING_TREATMENT, 'GKV', activeChips, extraction.extracted
        );

        printE2EResult('TEST 2: Tiefe Karies mit Cp', dictation, extraction, activeChips, upsells, result);

        // Assertions
        expect(extraction.extracted.diagnosis).toBe('Caries profunda');
        expect(activeChips).toContain('cp');
        expect(result.uebersicht.codes).toContain('BEMA 13c'); // 3 Flächen
        expect(result.uebersicht.codes).toContain('BEMA 41'); // Leitung
        expect(result.uebersicht.codes).toContain('BEMA 25'); // Cp
        expect(result.fliesstext).toContain('Überkappung');
    });

    // ========================================================================
    // TEST 3: PKV mit Fluoridierung
    // ========================================================================
    it('TEST 3: PKV-Patient komplett', () => {
        const dictation = "Füllung 24 MO, Infiltration, Kofferdam, Exkavation, Teilmatrize, Ätzung, Schichttechnik, Fluoridierung, Tetric A2";

        // 1. Extraktion
        const extraction = simulateExtraction(dictation);

        // 2. Aktive Chips
        const activeChips = [
            ...extraction.detectedChips,
            'vipr_pos', 'perk_neg', 'spont_neg'
        ].filter((v, i, a) => a.indexOf(v) === i);

        // 3. Final Output - PKV!
        const result = generateFinalDocumentation(
            FILLING_TREATMENT, 'PKV', activeChips, extraction.extracted
        );

        const upsells = getActiveUpsells(FILLING_TREATMENT, extraction.extracted);
        printE2EResult('TEST 3: PKV-Patient', dictation, extraction, activeChips, upsells, result);

        // Assertions - PKV Codes (nach Billing-Fix)
        // GOZ 2080 = 2 Flächen, GOZ 2197 ist in F-Codes INKLUDIERT (nicht separat!)
        expect(result.uebersicht.codes).toContain('GOZ 2080'); // F2 (2 Flächen = 2080, nicht 2100!)
        expect(result.uebersicht.codes).toContain('GOZ 0090'); // LA
        expect(result.uebersicht.codes).toContain('GOZ 2040'); // Kofferdam
        // GOZ 2197 wird NICHT mehr separat abgerechnet - ist in 2060-2120 inkludiert!
        expect(result.uebersicht.codes).toContain('GOZ 1020'); // Fluor
    });

    // ========================================================================
    // TEST 4: Risiko-Patient mit Zusatzinfos
    // ========================================================================
    it('TEST 4: Risiko-Patient - Zusatzinfos erfasst', () => {
        const dictation = "Füllung 46 DO, Patient Diabetiker Metformin, nimmt Marcumar, Infiltration, Kofferdam ging nicht wegen Brücke also relativ, Exkavation, tiefe Karies, Cp Calxyl, Ätzung Schichttechnik, Blutung bei Politur, Kontrolle nächste Woche";

        // 1. Extraktion
        const extraction = simulateExtraction(dictation);

        // 2. Aktive Chips - ABER rel_trocken statt kofferdam!
        let activeChips = [...extraction.detectedChips, 'vipr_pos', 'perk_neg', 'spont_neg'];
        // Entferne kofferdam wenn relativ erwähnt
        if (activeChips.includes('rel_trocken')) {
            activeChips = activeChips.filter(c => c !== 'kofferdam');
        }
        activeChips = activeChips.filter((v, i, a) => a.indexOf(v) === i);

        // 3. Final Output
        const result = generateFinalDocumentation(
            FILLING_TREATMENT, 'GKV', activeChips, extraction.extracted
        );

        const upsells = getActiveUpsells(FILLING_TREATMENT, extraction.extracted);
        printE2EResult('TEST 4: Risiko-Patient', dictation, extraction, activeChips, upsells, result);

        // Assertions
        expect(extraction.extracted.anamnese?.length).toBeGreaterThanOrEqual(1);
        expect(extraction.extracted.komplikationen?.length).toBeGreaterThanOrEqual(1);
        expect(extraction.extracted.hinweise?.length).toBeGreaterThanOrEqual(1);

        // Kein Kofferdam-Code!
        expect(result.uebersicht.codes).not.toContain('BEMA 12');

        // Fließtext enthält Zusatzinfos
        expect(result.fliesstext).toContain('Anamnese');
        expect(result.fliesstext).toContain('Komplikation');
        expect(result.fliesstext).toContain('Hinweis');
    });

    // ========================================================================
    // TEST 5: Chip-Toggle (Kofferdam → relativ)
    // ========================================================================
    it('TEST 5: Chip-Toggle - Kofferdam deaktivieren', () => {
        const dictation = "Füllung 26 O, kleine Karies, Infiltration, Kofferdam, Exkavation, Ätzung, Bulk-Fill";

        // 1. Extraktion
        const extraction = simulateExtraction(dictation);

        // 2. Initiale Chips
        let activeChips = [...extraction.detectedChips, 'vipr_pos', 'perk_neg', 'spont_neg'];
        activeChips = activeChips.filter((v, i, a) => a.indexOf(v) === i);

        // Initial mit Kofferdam
        const resultWithKofferdam = generateFinalDocumentation(
            FILLING_TREATMENT, 'GKV', activeChips, extraction.extracted
        );

        console.log('\n📢 VORHER (mit Kofferdam):');
        console.log('   Codes:', resultWithKofferdam.uebersicht.codes.join(', '));

        // 3. USER TOGGLED: Kofferdam → relativ
        activeChips = activeChips.filter(c => c !== 'kofferdam');
        activeChips.push('rel_trocken');

        // 4. Neu generieren
        const resultWithRelativ = generateFinalDocumentation(
            FILLING_TREATMENT, 'GKV', activeChips, extraction.extracted
        );

        console.log('\n📢 NACHHER (relativ):');
        console.log('   Codes:', resultWithRelativ.uebersicht.codes.join(', '));

        const upsells = getActiveUpsells(FILLING_TREATMENT, extraction.extracted);
        printE2EResult('TEST 5: Chip-Toggle', dictation, extraction, activeChips, upsells, resultWithRelativ);

        // Assertions - Toggle funktioniert
        expect(resultWithKofferdam.uebersicht.codes).toContain('BEMA 12');
        expect(resultWithRelativ.uebersicht.codes).not.toContain('BEMA 12');

        // Text ändert sich auch
        expect(resultWithKofferdam.fliesstext).toContain('Kofferdam');
        expect(resultWithRelativ.fliesstext).toContain('Relative');
    });

});
