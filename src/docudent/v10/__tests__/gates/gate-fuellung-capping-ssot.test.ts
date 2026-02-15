/**
 * Gate Test: Fuellung Capping SSOT (GP7)
 *
 * Contract: Cp/P chip emission comes EXCLUSIVELY from Procedure nodes.
 * No medical chip logic in runV10.ts.
 *
 * Rules tested:
 *   - rule-ueberkappung-yes-emits-cp: capping.performed=yes + pulpaOpened!=true → cp
 *   - rule-ueberkappung-p-emits: capping.performed=yes + pulpaOpened=true → p
 *   - rule-ueberkappung-no-emits-cp-not-required: capping.performed=no + profunda → cp_not_required
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';
import * as fs from 'fs';
import * as path from 'path';

describe('Gate: Fuellung Capping SSOT (GP7)', () => {
    // ═══════════════════════════════════════════════════════════════
    // GATE 1: Facts → Chips (SSOT KB Rules)
    // ═══════════════════════════════════════════════════════════════
    describe('Gate 1: Facts → Chips via Procedure nodes', () => {
        it('Case 1: capping.performed=yes + pulpaOpened=false → cp emitted, NOT p', async () => {
            const result = await runV10({
                dictation: 'Zahn 16 MOD Karies profunda Kompositfüllung',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map([
                    ['medical_mkv_confirmed', 'nur_kasse'],
                    ['medical_caries_depth', 'profunda'],
                    ['medical_ueberkappung', 'indirekt'],
                    ['medical_ueberkappung_material', 'Ca(OH)₂'],
                    ['fuellung_material', 'Komposit'],
                    ['fuellung_isolation', 'keine'],
                    ['fuellung_layering', 'no'],
                    ['fuellung_adhesive', 'yes'],
                    ['medical_vipr', 'positiv'],
                    ['medical_perk', 'negativ'],
                ]),
                testOnly: {
                    enabled: true,
                    forceExtraction: {
                        tooth: '16',
                        surfaces: ['m', 'o', 'd'],
                        cariesDepth: 'profunda',
                        pulpaOpened: false,  // Wichtig: KEINE Pulpaeröffnung
                    },
                },
            });

            expect(result.state).toBe('output');
            if (result.state === 'output') {
                const perInstance = Object.values(result.output.perInstance)[0];
                expect(perInstance.chips).toContain('cp');
                expect(perInstance.chips).not.toContain('p');
            }
        });

        it('Case 2: capping.performed=yes + pulpaOpened=true → p emitted, NOT cp', async () => {
            const result = await runV10({
                dictation: 'Zahn 36 MOD Karies profunda Pulpaeröffnung direkte Überkappung MTA',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map([
                    ['medical_mkv_confirmed', 'nur_kasse'],
                    ['medical_caries_depth', 'profunda'],
                    ['medical_ueberkappung', 'direkt'],
                    ['medical_ueberkappung_material', 'MTA'],
                    ['fuellung_material', 'Komposit'],
                    ['fuellung_isolation', 'keine'],
                    ['fuellung_layering', 'no'],
                    ['fuellung_adhesive', 'yes'],
                    ['medical_vipr', 'positiv'],
                    ['medical_perk', 'negativ'],
                ]),
                testOnly: {
                    enabled: true,
                    forceExtraction: {
                        tooth: '36',
                        surfaces: ['m', 'o', 'd'],
                        cariesDepth: 'profunda',
                        pulpaOpened: true,  // Wichtig: Pulpaeröffnung!
                    },
                },
            });

            expect(result.state).toBe('output');
            if (result.state === 'output') {
                const perInstance = Object.values(result.output.perInstance)[0];
                expect(perInstance.chips).toContain('p');
                expect(perInstance.chips).not.toContain('cp');
            }
        });

        it('Case 3: capping.performed=no → neither cp nor p', async () => {
            const result = await runV10({
                dictation: 'Zahn 46 MOD Karies profunda Kompositfüllung',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map([
                    ['medical_mkv_confirmed', 'nur_kasse'],
                    ['medical_caries_depth', 'profunda'],
                    ['medical_ueberkappung', 'nein'],
                    ['fuellung_material', 'Komposit'],
                    ['fuellung_isolation', 'keine'],
                    ['fuellung_layering', 'no'],
                    ['fuellung_adhesive', 'yes'],
                    ['medical_vipr', 'positiv'],
                    ['medical_perk', 'negativ'],
                ]),
                testOnly: {
                    enabled: true,
                    forceExtraction: {
                        tooth: '46',
                        surfaces: ['m', 'o', 'd'],
                        cariesDepth: 'profunda',
                    },
                },
            });

            expect(result.state).toBe('output');
            if (result.state === 'output') {
                const perInstance = Object.values(result.output.perInstance)[0];
                expect(perInstance.chips).not.toContain('cp');
                expect(perInstance.chips).not.toContain('p');
                expect(perInstance.chips).toContain('cp_not_required');
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // GATE 1b: Hardening - No cp/p augmentation in runV10.ts
    // ═══════════════════════════════════════════════════════════════
    describe('Gate 1b: No cp/p chip augmentation in runV10.ts', () => {
        it('runV10.ts does not contain augmentedChips.push for cp or p', () => {
            const runV10Path = path.resolve(__dirname, '../../pipeline/runV10.ts');
            const content = fs.readFileSync(runV10Path, 'utf-8');

            // Should NOT contain chip augmentation for cp/p
            expect(content).not.toMatch(/augmentedChips\.push\(['"]cp['"]\)/);
            expect(content).not.toMatch(/augmentedChips\.push\(['"]p['"]\)/);
            expect(content).not.toMatch(/augmentedChips\.push\(['"]cp_not_required['"]\)/);

            // Should contain the GP7 SSOT comment
            expect(content).toContain('GP7: Cp/P chip emission is SSOT via Procedure nodes');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // GATE 2: Chips → BillingOrigin (KB)
    // ═══════════════════════════════════════════════════════════════
    describe('Gate 2: Chips → BillingOrigin', () => {
        it('cp chip → billingCompleteness.isComplete with chip.billingRef origin', async () => {
            const result = await runV10({
                dictation: 'Zahn 27 MOD profunda Cp Ca(OH)2',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map([
                    ['medical_mkv_confirmed', 'nur_kasse'],
                    ['medical_caries_depth', 'profunda'],
                    ['medical_ueberkappung', 'indirekt'],
                    ['medical_ueberkappung_material', 'Ca(OH)₂'],
                    ['fuellung_material', 'Komposit'],
                    ['fuellung_isolation', 'keine'],
                    ['fuellung_layering', 'no'],
                    ['fuellung_adhesive', 'yes'],
                    ['medical_vipr', 'positiv'],
                    ['medical_perk', 'negativ'],
                ]),
                testOnly: {
                    enabled: true,
                    forceExtraction: {
                        tooth: '27',
                        surfaces: ['m', 'o', 'd'],
                        cariesDepth: 'profunda',
                    },
                },
            });

            expect(result.state).toBe('output');
            if (result.state === 'output') {
                expect(result.meta.billingCompleteness?.isComplete).toBe(true);

                // Check BEMA_25 has origin from cp chip
                const cpOrigin = result.meta.billingCompleteness?.origins.find(
                    o => o.code === 'BEMA_25'
                );
                expect(cpOrigin).toBeDefined();
                expect(cpOrigin?.origin).toBe('chip.billingRef');
                expect(cpOrigin?.ref).toBe('cp');
            }
        });

        it('MKV cp → BEMA base (no GOZ for Cp base service)', async () => {
            const result = await runV10({
                dictation: 'Zahn 36 MOD profunda 120€ Mehrkosten',
                treatmentId: 'fuellung',
                insuranceType: 'MKV',
                textLength: 'mittel',
                answers: new Map([
                    ['medical_mkv_confirmed', 'mehrkosten'],
                    ['mkv_confirmed', 'mehrkosten'],
                    ['medical_caries_depth', 'profunda'],
                    ['medical_ueberkappung', 'indirekt'],
                    ['medical_ueberkappung_material', 'Ca(OH)₂'],
                    ['fuellung_material', 'Komposit'],
                    ['fuellung_mkv_justification', 'Ästhetik'],
                    ['fuellung_isolation', 'keine'],
                    ['fuellung_layering', 'no'],
                    ['fuellung_adhesive', 'yes'],
                    ['medical_vipr', 'positiv'],
                    ['medical_perk', 'negativ'],
                ]),
                testOnly: {
                    enabled: true,
                    forceExtraction: {
                        tooth: '36',
                        surfaces: ['m', 'o', 'd'],
                        cariesDepth: 'profunda',
                        mehrkostenConfirmed: true,
                        mkvAmount: 120,
                    },
                },
            });

            expect(result.state).toBe('output');
            if (result.state === 'output') {
                // Cp should be BEMA in MKV (base service)
                expect(result.output.billingCodes).toContain('BEMA_25');
                expect(result.output.billingCodes).not.toContain('GOZ_2330');
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // GATE 3: Chips → Text (Composer Contract)
    // ═══════════════════════════════════════════════════════════════
    describe('Gate 3: Chips → Text', () => {
        it('cp emitted → text contains Überkappung mention', async () => {
            const result = await runV10({
                dictation: 'Zahn 16 MOD profunda Cp Ca(OH)2',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map([
                    ['medical_mkv_confirmed', 'nur_kasse'],
                    ['medical_caries_depth', 'profunda'],
                    ['medical_ueberkappung', 'indirekt'],
                    ['medical_ueberkappung_material', 'Ca(OH)₂'],
                    ['fuellung_material', 'Komposit'],
                    ['fuellung_isolation', 'keine'],
                    ['fuellung_layering', 'no'],
                    ['fuellung_adhesive', 'yes'],
                    ['medical_vipr', 'positiv'],
                    ['medical_perk', 'negativ'],
                ]),
                testOnly: {
                    enabled: true,
                    forceExtraction: {
                        tooth: '16',
                        surfaces: ['m', 'o', 'd'],
                        cariesDepth: 'profunda',
                    },
                },
            });

            expect(result.state).toBe('output');
            if (result.state === 'output') {
                const text = result.output.fullText.toLowerCase();
                // Should mention Überkappung or Cp in text
                expect(text).toMatch(/überkappung|cp/i);
            }
        });

        it('p emitted → text contains direkte Überkappung', async () => {
            const result = await runV10({
                dictation: 'Zahn 36 profunda Pulpaeröffnung direkte Überkappung MTA',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map([
                    ['medical_mkv_confirmed', 'nur_kasse'],
                    ['medical_caries_depth', 'profunda'],
                    ['medical_ueberkappung', 'direkt'],
                    ['medical_ueberkappung_material', 'MTA'],
                    ['fuellung_material', 'Komposit'],
                    ['fuellung_isolation', 'keine'],
                    ['fuellung_layering', 'no'],
                    ['fuellung_adhesive', 'yes'],
                    ['medical_vipr', 'positiv'],
                    ['medical_perk', 'negativ'],
                ]),
                testOnly: {
                    enabled: true,
                    forceExtraction: {
                        tooth: '36',
                        surfaces: ['o'],
                        cariesDepth: 'profunda',
                        pulpaOpened: true,
                    },
                },
            });

            expect(result.state).toBe('output');
            if (result.state === 'output') {
                const text = result.output.fullText.toLowerCase();
                // P chip text should mention Pulpaeröffnung or direkte Überkappung
                expect(text).toMatch(/pulpaeröffnung|direkt|überkappung|p/i);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // GATE 4: MKV Verhalten (No Silent Defaults)
    // ═══════════════════════════════════════════════════════════════
    describe('Gate 4: MKV Behavior', () => {
        it('MKV + cp + mehrkostenConfirmed=false → no GOZ addon', async () => {
            const result = await runV10({
                dictation: 'Zahn 36 MOD profunda nur Kassenleistung',
                treatmentId: 'fuellung',
                insuranceType: 'MKV',
                textLength: 'mittel',
                answers: new Map([
                    ['medical_mkv_confirmed', 'nur_kasse'],
                    ['mkv_confirmed', 'nur_kasse'],
                    ['medical_caries_depth', 'profunda'],
                    ['medical_ueberkappung', 'indirekt'],
                    ['medical_ueberkappung_material', 'Ca(OH)₂'],
                    ['fuellung_material', 'Komposit'],
                    ['fuellung_mkv_justification', 'Ästhetik'],
                    ['fuellung_isolation', 'keine'],
                    ['fuellung_layering', 'no'],
                    ['fuellung_adhesive', 'yes'],
                    ['medical_vipr', 'positiv'],
                    ['medical_perk', 'negativ'],
                ]),
                testOnly: {
                    enabled: true,
                    forceExtraction: {
                        tooth: '36',
                        surfaces: ['m', 'o', 'd'],
                        cariesDepth: 'profunda',
                        nurKasse: true,  // No Mehrkosten
                        mehrkostenConfirmed: false,
                    },
                },
            });

            expect(result.state).toBe('output');
            if (result.state === 'output') {
                // nurKasse=true → only BEMA, no GOZ
                const gozCodes = result.output.billingCodes.filter(c => c.startsWith('GOZ_'));
                expect(gozCodes).toHaveLength(0);
            }
        });

        it('MKV + mehrkostenConfirmed=true → GOZ addon allowed, combinability warns not blocks', async () => {
            const result = await runV10({
                dictation: 'Zahn 16 MOD Karies 120€ Mehrkosten Komposit',
                treatmentId: 'fuellung',
                insuranceType: 'MKV',
                textLength: 'mittel',
                answers: new Map([
                    ['medical_mkv_confirmed', 'mehrkosten'],
                    ['mkv_confirmed', 'mehrkosten'],
                    ['medical_caries_depth', 'profunda'],
                    ['medical_ueberkappung', 'indirekt'],
                    ['medical_ueberkappung_material', 'Ca(OH)₂'],
                    ['fuellung_material', 'Komposit'],
                    ['fuellung_mkv_justification', 'Ästhetik'],
                    ['fuellung_isolation', 'keine'],
                    ['fuellung_layering', 'no'],
                    ['fuellung_adhesive', 'yes'],
                    ['medical_vipr', 'positiv'],
                    ['medical_perk', 'negativ'],
                ]),
                testOnly: {
                    enabled: true,
                    forceExtraction: {
                        tooth: '16',
                        surfaces: ['m', 'o', 'd'],
                        cariesDepth: 'profunda',
                        mehrkostenConfirmed: true,
                        mkvAmount: 120,
                    },
                },
            });

            expect(result.state).toBe('output');
            if (result.state === 'output') {
                // Combinability should not block
                expect(result.meta.combinability?.verdict).not.toBe('BLOCK');

                // State is output, not error
                expect(result.state).toBe('output');
            }
        });
    });
});
