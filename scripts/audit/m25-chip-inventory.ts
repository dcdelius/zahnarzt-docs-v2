/**
 * M25 Chip Inventory Script
 * 
 * Generates chip inventory with hashes for SSOT audit.
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const KB_DIR = './src/docudent/core/billing/knowledgeBase/treatments';
const registeredPacks = ['fuellung', 'endo'];

interface ChipDef {
    chipId: string;
    treatmentId: string;
    billingRef?: Record<string, string>;
    textSnippets?: Record<string, string>;
    variables?: string[];
    label?: string;
    phase?: string;
    category?: string;
}

interface ChipEntry extends ChipDef {
    definitionHash: string;
    conceptSignature: string;
}

function normalizeText(text: string): string {
    return text.toLowerCase().replace(/\{[^}]+\}/g, '').replace(/[^a-z0-9]/g, '');
}

function computeDefinitionHash(chip: ChipDef): string {
    const payload = JSON.stringify({
        billingRef: chip.billingRef ? Object.entries(chip.billingRef).sort() : null,
        textSnippets: chip.textSnippets ? Object.entries(chip.textSnippets).sort().map(([k, v]) => [k, normalizeText(v)]) : null,
        variables: chip.variables?.sort() || [],
    });
    return createHash('sha256').update(payload).digest('hex').slice(0, 12);
}

function computeConceptSignature(chip: ChipDef): string {
    const texts = chip.textSnippets ? Object.values(chip.textSnippets).map(normalizeText).sort().join('') : '';
    const billing = chip.billingRef ? Object.values(chip.billingRef).sort().join(',') : '';
    return createHash('sha256').update(texts + billing).digest('hex').slice(0, 12);
}

const inventory: ChipEntry[] = [];

for (const treatmentId of registeredPacks) {
    const kbPath = path.join(KB_DIR, treatmentId, 'unified.json');
    if (!fs.existsSync(kbPath)) continue;
    const kb = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
    for (const chip of kb.chips || []) {
        const vars = chip.variablen
            ? Object.keys(chip.variablen)
            : (chip.textSnippets?.lang?.match(/\{[^}]+\}/g) || []).map((v: string) => v.slice(1, -1));
        const entry: ChipEntry = {
            chipId: chip.id,
            treatmentId,
            billingRef: chip.billingRef,
            textSnippets: chip.textSnippets,
            variables: vars.length > 0 ? vars : undefined,
            label: chip.label,
            phase: chip.phase,
            category: chip.category,
            definitionHash: '',
            conceptSignature: '',
        };
        entry.definitionHash = computeDefinitionHash(entry);
        entry.conceptSignature = computeConceptSignature(entry);
        inventory.push(entry);
    }
}

// Sort deterministically
inventory.sort((a, b) => a.chipId.localeCompare(b.chipId) || a.treatmentId.localeCompare(b.treatmentId));

// Find collisions
const chipsByChipId = new Map<string, ChipEntry[]>();
for (const chip of inventory) {
    if (!chipsByChipId.has(chip.chipId)) chipsByChipId.set(chip.chipId, []);
    chipsByChipId.get(chip.chipId)!.push(chip);
}

const chipsByConcept = new Map<string, ChipEntry[]>();
for (const chip of inventory) {
    if (!chipsByConcept.has(chip.conceptSignature)) chipsByConcept.set(chip.conceptSignature, []);
    chipsByConcept.get(chip.conceptSignature)!.push(chip);
}

// Common chips (in >=2 treatments)
const commonChips = [...chipsByChipId.entries()].filter(([_, chips]) => chips.length > 1);

// ID collisions
const collisions = commonChips.filter(([_, chips]) => new Set(chips.map(c => c.definitionHash)).size > 1);

// Concept duplicates (different IDs, same concept)
const conceptDupes = [...chipsByConcept.entries()].filter(([_, chips]) => {
    const ids = new Set(chips.map(c => c.chipId));
    return ids.size > 1;
});

// Output summary
console.log('=== CHIP INVENTORY SUMMARY ===');
console.log('Total chips:', inventory.length);
console.log('Unique chipIds:', chipsByChipId.size);
console.log('Unique concepts:', chipsByConcept.size);
console.log();

console.log('=== COMMON CHIPS (in >=2 treatments) ===');
console.log('Count:', commonChips.length);
for (const [chipId, chips] of commonChips) {
    const hashes = new Set(chips.map(c => c.definitionHash));
    const verdict = hashes.size === 1 ? 'OK' : 'COLLISION';
    console.log(`  - ${chipId}: ${chips.map(c => c.treatmentId).join(', ')} | Hashes: ${[...hashes].join(', ')} | ${verdict}`);
}
console.log();

console.log('=== ID COLLISIONS (DANGEROUS) ===');
console.log('Count:', collisions.length);
for (const [chipId, chips] of collisions) {
    console.log(`  COLLISION: ${chipId}`);
    for (const chip of chips) {
        console.log(`    - ${chip.treatmentId}: ${chip.definitionHash}`);
        if (chip.billingRef) console.log(`      billingRef: ${JSON.stringify(chip.billingRef)}`);
    }
}
console.log();

console.log('=== CONCEPT DUPLICATES (different IDs, same concept) ===');
console.log('Count:', conceptDupes.length);
for (const [sig, chips] of conceptDupes) {
    console.log(`  Concept ${sig}: ${chips.map(c => c.chipId + '@' + c.treatmentId).join(', ')}`);
}

// Write inventory JSON
const inventoryOutput = {
    generatedAt: new Date().toISOString(),
    totalChips: inventory.length,
    uniqueChipIds: chipsByChipId.size,
    commonChipsCount: commonChips.length,
    collisionsCount: collisions.length,
    conceptDupesCount: conceptDupes.length,
    chips: inventory.map(c => ({
        chipId: c.chipId,
        treatmentId: c.treatmentId,
        definitionHash: c.definitionHash,
        conceptSignature: c.conceptSignature,
        billingRef: c.billingRef,
        label: c.label,
        phase: c.phase,
    })),
    commonChips: commonChips.map(([chipId, chips]) => ({
        chipId,
        treatments: chips.map(c => c.treatmentId),
        hashes: [...new Set(chips.map(c => c.definitionHash))],
        verdict: new Set(chips.map(c => c.definitionHash)).size === 1 ? 'OK' : 'COLLISION',
    })),
    collisions: collisions.map(([chipId, chips]) => ({
        chipId,
        entries: chips.map(c => ({
            treatmentId: c.treatmentId,
            definitionHash: c.definitionHash,
            billingRef: c.billingRef,
        })),
    })),
};

fs.writeFileSync('./docs/audit/m25-chip-inventory.json', JSON.stringify(inventoryOutput, null, 2));
console.log('\n✅ Inventory written to docs/audit/m25-chip-inventory.json');
