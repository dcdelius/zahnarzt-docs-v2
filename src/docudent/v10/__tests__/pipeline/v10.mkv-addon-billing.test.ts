/**
 * V10 MKV Addon Billing Contract Test
 *
 * Tests for correct GOZ addon emission when MKV + Mehrkosten:
 * - MKV + komposit/mehrschicht → GOZ_2197 emitted
 * - MKV + "nur Kasse" → NO GOZ addon
 * - "120€" → NO phantom tooth
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

describe('V10 MKV Addon Billing Contract', () => {
    describe('GOZ Addon Emission', () => {
        it('MKV + komposit → should emit GOZ_2197 addon', async () => {
            const result = await runV10({
                dictation: 'Zahn 27 mod mit Anästhesie, Komposit, Mehrschichttechnik, 120€',
                treatmentId: 'fuellung',
                insuranceType: 'MKV',
                textLength: 'mittel',
                answers: new Map([
                    ['fuellung_material', 'komposit'],
                ]),
            });

            console.log('[MKV ADDON] State:', result.state);

            if (result.state === 'output') {
                const billingCodes = result.output?.billingCodes ?? [];
                console.log('[MKV ADDON] Billing codes:', billingCodes);

                // MUST have BEMA for base (GKV part)
                const hasBema = billingCodes.some(c => c.startsWith('BEMA_'));
                expect(hasBema).toBe(true);

                // MUST have GOZ addon for MKV (GOZ_2197 for Mehrschicht or GOZ_2100 for Adhäsiv)
                const hasGozAddon = billingCodes.some(c => c.startsWith('GOZ_'));
                expect(hasGozAddon).toBe(true);
                console.log('[MKV ADDON] GOZ codes found:', billingCodes.filter(c => c.startsWith('GOZ_')));
            }
        });

        it('MKV + "nur Kasse" → should NOT emit GOZ addon', async () => {
            const result = await runV10({
                dictation: 'Zahn 27 mod mit Anästhesie, nur Kasse',
                treatmentId: 'fuellung',
                insuranceType: 'MKV',
                textLength: 'mittel',
                answers: new Map([
                    ['fuellung_material', 'komposit'],
                ]),
            });

            console.log('[NUR KASSE] State:', result.state);

            if (result.state === 'output') {
                const billingCodes = result.output?.billingCodes ?? [];
                console.log('[NUR KASSE] Billing codes:', billingCodes);

                // BEMA codes should be present (base billing)
                const hasBema = billingCodes.some(c => c.startsWith('BEMA_'));
                expect(hasBema).toBe(true);

                // NO GOZ addon when "nur Kasse"
                const hasGozAddon = billingCodes.some(c => c.startsWith('GOZ_'));
                expect(hasGozAddon).toBe(false);
            }
        });

        it('GKV → should NOT emit GOZ codes at all', async () => {
            const result = await runV10({
                dictation: 'Zahn 27 mod mit Anästhesie, Komposit',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map([
                    ['fuellung_material', 'komposit'],
                ]),
            });

            console.log('[GKV] State:', result.state);

            if (result.state === 'output') {
                const billingCodes = result.output?.billingCodes ?? [];
                console.log('[GKV] Billing codes:', billingCodes);

                // BEMA codes only for GKV
                const hasBema = billingCodes.some(c => c.startsWith('BEMA_'));
                expect(hasBema).toBe(true);

                // NEVER GOZ for pure GKV
                const hasGoz = billingCodes.some(c => c.startsWith('GOZ_'));
                expect(hasGoz).toBe(false);
            }
        });
    });

    describe('Phantom Tooth Prevention', () => {
        it('"120€" should NOT create phantom tooth 12 or 20', async () => {
            const result = await runV10({
                dictation: 'Zahn 27 mod, Mehrkosten 120€',
                treatmentId: 'fuellung',
                insuranceType: 'MKV',
                textLength: 'mittel',
                answers: new Map([
                    ['fuellung_material', 'komposit'],
                ]),
            });

            console.log('[PHANTOM] State:', result.state);

            if (result.state === 'output') {
                const perInstance = result.output?.perInstance ?? {};
                const allTeeth = Object.values(perInstance).flatMap(p => p.teeth);
                console.log('[PHANTOM] Teeth:', allTeeth);

                // Should have tooth 27
                expect(allTeeth).toContain('27');

                // Should NOT have phantom teeth from 120€
                expect(allTeeth).not.toContain('12');
                expect(allTeeth).not.toContain('20');
                expect(allTeeth).not.toContain('0');
                expect(allTeeth).not.toContain('1');
            }
        });
    });

    describe('MKV Section Output', () => {
        it('MKV + amount → MKV section should contain amount', async () => {
            const result = await runV10({
                dictation: 'Zahn 27 mod, Mehrkosten 120€',
                treatmentId: 'fuellung',
                insuranceType: 'MKV',
                textLength: 'lang',
                answers: new Map([
                    ['fuellung_material', 'komposit'],
                ]),
            });

            console.log('[MKV SECTION] State:', result.state);

            if (result.state === 'output') {
                const sections = result.output?.sections ?? [];
                const mkvSection = sections.find(s => s.id === 'mkv');
                console.log('[MKV SECTION] Section:', mkvSection);

                if (mkvSection) {
                    // MKV section should contain amount
                    expect(mkvSection.content).toMatch(/120|Mehrkosten/i);
                }

                // Full text should contain MKV info
                const fullText = result.output?.fullText ?? '';
                expect(fullText).toMatch(/Mehrkosten|120/i);
            }
        });
    });
});
