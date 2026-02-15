/**
 * Gate Test: M25 No ChipId Collision
 *
 * Ensures common chips across treatments have identical billingRefs.
 * Text snippet differences are allowed as WARN level.
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

interface ChipDef {
    id: string;
    billingRef?: Record<string, string> | null;
    textSnippets?: Record<string, string>;
    label?: string;
}

interface TreatmentKb {
    chips: ChipDef[];
}

const KB_DIR = './src/docudent/core/billing/knowledgeBase/treatments';
const REGISTERED_PACKS = ['fuellung', 'endo'];

function loadChips(treatmentId: string): ChipDef[] {
    const kbPath = path.join(KB_DIR, treatmentId, 'unified.json');
    if (!fs.existsSync(kbPath)) return [];
    const kb: TreatmentKb = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
    return kb.chips || [];
}

function normalizeBillingRef(ref?: Record<string, string> | null): string {
    if (!ref) return '';
    return Object.entries(ref).sort().map(([k, v]) => `${k}:${v}`).join(',');
}

describe('gate-m25-no-chipid-collision', () => {
    const allChips = new Map<string, { treatmentId: string; chip: ChipDef }[]>();

    // Collect all chips
    for (const treatmentId of REGISTERED_PACKS) {
        const chips = loadChips(treatmentId);
        for (const chip of chips) {
            if (!allChips.has(chip.id)) allChips.set(chip.id, []);
            allChips.get(chip.id)!.push({ treatmentId, chip });
        }
    }

    // Find common chips
    const commonChips = [...allChips.entries()].filter(([_, entries]) => entries.length > 1);

    test('common chips have identical billingRef', () => {
        const collisions: string[] = [];

        for (const [chipId, entries] of commonChips) {
            const billingRefs = new Set(entries.map(e => normalizeBillingRef(e.chip.billingRef)));
            if (billingRefs.size > 1) {
                collisions.push(`${chipId}: billingRef differs across ${entries.map(e => e.treatmentId).join(', ')}`);
            }
        }

        console.log(`\n📊 M25 Common Chip Analysis:`);
        console.log(`   Common chips: ${commonChips.length}`);
        console.log(`   BillingRef collisions: ${collisions.length}`);

        expect(collisions).toEqual([]);
    });

    test('common chip count is tracked', () => {
        console.log(`\n📋 Common chips (${commonChips.length}):`);
        for (const [chipId, entries] of commonChips) {
            console.log(`   - ${chipId}: ${entries.map(e => e.treatmentId).join(', ')}`);
        }
        expect(commonChips.length).toBeGreaterThan(0);
    });

    test('all common chips logged for snapshot tracking', () => {
        const commonChipIds = commonChips.map(([id]) => id).sort();
        // Snapshot: these are the known common chips
        const expectedCommonChips = [
            'kofferdam',
            'la_infiltr',
            'la_leitung',
            'perk_neg',
            'perk_pos',
            'vipr_neg',
            'vipr_pos',
        ];
        expect(commonChipIds).toEqual(expectedCommonChips);
    });
});
