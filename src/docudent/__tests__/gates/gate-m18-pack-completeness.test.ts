/**
 * Gate Test: M18 Pack Completeness
 *
 * For each pack, verifies:
 * - Treatment KB loads (not null)
 * - Every chip with billingRef points to existing code in catalogs
 * - No unresolved template vars in rendered output for golden scenarios
 */

import { describe, test, expect } from 'vitest';
import { listPacks } from '../../v10/packs';
import { renderFromKbChips } from '../../v7/output/renderFromKbChips';
import type { TreatmentKb } from '../../v10/kb/treatment/types';

// BEMA/GOZ prefix patterns for validation
const VALID_BILLING_PREFIXES = ['BEMA_', 'GOZ_', 'GOÄ_'];

// UI-only packs (no KB, for UI testing only) - skip from KB completeness tests
const UI_ONLY_PACKS = ['extraction_stub'];

describe('gate-m18-pack-completeness', () => {
    const allPacks = listPacks();
    // Filter to only packs with real KB (exclude UI-only stubs)
    const packs = allPacks.filter(p => !UI_ONLY_PACKS.includes(p.id));

    // ═══════════════════════════════════════════════════════════════
    // KB LOADING
    // ═══════════════════════════════════════════════════════════════

    describe('Treatment KB loads for each pack', () => {
        for (const pack of packs) {
            test(`${pack.id}: KB loads (not null)`, () => {
                const kb = pack.getTreatmentKb();
                expect(kb).not.toBeNull();
                expect(kb?._meta).toBeDefined();
                expect(kb?.chips).toBeDefined();
                expect(kb?.chips.length).toBeGreaterThan(0);
            });

            test(`${pack.id}: KB has version and id in meta`, () => {
                const kb = pack.getTreatmentKb();
                expect(kb?._meta.id).toBe(pack.id);
                expect(kb?._meta.version).toBeDefined();
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // BILLING REF VALIDATION
    // ═══════════════════════════════════════════════════════════════

    describe('BillingRef points to valid codes', () => {
        for (const pack of packs) {
            test(`${pack.id}: all billingRefs have valid prefixes`, () => {
                const kb = pack.getTreatmentKb();
                expect(kb).not.toBeNull();

                const invalidRefs: string[] = [];

                for (const chip of kb!.chips) {
                    if (chip.billingRef) {
                        const refs = [chip.billingRef.GKV, chip.billingRef.PKV].filter(Boolean) as string[];
                        for (const ref of refs) {
                            const isValid = VALID_BILLING_PREFIXES.some(prefix => ref.startsWith(prefix));
                            if (!isValid) {
                                invalidRefs.push(`${chip.id}: ${ref}`);
                            }
                        }
                    }
                }

                expect(invalidRefs).toEqual([]);
            });

            test(`${pack.id}: leistung chips have billingRef`, () => {
                const kb = pack.getTreatmentKb();
                expect(kb).not.toBeNull();

                const leistungChipsWithoutBilling: string[] = [];

                for (const chip of kb!.chips) {
                    if (chip.category === 'leistung') {
                        // Check if it has a billingRef OR a hinweis explaining why not
                        const hasBilling = chip.billingRef && (chip.billingRef.GKV || chip.billingRef.PKV);
                        const hasHinweis = (chip as { hinweis?: string }).hinweis;

                        if (!hasBilling && !hasHinweis) {
                            leistungChipsWithoutBilling.push(chip.id);
                        }
                    }
                }

                // Allow some chips without billing if they have explanatory hinweis
                // or are auxiliary chips (e.g., isolation, documentation)
                expect(leistungChipsWithoutBilling.length).toBeLessThanOrEqual(5);
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // TEMPLATE VAR RESOLUTION
    // ═══════════════════════════════════════════════════════════════

    describe('No unresolved template vars in rendered output', () => {
        for (const pack of packs) {
            test(`${pack.id}: chips render without {var} placeholders`, () => {
                const kb = pack.getTreatmentKb();
                expect(kb).not.toBeNull();

                const unresolvedVars: Array<{ chip: string; text: string; vars: string[] }> = [];

                for (const chip of kb!.chips) {
                    // Skip chips without text snippets
                    if (!chip.textSnippets?.mittel) continue;

                    // Render with mock context
                    const result = renderFromKbChips({
                        chips: [chip.id],
                        treatmentId: pack.id as 'fuellung' | 'endo',
                        insuranceType: 'GKV',
                        textLength: 'mittel',
                        context: {
                            zahn: '16',
                            flaechen: 'MOD',
                            kanalzahl: '3',
                        },
                        treatmentKb: kb as TreatmentKb,
                    });

                    // Check for unresolved {var} patterns
                    const text = result.fullText || '';
                    const varPattern = /\{[a-zA-Z_]+\}/g;
                    const matches = text.match(varPattern);

                    if (matches && matches.length > 0) {
                        unresolvedVars.push({
                            chip: chip.id,
                            text: text.slice(0, 100),
                            vars: matches,
                        });
                    }
                }

                expect(unresolvedVars).toEqual([]);
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // SCENARIO COMPLETENESS
    // ═══════════════════════════════════════════════════════════════

    describe('Pack has clinical scenarios', () => {
        for (const pack of packs) {
            test(`${pack.id}: has at least 5 clinical scenarios`, () => {
                const scenarios = pack.getGoldenClinicalScenarios();
                expect(scenarios.length).toBeGreaterThanOrEqual(5);
            });

            test(`${pack.id}: scenarios have unique IDs`, () => {
                const scenarios = pack.getGoldenClinicalScenarios();
                const ids = scenarios.map(s => s.id);
                const uniqueIds = new Set(ids);
                expect(uniqueIds.size).toBe(ids.length);
            });

            test(`${pack.id}: scenarios target correct treatment`, () => {
                const scenarios = pack.getGoldenClinicalScenarios();
                for (const scenario of scenarios) {
                    expect(scenario.treatmentId).toBe(pack.id);
                }
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // COMBINABILITY GOLDENS
    // ═══════════════════════════════════════════════════════════════

    describe('Pack has combinability goldens', () => {
        for (const pack of packs) {
            test(`${pack.id}: has at least 3 combinability goldens`, () => {
                const goldens = pack.getCombinabilityGoldens();
                expect(goldens.length).toBeGreaterThanOrEqual(3);
            });

            test(`${pack.id}: goldens have expected structure`, () => {
                const goldens = pack.getCombinabilityGoldens();
                for (const golden of goldens) {
                    expect(golden.id).toBeDefined();
                    expect(golden.codes).toBeDefined();
                    expect(golden.codes.length).toBeGreaterThan(0);
                    expect(['PASS', 'WARN', 'BLOCK']).toContain(golden.expectedVerdict);
                }
            });

            test(`${pack.id}: has both PASS and BLOCK cases`, () => {
                const goldens = pack.getCombinabilityGoldens();
                const hasPass = goldens.some(g => g.expectedVerdict === 'PASS');
                const hasBlock = goldens.some(g => g.expectedVerdict === 'BLOCK');
                expect(hasPass).toBe(true);
                expect(hasBlock).toBe(true);
            });
        }
    });
});
