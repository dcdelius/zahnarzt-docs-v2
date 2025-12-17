/**
 * FINAL OUTPUT VERIFICATION
 * 
 * 5 realistische Diktat-Szenarien zur Validierung des gesamten Workflows:
 * - Engine-Output
 * - Zusatzinfos-Erfassung
 * - Billing-Codes
 * - Fließtext-Generierung
 */

import { describe, it, expect } from 'vitest';
import { FILLING_TREATMENT } from '../sonia/behandlungen/konservierend/fuellung/definition';
import {
    generateFinalDocumentation,
    getDefaultActiveChips
} from '../sonia/behandlungen/_shared/engine';
import { ExtractedDataWithExtras } from '../sonia/behandlungen/_shared/types';

// Helper für formatierte Ausgabe - KORREKTES 2-SEKTIONEN-FORMAT
function printReport(
    title: string,
    result: ReturnType<typeof generateFinalDocumentation>,
    extracted: ExtractedDataWithExtras
) {
    console.log('\n' + '═'.repeat(70));
    console.log(`  ${title}`);
    console.log('═'.repeat(70));

    // === SEKTION 1: ÜBERSICHT & ABRECHNUNG ===
    console.log('\n=== ÜBERSICHT & ABRECHNUNG ===\n');
    console.log(result.uebersicht.header);
    console.log(`Diagnose: ${extracted.diagnosis || '?'}`);
    console.log(`Material: ${extracted.material || '?'} (${extracted.shade || '?'})`);
    console.log(result.uebersicht.befund);

    console.log('\nDurchgeführte Leistungen:');
    result.uebersicht.leistungen.forEach(l => console.log(`• ${l}`));

    console.log(`\nCodes: ${result.uebersicht.codes.join(', ')}`);

    // === ZUSATZINFOS (wenn vorhanden) ===
    if (result.zusatzinfos.length > 0) {
        console.log('\n⚠️ Zusatzinfos:');
        result.zusatzinfos.forEach((z, i) => console.log(`   ${i + 1}. ${z}`));
    }

    // === SEKTION 2: BEHANDLUNGSABLAUF + AUFKLÄRUNG ===
    console.log('\n⸻\n');
    console.log('=== BEHANDLUNGSABLAUF + AUFKLÄRUNG ===\n');

    // Word-wrap at 70 chars for readability
    const wrapped = result.fliesstext.match(/.{1,70}(\s|$)/g) || [];
    wrapped.forEach(line => console.log(line.trim()));

    console.log('\n' + '─'.repeat(70));
}

describe('Final Output Verification - 5 Szenarien', () => {

    // ═══════════════════════════════════════════════════════════════════
    // TEST 1: Standard-Füllung (einfach)
    // ═══════════════════════════════════════════════════════════════════
    it('TEST 1: Standard-Füllung 16 DO (GKV)', () => {

        const extracted: ExtractedDataWithExtras = {
            tooth: '16',
            surfaces: ['d', 'o'],
            diagnosis: 'Caries media',
            material: 'Tetric EvoCeram',
            shade: 'A3'
        };

        const activeChips = [
            'vipr_pos', 'perk_neg', 'spont_neg',
            'la_infiltr', 'kofferdam', 'exkavation',
            'adhesive', 'schicht'
        ];

        const result = generateFinalDocumentation(
            FILLING_TREATMENT, 'GKV', activeChips, extracted
        );

        printReport('TEST 1: Standard-Füllung 16 DO (GKV)', result, extracted);

        // Assertions
        expect(result.uebersicht.header).toBe('Zahn: 16 (D/O)');
        expect(result.uebersicht.codes).toContain('BEMA 13b');
        expect(result.uebersicht.codes).toContain('BEMA 40');
        expect(result.uebersicht.codes).toContain('BEMA 12');
        expect(result.zusatzinfos.length).toBe(0);
        expect(result.fliesstext).toContain('aufgeklärt');
        expect(result.fliesstext).toContain('entlassen');
    });

    // ═══════════════════════════════════════════════════════════════════
    // TEST 2: Tiefe Karies mit Cp (GKV)
    // ═══════════════════════════════════════════════════════════════════
    it('TEST 2: Caries profunda mit Cp (GKV)', () => {

        const extracted: ExtractedDataWithExtras = {
            tooth: '36',
            surfaces: ['m', 'o', 'd'],
            diagnosis: 'Caries profunda, keine Pulpaeröffnung',
            material: 'Tetric EvoCeram',
            shade: 'A3'
        };

        const activeChips = [
            'vipr_pos', 'perk_neg', 'spont_neg',
            'la_leitung', 'kofferdam', 'exkavation',
            'cp',  // Indirekte Überkappung!
            'matrize', 'adhesive', 'schicht'
        ];

        const result = generateFinalDocumentation(
            FILLING_TREATMENT, 'GKV', activeChips, extracted
        );

        printReport('TEST 2: Caries profunda mit Cp (GKV)', result, extracted);

        // Assertions
        expect(result.uebersicht.header).toBe('Zahn: 36 (M/O/D)');
        expect(result.uebersicht.codes).toContain('BEMA 13c'); // 3 Flächen
        expect(result.uebersicht.codes).toContain('BEMA 41'); // Leitung
        expect(result.uebersicht.codes).toContain('BEMA 25'); // Cp
        expect(result.uebersicht.leistungen.some(l => l.includes('Cp'))).toBe(true);
        expect(result.fliesstext).toContain('Überkappung');
    });

    // ═══════════════════════════════════════════════════════════════════
    // TEST 3: PKV mit Zusatzleistungen
    // ═══════════════════════════════════════════════════════════════════
    it('TEST 3: PKV-Patient mit Zusatzleistungen', () => {

        const extracted: ExtractedDataWithExtras = {
            tooth: '24',
            surfaces: ['m', 'o'],
            diagnosis: 'Sekundärkaries',
            material: 'Venus Diamond',
            shade: 'A2'
        };

        const activeChips = [
            'vipr_pos', 'perk_neg', 'spont_neg',
            'la_infiltr', 'kofferdam', 'exkavation',
            'matrize', 'adhesive', 'schicht', 'fluor'
        ];

        const result = generateFinalDocumentation(
            FILLING_TREATMENT, 'PKV', activeChips, extracted
        );

        printReport('TEST 3: PKV-Patient mit Zusatzleistungen', result, extracted);

        // Assertions
        expect(result.uebersicht.codes).toContain('GOZ 2100'); // F2
        expect(result.uebersicht.codes).toContain('GOZ 0090'); // LA
        expect(result.uebersicht.codes).toContain('GOZ 2040'); // Kofferdam
        expect(result.uebersicht.codes).toContain('GOZ 2197'); // Adhäsiv
        expect(result.uebersicht.codes).toContain('GOZ 2060'); // Schicht
        expect(result.uebersicht.codes).toContain('GOZ 1020'); // Fluor
    });

    // ═══════════════════════════════════════════════════════════════════
    // TEST 4: Komplexer Fall mit Zusatzinfos (Risiko-Patient)
    // ═══════════════════════════════════════════════════════════════════
    it('TEST 4: Risiko-Patient mit Zusatzinfos (Marcumar, Diabetes)', () => {

        const extracted: ExtractedDataWithExtras = {
            tooth: '46',
            surfaces: ['d', 'o'],
            diagnosis: 'Caries profunda',
            material: 'Tetric EvoCeram',
            shade: 'A3',

            anamnese: [
                'Diabetes mellitus Typ 2, Metformin 1000mg',
                'Marcumar seit 3 Wochen (INR nicht kontrolliert)'
            ],

            komplikationen: [
                'Kofferdam nicht möglich (Brücke 45-47)',
                'Verstärkte Gingivablutung unter Antikoagulation'
            ],

            zusatzinfos: [
                'Beratung: Blutungsrisiko unter Marcumar erklärt'
            ],

            hinweise: [
                'Ibuprofen kontraindiziert (Marcumar)',
                'Kontrolle in 1 Woche'
            ]
        };

        const activeChips = [
            'vipr_pos', 'perk_neg', 'spont_neg',
            'la_infiltr',
            'rel_trocken',  // Kofferdam ging nicht!
            'exkavation', 'cp',
            'adhesive', 'schicht'
        ];

        const result = generateFinalDocumentation(
            FILLING_TREATMENT, 'GKV', activeChips, extracted
        );

        printReport('TEST 4: Risiko-Patient (Marcumar, Diabetes)', result, extracted);

        // Assertions - Zusatzinfos müssen erfasst sein!
        expect(result.zusatzinfos.length).toBeGreaterThanOrEqual(6);
        expect(result.zusatzinfos.some(z => z.includes('Diabetes'))).toBe(true);
        expect(result.zusatzinfos.some(z => z.includes('Marcumar'))).toBe(true);
        expect(result.zusatzinfos.some(z => z.includes('Ibuprofen'))).toBe(true);

        // Kein Kofferdam-Code!
        expect(result.uebersicht.codes).not.toContain('BEMA 12');

        // Fließtext muss Zusatzinfos enthalten
        expect(result.fliesstext).toContain('Diabetes');
        expect(result.fliesstext).toContain('Marcumar');
        expect(result.fliesstext).toContain('Komplikation');
        expect(result.fliesstext).toContain('Ibuprofen kontraindiziert');
    });

    // ═══════════════════════════════════════════════════════════════════
    // TEST 5: Minimalfall (nur Okklusal, ohne LA)
    // ═══════════════════════════════════════════════════════════════════
    it('TEST 5: Minimalfall - kleine O-Füllung ohne LA', () => {

        const extracted: ExtractedDataWithExtras = {
            tooth: '26',
            surfaces: ['o'],
            diagnosis: 'Caries superficialis',
            material: 'Tetric EvoCeram',
            shade: 'A2'
        };

        const activeChips = [
            'vipr_pos', 'perk_neg', 'spont_neg',
            'ohne_la',      // Keine Anästhesie
            'rel_trocken',  // Nur relativ
            'exkavation',
            'adhesive', 'schicht'
        ];

        const result = generateFinalDocumentation(
            FILLING_TREATMENT, 'GKV', activeChips, extracted
        );

        printReport('TEST 5: Minimalfall - O-Füllung ohne LA', result, extracted);

        // Assertions
        expect(result.uebersicht.header).toBe('Zahn: 26 (O)');
        expect(result.uebersicht.codes).toContain('BEMA 13'); // 1 Fläche

        // Keine LA-Codes!
        expect(result.uebersicht.codes).not.toContain('BEMA 40');
        expect(result.uebersicht.codes).not.toContain('BEMA 41');

        // Kein Kofferdam
        expect(result.uebersicht.codes).not.toContain('BEMA 12');

        // Fließtext erwähnt "ohne LA"
        expect(result.fliesstext).toContain('Ohne Lokalanästhesie');
    });

});
