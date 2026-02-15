/**
 * Gate Test: Fuellung No Silent Defaults
 *
 * Contract: MKV must NOT emit GOZ addon without mkvConfirmed.
 * nurKasse must suppress all GOZ codes.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

describe('Gate: Fuellung No Silent Defaults', () => {
    it('MKV without mkvConfirmed → no GOZ addon', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 mod Füllung',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
                ['medical_vitality', 'positiv'],
                ['medical_percussion', 'negativ'],
                ['mkv_betrag', '120'],
                ['mkv_confirmed', 'nur_kasse'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o', 'd'],
                    mehrkostenConfirmed: false, // Explicit: NOT confirmed
                },
            },
        });

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            // Should have BEMA base
            const hasBema = codes.some(c => c.startsWith('BEMA_'));
            expect(hasBema).toBe(true);

            // Should NOT have GOZ addon (not confirmed)
            const hasGozAddon = codes.some(c =>
                c.startsWith('GOZ_206') || c.startsWith('GOZ_208') ||
                c.startsWith('GOZ_21') || c === 'GOZ_2197'
            );
            expect(hasGozAddon, `Unexpected GOZ addon without confirmation: ${codes}`).toBe(false);
        }
    });

    it('nurKasse → BEMA only, no GOZ at all', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 mod Füllung nur Kasse',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vitality', 'positiv'],
                ['medical_percussion', 'negativ'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o', 'd'],
                    nurKasse: true,
                },
            },
        });

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            // All codes must be BEMA
            for (const code of codes) {
                expect(code.startsWith('BEMA_'), `Unexpected non-BEMA code: ${code}`).toBe(true);
            }

            // No GOZ at all
            const hasGoz = codes.some(c => c.startsWith('GOZ_'));
            expect(hasGoz).toBe(false);
        }
    });

    it('MKV with explicit mkvConfirmed=true → GOZ addon allowed', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 mod Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_mkv_confirmed', 'mehrkosten'],
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
                ['medical_vitality', 'positiv'],
                ['medical_percussion', 'negativ'],
                ['fuellung_material', 'Komposit'],
                ['fuellung_isolation', 'keine'],
                ['fuellung_layering', 'yes'],
                ['fuellung_adhesive', 'yes'],
                ['mkv_betrag', '120'],
                ['mkv_confirmed', 'mehrkosten'],
                ['fuellung_mkv_justification', 'mehrschicht'],
                ['mkv_justification', 'mehrschicht'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o', 'd'],
                    materialMentioned: 'komposit',
                    mehrkostenConfirmed: true,
                },
            },
        });

        expect(result.state).toBe('output');

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            // Should have BEMA base
            const hasBema = codes.some(c => c.startsWith('BEMA_'));
            expect(hasBema).toBe(true);

            // MAY have GOZ addon (confirmed)
            // Note: GOZ_2197 may be dropped by combinability
            console.log('[GATE] MKV confirmed codes:', codes);
        }
    });

    it('GKV → no GOZ codes ever', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 mod Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_mkv_confirmed', 'nur_kasse'],
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
                ['medical_vitality', 'positiv'],
                ['medical_percussion', 'negativ'],
                ['fuellung_material', 'Komposit'],
                ['fuellung_isolation', 'keine'],
                ['fuellung_layering', 'no'],
                ['fuellung_adhesive', 'yes'],
            ]),
        });

        expect(result.state).toBe('output');

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            for (const code of codes) {
                expect(
                    code.startsWith('BEMA_'),
                    `GKV should not have non-BEMA code: ${code}`
                ).toBe(true);
            }
        }
    });

    it('PKV → no BEMA codes ever', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 mod Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_mkv_confirmed', 'nur_kasse'],
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
                ['medical_vitality', 'positiv'],
                ['medical_percussion', 'negativ'],
                ['fuellung_material', 'Komposit'],
                ['fuellung_isolation', 'keine'],
                ['fuellung_layering', 'no'],
                ['fuellung_adhesive', 'yes'],
            ]),
        });

        expect(result.state).toBe('output');

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            for (const code of codes) {
                expect(
                    code.startsWith('GOZ_'),
                    `PKV should not have non-GOZ code: ${code}`
                ).toBe(true);
            }
        }
    });
});
