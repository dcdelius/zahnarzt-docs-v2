/**
 * OUTPUT DUMP TEST
 * 
 * Druckt den vollständigen Output für manuelle klinische Prüfung
 */

import { FILLING_TREATMENT } from '../src/docudent/core/behandlungen/konservierend/fuellung/definition';
import {
    inferChipsFromDictation,
    resolveChipStates,
    getActiveChipIds,
    generateFinalDocumentation
} from '../src/docudent/core/behandlungen/_shared/engine';
import type { InsuranceType, TextLength } from '../src/docudent/core/behandlungen/_shared/types';


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

console.log('\n' + '='.repeat(80));
console.log(' DOKUMASTER OUTPUT DUMP - ZAHNMEDIZINISCHE PRÜFUNG ');
console.log('='.repeat(80) + '\n');

// ════════════════════════════════════════════════════════════════════════════
// FALL 1: Komplexe GKV Füllung mit allen Standardleistungen
// ════════════════════════════════════════════════════════════════════════════

const case1 = {
    name: 'Komplexe GKV MOD mit Cp',
    dictation: 'Kompositfüllung Zahn 46 mesial okklusal distal, Leitungsanästhesie N. alveolaris inferior, Kofferdam angelegt, Exkavation kariöser Hartsubstanz bis sondenhart, Kavität pulpanah, indirekte Überkappung mit Calxyl, Teilmatrize mit Holzkeil, Adhäsivtechnik Schmelz-Dentin-Bonding, Komposit Tetric in Schichttechnik, Aushärtung, Okklusion eingeschliffen, Politur abschließend',
    extracted: { tooth: '46', surfaces: ['m', 'o', 'd'], diagnosis: 'Caries profunda', material: 'Tetric' },
    insuranceType: 'GKV' as InsuranceType
};

const result1 = runFullPipeline(case1.dictation, case1.extracted, case1.insuranceType);

console.log('┌' + '─'.repeat(78) + '┐');
console.log('│ FALL 1: ' + case1.name.padEnd(69) + '│');
console.log('├' + '─'.repeat(78) + '┤');
console.log('│ DIKTAT:');
console.log('│ ' + case1.dictation.slice(0, 76));
console.log('│ ' + case1.dictation.slice(76, 152));
if (case1.dictation.length > 152) console.log('│ ' + case1.dictation.slice(152));
console.log('├' + '─'.repeat(78) + '┤');
console.log('│');
console.log('│ ➡️ ERKANNTE CHIPS:');
result1.inferredChips.forEach(c => console.log('│    • ' + c));
console.log('│');
console.log('│ ➡️ AKTIVE CHIPS (nach Resolution):');
result1.activeChips.forEach(c => console.log('│    • ' + c));
console.log('│');
console.log('├' + '─'.repeat(78) + '┤');
console.log('│ === ÜBERSICHT ===');
console.log('│ Header: ' + result1.doc.uebersicht.header);
console.log('│');
console.log('│ Leistungen:');
result1.doc.uebersicht.leistungen.forEach((l, i) => console.log('│   ' + (i + 1) + '. ' + l));
console.log('│');
console.log('│ === ABRECHNUNG (' + case1.insuranceType + ') ===');
result1.doc.uebersicht.codes.forEach(c => console.log('│   • ' + c));
console.log('│');
console.log('├' + '─'.repeat(78) + '┤');
console.log('│ === BEHANDLUNGSABLAUF ===');
console.log('│');
// Word wrap the text
const words = result1.doc.fliesstext.split(' ');
let line = '│ ';
words.forEach(word => {
    if ((line + word).length > 78) {
        console.log(line);
        line = '│ ' + word + ' ';
    } else {
        line += word + ' ';
    }
});
if (line.trim().length > 2) console.log(line);
console.log('│');
console.log('└' + '─'.repeat(78) + '┘');

// ════════════════════════════════════════════════════════════════════════════
// FALL 2: Minimal-Diktat (nur das Nötigste)
// ════════════════════════════════════════════════════════════════════════════

const case2 = {
    name: 'Minimales Diktat - nur Basics',
    dictation: 'Füllung 16 O, Infiltration, Komposit',
    extracted: { tooth: '16', surfaces: ['o'], diagnosis: 'Caries media' },
    insuranceType: 'GKV' as InsuranceType
};

const result2 = runFullPipeline(case2.dictation, case2.extracted, case2.insuranceType);

console.log('\n');
console.log('┌' + '─'.repeat(78) + '┐');
console.log('│ FALL 2: ' + case2.name.padEnd(69) + '│');
console.log('├' + '─'.repeat(78) + '┤');
console.log('│ DIKTAT: ' + case2.dictation);
console.log('├' + '─'.repeat(78) + '┤');
console.log('│');
console.log('│ ➡️ ERKANNTE CHIPS: ' + result2.inferredChips.join(', '));
console.log('│ ➡️ AKTIVE CHIPS: ' + result2.activeChips.join(', '));
console.log('│');
console.log('│ === ABRECHNUNG (' + case2.insuranceType + ') ===');
result2.doc.uebersicht.codes.forEach(c => console.log('│   • ' + c));
console.log('│');
console.log('│ === BEHANDLUNGSABLAUF ===');
const words2 = result2.doc.fliesstext.split(' ');
let line2 = '│ ';
words2.forEach(word => {
    if ((line2 + word).length > 78) {
        console.log(line2);
        line2 = '│ ' + word + ' ';
    } else {
        line2 += word + ' ';
    }
});
if (line2.trim().length > 2) console.log(line2);
console.log('│');
console.log('└' + '─'.repeat(78) + '┘');

// ════════════════════════════════════════════════════════════════════════════
// PRÜFUNG: Was NICHT im Output sein darf
// ════════════════════════════════════════════════════════════════════════════

console.log('\n');
console.log('┌' + '─'.repeat(78) + '┐');
console.log('│ PRÜFUNG: Was NICHT erscheinen darf (Fall 2 - Minimal-Diktat)           │');
console.log('├' + '─'.repeat(78) + '┤');

const text2 = result2.doc.fliesstext;
const forbidden = [
    { term: 'Röntgen', status: text2.includes('Röntgen') ? '❌ FEHLER' : '✅ OK' },
    { term: 'Kariesdetektor', status: text2.includes('Kariesdetektor') ? '❌ FEHLER' : '✅ OK' },
    { term: 'Fluorid', status: text2.includes('Fluorid') ? '❌ FEHLER' : '✅ OK' },
    { term: 'Überkappung', status: text2.includes('Überkappung') ? '❌ FEHLER' : '✅ OK' },
    { term: 'Matrize', status: text2.includes('Matrize') ? '❌ FEHLER' : '✅ OK' },
    { term: 'Kofferdam', status: text2.includes('Kofferdam') ? '❌ FEHLER' : '✅ OK' },
    { term: 'Leitung', status: text2.includes('Leitungsanästhesie') ? '❌ FEHLER' : '✅ OK' },
];

forbidden.forEach(f => console.log('│   ' + f.status + ' ' + f.term + ' (nicht diktiert)'));
console.log('└' + '─'.repeat(78) + '┘');

console.log('\n' + '='.repeat(80));
console.log(' ENDE DER PRÜFUNG ');
console.log('='.repeat(80) + '\n');
