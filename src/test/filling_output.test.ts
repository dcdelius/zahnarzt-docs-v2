/**
 * FILLING OUTPUT TEST
 * 
 * Vergleicht den generierten Output mit dem Ziel-Format:
 * 
 * === ÜBERSICHT & ABRECHNUNG ===
 * 
 * Zahn: 16 (D/O)
 * Diagnose: Caries profunda, keine Pulpaeröffnung
 * Material: Tetric EvoCeram (A3)
 * Befund: ViPr + / Perk − / Spontanschmerz −
 * 
 * Durchgeführte Leistungen (abrechnungsrelevant):
 * • Lokalanästhesie (Infiltration; Ultracain D-S)
 * • Trockenlegung: Kofferdam
 * • Exkavation bis sondenhart, CP nicht erforderlich
 * • Teilmatrize + Keil
 * • Ätz-/Adhäsivtechnik
 * • Komposit schichtweise appliziert, lichthärtend
 * • Okklusionskontrolle/Einschleifen
 * • Politur, Fluoridierung
 * 
 * Codes: BEMA 13b, 40, 12
 */

import { describe, it, expect } from 'vitest';
import { FILLING_TREATMENT } from '../sonia/behandlungen/konservierend/fuellung/definition';
import { processTreatment, getDefaultActiveChips } from '../sonia/behandlungen/_shared/engine';
import { TreatmentContext, InsuranceType } from '../sonia/behandlungen/_shared/types';

// Helper: Generate full output like the UI would
function generateFillingOutput(options: {
    tooth: string;
    surfaces: string[];
    diagnosis: string;
    material: string;
    shade: string;
    insuranceType: InsuranceType;
    activeChips: string[];
}) {
    const context: TreatmentContext = {
        treatment: FILLING_TREATMENT,
        insuranceType: options.insuranceType,
        activeChips: options.activeChips,
        extractedData: {
            tooth: options.tooth,
            surfaces: options.surfaces,
            diagnosis: options.diagnosis,
            material: options.material,
            shade: options.shade
        },
        acceptedUpsells: []
    };

    const result = processTreatment(context);

    // Build Befund line from dataPatches
    const befundParts: string[] = [];
    if (result.dataPatches.vitality) {
        befundParts.push(`ViPr ${result.dataPatches.vitality}`);
    }
    if (result.dataPatches.percussion) {
        befundParts.push(`Perk ${result.dataPatches.percussion}`);
    }
    if (result.dataPatches.spontaneous_pain) {
        befundParts.push(`Spontanschmerz ${result.dataPatches.spontaneous_pain}`);
    }
    const befundLine = befundParts.join(' / ');

    // Build surfaces string
    const surfacesStr = options.surfaces.map(s => s.toUpperCase()).join('/');

    // Build prose text (Fließtext)
    const treatment = FILLING_TREATMENT;
    const proseText = [
        treatment.consentText,
        ...result.procedureSnippets.filter(s => s && s.length > 0),
        treatment.dismissalText
    ].filter(Boolean).join(' ');

    // Build output
    const output = {
        header: `Zahn: ${options.tooth} (${surfacesStr})`,
        diagnosis: `Diagnose: ${options.diagnosis}`,
        material: `Material: ${options.material} (${options.shade})`,
        befund: `Befund: ${befundLine}`,
        leistungen: result.textLines.filter(l => l.length > 0),
        codes: result.billingCodes,
        proseText: proseText
    };

    return { output, result };
}

describe('Filling Output Format', () => {

    describe('GKV - Standard Case (C. profunda, CP nicht erforderlich)', () => {

        it('generates correct output structure', () => {
            const { output, result } = generateFillingOutput({
                tooth: '16',
                surfaces: ['d', 'o'],
                diagnosis: 'Caries profunda, keine Pulpaeröffnung',
                material: 'Tetric EvoCeram',
                shade: 'A3',
                insuranceType: 'GKV',
                activeChips: [
                    'vipr_pos', 'perk_neg', 'spont_neg',  // Befund
                    'la_infiltr', 'kofferdam',             // Anästhesie + Isolation
                    'exkavation',                          // Exkavation
                    'cp_not_required',                     // CP nicht erforderlich
                    'matrize',                             // Matrize
                    'adhesive', 'schicht',                 // Komposit
                    'fluor'                                // Fluoridierung
                ]
            });

            console.log('\n========================================');
            console.log('=== ÜBERSICHT & ABRECHNUNG ===');
            console.log('========================================\n');
            console.log(output.header);
            console.log(output.diagnosis);
            console.log(output.material);
            console.log(output.befund);
            console.log('\nDurchgeführte Leistungen (abrechnungsrelevant):');
            output.leistungen.forEach(l => console.log(`• ${l}`));
            console.log(`\nCodes: ${output.codes.join(', ')}`);

            console.log('\n========================================');
            console.log('=== BEHANDLUNGSABLAUF + AUFKLÄRUNG ===');
            console.log('========================================\n');
            console.log(output.proseText);
            console.log('\n========================================\n');

            // Verify header
            expect(output.header).toBe('Zahn: 16 (D/O)');

            // Verify befund - use ASCII minus
            expect(output.befund).toContain('ViPr +');
            expect(output.befund).toContain('Perk -');
            expect(output.befund).toContain('Spontanschmerz -');

            // Verify leistungen
            expect(output.leistungen).toContain('Lokalanästhesie (Infiltration; Ultracain D-S)');
            expect(output.leistungen).toContain('Trockenlegung: Kofferdam');
            expect(output.leistungen).toContain('Exkavation bis sondenhart');
            expect(output.leistungen).toContain('Teilmatrize + Keil');
            expect(output.leistungen).toContain('Ätz-/Adhäsivtechnik');
            expect(output.leistungen).toContain('Komposit schichtweise appliziert, lichthärtend');
            expect(output.leistungen).toContain('Okklusionskontrolle/Einschleifen');
            expect(output.leistungen).toContain('Politur');
            expect(output.leistungen).toContain('Fluoridierung');

            // Verify codes
            expect(output.codes).toContain('BEMA 13b'); // 2 Flächen
            expect(output.codes).toContain('BEMA 40');  // LA
            expect(output.codes).toContain('BEMA 12');  // Kofferdam
            expect(output.codes).toContain('BEMA IP4'); // Fluoridierung

            // Verify prose text
            expect(output.proseText).toContain('Pat. aufgeklärt');
            expect(output.proseText).toContain('Einwilligung erteilt');
            expect(output.proseText).toContain('LA Infiltration');
            expect(output.proseText).toContain('Kofferdam angelegt');
            expect(output.proseText).toContain('Exkavation');
            expect(output.proseText).toContain('beschwerdearm entlassen');
        });

        it('generates correct BEMA codes for 3 surfaces (MOD)', () => {
            const { output } = generateFillingOutput({
                tooth: '36',
                surfaces: ['m', 'o', 'd'],
                diagnosis: 'Caries media',
                material: 'Tetric EvoCeram',
                shade: 'A3',
                insuranceType: 'GKV',
                activeChips: ['la_infiltr', 'kofferdam', 'adhesive', 'schicht']
            });

            expect(output.codes).toContain('BEMA 13c'); // 3 Flächen
        });
    });

    describe('GKV - Mit Cp (tiefe Karies)', () => {

        it('includes Cp when activated', () => {
            const { output, result } = generateFillingOutput({
                tooth: '36',
                surfaces: ['m', 'o', 'd'],
                diagnosis: 'Caries profunda',
                material: 'Tetric EvoCeram',
                shade: 'A3',
                insuranceType: 'GKV',
                activeChips: [
                    'vipr_pos', 'perk_neg', 'spont_neg',
                    'la_infiltr', 'kofferdam',
                    'cp',  // Cp aktiviert
                    'matrize',
                    'adhesive', 'schicht'
                ]
            });

            console.log('\n=== MIT Cp ===');
            console.log('Leistungen:', output.leistungen);
            console.log('Codes:', output.codes);

            expect(output.leistungen.some(l => l.includes('Cp'))).toBe(true);
            expect(output.codes).toContain('BEMA 25'); // Cp = BEMA Ziffer 25
        });
    });

    describe('PKV - Zusätzliche Codes', () => {

        it('includes GOZ codes for PKV', () => {
            const { output } = generateFillingOutput({
                tooth: '16',
                surfaces: ['m', 'o', 'd'],
                diagnosis: 'Caries media',
                material: 'Tetric EvoCeram',
                shade: 'A3',
                insuranceType: 'PKV',
                activeChips: [
                    'la_infiltr', 'kofferdam',
                    'adhesive', 'schicht',
                    'fluor'
                ]
            });

            console.log('\n=== PKV ===');
            console.log('Codes:', output.codes);

            expect(output.codes).toContain('GOZ 2120');  // F3
            expect(output.codes).toContain('GOZ 0090');  // LA
            expect(output.codes).toContain('GOZ 2040');  // Kofferdam
            expect(output.codes).toContain('GOZ 2197');  // Adhäsiv
            expect(output.codes).toContain('GOZ 2060');  // Schichttechnik
            expect(output.codes).toContain('GOZ 1020');  // Fluoridierung
        });
    });

    describe('Default Chips', () => {

        it('has correct default chips', () => {
            const defaults = getDefaultActiveChips(FILLING_TREATMENT);

            console.log('\n=== DEFAULT CHIPS ===');
            console.log(defaults);

            // Befund defaults
            expect(defaults).toContain('vipr_pos');
            expect(defaults).toContain('perk_neg');
            expect(defaults).toContain('spont_neg');

            // Standard treatment defaults
            expect(defaults).toContain('la_infiltr');
            expect(defaults).toContain('kofferdam');
            expect(defaults).toContain('cp_not_required');
            expect(defaults).toContain('adhesive');
            expect(defaults).toContain('schicht');
        });
    });

});
