/**
 * REAL-LIFE E2E FLOW TEST
 * 
 * Simulates the complete pipeline 5 times:
 * 1. Dictation (realistic text)
 * 2. Extraction simulation
 * 3. Chip resolution with smart anesthesia
 * 4. Upsell generation
 * 5. Final documentation output
 * 6. Analysis for logical issues
 */

import { describe, it, expect } from 'vitest';
import { FILLING_TREATMENT } from '../sonia/behandlungen/konservierend/fuellung/definition';
import {
    resolveChipStates,
    getActiveChipIds,
    processTreatment,
    generateFinalDocumentation,
    getActiveUpsells
} from '../sonia/behandlungen/_shared/engine';
import { resolveAnesthesiaFromDictation, inferAnesthesia } from '../sonia/behandlungen/_shared/anesthesiaInference';
import { InsuranceType, TextLength } from '../sonia/behandlungen/_shared/types';

// ========================================
// HELPER: Simulate chip extraction from dictation
// ========================================

function simulateChipExtraction(dictation: string, tooth: string): string[] {
    const chips: string[] = [];
    const lower = dictation.toLowerCase();

    // Smart anesthesia
    const anesthesia = resolveAnesthesiaFromDictation(dictation, tooth);
    if (anesthesia.chipId !== 'ohne_la') {
        chips.push(anesthesia.chipId);
    }

    // Trockenlegung
    if (lower.includes('kofferdam') || lower.includes('absolut')) {
        chips.push('kofferdam');
    } else if (lower.includes('relativ') || lower.includes('watteroll')) {
        chips.push('rel_trocken');
    }

    // Exkavation
    if (lower.includes('exkav') || lower.includes('sondenhart') || lower.includes('karies')) {
        chips.push('exkavation');
    }

    // Cp/P
    if (lower.includes('calxyl') || lower.includes('calcium') ||
        lower.includes('überkapp') && lower.includes('indirekt')) {
        chips.push('cp');
    } else if (lower.includes('direkte überkapp') || lower.includes(' p ')) {
        chips.push('p');
    }

    // Matrize
    if (lower.includes('matri') || lower.includes('keil') || lower.includes('teilmatri')) {
        chips.push('matrize');
    }

    // Schichttechnik / Adhäsiv
    if (lower.includes('schicht') || lower.includes('bulk') || lower.includes('komposit')) {
        chips.push('schicht');
        chips.push('adhesive');
    }
    if (lower.includes('ätz') || lower.includes('adhäs') || lower.includes('bond')) {
        chips.push('adhesive');
    }

    // Fluoridierung
    if (lower.includes('fluor')) {
        chips.push('fluoridierung');
    }

    // Befunde
    if (lower.includes('vital') && !lower.includes('devital')) {
        chips.push('vipr_pos');
    } else if (lower.includes('devital') || lower.includes('avital')) {
        chips.push('vipr_neg');
    }

    if (lower.includes('perk neg') || lower.includes('perk -') || lower.includes('perkussionsnegativ')) {
        chips.push('perk_neg');
    }

    // Dedupe
    return [...new Set(chips)];
}

// ========================================
// HELPER: Parse surfaces from dictation
// ========================================

function parseSurfaces(dictation: string): string[] {
    const lower = dictation.toLowerCase();
    const surfaces: string[] = [];

    // Look for explicit surface mentions
    const surfacePatterns = [
        { pattern: /modp/i, surfaces: ['m', 'o', 'd', 'p'] },
        { pattern: /mod\b/i, surfaces: ['m', 'o', 'd'] },
        { pattern: /mo\b/i, surfaces: ['m', 'o'] },
        { pattern: /od\b/i, surfaces: ['o', 'd'] },
        { pattern: /do\b/i, surfaces: ['d', 'o'] },
        { pattern: /\bo\b/, surfaces: ['o'] },
        { pattern: /\bm\b/, surfaces: ['m'] },
        { pattern: /\bd\b/, surfaces: ['d'] },
    ];

    for (const p of surfacePatterns) {
        if (p.pattern.test(lower)) {
            return p.surfaces;
        }
    }

    // Fallback: check individual
    if (lower.includes('okklusal') || lower.includes('okk')) surfaces.push('o');
    if (lower.includes('mesial') || lower.includes('mes')) surfaces.push('m');
    if (lower.includes('distal') || lower.includes('dis')) surfaces.push('d');
    if (lower.includes('bukkal') || lower.includes('buk')) surfaces.push('b');
    if (lower.includes('palat') || lower.includes('ling')) surfaces.push('p');

    return surfaces.length > 0 ? surfaces : ['o'];  // Default to occlusal
}

// ========================================
// HELPER: Parse tooth from dictation
// ========================================

function parseTooth(dictation: string): string | undefined {
    // Look for tooth number patterns
    const patterns = [
        /zahn\s*(\d{2})/i,
        /(\d{2})\s*[omdpbl]/i,
        /füllung\s*(\d{2})/i,
        /(\d{2})\s*(mod|mo|od|do|o|m|d)/i,
    ];

    for (const p of patterns) {
        const match = dictation.match(p);
        if (match && match[1]) {
            return match[1];
        }
    }

    return undefined;
}

// ========================================
// 5 REAL-LIFE TEST CASES
// ========================================

const REAL_LIFE_CASES = [
    {
        id: 1,
        name: 'Standard OK Füllung',
        dictation: 'Füllung Zahn 16 DO, Patient vital, mit Anästhesie, Kofferdam, Exkavation sondenhart, Teilmatrize, Ätzung Schichttechnik Tetric A3, Politur',
        insuranceType: 'GKV' as InsuranceType,
        expectedIssues: []
    },
    {
        id: 2,
        name: 'UK Molar mit Leitung',
        dictation: 'Füllung 46 MOD, Anästhesie, Kofferdam, tiefe Exkavation, Komposit Schichttechnik',
        insuranceType: 'GKV' as InsuranceType,
        expectedIssues: []
    },
    {
        id: 3,
        name: 'Tiefe Karies mit Cp',
        dictation: 'Füllung 36 OD, Leitungsanästhesie, Kofferdam, tiefe Karies, indirekte Überkappung mit Calxyl, dann Ätzung und Schichttechnik',
        insuranceType: 'GKV' as InsuranceType,
        expectedIssues: []
    },
    {
        id: 4,
        name: 'PKV Patient',
        dictation: 'Füllung 25 MO, Privatpatient, Infiltration, Kofferdam, normale Exkavation, Adhäsivtechnik, Schichtfüllung mit Venus',
        insuranceType: 'PKV' as InsuranceType,
        expectedIssues: []
    },
    {
        id: 5,
        name: 'Risiko-Patient mit Zusatzinfos',
        dictation: 'Füllung 47 MOD, Patient Diabetiker nimmt Metformin, Leitungsanästhesie, Kofferdam ging nicht also relative Trockenlegung, Exkavation, tiefe Karies pulpanah, Cp mit Calxyl, Matrize, Schichttechnik, Kontrolle in einer Woche',
        insuranceType: 'GKV' as InsuranceType,
        expectedIssues: []
    }
];

describe('Real-Life E2E Flow Test', () => {

    REAL_LIFE_CASES.forEach((testCase) => {
        it(`Case ${testCase.id}: ${testCase.name}`, () => {
            console.log('\n' + '═'.repeat(70));
            console.log(`CASE ${testCase.id}: ${testCase.name}`);
            console.log('═'.repeat(70));

            // ======== STEP 1: Parse Dictation ========
            console.log('\n📢 DIKTAT:');
            console.log(`   "${testCase.dictation}"`);

            const tooth = parseTooth(testCase.dictation);
            const surfaces = parseSurfaces(testCase.dictation);

            console.log('\n🔍 EXTRAKTION:');
            console.log(`   Zahn: ${tooth || 'nicht erkannt'}`);
            console.log(`   Flächen: ${surfaces.join(', ')}`);

            expect(tooth).toBeDefined();

            // ======== STEP 2: Anesthesia Inference ========
            const anesthesiaInference = inferAnesthesia(tooth!);
            console.log(`   Anästhesie-Empfehlung: ${anesthesiaInference.reason}`);

            // ======== STEP 3: Chip Extraction ========
            const extractedChips = simulateChipExtraction(testCase.dictation, tooth!);
            console.log(`   Erkannte Chips: ${extractedChips.join(', ')}`);

            // ======== STEP 4: Resolve Chip States ========
            const chipStates = resolveChipStates(FILLING_TREATMENT, extractedChips, new Map());
            const activeChipIds = getActiveChipIds(chipStates);

            console.log('\n✅ AKTIVE CHIPS:');
            console.log(`   ${activeChipIds.join(', ')}`);

            // ======== STEP 5: Upsells/Fragen ========
            const extractedData = {
                tooth,
                surfaces,
                diagnosis: testCase.dictation.toLowerCase().includes('tief') ? 'Caries profunda' : 'Caries media'
            };
            const upsells = getActiveUpsells(FILLING_TREATMENT, extractedData);

            console.log('\n💡 UPSELLS/FRAGEN:');
            if (upsells.length > 0) {
                upsells.forEach(u => console.log(`   • ${u.label}: ${u.description}`));
            } else {
                console.log('   (keine)');
            }

            // ======== STEP 6: Process Treatment ========
            const result = processTreatment({
                treatment: FILLING_TREATMENT,
                insuranceType: testCase.insuranceType,
                activeChips: activeChipIds,
                extractedData,
                acceptedUpsells: [],
                textLength: 'mittel' as TextLength
            });

            console.log('\n📋 BILLING CODES:');
            console.log(`   ${result.billingCodes.join(', ')}`);

            // ======== STEP 7: Final Documentation ========
            const doc = generateFinalDocumentation(
                FILLING_TREATMENT,
                testCase.insuranceType,
                activeChipIds,
                extractedData,
                [],
                'mittel'
            );

            console.log('\n📄 FINAL OUTPUT:');
            console.log('─'.repeat(60));
            console.log(`${doc.uebersicht.header}`);
            console.log(`Befund: ${doc.uebersicht.befund}`);
            console.log('');
            console.log('Leistungen:');
            doc.uebersicht.leistungen.forEach(l => console.log(`• ${l}`));
            console.log('');
            console.log(`Codes: ${doc.uebersicht.codes.join(', ')}`);
            console.log('─'.repeat(60));
            console.log('');
            console.log(doc.fliesstext);
            console.log('─'.repeat(60));

            // ======== STEP 8: Analyze for Issues ========
            const issues: string[] = [];

            // Check: Anesthesia correct for tooth position?
            if (tooth && parseInt(tooth) >= 35 && parseInt(tooth) <= 48) {
                // UK Molar - should use Leitung
                if (!activeChipIds.includes('la_leitung') && !activeChipIds.includes('ohne_la')) {
                    issues.push(`UK ${tooth} sollte Leitungsanästhesie haben, nicht Infiltration`);
                }
            }

            // Check: No mixed BEMA/GOZ
            const hasBema = result.billingCodes.some(c => c.startsWith('BEMA'));
            const hasGoz = result.billingCodes.some(c => c.startsWith('GOZ'));
            if (hasBema && hasGoz) {
                issues.push('Gemischte BEMA/GOZ Codes - sollte nur eine Kategorie sein');
            }

            // Check: Correct insurance codes
            if (testCase.insuranceType === 'GKV' && hasGoz && !doc.uebersicht.codes.some(c => c.startsWith('GOZ'))) {
                // Only flag if GOZ appears without explicit reason
            }
            if (testCase.insuranceType === 'PKV' && hasBema) {
                issues.push('PKV Patient hat BEMA Codes - sollte GOZ haben');
            }

            // Check: F-Code matches surfaces
            const surfaceCount = surfaces.length;
            if (testCase.insuranceType === 'GKV') {
                if (surfaceCount === 1 && !result.billingCodes.includes('BEMA 13')) {
                    issues.push(`1 Fläche sollte BEMA 13 haben`);
                }
                if (surfaceCount === 2 && !result.billingCodes.includes('BEMA 13b')) {
                    issues.push(`2 Flächen sollte BEMA 13b haben`);
                }
                if (surfaceCount === 3 && !result.billingCodes.includes('BEMA 13c')) {
                    issues.push(`3 Flächen sollte BEMA 13c haben`);
                }
            }

            // Check: No duplicate anesthesia
            const la40 = result.billingCodes.filter(c => c === 'BEMA 40').length;
            const la41 = result.billingCodes.filter(c => c === 'BEMA 41').length;
            if (la40 + la41 > 1) {
                issues.push('Doppelte Anästhesie-Codes (40 + 41)');
            }

            // Check: No GOZ 2197 separately
            if (result.billingCodes.includes('GOZ 2197')) {
                issues.push('GOZ 2197 sollte nicht separat erscheinen (inkl. in F-Code)');
            }

            // Check: Cp with deep caries
            if (testCase.dictation.toLowerCase().includes('calxyl') ||
                testCase.dictation.toLowerCase().includes('überkapp')) {
                if (!activeChipIds.includes('cp')) {
                    issues.push('Cp im Diktat aber Chip nicht aktiv');
                }
                if (!result.billingCodes.includes('BEMA 25') && testCase.insuranceType === 'GKV') {
                    issues.push('Cp aktiv aber BEMA 25 fehlt');
                }
            }

            console.log('\n🔎 ANALYSE:');
            if (issues.length === 0) {
                console.log('   ✅ Keine logischen Fehler gefunden');
            } else {
                issues.forEach(issue => console.log(`   ⚠️ ${issue}`));
            }

            // Store issues for assertion
            testCase.expectedIssues.push(...issues);

            // Assertions
            expect(result.billingCodes.length).toBeGreaterThan(0);
            expect(doc.fliesstext.length).toBeGreaterThan(100);

            // Fail if critical issues found
            expect(issues.filter(i =>
                i.includes('Gemischte BEMA/GOZ') ||
                i.includes('GOZ 2197') ||
                i.includes('Doppelte Anästhesie')
            )).toHaveLength(0);

            console.log('\n✓ Case passed');
        });
    });

    it('Summary of all cases', () => {
        console.log('\n' + '═'.repeat(70));
        console.log('ZUSAMMENFASSUNG');
        console.log('═'.repeat(70));

        let totalIssues = 0;
        REAL_LIFE_CASES.forEach(tc => {
            const issueCount = tc.expectedIssues.length;
            totalIssues += issueCount;
            console.log(`Case ${tc.id} (${tc.name}): ${issueCount === 0 ? '✅ OK' : `⚠️ ${issueCount} Issues`}`);
        });

        console.log('─'.repeat(70));
        console.log(`Total Issues: ${totalIssues}`);

        expect(totalIssues).toBe(0);
    });
});
