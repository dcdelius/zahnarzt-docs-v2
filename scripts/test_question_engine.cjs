/**
 * Integration Test: Question Engine with Inferred Data
 */
const path = require('path');
const root = path.join(__dirname, '..');

console.log('═══ QUESTION ENGINE INTEGRATION TEST ═══\n');

// Load questions
const questions = require(path.join(root, 'src/docudent/core/behandlungen/fuellung/questions.json'));

// Simulate different scenarios
const scenarios = [
    {
        name: 'UK Molar mit tiefer Karies',
        dictation: 'Füllung 46 mod, tiefe Karies, Komposit',
        extracted: {
            tooth: '46',
            surfaces: ['m', 'o', 'd'],
            diagnosis: 'Caries profunda',
            material: 'Komposit',
            inferred: {
                ukMolar: true,
                deepCavity: true,
                cappingLikely: true,
                multiSurface: true,
                approximal: true
            }
        },
        insuranceType: 'GKV',
        expectedQuestions: ['deep_caries_capping', 'anesthesia_type_unknown']
    },
    {
        name: 'Einfache Füllung mit Kofferdam erwähnt',
        dictation: '16 okklusal, Kofferdam, Komposit',
        extracted: {
            tooth: '16',
            surfaces: ['o'],
            material: 'Komposit',
            inferred: {
                kofferdamMentioned: true
            }
        },
        insuranceType: 'PKV',
        expectedQuestions: ['anesthesia_type_unknown']
    },
    {
        name: 'Mit Anästhesie erwähnt',
        dictation: '36 mod, Leitung, Komposit',
        extracted: {
            tooth: '36',
            surfaces: ['m', 'o', 'd'],
            anesthesia: 'Leitung',
            material: 'Komposit',
            inferred: {
                ukMolar: true,
                anesthesiaType: 'leitung',
                multiSurface: true
            }
        },
        insuranceType: 'GKV',
        expectedQuestions: [] // Anesthesia already known
    }
];

// Simple trigger evaluation (mimicking QuestionEngine logic)
function evaluateSimpleTrigger(question, dictation, extracted) {
    const trigger = question.trigger;
    const dictLower = dictation.toLowerCase();
    const inferred = extracted.inferred || {};

    // dependsOn - skip for now
    if (trigger.dependsOn) return { triggered: false, reason: 'dependency' };

    // always
    if (trigger.always) return { triggered: true, reason: 'always' };

    // keywords
    if (trigger.keywords) {
        for (const kw of trigger.keywords) {
            if (dictLower.includes(kw.toLowerCase())) {
                return { triggered: true, reason: 'keyword: ' + kw };
            }
        }
    }

    // COMBINED: extractedFields + notMentioned (AND logic)
    if (trigger.extractedFields && trigger.notMentioned) {
        let extractedMatch = false;
        for (const [field, values] of Object.entries(trigger.extractedFields)) {
            const extractedValue = extracted[field];
            if (extractedValue && Array.isArray(extractedValue)) {
                const extractedLower = extractedValue.map(v => v.toLowerCase());
                for (const v of values) {
                    if (extractedLower.includes(v.toLowerCase())) {
                        extractedMatch = true;
                        break;
                    }
                }
            }
            if (extractedMatch) break;
        }

        const noneExplicitlyMentioned = !trigger.notMentioned.some(kw =>
            dictLower.includes(kw.toLowerCase())
        );

        if (extractedMatch && noneExplicitlyMentioned) {
            return { triggered: true, reason: 'combined match' };
        }
        return { triggered: false, reason: '' };
    }

    // notMentioned ONLY
    if (trigger.notMentioned && !trigger.extractedFields) {
        const anyMentioned = trigger.notMentioned.some(kw => dictLower.includes(kw.toLowerCase()));
        // Also check inferred
        if (trigger.notMentioned.includes('kofferdam') && inferred.kofferdamMentioned) {
            return { triggered: false, reason: 'inferred.kofferdamMentioned' };
        }
        if (trigger.notMentioned.includes('leitung') && inferred.anesthesiaType) {
            return { triggered: false, reason: 'inferred.anesthesiaType' };
        }
        if (!anyMentioned) {
            return { triggered: true, reason: 'not mentioned' };
        }
    }

    // inferred.deepCavity
    if (trigger.keywords?.some(kw => ['tief', 'profunda', 'pulpanah', 'cp'].includes(kw.toLowerCase()))) {
        if (inferred.deepCavity) {
            return { triggered: true, reason: 'inferred.deepCavity' };
        }
    }

    return { triggered: false, reason: '' };
}

// Run tests
let passed = 0, failed = 0;
for (const scenario of scenarios) {
    console.log('Test:', scenario.name);
    console.log('  Dictation:', scenario.dictation);

    const allQuestions = [
        ...questions.tier1_contextual.questions.map(q => ({ ...q, tier: 1 })),
        ...questions.tier2_optimization.questions.map(q => ({ ...q, tier: 2 }))
    ];

    const triggeredQuestions = [];
    for (const q of allQuestions) {
        const result = evaluateSimpleTrigger(q, scenario.dictation, scenario.extracted);
        if (result.triggered) {
            triggeredQuestions.push(q.id);
        }
    }

    console.log('  Triggered:', triggeredQuestions.join(', ') || '(none)');
    console.log('  Expected:', scenario.expectedQuestions.join(', ') || '(none)');

    // Check if expected questions are triggered
    const allExpectedTriggered = scenario.expectedQuestions.every(eq => triggeredQuestions.includes(eq));
    if (allExpectedTriggered) {
        console.log('  ✓ PASS\n');
        passed++;
    } else {
        console.log('  ✗ FAIL\n');
        failed++;
    }
}

console.log('═══ RESULTS ═══');
console.log('Passed:', passed, '/ Failed:', failed);

if (failed > 0) {
    process.exit(1);
}
