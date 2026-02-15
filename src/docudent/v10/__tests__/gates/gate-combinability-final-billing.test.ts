/**
 * Gate Test: Combinability Auto-Resolve Final Billing
 *
 * Contract: When GOZ_2197 + GOZ_2060-2120 conflict is auto-resolved,
 * GOZ_2197 MUST NOT appear in the final output.billingCodes.
 *
 * This is an E2E test through the full pipeline.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

describe('Gate: Combinability Auto-Resolve Final Billing', () => {
    it('GOZ_2197 removed from final billingCodes when combined with F-code', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 mod Kompositfüllung Mehrschichttechnik',
            treatmentId: 'fuellung',
            insuranceType: 'PKV',  // Pure PKV to get GOZ only
            textLength: 'mittel',
            answers: new Map([
                ['medical_mkv_confirmed', 'nur_kasse'],
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
                ['fuellung_material', 'Komposit'],
                ['fuellung_isolation', 'keine'],
                ['fuellung_layering', 'yes'],
                ['fuellung_adhesive', 'yes'],
                ['medical_vipr', 'positiv'],
                ['medical_perk', 'negativ'],
            ]),
        });

        // MUST be output, not error
        expect(result.state).toBe('output');

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            // F-code (GOZ_2100 for MOD) should be present
            const hasFcode = codes.some(c =>
                c.startsWith('GOZ_206') || c.startsWith('GOZ_208') ||
                c.startsWith('GOZ_21')
            );
            expect(hasFcode).toBe(true);

            // GOZ_2197 should NOT be in final billing (auto-dropped)
            expect(codes).not.toContain('GOZ_2197');

            // Check perInstance also doesn't have 2197
            for (const [, instance] of Object.entries(result.output.perInstance)) {
                expect(instance.billingRefs).not.toContain('GOZ_2197');
            }

            console.log('[E2E] Final billing codes:', codes);
        }
    });

    it('GOZ_2197 stays when NOT combined with F-code (edge case)', async () => {
        // This is a theoretical case - in practice, fillings always have F-codes
        // but the logic should preserve 2197 if no 2060-2120 present
        // We can't easily test this through full pipeline since fuellung always emits F-code
        // This is verified in gate-combinability-auto-resolve.test.ts
    });

    it('MKV case: GOZ_2197 removed, BEMA base stays', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 mod Kompositfüllung Mehrschichttechnik',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_mkv_confirmed', 'mehrkosten'],
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
                ['medical_vitality', 'negativ'],
                ['medical_percussion', 'negativ'],
                ['fuellung_material', 'Komposit'],
                ['fuellung_isolation', 'keine'],
                ['fuellung_layering', 'yes'],
                ['fuellung_adhesive', 'yes'],
                ['mkv_confirmed', 'mehrkosten'],
                ['fuellung_mkv_justification', 'Mehrschichttechnik'],
                ['mkv_justification', 'mehrschicht'],
                ['mkv_betrag', '120'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o', 'd'],
                    materialMentioned: 'komposit',
                    mehrkostenConfirmed: true,
                    adhesiveTechnique: true,
                    mkvAmount: 120,
                },
            },
        });

        expect(result.state).toBe('output');

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            // BEMA base should be present
            const hasBema = codes.some(c => c.startsWith('BEMA_'));
            expect(hasBema).toBe(true);

            // GOZ_2197 should NOT be in final billing (auto-dropped due to F-code conflict)
            expect(codes).not.toContain('GOZ_2197');

            // But GOZ F-code addon (2100) might be dropped too since it conflicts with 2197
            // Actually: 2197 is anchor, F-codes are blockWith, so F-codes stay, 2197 drops

            console.log('[E2E MKV] Final billing codes:', codes);
        }
    });

    it('warnings in meta, not in fullText', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 mod Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
            ]),
        });

        if (result.state === 'output') {
            const text = result.output.fullText;
            const meta = result.meta;

            // Text should NOT contain warning about dropped codes
            expect(text.toLowerCase()).not.toContain('dropped');
            expect(text.toLowerCase()).not.toContain('2197');

            // Meta may contain combinability info (for debug)
            if (meta.combinability) {
                console.log('[E2E] Meta combinability:', meta.combinability);
            }
        }
    });
});
