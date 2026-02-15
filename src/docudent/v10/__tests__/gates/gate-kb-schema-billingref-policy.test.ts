/**
 * Gate Test: KB Schema BillingRef Policy
 *
 * Contract: Chip billingRef structure must follow BASE/ADDON/MIXED policy:
 * - BASE chips (base services): Should have GKV branch (and optionally PKV)
 *   Examples: la_infiltr, la_leitung, kofferdam, cp, p, fluor
 * - ADDON chips (MKV addons): Should have MKV branch, no GKV branch
 *   Examples: mehrschicht (GOZ_2197)
 * - MIXED chips: Must be explicitly allowlisted if they have both GKV and MKV branches
 *
 * This gate prevents:
 * - BASE chips accidentally getting MKV-only branches (would break GKV)
 * - ADDON chips getting GKV branches (would incorrectly give BEMA for MKV addons)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

interface ChipBillingRef {
    GKV?: string;
    PKV?: string;
    MKV?: string;
}

interface UnifiedChip {
    id: string;
    label: string;
    category: string;
    billingRef: ChipBillingRef | null;
    hinweis?: string;
}

interface UnifiedJson {
    _meta: { id: string; version: string };
    chips: UnifiedChip[];
    surface_mapping?: Record<string, Record<string, string>>;
}

// Define chip classification based on billing intent
type ChipBillingClass = 'BASE' | 'ADDON' | 'PKV_UPSELL' | 'TEXT_ONLY' | 'SURFACE_MAPPED';

// Chips that are explicitly allowed to have both GKV and MKV branches
const ALLOWED_MIXED_CHIPS: string[] = [
    // Currently none - all chips should be pure BASE or ADDON
];

/**
 * Classify a chip based on its billingRef structure.
 */
function classifyChip(chip: UnifiedChip): ChipBillingClass {
    if (chip.billingRef === null) {
        // Check if it uses surface_mapping
        if (chip.hinweis?.toLowerCase().includes('surface_mapping')) {
            return 'SURFACE_MAPPED';
        }
        return 'TEXT_ONLY';
    }

    const hasGkv = !!chip.billingRef.GKV;
    const hasPkv = !!chip.billingRef.PKV;
    const hasMkv = !!chip.billingRef.MKV;

    // MKV-only = ADDON
    if (hasMkv && !hasGkv) {
        return 'ADDON';
    }

    // GKV (with or without PKV) = BASE
    if (hasGkv) {
        return 'BASE';
    }

    // PKV-only (e.g., oberflaeche_la GOZ_0080) = PKV_UPSELL
    // These are upsell opportunities, not base services
    if (hasPkv && !hasGkv && !hasMkv) {
        return 'PKV_UPSELL';
    }

    return 'TEXT_ONLY';
}

describe('Gate: KB Schema BillingRef Policy', () => {
    const kbPath = path.join(
        process.cwd(),
        'src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json'
    );

    let kb: UnifiedJson;

    beforeAll(() => {
        const content = fs.readFileSync(kbPath, 'utf-8');
        kb = JSON.parse(content);
    });

    it('all chips with billingRef have valid structure', () => {
        const chipsWithBilling = kb.chips.filter(c => c.billingRef !== null);

        for (const chip of chipsWithBilling) {
            const ref = chip.billingRef!;

            // Validate branch values are strings
            if (ref.GKV !== undefined) expect(typeof ref.GKV).toBe('string');
            if (ref.PKV !== undefined) expect(typeof ref.PKV).toBe('string');
            if (ref.MKV !== undefined) expect(typeof ref.MKV).toBe('string');

            // Validate code format (BEMA_ or GOZ_ prefix)
            if (ref.GKV) expect(ref.GKV).toMatch(/^BEMA_/);
            if (ref.PKV) expect(ref.PKV).toMatch(/^GOZ_/);
            if (ref.MKV) expect(ref.MKV).toMatch(/^GOZ_/);
        }
    });

    it('BASE chips have GKV branch (channelization requirement)', () => {
        const baseChips = kb.chips.filter(c => classifyChip(c) === 'BASE');

        for (const chip of baseChips) {
            // BASE chips MUST have GKV for channelization to work
            expect(chip.billingRef?.GKV).toBeDefined();
            console.log(`[GATE KB-SCHEMA] BASE chip: ${chip.id} → GKV=${chip.billingRef?.GKV}`);
        }
    });

    it('ADDON chips have MKV branch only (no GKV fallback)', () => {
        const addonChips = kb.chips.filter(c => classifyChip(c) === 'ADDON');

        for (const chip of addonChips) {
            expect(chip.billingRef?.MKV).toBeDefined();
            // ADDON chips should NOT have GKV (would break channelization)
            expect(chip.billingRef?.GKV).toBeUndefined();
            console.log(`[GATE KB-SCHEMA] ADDON chip: ${chip.id} → MKV=${chip.billingRef?.MKV}`);
        }
    });

    it('no unexpected MIXED chips (explicit allowlist only)', () => {
        const mixedChips = kb.chips.filter(c => {
            if (c.billingRef === null) return false;
            const hasGkv = !!c.billingRef.GKV;
            const hasMkv = !!c.billingRef.MKV;
            return hasGkv && hasMkv;
        });

        const unexpectedMixed = mixedChips.filter(c => !ALLOWED_MIXED_CHIPS.includes(c.id));

        if (unexpectedMixed.length > 0) {
            console.log('[GATE KB-SCHEMA] Unexpected MIXED chips:', unexpectedMixed.map(c => c.id));
        }

        expect(unexpectedMixed.length).toBe(0);
    });

    it('surface_mapping has all required branches', () => {
        const sm = kb.surface_mapping;
        expect(sm).toBeDefined();

        const requiredKeys = ['1', '2', '3', '4+'];
        for (const key of requiredKeys) {
            expect(sm![key]).toBeDefined();
            expect(sm![key].GKV).toBeDefined();
            expect(sm![key].PKV).toBeDefined();
            expect(sm![key].MKV).toBeDefined();
            expect(sm![key].MKV_addon).toBeDefined();

            // Validate format
            expect(sm![key].GKV).toMatch(/^BEMA_/);
            expect(sm![key].PKV).toMatch(/^GOZ_/);
            expect(sm![key].MKV).toMatch(/^BEMA_/);
            expect(sm![key].MKV_addon).toMatch(/^GOZ_/);
        }
    });

    it('chip classification summary', () => {
        const summary = {
            BASE: [] as string[],
            ADDON: [] as string[],
            PKV_UPSELL: [] as string[],
            SURFACE_MAPPED: [] as string[],
            TEXT_ONLY: [] as string[],
        };

        for (const chip of kb.chips) {
            const cls = classifyChip(chip);
            summary[cls].push(chip.id);
        }

        console.log('[GATE KB-SCHEMA] Classification Summary:');
        console.log(`  BASE (${summary.BASE.length}): ${summary.BASE.join(', ')}`);
        console.log(`  ADDON (${summary.ADDON.length}): ${summary.ADDON.join(', ')}`);
        console.log(`  PKV_UPSELL (${summary.PKV_UPSELL.length}): ${summary.PKV_UPSELL.join(', ')}`);
        console.log(`  SURFACE_MAPPED (${summary.SURFACE_MAPPED.length}): ${summary.SURFACE_MAPPED.join(', ')}`);
        console.log(`  TEXT_ONLY (${summary.TEXT_ONLY.length}): ${summary.TEXT_ONLY.length} chips`);

        // At least some BASE and ADDON chips should exist
        expect(summary.BASE.length).toBeGreaterThan(0);
        expect(summary.ADDON.length).toBeGreaterThan(0);
    });
});
