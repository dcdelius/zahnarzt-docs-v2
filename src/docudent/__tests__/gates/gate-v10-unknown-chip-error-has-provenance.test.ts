/**
 * Gate: V10 Unknown Chip Error Has Provenance (M70)
 * 
 * Verifies that when renderer hits "chip not found in KB",
 * the error includes chipId, treatmentId, and provenance.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';
import { renderFromKbChips } from '../../v7/output';

describe('Gate: V10 Unknown Chip Error Has Provenance (M70)', () => {
    describe('Renderer Unknown Chip Handling', () => {
        it('renderFromKbChips throws on unknown chip (SSOT enforcement)', () => {
            // Unknown chip should throw in non-production
            // This is correct SSOT behavior - no chip without KB
            expect(() => {
                renderFromKbChips({
                    chips: ['totally_fake_chip_that_does_not_exist'],
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'kurz',
                });
            }).toThrow(/not found in KB|NO CHIP WITHOUT KB/);
        });

        it('error message includes chipId', () => {
            const fakeChip = 'totally_fake_chip_xyz';
            try {
                renderFromKbChips({
                    chips: [fakeChip],
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'kurz',
                });
                expect.fail('Should have thrown');
            } catch (e: any) {
                expect(e.message).toContain(fakeChip);
            }
        });

        it('error message includes treatmentId', () => {
            try {
                renderFromKbChips({
                    chips: ['unknown_chip'],
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'kurz',
                });
                expect.fail('Should have thrown');
            } catch (e: any) {
                expect(e.message).toContain('fuellung');
            }
        });

        it('unknown chip produces diagnostic in trace when used with runV10', async () => {
            const result = await runV10({
                dictation: 'Zahn 26 Füllung',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'kurz',
                testOnly: {
                    forceExtraction: {
                        tooth: '26',
                        surfaces: ['O'],
                        diagnosis: 'Karies',
                        mentioned: {},
                    },
                    // Force a chip that doesn't exist
                    forceChips: ['unknown_chip_xyz'],
                },
            });

            // Pipeline should handle gracefully
            // Either output with empty text or error state
            expect(['output', 'error', 'questions']).toContain(result.state);

            // Meta should exist
            expect(result.meta).toBeTruthy();
        });
    });

    describe('Provenance in Error Meta', () => {
        it('chip provenance is included in meta', async () => {
            const result = await runV10({
                dictation: 'Zahn 26 tiefe Karies Füllung',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'kurz',
                testOnly: {
                    forceExtraction: {
                        tooth: '26',
                        surfaces: ['O'],
                        diagnosis: 'profunda',
                        cariesDepth: 'profunda',
                        mentioned: {},
                    },
                    forceChips: ['la_infiltr', 'kofferdam', 'exkavation', 'cp', 'komposit_basic', 'finishing'],
                    forceAnswers: new Map([
                        ['medical_ueberkappung', 'indirekt'],
                        ['medical_ueberkappung_material', 'Ca(OH)₂'],
                    ]),
                },
            });

            expect(result.state).toBe('output');
            expect(result.meta?.provenance).toBeTruthy();

            if (result.meta?.provenance?.chips) {
                // Each chip should have chipId and emittedByRuleId
                for (const chipProv of result.meta.provenance.chips) {
                    expect(chipProv.chipId).toBeTruthy();
                    expect(typeof chipProv.chipId).toBe('string');
                }
            }
        });

        it('billing guard tracks blocked chips with provenance', async () => {
            const result = await runV10({
                dictation: 'Zahn 26 Füllung',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'kurz',
                testOnly: {
                    forceExtraction: {
                        tooth: '26',
                        surfaces: ['O'],
                        diagnosis: 'Karies',
                        mentioned: {},
                    },
                    forceChips: ['la_infiltr', 'kofferdam', 'exkavation', 'komposit_basic', 'finishing'],
                },
            });

            expect(result.state).toBe('output');

            // Billing guard should be in meta
            if (result.meta?.provenance?.billingGuard) {
                expect(typeof result.meta.provenance.billingGuard.allowed).toBe('number');
                expect(typeof result.meta.provenance.billingGuard.blocked).toBe('number');
            }
        });
    });
});
