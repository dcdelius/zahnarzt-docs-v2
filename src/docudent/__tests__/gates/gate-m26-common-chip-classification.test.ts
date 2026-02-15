/**
 * Gate Test: M26 Common Chip Classification
 *
 * Classifies all chips into categories and maintains snapshot for drift detection.
 *
 * Categories:
 * - COMMON_IDENTICAL: Same chipId, identical in all treatments
 * - COMMON_BILLING_ONLY: Same chipId, identical billing, approved text drift
 * - TREATMENT_SPECIFIC: Only in one treatment
 * - BILLING_SHARED_GROUP: Multiple chips share same billingRef (e.g. kanalaufbereitung 1-4)
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

interface TextSnippets {
    kurz?: string;
    mittel?: string;
    lang?: string;
}

interface ChipDef {
    id: string;
    billingRef?: Record<string, string> | null;
    textSnippets?: TextSnippets;
}

const KB_DIR = './src/docudent/core/billing/knowledgeBase/treatments';
const REGISTERED_PACKS = ['fuellung', 'endo'];

type ChipClassification =
    | 'COMMON_IDENTICAL'
    | 'COMMON_BILLING_ONLY'
    | 'TREATMENT_SPECIFIC';

function loadChips(treatmentId: string): { treatmentId: string; chip: ChipDef }[] {
    const kbPath = path.join(KB_DIR, treatmentId, 'unified.json');
    if (!fs.existsSync(kbPath)) return [];
    const kb = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
    return (kb.chips || []).map((c: ChipDef) => ({ treatmentId, chip: c }));
}

function normalizeBillingRef(ref?: Record<string, string> | null): string {
    if (!ref) return 'null';
    return Object.entries(ref)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join(',');
}

function normalizeTextSnippets(snippets?: TextSnippets): string {
    if (!snippets) return '';
    return [snippets.kurz, snippets.mittel, snippets.lang].filter(Boolean).join('|||');
}

describe('gate-m26-common-chip-classification', () => {
    // Collect all chips from all treatments
    const chipsByTreatment = new Map<string, { treatmentId: string; chip: ChipDef }[]>();
    const allChipIds = new Set<string>();

    for (const treatmentId of REGISTERED_PACKS) {
        const chips = loadChips(treatmentId);
        for (const entry of chips) {
            const id = entry.chip.id;
            allChipIds.add(id);
            if (!chipsByTreatment.has(id)) chipsByTreatment.set(id, []);
            chipsByTreatment.get(id)!.push(entry);
        }
    }

    // Classify each chip
    const classifications = new Map<string, ChipClassification>();

    for (const [chipId, entries] of chipsByTreatment) {
        if (entries.length === 1) {
            classifications.set(chipId, 'TREATMENT_SPECIFIC');
        } else {
            // Check if billing matches
            const billingRefs = new Set(entries.map(e => normalizeBillingRef(e.chip.billingRef)));
            const textSnippets = new Set(entries.map(e => normalizeTextSnippets(e.chip.textSnippets)));

            if (billingRefs.size > 1) {
                // This should be caught by billing mismatch gate
                classifications.set(chipId, 'COMMON_BILLING_ONLY');
            } else if (textSnippets.size > 1) {
                // Same billing, different text
                classifications.set(chipId, 'COMMON_BILLING_ONLY');
            } else {
                // Completely identical
                classifications.set(chipId, 'COMMON_IDENTICAL');
            }
        }
    }

    // Group by classification
    const byClassification = new Map<ChipClassification, string[]>();
    for (const [chipId, classification] of classifications) {
        if (!byClassification.has(classification)) {
            byClassification.set(classification, []);
        }
        byClassification.get(classification)!.push(chipId);
    }

    // SNAPSHOT: Expected classification counts
    // Update these when chips are added/removed
    const SNAPSHOT = {
        COMMON_IDENTICAL: ['perk_neg', 'perk_pos', 'vipr_neg', 'vipr_pos'].sort(),
        COMMON_BILLING_ONLY: ['kofferdam', 'la_infiltr', 'la_leitung'].sort(),
    };

    test('common identical chips match snapshot', () => {
        const actual = (byClassification.get('COMMON_IDENTICAL') || []).sort();
        console.log('\n📋 COMMON_IDENTICAL chips:');
        for (const c of actual) {
            console.log(`   ${c}`);
        }
        expect(actual).toEqual(SNAPSHOT.COMMON_IDENTICAL);
    });

    test('common billing-only chips match snapshot', () => {
        const actual = (byClassification.get('COMMON_BILLING_ONLY') || []).sort();
        console.log('\n📋 COMMON_BILLING_ONLY chips (text drift allowed):');
        for (const c of actual) {
            console.log(`   ${c}`);
        }
        expect(actual).toEqual(SNAPSHOT.COMMON_BILLING_ONLY);
    });

    test('treatment-specific chips are logged', () => {
        const specific = (byClassification.get('TREATMENT_SPECIFIC') || []).sort();
        console.log(`\n📋 TREATMENT_SPECIFIC chips: ${specific.length}`);

        // Group by treatment
        const byTreatment = new Map<string, string[]>();
        for (const chipId of specific) {
            const entry = chipsByTreatment.get(chipId)![0];
            const t = entry.treatmentId;
            if (!byTreatment.has(t)) byTreatment.set(t, []);
            byTreatment.get(t)!.push(chipId);
        }

        for (const [t, chips] of byTreatment) {
            console.log(`   ${t}: ${chips.sort().join(', ')}`);
        }

        expect(specific.length).toBeGreaterThan(0);
    });

    test('classification summary', () => {
        console.log('\n📊 M26 Chip Classification Summary:');
        console.log(`   Total chips: ${allChipIds.size}`);
        console.log(`   COMMON_IDENTICAL: ${byClassification.get('COMMON_IDENTICAL')?.length || 0}`);
        console.log(`   COMMON_BILLING_ONLY: ${byClassification.get('COMMON_BILLING_ONLY')?.length || 0}`);
        console.log(`   TREATMENT_SPECIFIC: ${byClassification.get('TREATMENT_SPECIFIC')?.length || 0}`);
        expect(allChipIds.size).toBeGreaterThan(0);
    });
});
