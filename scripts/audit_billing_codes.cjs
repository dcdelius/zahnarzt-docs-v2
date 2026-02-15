const path = require('path');
const root = path.join(__dirname, '..');
const q = require(path.join(root, 'src/docudent/core/behandlungen/fuellung/questions.json'));
const bema = require(path.join(root, 'src/docudent/core/billing/knowledgeBase/kataloge/bema.json'));
const goz = require(path.join(root, 'src/docudent/core/billing/knowledgeBase/kataloge/goz.json'));
const goae = require(path.join(root, 'src/docudent/core/billing/knowledgeBase/kataloge/goa.json'));

console.log('═══ CODE REFERENCE VALIDATION ═══\n');

// Collect all codes from questions
const referencedCodes = new Set();
const allQuestions = [
    ...q.tier1_contextual.questions,
    ...q.tier2_optimization.questions,
    ...q.tier3_opportunistic.questions
];

for (const question of allQuestions) {
    for (const option of question.options) {
        if (option.billing) {
            if (option.billing.GKV && option.billing.GKV.code) referencedCodes.add(option.billing.GKV.code);
            if (option.billing.PKV && option.billing.PKV.code) referencedCodes.add(option.billing.PKV.code);
        }
    }
}

console.log('Unique codes referenced:', referencedCodes.size);
console.log('');

let valid = 0, invalid = 0;
for (const code of referencedCodes) {
    let found = false;
    if (bema[code]) found = true;
    if (goz[code]) found = true;
    if (goae[code]) found = true;
    // Handle BEMA_Ä variants
    if (!found && code.startsWith('BEMA_Ä')) {
        if (bema[code]) found = true;
    }
    // Handle GOZ_XXXa analog variants
    if (!found && code.match(/GOZ_\d+a$/)) {
        const base = code.replace(/a$/, '');
        if (goz[base]) found = true; // Base code exists, analog is valid
    }

    if (found) {
        valid++;
        console.log('✓', code);
    } else {
        invalid++;
        console.log('✗', code, '- NOT FOUND IN DATABASE');
    }
}
console.log('');
console.log('Summary: Valid:', valid, '/ Invalid:', invalid);

if (invalid > 0) {
    console.log('\n⚠️  WARNING: Some codes are not in the database!');
    process.exit(1);
} else {
    console.log('\n✅ All codes verified against billing database!');
}
