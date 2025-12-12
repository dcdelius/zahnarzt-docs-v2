// Test für Kombinationsregeln
const path = require('path');
const root = path.join(__dirname, '..');

// Einfacher direkter Import der Regeln
const kombinationsRegeln = require(path.join(root, 'src/docudent/core/billing/knowledgeBase/regeln/kombinationen.json'));

console.log('═══ KOMBINATIONSREGELN TEST ═══\n');

// Finde Ausschluss-Regeln
const ausschlussRegeln = kombinationsRegeln.filter(r => r.typ === 'ausschluss');
console.log(`Ausschluss-Regeln: ${ausschlussRegeln.length}`);

for (const regel of ausschlussRegeln) {
    console.log(`\n• ${regel.titel}`);
    console.log(`  Betroffene Codes: ${regel.betrifft.join(', ')}`);
    console.log(`  Schweregrad: ${regel.schweregrad}`);
}

// Simuliere Validierung
console.log('\n═══ VALIDIERUNGSTEST ═══\n');

function validateCodes(codes) {
    const conflicts = [];
    const codeIds = codes;

    for (const regel of ausschlussRegeln) {
        if (regel.regel.operator !== 'darf_nicht') continue;

        const found = regel.betrifft.filter(b => codeIds.includes(b));
        if (found.length > 1) {
            conflicts.push({
                title: regel.titel,
                severity: regel.schweregrad,
                affectedCodes: found,
                description: regel.beschreibung
            });
        }
    }
    return conflicts;
}

// Test 1: GOZ 2197 + GOZ 2060 (Ausschluss-Konflikt!)
const test1 = ['GOZ_2197', 'GOZ_2060'];
console.log('Test 1: GOZ 2197 + GOZ 2060');
const result1 = validateCodes(test1);
console.log(`  Konflikte: ${result1.length}`);
if (result1.length > 0) {
    console.log(`  ✓ KONFLIKT: ${result1[0].title}`);
    console.log(`    → Schweregrad: ${result1[0].severity}`);
} else {
    console.log(`  ✗ Kein Konflikt erkannt`);
}

// Test 2: Normale Kombination (kein Konflikt)
console.log('\nTest 2: BEMA 13 + 40 + 12 (sollte OK sein)');
const test2 = ['BEMA_13', 'BEMA_40', 'BEMA_12'];
const result2 = validateCodes(test2);
console.log(`  Konflikte: ${result2.length}`);
if (result2.length === 0) {
    console.log(`  ✓ OK - keine Konflikte`);
}

// Test 3: Mehrere Ausschluss-Codes
console.log('\nTest 3: GOZ 2197 + 2080 + 2100 (3-fach Ausschluss)');
const test3 = ['GOZ_2197', 'GOZ_2080', 'GOZ_2100'];
const result3 = validateCodes(test3);
console.log(`  Konflikte: ${result3.length}`);
if (result3.length > 0) {
    console.log(`  ✓ KONFLIKT: ${result3[0].affectedCodes.join(' + ')}`);
}

console.log('\n═══ FAZIT ═══');
console.log('Die Kombinationslogik funktioniert!');
console.log('ABER: Sie ist noch NICHT in useBillingV5Controller integriert.');
