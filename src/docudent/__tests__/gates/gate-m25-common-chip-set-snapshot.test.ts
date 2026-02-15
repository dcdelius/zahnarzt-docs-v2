/**
 * Gate Test: M25 Common Chip Set Snapshot
 *
 * Tracks the set of common chips across treatments.
 * If new common chips appear, this test must be updated consciously.
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const KB_DIR = './src/docudent/core/billing/knowledgeBase/treatments';
const REGISTERED_PACKS = ['fuellung', 'endo'];

interface ChipDef {
    id: string;
}

function loadChipIds(treatmentId: string): string[] {
    const kbPath = path.join(KB_DIR, treatmentId, 'unified.json');
    if (!fs.existsSync(kbPath)) return [];
    const kb = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
    return (kb.chips || []).map((c: ChipDef) => c.id);
}

describe('gate-m25-common-chip-set-snapshot', () => {
    test('common chip set matches snapshot', () => {
        const allChipIds = new Map<string, string[]>();

        for (const treatmentId of REGISTERED_PACKS) {
            const chipIds = loadChipIds(treatmentId);
            for (const id of chipIds) {
                if (!allChipIds.has(id)) allChipIds.set(id, []);
                allChipIds.get(id)!.push(treatmentId);
            }
        }

        const commonChips = [...allChipIds.entries()]
            .filter(([_, treatments]) => treatments.length > 1)
            .map(([id]) => id)
            .sort();

        // SNAPSHOT: If this changes, you're adding/removing common chips
        // Update consciously!
        const SNAPSHOT_COMMON_CHIPS = [
            'kofferdam',
            'la_infiltr',
            'la_leitung',
            'perk_neg',
            'perk_pos',
            'vipr_neg',
            'vipr_pos',
        ];

        expect(commonChips).toEqual(SNAPSHOT_COMMON_CHIPS);
    });

    test('reports common chip treatments', () => {
        const allChipIds = new Map<string, string[]>();

        for (const treatmentId of REGISTERED_PACKS) {
            const chipIds = loadChipIds(treatmentId);
            for (const id of chipIds) {
                if (!allChipIds.has(id)) allChipIds.set(id, []);
                allChipIds.get(id)!.push(treatmentId);
            }
        }

        const commonChips = [...allChipIds.entries()]
            .filter(([_, treatments]) => treatments.length > 1);

        console.log('\n📋 Common Chips Snapshot:');
        for (const [id, treatments] of commonChips.sort((a, b) => a[0].localeCompare(b[0]))) {
            console.log(`   ${id}: ${treatments.join(', ')}`);
        }
    });
});
