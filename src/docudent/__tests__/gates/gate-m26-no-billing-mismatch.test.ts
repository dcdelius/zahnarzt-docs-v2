/**
 * Gate Test: M26 No Billing Mismatch
 *
 * HARD RULE: If same chipId exists in multiple treatments, billingRef MUST be identical.
 * This is a billing integrity gate - billing mismatches cause real financial harm.
 *
 * Severity: CRITICAL
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

interface ChipDef {
    id: string;
    billingRef?: Record<string, string> | null;
}

const KB_DIR = './src/docudent/core/billing/knowledgeBase/treatments';
const REGISTERED_PACKS = ['fuellung', 'endo'];

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

describe('gate-m26-no-billing-mismatch', () => {
    // Collect all chips from all treatments
    const chipsByTreatment = new Map<string, { treatmentId: string; chip: ChipDef }[]>();

    for (const treatmentId of REGISTERED_PACKS) {
        const chips = loadChips(treatmentId);
        for (const entry of chips) {
            const id = entry.chip.id;
            if (!chipsByTreatment.has(id)) chipsByTreatment.set(id, []);
            chipsByTreatment.get(id)!.push(entry);
        }
    }

    // Find chips that exist in multiple treatments
    const commonChips = [...chipsByTreatment.entries()].filter(
        ([_, entries]) => entries.length > 1
    );

    test('no billingRef mismatch for common chips (CRITICAL)', () => {
        const mismatches: {
            chipId: string;
            details: { treatment: string; billingRef: string }[];
        }[] = [];

        for (const [chipId, entries] of commonChips) {
            const billingRefs = entries.map(e => ({
                treatment: e.treatmentId,
                billingRef: normalizeBillingRef(e.chip.billingRef),
            }));

            const uniqueRefs = new Set(billingRefs.map(b => b.billingRef));
            if (uniqueRefs.size > 1) {
                mismatches.push({ chipId, details: billingRefs });
            }
        }

        console.log('\n📊 M26 Billing Mismatch Analysis:');
        console.log(`   Common chips checked: ${commonChips.length}`);
        console.log(`   Billing mismatches: ${mismatches.length}`);

        if (mismatches.length > 0) {
            console.log('\n❌ BILLING MISMATCHES FOUND:');
            for (const m of mismatches) {
                console.log(`   ${m.chipId}:`);
                for (const d of m.details) {
                    console.log(`     - ${d.treatment}: ${d.billingRef}`);
                }
            }
        }

        expect(mismatches.length).toBe(0);
    });

    test('all common chips have matching billing (summary)', () => {
        console.log('\n📋 Common Chips Billing Summary:');
        for (const [chipId, entries] of commonChips.sort((a, b) => a[0].localeCompare(b[0]))) {
            const billingRef = normalizeBillingRef(entries[0].chip.billingRef);
            const treatments = entries.map(e => e.treatmentId).join(', ');
            console.log(`   ${chipId}: ${billingRef || 'null'} [${treatments}]`);
        }
        expect(commonChips.length).toBeGreaterThan(0);
    });
});
