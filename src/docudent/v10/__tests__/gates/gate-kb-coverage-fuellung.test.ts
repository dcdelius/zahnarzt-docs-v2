/**
 * Gate Test: Fuellung KB Coverage (GP4)
 *
 * Contract: All chips in the Fuellung unified.json KB have resolvable billing.
 * Every chip with billingRef !== null must have proper GKV/PKV branches.
 * Chips using surface_mapping must have valid surface_mapping entries.
 *
 * NO HARDCODED BILLING CODES - only prefix checks.
 */

import { describe, it, expect } from 'vitest';
import fuellungKb from '../../../core/billing/knowledgeBase/treatments/fuellung/unified.json';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface KbChip {
    id: string;
    label: string;
    billingRef?: {
        GKV?: string;
        PKV?: string;
        MKV?: string;
    } | null;
    hinweis?: string;
    category?: string;
}

interface SurfaceMappingEntry {
    GKV?: string;
    PKV?: string;
    MKV?: string;
    MKV_addon?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE TEST: KB COVERAGE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Gate: Fuellung KB Coverage (GP4)', () => {
    const chips = fuellungKb.chips as KbChip[];
    const surfaceMapping = fuellungKb.surface_mapping as Record<string, SurfaceMappingEntry>;

    describe('Contract: All chips have resolvable billing', () => {
        it('All billing chips have valid billingRef or use surface_mapping', () => {
            const issues: string[] = [];

            for (const chip of chips) {
                // Skip text-only chips (category = befund, info)
                if (chip.category === 'befund' || chip.category === 'info') {
                    continue;
                }

                if (chip.billingRef === null) {
                    // Check if it uses surface_mapping
                    const usesSurfaceMapping = chip.hinweis?.toLowerCase().includes('surface_mapping') ||
                        chip.hinweis?.toLowerCase().includes('f-code');

                    if (!usesSurfaceMapping) {
                        // Text-only chip - allowed
                        continue;
                    }

                    // Uses surface_mapping - verify mapping exists
                    if (!surfaceMapping) {
                        issues.push(`${chip.id}: uses surface_mapping but no surface_mapping in KB`);
                    }
                } else if (chip.billingRef) {
                    // Has direct billingRef - check branches
                    const hasGkv = !!chip.billingRef.GKV;
                    const hasPkv = !!chip.billingRef.PKV;
                    const hasMkv = !!chip.billingRef.MKV;

                    // At least one branch required
                    if (!hasGkv && !hasPkv && !hasMkv) {
                        issues.push(`${chip.id}: billingRef defined but no branches`);
                    }

                    // Validate prefix (NO HARDCODES - only pattern checks)
                    if (hasGkv && !chip.billingRef.GKV!.startsWith('BEMA_')) {
                        issues.push(`${chip.id}: GKV branch should start with BEMA_`);
                    }
                    if (hasPkv && !chip.billingRef.PKV!.startsWith('GOZ_')) {
                        issues.push(`${chip.id}: PKV branch should start with GOZ_`);
                    }
                    if (hasMkv && !chip.billingRef.MKV!.startsWith('GOZ_')) {
                        issues.push(`${chip.id}: MKV branch should start with GOZ_`);
                    }
                }
            }

            if (issues.length > 0) {
                console.error('[KB Coverage] Issues found:', issues);
            }
            expect(issues).toEqual([]);
        });

        it('Surface mapping has all required branches', () => {
            expect(surfaceMapping).toBeDefined();

            const issues: string[] = [];

            for (const [surfaceCount, entry] of Object.entries(surfaceMapping)) {
                if (surfaceCount === '_comment') continue;

                // GKV branch required for F-codes
                if (!entry.GKV) {
                    issues.push(`surface_mapping[${surfaceCount}]: missing GKV branch`);
                } else if (!entry.GKV.startsWith('BEMA_')) {
                    issues.push(`surface_mapping[${surfaceCount}]: GKV should start with BEMA_`);
                }

                // PKV branch required
                if (!entry.PKV) {
                    issues.push(`surface_mapping[${surfaceCount}]: missing PKV branch`);
                } else if (!entry.PKV.startsWith('GOZ_')) {
                    issues.push(`surface_mapping[${surfaceCount}]: PKV should start with GOZ_`);
                }

                // MKV should fallback to GKV (BEMA base)
                if (entry.MKV && !entry.MKV.startsWith('BEMA_')) {
                    issues.push(`surface_mapping[${surfaceCount}]: MKV base should be BEMA_`);
                }
            }

            if (issues.length > 0) {
                console.error('[Surface Mapping] Issues found:', issues);
            }
            expect(issues).toEqual([]);
        });



        it('LA chips have correct channelization (GKV=BEMA, PKV=GOZ)', () => {
            const laChips = chips.filter(c => c.id.startsWith('la_'));

            for (const chip of laChips) {
                expect(chip.billingRef).toBeDefined();

                if (chip.billingRef && chip.billingRef !== null) {
                    // GKV → BEMA_40 or BEMA_41
                    if (chip.billingRef.GKV) {
                        expect(chip.billingRef.GKV.startsWith('BEMA_4')).toBe(true);
                    }
                    // PKV → GOZ_00
                    if (chip.billingRef.PKV) {
                        expect(chip.billingRef.PKV.startsWith('GOZ_0')).toBe(true);
                    }
                    // NO MKV branch for LA (base service)
                    expect(chip.billingRef.MKV).toBeUndefined();
                }
            }
        });

        it('Kofferdam chip has correct channelization', () => {
            const kofferdamChip = chips.find(c => c.id === 'kofferdam');
            expect(kofferdamChip).toBeDefined();

            if (kofferdamChip?.billingRef && kofferdamChip.billingRef !== null) {
                expect(kofferdamChip.billingRef.GKV).toBe('BEMA_12');
                expect(kofferdamChip.billingRef.PKV).toBe('GOZ_2040');
                // NO MKV branch (base service)
                expect(kofferdamChip.billingRef.MKV).toBeUndefined();
            }
        });

        it('Cp/P chips have correct channelization', () => {
            const cpChip = chips.find(c => c.id === 'cp');
            const pChip = chips.find(c => c.id === 'p');

            for (const chip of [cpChip, pChip]) {
                if (chip?.billingRef && chip.billingRef !== null) {
                    expect(chip.billingRef.GKV?.startsWith('BEMA_2')).toBe(true);
                    expect(chip.billingRef.PKV?.startsWith('GOZ_23')).toBe(true);
                }
            }
        });

        it('Mehrschicht chip has MKV branch only (addon)', () => {
            const mehrschichtChip = chips.find(c => c.id === 'mehrschicht');
            expect(mehrschichtChip).toBeDefined();

            if (mehrschichtChip?.billingRef && mehrschichtChip.billingRef !== null) {
                // Mehrschicht is MKV-only addon
                expect(mehrschichtChip.billingRef.MKV).toBeDefined();
                expect(mehrschichtChip.billingRef.MKV?.startsWith('GOZ_')).toBe(true);
                // Should NOT have GKV branch (not a base service)
                expect(mehrschichtChip.billingRef.GKV).toBeUndefined();
            }
        });
    });

    // === Summary stats ===
    it('Summary: KB structure validated', () => {
        expect(chips.length).toBeGreaterThan(10);
        expect(Object.keys(surfaceMapping).length).toBeGreaterThanOrEqual(4);

        const chipWithBilling = chips.filter(c => c.billingRef !== null && c.billingRef !== undefined);
        console.log(`[KB Coverage] Total chips: ${chips.length}, with billing: ${chipWithBilling.length}`);
    });
});
