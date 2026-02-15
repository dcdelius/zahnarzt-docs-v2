/**
 * Gate Test: M25 No Duplicate Concepts
 *
 * Detects chips that may be duplicates (same meaning, different IDs).
 * Uses conceptSignature: hash of (normalized text + billingRef set).
 *
 * Severity levels:
 * - HIGH: Same billingRef + very similar text → likely true duplicate
 * - MED: Same billingRef, different text → review needed
 * - LOW: Different billingRef, similar text → probably intentional
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface ChipDef {
    id: string;
    billingRef?: Record<string, string> | null;
    textSnippets?: Record<string, string>;
    label?: string;
}

const KB_DIR = './src/docudent/core/billing/knowledgeBase/treatments';
const REGISTERED_PACKS = ['fuellung', 'endo'];

function loadChips(treatmentId: string): { treatmentId: string; chip: ChipDef }[] {
    const kbPath = path.join(KB_DIR, treatmentId, 'unified.json');
    if (!fs.existsSync(kbPath)) return [];
    const kb = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
    return (kb.chips || []).map((c: ChipDef) => ({ treatmentId, chip: c }));
}

/**
 * Normalize text for comparison:
 * - Lowercase
 * - Remove variables like {material}
 * - Remove punctuation and extra whitespace
 */
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/\{[^}]+\}/g, '') // Remove {variables}
        .replace(/[^\w\säöüß]/g, ' ') // Keep only word chars and German umlauts
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Get canonical billing reference string (sorted).
 */
function getBillingKey(ref?: Record<string, string> | null): string {
    if (!ref) return '';
    return Object.entries(ref)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join(',');
}

/**
 * Create concept signature hash from text and billing.
 */
function createConceptHash(chip: ChipDef): string {
    const textParts: string[] = [];
    if (chip.textSnippets) {
        // Use longest available text for best comparison
        const text = chip.textSnippets.lang || chip.textSnippets.mittel || chip.textSnippets.kurz || '';
        textParts.push(normalizeText(text));
    }
    const billing = getBillingKey(chip.billingRef);
    const combined = `${textParts.join('|')}::${billing}`;
    return crypto.createHash('md5').update(combined).digest('hex').slice(0, 12);
}

/**
 * Create billing-only signature for higher-confidence duplicate detection.
 */
function createBillingOnlyHash(chip: ChipDef): string {
    const billing = getBillingKey(chip.billingRef);
    if (!billing) return 'NO_BILLING';
    return crypto.createHash('md5').update(billing).digest('hex').slice(0, 8);
}

describe('gate-m25-no-duplicate-concepts', () => {
    // Collect all chips from all treatments
    const allChipEntries: { treatmentId: string; chip: ChipDef; conceptHash: string; billingHash: string }[] = [];

    for (const treatmentId of REGISTERED_PACKS) {
        const chips = loadChips(treatmentId);
        for (const entry of chips) {
            allChipEntries.push({
                ...entry,
                conceptHash: createConceptHash(entry.chip),
                billingHash: createBillingOnlyHash(entry.chip),
            });
        }
    }

    // Build concept signature map (excluding common chips which are expected to be shared)
    const conceptMap = new Map<string, typeof allChipEntries>();
    const billingMap = new Map<string, typeof allChipEntries>();

    for (const entry of allChipEntries) {
        // Concept signature grouping
        if (!conceptMap.has(entry.conceptHash)) conceptMap.set(entry.conceptHash, []);
        conceptMap.get(entry.conceptHash)!.push(entry);

        // Billing-only grouping
        if (!billingMap.has(entry.billingHash)) billingMap.set(entry.billingHash, []);
        billingMap.get(entry.billingHash)!.push(entry);
    }

    // Find potential duplicates (same conceptHash, different chipId)
    const conceptDuplicates: { hash: string; chips: typeof allChipEntries }[] = [];
    for (const [hash, entries] of conceptMap) {
        const uniqueIds = new Set(entries.map(e => e.chip.id));
        if (uniqueIds.size > 1) {
            conceptDuplicates.push({ hash, chips: entries });
        }
    }

    // Find same billing, different IDs (stricter check)
    const billingDuplicates: { hash: string; chips: typeof allChipEntries }[] = [];
    for (const [hash, entries] of billingMap) {
        if (hash === 'NO_BILLING') continue; // Skip chips without billing
        const uniqueIds = new Set(entries.map(e => e.chip.id));
        if (uniqueIds.size > 1) {
            billingDuplicates.push({ hash, chips: entries });
        }
    }

    // Known common chips (allowed to exist in multiple treatments)
    const KNOWN_COMMON_CHIPS = [
        'kofferdam',
        'la_infiltr',
        'la_leitung',
        'perk_neg',
        'perk_pos',
        'vipr_neg',
        'vipr_pos',
    ];

    test('no unexpected concept duplicates across different chip IDs', () => {
        // Filter out known common chips
        const unexpectedDuplicates = conceptDuplicates.filter(dup => {
            const chipIds = [...new Set(dup.chips.map(c => c.chip.id))];
            // If all chip IDs are in the known common list, it's expected
            return !chipIds.every(id => KNOWN_COMMON_CHIPS.includes(id));
        });

        console.log('\n📊 M25 Concept Duplicate Analysis:');
        console.log(`   Total unique concept signatures: ${conceptMap.size}`);
        console.log(`   Concept groups with >1 chipId: ${conceptDuplicates.length}`);
        console.log(`   Unexpected duplicates: ${unexpectedDuplicates.length}`);

        for (const dup of unexpectedDuplicates) {
            const chipIds = [...new Set(dup.chips.map(c => c.chip.id))];
            console.log(`   ⚠️  Hash ${dup.hash}: ${chipIds.join(', ')}`);
        }

        // This should pass - we don't expect hidden duplicates
        expect(unexpectedDuplicates.length).toBe(0);
    });

    test('no unexpected billing duplicates (same billingRef, different chipId)', () => {
        // Filter out known common chips
        const unexpectedBillingDups = billingDuplicates.filter(dup => {
            const chipIds = [...new Set(dup.chips.map(c => c.chip.id))];
            // If all chip IDs are in known common list, it's expected
            return !chipIds.every(id => KNOWN_COMMON_CHIPS.includes(id));
        });

        console.log('\n📊 M25 Billing Duplicate Analysis:');
        console.log(`   Billing groups with >1 chipId: ${billingDuplicates.length}`);
        console.log(`   Unexpected billing duplicates: ${unexpectedBillingDups.length}`);

        for (const dup of unexpectedBillingDups) {
            const chipIds = [...new Set(dup.chips.map(c => c.chip.id))];
            const billing = getBillingKey(dup.chips[0].chip.billingRef);
            console.log(`   ⚠️  ${billing}: ${chipIds.join(', ')}`);
        }

        // Note: Some billing codes are legitimately shared (e.g., BEMA_32 for all kanalaufbereitung variants)
        // These are not true duplicates - they represent "per canal" billing
        // We expect billing duplicates for:
        // - kanalaufbereitung_1/2/3/4 (all use BEMA_32/GOZ_2410 per canal)
        // - wf_kalt/warm/einzel (all use BEMA_34/GOZ_2440 per canal)
        // - roentgen chips (BEMA_Ä925a/GOZ_5000)

        // Allowlist: chips that legitimately share billing codes
        const BILLING_SHARE_ALLOWLIST = [
            'kanalaufbereitung_1',
            'kanalaufbereitung_2',
            'kanalaufbereitung_3',
            'kanalaufbereitung_4',
            'wf_kalt',
            'wf_warm',
            'wf_einzel',
            'roentgen_einzelzahn',
            'roentgen_kontrolle',
            'laengenmessung_roentgen',
        ];

        const trueDuplicates = unexpectedBillingDups.filter(dup => {
            const chipIds = [...new Set(dup.chips.map(c => c.chip.id))];
            return !chipIds.every(id => BILLING_SHARE_ALLOWLIST.includes(id) || KNOWN_COMMON_CHIPS.includes(id));
        });

        console.log(`   True duplicates (after allowlist): ${trueDuplicates.length}`);

        expect(trueDuplicates.length).toBe(0);
    });

    test('logs all detected concept groups for audit trail', () => {
        console.log('\n📋 All Concept Signature Groups:');
        for (const [hash, entries] of conceptMap) {
            const uniqueIds = [...new Set(entries.map(e => e.chip.id))];
            if (uniqueIds.length > 1) {
                const treatments = [...new Set(entries.map(e => e.treatmentId))];
                console.log(`   ${hash}: ${uniqueIds.join(', ')} [${treatments.join(', ')}]`);
            }
        }
        expect(true).toBe(true); // This test is for logging only
    });
});
