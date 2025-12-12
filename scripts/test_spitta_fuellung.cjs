/**
 * Spitta-Style Füllungs-Fallbeispiele
 * 
 * Testet die Billing-Logik, Kombinationsregeln, und Fragen-Engine
 * mit realistischen Praxis-Diktaten nach Spitta-Vorbild.
 */

const path = require('path');
const root = path.join(__dirname, '..');

// Load data
const kombinationsRegeln = require(path.join(root, 'src/docudent/core/billing/knowledgeBase/regeln/kombinationen.json'));
const questions = require(path.join(root, 'src/docudent/core/behandlungen/fuellung/questions.json'));

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('      SPITTA-STYLE FÜLLUNGS-FALLBEISPIELE');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function extractFromDictation(dictation) {
    const lower = dictation.toLowerCase();
    const extracted = {
        tooth: null,
        surfaces: [],
        material: null,
        anesthesia: null,
        diagnosis: null,
        kofferdam: false,
        cp: false,
        matrize: false,
        inferred: {}
    };

    // Tooth extraction
    const toothMatch = dictation.match(/\b(\d{2})\b/);
    if (toothMatch) extracted.tooth = toothMatch[1];

    // Surface extraction
    if (lower.includes('modp')) extracted.surfaces = ['m', 'o', 'd', 'p'];
    else if (lower.includes('mod')) extracted.surfaces = ['m', 'o', 'd'];
    else if (lower.includes('mo')) extracted.surfaces = ['m', 'o'];
    else if (lower.includes('od')) extracted.surfaces = ['o', 'd'];
    else if (lower.includes('do')) extracted.surfaces = ['d', 'o'];
    else extracted.surfaces = ['o'];

    // Material
    if (lower.includes('tetric')) extracted.material = 'Tetric';
    else if (lower.includes('venus')) extracted.material = 'Venus';
    else if (lower.includes('komposit')) extracted.material = 'Komposit';

    // Anesthesia
    if (lower.includes('leitung')) extracted.anesthesia = 'Leitung';
    else if (lower.includes('infiltration')) extracted.anesthesia = 'Infiltration';

    // Kofferdam
    extracted.kofferdam = lower.includes('kofferdam');

    // Matrize  
    extracted.matrize = lower.includes('matri') || lower.includes('teilmatrize');

    // Cp
    extracted.cp = lower.includes('calxyl') || lower.includes('überkapp') ||
        lower.includes('profunda') || lower.includes('tief');

    // Diagnosis
    if (lower.includes('profunda') || lower.includes('pulpanah')) {
        extracted.diagnosis = 'Caries profunda';
    } else if (lower.includes('tief')) {
        extracted.diagnosis = 'Tiefe Karies';
    } else {
        extracted.diagnosis = 'Caries media';
    }

    // Inferred
    const toothNum = parseInt(extracted.tooth || '0');
    extracted.inferred = {
        ukMolar: toothNum >= 36 && toothNum <= 38 || toothNum >= 46 && toothNum <= 48,
        deepCavity: lower.includes('tief') || lower.includes('profunda'),
        multiSurface: extracted.surfaces.length >= 2,
        approximal: extracted.surfaces.includes('m') || extracted.surfaces.includes('d'),
        kofferdamMentioned: lower.includes('kofferdam'),
        anesthesiaType: extracted.anesthesia?.toLowerCase() || null
    };

    return extracted;
}

function inferBillingCodes(extracted, insuranceType) {
    const codes = [];
    const surfaces = extracted.surfaces.length;

    if (insuranceType === 'GKV') {
        // F-Code nach Flächen
        if (surfaces === 1) codes.push('BEMA_13');
        else if (surfaces === 2) codes.push('BEMA_13b');
        else if (surfaces >= 3) codes.push('BEMA_13c');

        // Anästhesie
        if (extracted.anesthesia === 'Leitung') codes.push('BEMA_41a');
        else if (extracted.anesthesia === 'Infiltration') codes.push('BEMA_40');

        // Kofferdam
        if (extracted.kofferdam) codes.push('BEMA_12');

        // Cp
        if (extracted.cp) codes.push('BEMA_25');

    } else { // PKV
        // F-Code nach Flächen
        if (surfaces === 1) codes.push('GOZ_2060');
        else if (surfaces === 2) codes.push('GOZ_2080');
        else if (surfaces >= 3) codes.push('GOZ_2100');

        // Anästhesie
        if (extracted.anesthesia) codes.push('GOZ_0100');

        // Kofferdam
        if (extracted.kofferdam) codes.push('GOZ_2040');

        // Cp
        if (extracted.cp) codes.push('GOZ_2330');
    }

    return codes;
}

function validateCombinations(codes) {
    const conflicts = [];

    for (const regel of kombinationsRegeln) {
        if (regel.typ !== 'ausschluss') continue;
        if (regel.regel.operator !== 'darf_nicht') continue;

        const found = regel.betrifft.filter(b => codes.includes(b));
        if (found.length > 1) {
            conflicts.push({
                regel: regel.titel,
                codes: found,
                severity: regel.schweregrad,
                beschreibung: regel.beschreibung
            });
        }
    }

    return conflicts;
}

function getTriggeredQuestions(dictation, extracted, insuranceType) {
    const triggered = [];
    const dictLower = dictation.toLowerCase();

    const allQuestions = [
        ...questions.tier1_contextual.questions.map(q => ({ ...q, tier: 1 })),
        ...questions.tier2_optimization.questions.map(q => ({ ...q, tier: 2 })),
        ...questions.tier3_opportunistic.questions.map(q => ({ ...q, tier: 3 }))
    ];

    for (const q of allQuestions) {
        const trigger = q.trigger;

        // Skip dependencies
        if (trigger.dependsOn) continue;

        // Always triggers
        if (trigger.always) {
            triggered.push({ id: q.id, tier: q.tier, question: q.question });
            continue;
        }

        // Keywords
        if (trigger.keywords) {
            for (const kw of trigger.keywords) {
                if (dictLower.includes(kw.toLowerCase())) {
                    triggered.push({ id: q.id, tier: q.tier, question: q.question, reason: `keyword: ${kw}` });
                    break;
                }
            }
        }

        // Combined extractedFields + notMentioned (AND logic)
        if (trigger.extractedFields && trigger.notMentioned) {
            let extractedMatch = false;

            for (const [field, values] of Object.entries(trigger.extractedFields)) {
                const val = extracted[field];
                if (val && Array.isArray(val)) {
                    const valLower = val.map(v => v.toLowerCase());
                    for (const v of values) {
                        if (valLower.includes(v.toLowerCase())) {
                            extractedMatch = true;
                            break;
                        }
                    }
                }
            }

            const noneExplicitlyMentioned = !trigger.notMentioned.some(kw =>
                dictLower.includes(kw.toLowerCase())
            );

            if (extractedMatch && noneExplicitlyMentioned) {
                triggered.push({ id: q.id, tier: q.tier, question: q.question, reason: 'extracted + not mentioned' });
            }
            continue;
        }

        // notMentioned only
        if (trigger.notMentioned && !trigger.extractedFields) {
            const inferred = extracted.inferred || {};

            // Skip if inferred says it's mentioned
            if (trigger.notMentioned.includes('kofferdam') && inferred.kofferdamMentioned) continue;
            if (trigger.notMentioned.includes('leitung') && inferred.anesthesiaType) continue;

            const anyMentioned = trigger.notMentioned.some(kw => dictLower.includes(kw.toLowerCase()));
            if (!anyMentioned) {
                triggered.push({ id: q.id, tier: q.tier, question: q.question, reason: 'not mentioned' });
            }
        }

        // Deep cavity from inferred
        if (trigger.keywords?.some(kw => ['tief', 'profunda', 'pulpanah'].includes(kw.toLowerCase()))) {
            if (extracted.inferred?.deepCavity) {
                // Already handled by keyword check
            }
        }
    }

    return triggered;
}

// ═══════════════════════════════════════════════════════════════
// SPITTA FALLBEISPIELE
// ═══════════════════════════════════════════════════════════════

const SPITTA_CASES = [
    {
        id: 1,
        name: 'Standard OK Prämolar (GKV)',
        dictation: 'Füllung 16 DO, Infiltration, Kofferdam, Exkavation sondenhart, Teilmatrize, Ätzung Schichttechnik Tetric A3',
        insuranceType: 'GKV',
        expectedCodes: ['BEMA_13b', 'BEMA_40', 'BEMA_12'],
        shouldAskMatrix: false, // Mentioned!
        shouldAskAnesthesia: false // Mentioned!
    },
    {
        id: 2,
        name: 'UK Molar mit Leitung (GKV)',
        dictation: 'Füllung 46 MOD, Leitungsanästhesie, Kofferdam, Exkavation, Schichttechnik',
        insuranceType: 'GKV',
        expectedCodes: ['BEMA_13c', 'BEMA_41a', 'BEMA_12'],
        shouldAskMatrix: true, // Not mentioned!
        shouldAskAnesthesia: false
    },
    {
        id: 3,
        name: 'Tiefe Karies mit Cp (GKV)',
        dictation: 'Füllung 36 OD, Leitung, Kofferdam, tiefe Karies pulpanah, indirekte Überkappung mit Calxyl, Sektionalmatrize, Komposit',
        insuranceType: 'GKV',
        expectedCodes: ['BEMA_13b', 'BEMA_41a', 'BEMA_12', 'BEMA_25'],
        shouldAskMatrix: false, // Mentioned!
        shouldAskCp: false // Already doing Cp
    },
    {
        id: 4,
        name: 'PKV Standard MO',
        dictation: 'Füllung 25 MO, Infiltration, Kofferdam, Schichtfüllung Venus Pearl',
        insuranceType: 'PKV',
        expectedCodes: ['GOZ_2080', 'GOZ_0100', 'GOZ_2040'],
        shouldAskMatrix: true, // Not mentioned, approximal!
        shouldAskAnesthesia: false
    },
    {
        id: 5,
        name: 'Okklusal nur (einfach, GKV)',
        dictation: 'Füllung 26 okklusal, kleine Karies, Komposit',
        insuranceType: 'GKV',
        expectedCodes: ['BEMA_13'],
        shouldAskMatrix: false, // Only O surface
        shouldAskAnesthesia: true // Not mentioned!
    },
    {
        id: 6,
        name: 'PKV Adhäsiv-Konflikt Test',
        dictation: 'Füllung 15 MOD, Kofferdam, Adhäsivtechnik, Schichtung',
        insuranceType: 'PKV',
        expectedCodes: ['GOZ_2100', 'GOZ_2040'],
        shouldHaveConflict: false // GOZ 2197 not separate from 2100
    },
    {
        id: 7,
        name: 'UK 47 MOD Risiko-Patient',
        dictation: 'Füllung 47 MOD, Diabetiker, Leitungsanästhesie, relative Trockenlegung wegen Würgereiz, tiefe Karies Cp mit Calxyl, Matrize',
        insuranceType: 'GKV',
        expectedCodes: ['BEMA_13c', 'BEMA_41a', 'BEMA_25'],
        shouldWarnNoKofferdam: true,
        shouldAskMatrix: false // Mentioned!
    }
];

// ═══════════════════════════════════════════════════════════════
// RUN TESTS
// ═══════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;
let warnings = 0;

for (const tc of SPITTA_CASES) {
    console.log('─'.repeat(70));
    console.log(`FALL ${tc.id}: ${tc.name}`);
    console.log('─'.repeat(70));
    console.log(`📢 Diktat: "${tc.dictation}"`);
    console.log(`📋 Versicherung: ${tc.insuranceType}`);
    console.log('');

    // 1. Extract
    const extracted = extractFromDictation(tc.dictation);
    console.log('🔍 EXTRAKTION:');
    console.log(`   Zahn: ${extracted.tooth}`);
    console.log(`   Flächen: ${extracted.surfaces.join(', ')} (${extracted.surfaces.length})`);
    console.log(`   Anästhesie: ${extracted.anesthesia || '(nicht erwähnt)'}`);
    console.log(`   Kofferdam: ${extracted.kofferdam ? 'Ja' : 'Nein'}`);
    console.log(`   Cp/P: ${extracted.cp ? 'Ja' : 'Nein'}`);
    console.log(`   Diagnose: ${extracted.diagnosis}`);
    console.log('');

    // 2. Infer billing
    const codes = inferBillingCodes(extracted, tc.insuranceType);
    console.log('💰 BILLING CODES:');
    console.log(`   ${codes.join(', ')}`);

    // 3. Check expected codes
    const missingCodes = tc.expectedCodes.filter(ec => !codes.includes(ec));
    const extraCodes = codes.filter(c => !tc.expectedCodes.includes(c));

    if (missingCodes.length > 0) {
        console.log(`   ⚠️ FEHLT: ${missingCodes.join(', ')}`);
        warnings++;
    }
    console.log('');

    // 4. Validate combinations
    const conflicts = validateCombinations(codes);
    console.log('🔗 KOMBINATIONS-CHECK:');
    if (conflicts.length === 0) {
        console.log('   ✓ Keine Konflikte');
    } else {
        for (const c of conflicts) {
            console.log(`   ⛔ ${c.regel}: ${c.codes.join(' + ')}`);
            console.log(`      → ${c.beschreibung}`);
        }
    }
    console.log('');

    // 5. Get triggered questions
    const triggeredQs = getTriggeredQuestions(tc.dictation, extracted, tc.insuranceType);
    console.log('❓ GETRIGGERTE FRAGEN:');
    if (triggeredQs.length === 0) {
        console.log('   (keine)');
    } else {
        for (const q of triggeredQs) {
            console.log(`   [T${q.tier}] ${q.id}: ${q.question}`);
            if (q.reason) console.log(`        → ${q.reason}`);
        }
    }
    console.log('');

    // 6. Validate question logic
    let casePass = true;
    const matrixQ = triggeredQs.find(q => q.id === 'matrix_approximal');
    const anesthesiaQ = triggeredQs.find(q => q.id === 'anesthesia_type_unknown');

    console.log('✔️ VALIDIERUNG:');

    // Matrix question check
    const hasApproximal = extracted.surfaces.includes('m') || extracted.surfaces.includes('d');
    if (tc.shouldAskMatrix !== undefined) {
        if (tc.shouldAskMatrix && !matrixQ && hasApproximal) {
            console.log(`   ✗ Matrize-Frage sollte erscheinen (M/D-Fläche, nicht erwähnt)`);
            casePass = false;
        } else if (!tc.shouldAskMatrix && matrixQ) {
            console.log(`   ✗ Matrize-Frage sollte NICHT erscheinen`);
            casePass = false;
        } else {
            console.log(`   ✓ Matrize-Frage korrekt: ${matrixQ ? 'erscheint' : 'erscheint nicht'}`);
        }
    }

    // Anesthesia question check
    if (tc.shouldAskAnesthesia !== undefined) {
        if (tc.shouldAskAnesthesia && !anesthesiaQ) {
            console.log(`   ✗ Anästhesie-Frage sollte erscheinen`);
            casePass = false;
        } else if (!tc.shouldAskAnesthesia && anesthesiaQ) {
            console.log(`   ✗ Anästhesie-Frage sollte NICHT erscheinen`);
            casePass = false;
        } else {
            console.log(`   ✓ Anästhesie-Frage korrekt: ${anesthesiaQ ? 'erscheint' : 'erscheint nicht'}`);
        }
    }

    // Conflict check
    if (tc.shouldHaveConflict !== undefined) {
        if (tc.shouldHaveConflict && conflicts.length === 0) {
            console.log(`   ✗ Konflikt sollte erkannt werden`);
            casePass = false;
        } else if (!tc.shouldHaveConflict && conflicts.length > 0) {
            console.log(`   ✗ Konflikt sollte NICHT erscheinen`);
            casePass = false;
        } else {
            console.log(`   ✓ Konflikt-Check korrekt`);
        }
    }

    // Kofferdam warning
    if (tc.shouldWarnNoKofferdam && extracted.kofferdam) {
        console.log(`   ⚠️ Warnung: Kofferdam nicht möglich war, bMF (BEMA 12) nicht abrechenbar!`);
        warnings++;
    }

    if (casePass) {
        console.log('\n   ✅ FALL BESTANDEN');
        passed++;
    } else {
        console.log('\n   ❌ FALL FEHLGESCHLAGEN');
        failed++;
    }
    console.log('');
}

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

console.log('═'.repeat(70));
console.log('ZUSAMMENFASSUNG');
console.log('═'.repeat(70));
console.log(`✅ Bestanden: ${passed}/${SPITTA_CASES.length}`);
console.log(`❌ Fehlgeschlagen: ${failed}/${SPITTA_CASES.length}`);
console.log(`⚠️ Warnungen: ${warnings}`);
console.log('');

if (failed === 0) {
    console.log('🎉 ALLE TESTS BESTANDEN!');
    process.exit(0);
} else {
    console.log('❌ EINIGE TESTS FEHLGESCHLAGEN');
    process.exit(1);
}
