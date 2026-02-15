/**
 * Gate Test: M20 Pack Allowlist Must Be Explicit
 *
 * Verifies that pack allowlists are valid:
 * - IDs must exist in treatment KB
 * - Must only be chips with billingRef
 * - No duplicates
 * - Sorted/deterministic
 */

import { describe, test, expect } from 'vitest';
import { listPacks } from '../../v10/packs';

describe('gate-m20-pack-allowlist-must-be-explicit', () => {
    const UI_ONLY_PACKS = ["extraction_stub"]; const packs = listPacks().filter(p => !UI_ONLY_PACKS.includes(p.id));

    // ═══════════════════════════════════════════════════════════════
    // ALLOWLIST VALIDATION
    // ═══════════════════════════════════════════════════════════════

    for (const pack of packs) {
        describe(`Pack: ${pack.id}`, () => {
            test('allowlist IDs exist in KB', () => {
                const kb = pack.getTreatmentKb();
                expect(kb).not.toBeNull();

                const coverageConfig = pack.getCoverageConfig?.() || {};
                const allowlist = coverageConfig.uncoveredBillingChipIds ?? [];

                if (allowlist.length === 0) {
                    // No allowlist is fine
                    return;
                }

                const kbChipIds = new Set(kb!.chips.map(c => c.id));
                const invalidIds: string[] = [];

                for (const id of allowlist) {
                    if (!kbChipIds.has(id)) {
                        invalidIds.push(id);
                    }
                }

                if (invalidIds.length > 0) {
                    console.error(`\n❌ Pack ${pack.id} allowlist contains invalid IDs:`);
                    for (const id of invalidIds) {
                        console.error(`   - ${id} (not in KB)`);
                    }
                }

                expect(invalidIds).toEqual([]);
            });

            test('allowlist only contains billing chips', () => {
                const kb = pack.getTreatmentKb();
                expect(kb).not.toBeNull();

                const coverageConfig = pack.getCoverageConfig?.() || {};
                const allowlist = coverageConfig.uncoveredBillingChipIds ?? [];

                if (allowlist.length === 0) {
                    return;
                }

                // Build map of chip id -> has billingRef
                const chipBillingMap = new Map<string, boolean>();
                for (const chip of kb!.chips) {
                    const hasBilling = !!(chip.billingRef && (chip.billingRef.GKV || chip.billingRef.PKV));
                    chipBillingMap.set(chip.id, hasBilling);
                }

                const nonBillingInAllowlist: string[] = [];
                for (const id of allowlist) {
                    if (!chipBillingMap.get(id)) {
                        nonBillingInAllowlist.push(id);
                    }
                }

                if (nonBillingInAllowlist.length > 0) {
                    console.error(`\n❌ Pack ${pack.id} allowlist contains non-billing chips:`);
                    for (const id of nonBillingInAllowlist) {
                        console.error(`   - ${id} (no billingRef)`);
                    }
                }

                expect(nonBillingInAllowlist).toEqual([]);
            });

            test('allowlist has no duplicates', () => {
                const coverageConfig = pack.getCoverageConfig?.() || {};
                const allowlist = coverageConfig.uncoveredBillingChipIds ?? [];

                const seen = new Set<string>();
                const duplicates: string[] = [];

                for (const id of allowlist) {
                    if (seen.has(id)) {
                        duplicates.push(id);
                    }
                    seen.add(id);
                }

                expect(duplicates).toEqual([]);
            });

            test('allowlist is sorted', () => {
                const coverageConfig = pack.getCoverageConfig?.() || {};
                const allowlist = coverageConfig.uncoveredBillingChipIds ?? [];

                if (allowlist.length <= 1) {
                    return;
                }

                const sorted = [...allowlist].sort();
                expect(allowlist).toEqual(sorted);
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // GLOBAL CHECKS
    // ═══════════════════════════════════════════════════════════════

    test('all packs have getCoverageConfig method or no allowlist needed', () => {
        for (const pack of packs) {
            // getCoverageConfig is optional, so this just validates the interface
            const coverageConfig = pack.getCoverageConfig?.();

            if (coverageConfig) {
                expect(coverageConfig).toHaveProperty('uncoveredBillingChipIds');
            }
        }
    });
});
