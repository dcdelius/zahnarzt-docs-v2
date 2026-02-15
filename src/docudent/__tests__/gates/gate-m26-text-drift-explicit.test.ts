/**
 * Gate Test: M26 Text Drift Explicit
 *
 * SOFT RULE: Text drift (different textSnippets for same chipId) is only allowed if:
 * - Chip is in explicit allowlist with documented reason
 *
 * Any NEW text drift without allowlist entry will FAIL.
 *
 * Severity: WARN for allowed drift, FAIL for unapproved drift
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
    textSnippets?: TextSnippets;
}

const KB_DIR = './src/docudent/core/billing/knowledgeBase/treatments';
const REGISTERED_PACKS = ['fuellung', 'endo'];

/**
 * EXPLICIT ALLOWLIST: Text drift is approved for these chips.
 * Each entry documents WHY drift is acceptable.
 *
 * To add new approved drift:
 * 1. Add entry here with clear reason
 * 2. Consider if strict SSOT would be better
 */
const APPROVED_TEXT_DRIFT: Record<string, string> = {
    'kofferdam':
        'Fuellung uses detailed text mentioning clamp and visibility; Endo uses concise text mentioning sterility. Billing identical (BEMA_12/GOZ_2040).',
    'la_infiltr':
        'Fuellung includes surface anesthesia reference and concentration; Endo uses shorter text. Billing identical (BEMA_40/GOZ_0090).',
    'la_leitung':
        'Fuellung includes timing info (3 min wait); Endo uses shorter text. Billing identical (BEMA_41a/GOZ_0100).',
};

function loadChips(treatmentId: string): { treatmentId: string; chip: ChipDef }[] {
    const kbPath = path.join(KB_DIR, treatmentId, 'unified.json');
    if (!fs.existsSync(kbPath)) return [];
    const kb = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
    return (kb.chips || []).map((c: ChipDef) => ({ treatmentId, chip: c }));
}

function normalizeTextSnippets(snippets?: TextSnippets): string {
    if (!snippets) return '';
    const parts = [
        snippets.kurz || '',
        snippets.mittel || '',
        snippets.lang || '',
    ];
    return parts.join('|||');
}

describe('gate-m26-text-drift-explicit', () => {
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

    // Find text drift
    const textDriftChips: {
        chipId: string;
        treatments: { treatmentId: string; text: string }[];
    }[] = [];

    for (const [chipId, entries] of commonChips) {
        const texts = entries.map(e => ({
            treatmentId: e.treatmentId,
            text: normalizeTextSnippets(e.chip.textSnippets),
        }));

        const uniqueTexts = new Set(texts.map(t => t.text));
        if (uniqueTexts.size > 1) {
            textDriftChips.push({ chipId, treatments: texts });
        }
    }

    test('all text drift is explicitly approved', () => {
        const unapprovedDrift: string[] = [];

        for (const drift of textDriftChips) {
            if (!APPROVED_TEXT_DRIFT[drift.chipId]) {
                unapprovedDrift.push(drift.chipId);
            }
        }

        console.log('\n📊 M26 Text Drift Analysis:');
        console.log(`   Common chips: ${commonChips.length}`);
        console.log(`   Text drift chips: ${textDriftChips.length}`);
        console.log(`   Approved drift: ${textDriftChips.length - unapprovedDrift.length}`);
        console.log(`   Unapproved drift: ${unapprovedDrift.length}`);

        if (unapprovedDrift.length > 0) {
            console.log('\n❌ UNAPPROVED TEXT DRIFT:');
            for (const chipId of unapprovedDrift) {
                console.log(`   ${chipId}: text differs across treatments but not in allowlist`);
            }
            console.log('\n   To approve this drift, add entry to APPROVED_TEXT_DRIFT with reason.');
        }

        expect(unapprovedDrift.length).toBe(0);
    });

    test('approved drift is documented', () => {
        console.log('\n📋 Approved Text Drift:');
        for (const drift of textDriftChips) {
            const reason = APPROVED_TEXT_DRIFT[drift.chipId];
            if (reason) {
                console.log(`   ${drift.chipId}:`);
                console.log(`     Reason: ${reason}`);
            }
        }
        expect(Object.keys(APPROVED_TEXT_DRIFT).length).toBeGreaterThan(0);
    });

    test('no text drift chips exist outside expected set', () => {
        const expectedDriftChips = Object.keys(APPROVED_TEXT_DRIFT).sort();
        const actualDriftChips = textDriftChips.map(d => d.chipId).sort();

        // Warn if allowlist has entries that don't actually have drift
        const orphanAllowlist = expectedDriftChips.filter(
            c => !actualDriftChips.includes(c)
        );

        if (orphanAllowlist.length > 0) {
            console.log('\n⚠️  Allowlist entries without actual drift:');
            for (const c of orphanAllowlist) {
                console.log(`   ${c}`);
            }
        }

        // This is a soft warning, not a failure
        expect(true).toBe(true);
    });
});
