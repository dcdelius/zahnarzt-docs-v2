/**
 * ZUSATZINFOS EXTRACTION TEST
 * 
 * Tests that medically relevant information from dictation
 * is captured even when it doesn't fit standard chips.
 * 
 * "Nichts darf verloren gehen!"
 */

import { describe, it, expect } from 'vitest';
import { FILLING_TREATMENT } from '../sonia/behandlungen/konservierend/fuellung/definition';
import { processTreatment, getDefaultActiveChips } from '../sonia/behandlungen/_shared/engine';
import { TreatmentContext } from '../sonia/behandlungen/_shared/types';

// Simuliert die LLM-Extraktion aus einem komplexen Diktat
interface ExtractedDataWithExtras {
    // Standard-Felder
    tooth?: string;
    surfaces?: string[];
    diagnosis?: string;
    material?: string;
    shade?: string;

    // NEU: Zusatzinfos die nicht in Chips passen
    zusatzinfos?: string[];
    komplikationen?: string[];
    hinweise?: string[];
    anamnese?: string[];
}

// Simuliert Final-Output mit allem
interface FinalDocumentation {
    uebersicht: {
        header: string;
        befund: string;
        leistungen: string[];
        codes: string[];
    };
    fliesstext: string;
    zusatzinfos: string[];
}

/**
 * Generiert finalen Output mit Zusatzinfos
 */
function generateFinalDocumentation(
    extractedData: ExtractedDataWithExtras,
    activeChips: string[]
): FinalDocumentation {

    const context: TreatmentContext = {
        treatment: FILLING_TREATMENT,
        insuranceType: 'GKV',
        activeChips,
        extractedData: {
            surfaces: extractedData.surfaces,
            diagnosis: extractedData.diagnosis,
            material: extractedData.material,
            shade: extractedData.shade
        },
        acceptedUpsells: []
    };

    const engineResult = processTreatment(context);

    // Build surfaces string
    const surfacesStr = (extractedData.surfaces || []).map(s => s.toUpperCase()).join('/');

    // Fließtext bauen: Consent + Snippets + Zusatzinfos + Dismissal
    let prose = FILLING_TREATMENT.consentText || '';

    // Anamnese zuerst (wenn vorhanden)
    if (extractedData.anamnese?.length) {
        prose += ' Anamnese: ' + extractedData.anamnese.join('; ') + '.';
    }

    // Standard-Snippets
    prose += ' ' + engineResult.procedureSnippets.filter(s => s).join(' ');

    // Komplikationen einfügen (wenn vorhanden)
    if (extractedData.komplikationen?.length) {
        prose += ' Komplikation: ' + extractedData.komplikationen.join('; ') + '.';
    }

    // Zusatzinfos anhängen
    if (extractedData.zusatzinfos?.length) {
        prose += ' Zusätzlich: ' + extractedData.zusatzinfos.join('; ') + '.';
    }

    // Hinweise am Ende
    if (extractedData.hinweise?.length) {
        prose += ' Hinweis: ' + extractedData.hinweise.join('; ') + '.';
    }

    prose += ' ' + (FILLING_TREATMENT.dismissalText || '');

    return {
        uebersicht: {
            header: `Zahn: ${extractedData.tooth} (${surfacesStr})`,
            befund: `Befund: ViPr ${engineResult.dataPatches.vitality || '?'} / Perk ${engineResult.dataPatches.percussion || '?'}`,
            leistungen: engineResult.textLines.filter(l => l.length > 0),
            codes: engineResult.billingCodes
        },
        fliesstext: prose.replace(/\s+/g, ' ').trim(),
        zusatzinfos: [
            ...(extractedData.anamnese || []),
            ...(extractedData.komplikationen || []),
            ...(extractedData.zusatzinfos || []),
            ...(extractedData.hinweise || [])
        ]
    };
}

describe('Zusatzinfos Extraction', () => {

    describe('Komplexes Diktat mit versteckten relevanten Infos', () => {

        /**
         * KREATIVES TEST-DIKTAT:
         * 
         * "Also, der Herr Schmidt, 67 Jahre, Diabetiker Typ 2, der kommt heute 
         * für die Füllung 46 distal-okklusal. Er nimmt Metformin und hat mir erzählt 
         * dass er letzte Woche beim Kardiologen war wegen Herzrhythmusstörungen, 
         * der hat wohl Marcumar angesetzt. INR hab ich nicht gecheckt, aber die 
         * Blutung war normal. Infiltration mit Ultracain, er hat ein bisschen 
         * gezittert, ist wohl Spritzen-Angstpatient. Kofferdam ging schlecht wegen 
         * der Brücke nebenan, hab relative Trockenlegung gemacht. Exkavation zeigt 
         * Karies bis fast zur Pulpa, aber keine Eröffnung, Cp mit Calxyl. Der Zahn 
         * war übrigens schon mal wurzelbehandelt vor 10 Jahren, steht nicht in der 
         * Akte. Tetric A3, Schichttechnik. Beim Polieren hat er gefragt ob das 
         * Zahnfleisch immer so blutet, ich hab ihm erklärt dass das am Marcumar 
         * liegt. Kontrolle nächste Woche, soll Ibuprofen meiden wegen Marcumar."
         */
        it('captures all medically relevant information', () => {

            // Simulierte LLM-Extraktion aus obigem Diktat
            const extractedData: ExtractedDataWithExtras = {
                tooth: '46',
                surfaces: ['d', 'o'],
                diagnosis: 'Caries profunda, Z.n. WKB',
                material: 'Tetric EvoCeram',
                shade: 'A3',

                anamnese: [
                    'Diabetiker Typ 2, Metformin',
                    'Kardiologische Abklärung letzte Woche: Herzrhythmusstörungen',
                    'Marcumar neu angesetzt, INR nicht kontrolliert',
                    'Spritzen-Angstpatient (Tremor bei LA)',
                    'Z.n. WKB 46 vor 10 Jahren (nicht in Akte)'
                ],

                komplikationen: [
                    'Kofferdam nicht möglich (Brücke 45-47), relative Trockenlegung',
                    'Gingivale Blutung bei Politur (Marcumar-bedingt)'
                ],

                zusatzinfos: [
                    'Beratung: Gingivablutung unter Antikoagulation erklärt'
                ],

                hinweise: [
                    'Kontrolle nächste Woche',
                    'Ibuprofen kontraindiziert (Marcumar)'
                ]
            };

            const activeChips = [
                'vipr_pos', 'perk_neg', 'spont_neg',    // Befund
                'la_infiltr',                            // LA
                'rel_trocken',                           // Kofferdam ging nicht!
                'exkavation', 'cp',                      // Exkav + Cp
                'adhesive', 'schicht'                    // Komposit
            ];

            const result = generateFinalDocumentation(extractedData, activeChips);

            console.log('\n' + '='.repeat(60));
            console.log('=== ÜBERSICHT & ABRECHNUNG ===');
            console.log('='.repeat(60) + '\n');
            console.log(result.uebersicht.header);
            console.log(`Diagnose: ${extractedData.diagnosis}`);
            console.log(`Material: ${extractedData.material} (${extractedData.shade})`);
            console.log(result.uebersicht.befund);
            console.log('\nDurchgeführte Leistungen:');
            result.uebersicht.leistungen.forEach(l => console.log(`• ${l}`));
            console.log(`\nCodes: ${result.uebersicht.codes.join(', ')}`);

            console.log('\n' + '='.repeat(60));
            console.log('=== BEHANDLUNGSABLAUF + AUFKLÄRUNG ===');
            console.log('='.repeat(60) + '\n');
            // Word-wrap at 70 chars
            const wrapped = result.fliesstext.match(/.{1,70}(\s|$)/g) || [];
            wrapped.forEach(line => console.log(line.trim()));

            console.log('\n' + '='.repeat(60));
            console.log('=== ERFASSTE ZUSATZINFOS ===');
            console.log('='.repeat(60) + '\n');
            result.zusatzinfos.forEach((info, i) => console.log(`${i + 1}. ${info}`));
            console.log('\n');

            // ========================================
            // ASSERTIONS - Medizinisch relevante Infos
            // ========================================

            // Anamnese muss im Fließtext sein
            expect(result.fliesstext).toContain('Diabetiker');
            expect(result.fliesstext).toContain('Marcumar');
            expect(result.fliesstext).toContain('Herzrhythmus');

            // Komplikationen müssen dokumentiert sein
            expect(result.fliesstext).toContain('Kofferdam nicht möglich');
            expect(result.fliesstext).toContain('Marcumar-bedingt');

            // Hinweise müssen dokumentiert sein
            expect(result.fliesstext).toContain('Ibuprofen kontraindiziert');
            expect(result.fliesstext).toContain('Kontrolle');

            // Alte WKB muss erwähnt sein (obwohl nicht in Akte!)
            expect(result.zusatzinfos.some(z => z.includes('WKB'))).toBe(true);

            // Kein Kofferdam-Code weil relativ!
            expect(result.uebersicht.codes).not.toContain('BEMA 12');

            // Cp-Code muss drin sein
            expect(result.uebersicht.codes).toContain('BEMA 25');

            // Anzahl Zusatzinfos
            expect(result.zusatzinfos.length).toBeGreaterThanOrEqual(8);
        });

        it('handles simple case without extras', () => {

            const extractedData: ExtractedDataWithExtras = {
                tooth: '16',
                surfaces: ['o'],
                diagnosis: 'Caries media',
                material: 'Tetric EvoCeram',
                shade: 'A2'
                // Keine Zusatzinfos - Standard-Fall
            };

            const activeChips = getDefaultActiveChips(FILLING_TREATMENT);

            const result = generateFinalDocumentation(extractedData, activeChips);

            console.log('\n=== EINFACHER FALL ===');
            console.log(`Codes: ${result.uebersicht.codes.join(', ')}`);
            console.log(`Zusatzinfos: ${result.zusatzinfos.length}`);

            // Standard-Fall braucht keine Zusatzinfos
            expect(result.zusatzinfos.length).toBe(0);

            // Aber vollständiger Output
            expect(result.fliesstext).toContain('aufgeklärt');
            expect(result.fliesstext).toContain('entlassen');
            expect(result.uebersicht.codes.length).toBeGreaterThan(0);
        });
    });

});
