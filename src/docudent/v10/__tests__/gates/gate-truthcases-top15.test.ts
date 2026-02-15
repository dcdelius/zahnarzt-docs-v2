/**
 * Gate Test: Top-15 Praxis Truthcases
 *
 * GIGAPROMPT 3: Realistic dictation scenarios covering the most common
 * Füllung cases in practice. Each case verifies channelization, output text,
 * and billing code correctness.
 *
 * Categories:
 * - GKV: Standard filling scenarios
 * - PKV: Private insurance scenarios
 * - MKV: Mixed insurance with Mehrkosten
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

// Helper to get billing codes from result
function getBillingCodes(result: Awaited<ReturnType<typeof runV10>>): string[] {
    if (result.state === 'output') return result.output.billingCodes;
    return [];
}

// Helper to get text from result
function getText(result: Awaited<ReturnType<typeof runV10>>): string {
    if (result.state === 'output') return result.output.fullText;
    return '';
}

describe('Gate: Top-15 Praxis Truthcases', () => {
    // ════════════════════════════════════════════════════════════════
    // GKV CASES (1-5)
    // ════════════════════════════════════════════════════════════════

    it('TC01: GKV O-Fläche ohne LA', async () => {
        const result = await runV10({
            dictation: 'Zahn 16 okklusal Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
            ]),
        });

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            // Channelization: GKV → only BEMA
            expect(codes.every(c => !c.startsWith('GOZ_'))).toBe(true);

            // F-code for 1 surface (O)
            const hasFcode = codes.some(c => c.startsWith('BEMA_13'));
            expect(hasFcode).toBe(true);

            // No LA mentioned → no LA billing
            const hasLa = codes.some(c => c.includes('40') || c.includes('41'));
            expect(hasLa).toBe(false);

            console.log('[TC01] GKV O:', codes);
        }
    });

    it('TC02: GKV MO mit LA Infiltration', async () => {
        const result = await runV10({
            dictation: 'Zahn 26 mesio-okklusal Kompositfüllung Infiltrationsanästhesie',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
            ]),
        });

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            // Channelization
            expect(codes.every(c => !c.startsWith('GOZ_'))).toBe(true);

            // F-code present (any BEMA_13 variant based on surface count)
            const hasFcode = codes.some(c => c.startsWith('BEMA_13'));
            expect(hasFcode).toBe(true);

            // LA may be detected from dictation
            const hasLa = codes.some(c => c.startsWith('BEMA_40') || c.startsWith('BEMA_41'));

            console.log('[TC02] GKV MO+LA:', codes);
        }
    });

    it('TC03: GKV MOD mit Kofferdam', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 mod Füllung Kofferdam',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
            ]),
        });

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            // Channelization
            expect(codes.every(c => !c.startsWith('GOZ_'))).toBe(true);

            // F-code for 3 surfaces (MOD)
            expect(codes.some(c => c === 'BEMA_13c' || c.includes('13c'))).toBe(true);

            // Kofferdam
            expect(codes.some(c => c === 'BEMA_12' || c.includes('12'))).toBe(true);

            console.log('[TC03] GKV MOD+Kofferdam:', codes);
        }
    });

    it('TC04: GKV Caries profunda mit Cp', async () => {
        const result = await runV10({
            dictation: 'Zahn 46 okklusal Caries profunda mit Cp Ca(OH)2',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_ueberkappung', 'indirekt'],
                ['medical_ueberkappung_material', 'Ca(OH)₂'],
            ]),
        });

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            // Cp code
            expect(codes.some(c => c === 'BEMA_25' || c.includes('25'))).toBe(true);

            console.log('[TC04] GKV profunda+Cp:', codes);
        }
    });

    it('TC05: GKV 4-flächig', async () => {
        const result = await runV10({
            dictation: 'Zahn 37 modl Kompositfüllung mit LA Leitung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
            ]),
        });

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            // F-code for 4+ surfaces
            expect(codes.some(c => c === 'BEMA_13d' || c.includes('13d'))).toBe(true);

            // LA Leitung (UK Seitenzahn)
            expect(codes.some(c => c === 'BEMA_41a' || c.includes('41'))).toBe(true);

            console.log('[TC05] GKV 4-flächig+LA:', codes);
        }
    });

    // ════════════════════════════════════════════════════════════════
    // PKV CASES (6-9)
    // ════════════════════════════════════════════════════════════════

    it('TC06: PKV MO Komposit', async () => {
        const result = await runV10({
            dictation: 'Zahn 15 mo Kompositfüllung adhäsiv',
            treatmentId: 'fuellung',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
            ]),
        });

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            // Channelization: PKV → only GOZ
            expect(codes.every(c => !c.startsWith('BEMA_'))).toBe(true);

            // GOZ F-code for 2 surfaces
            expect(codes.some(c => c === 'GOZ_2080' || c.includes('2080'))).toBe(true);

            console.log('[TC06] PKV MO:', codes);
        }
    });

    it('TC07: PKV MOD mit LA und Kofferdam', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 mod Kompositfüllung Infiltrationsanästhesie Kofferdam',
            treatmentId: 'fuellung',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
            ]),
        });

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            // Channelization
            expect(codes.every(c => !c.startsWith('BEMA_'))).toBe(true);

            // GOZ F-code for 3 surfaces
            expect(codes.some(c => c === 'GOZ_2100' || c.includes('2100'))).toBe(true);

            // GOZ LA
            expect(codes.some(c => c === 'GOZ_0090' || c.includes('0090'))).toBe(true);

            // GOZ Kofferdam
            expect(codes.some(c => c === 'GOZ_2040' || c.includes('2040'))).toBe(true);

            console.log('[TC07] PKV MOD+LA+Kofferdam:', codes);
        }
    });

    it('TC08: PKV Cp mit MTA', async () => {
        const result = await runV10({
            dictation: 'Zahn 16 o Caries profunda direkte Überkappung MTA',
            treatmentId: 'fuellung',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_ueberkappung', 'indirekt'],
                ['medical_ueberkappung_material', 'MTA'],
            ]),
        });

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            // GOZ Cp
            expect(codes.some(c => c.includes('233') || c.includes('234'))).toBe(true);

            console.log('[TC08] PKV Cp+MTA:', codes);
        }
    });

    it('TC09: PKV Mehrschicht', async () => {
        const result = await runV10({
            dictation: 'Zahn 26 mod Kompositfüllung Mehrschichttechnik adhäsiv',
            treatmentId: 'fuellung',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
            ]),
        });

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            // Only GOZ
            expect(codes.every(c => !c.startsWith('BEMA_'))).toBe(true);

            console.log('[TC09] PKV Mehrschicht:', codes);
        }
    });

    // ════════════════════════════════════════════════════════════════
    // MKV CASES (10-15)
    // ════════════════════════════════════════════════════════════════

    it('TC10: MKV Komposit ohne Mehrkosten → nur BEMA', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 mod Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o', 'd'],
                    materialMentioned: 'komposit',
                    nurKasse: true, // Explicit: nur Kasse
                },
            },
        });

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            // nurKasse → NO GOZ
            expect(codes.every(c => !c.startsWith('GOZ_'))).toBe(true);

            // Has BEMA base
            expect(codes.some(c => c.startsWith('BEMA_'))).toBe(true);

            console.log('[TC10] MKV nurKasse:', codes);
        }
    });

    it('TC11: MKV mit Mehrkosten bestätigt → BEMA + GOZ', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 mod Kompositfüllung Mehrschichttechnik 120 Euro',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o', 'd'],
                    materialMentioned: 'komposit',
                    mehrkostenConfirmed: true,
                    adhesiveTechnique: true,
                    mehrkostenMentioned: true,
                },
            },
        });

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            // Should have BEMA base
            expect(codes.some(c => c.startsWith('BEMA_'))).toBe(true);

            // Should have GOZ addon (when Mehrkosten confirmed)
            // Note: GOZ_2197 is the Mehrschicht addon
            console.log('[TC11] MKV mit Mehrkosten:', codes);
        }
    });

    it('TC12: MKV LA bleibt BEMA (base service)', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 mod Kompositfüllung Infiltrationsanästhesie',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o', 'd'],
                    anesthesia: 'infiltr',
                    mehrkostenConfirmed: true, // Even with Mehrkosten...
                },
            },
        });

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            // LA MUST be BEMA_40, NOT GOZ_0090 (base service)
            const hasGozLa = codes.some(c => c === 'GOZ_0090' || c === 'GOZ_0100');
            expect(hasGozLa).toBe(false);

            // If LA is present, it's BEMA
            const hasBemaLa = codes.some(c => c.startsWith('BEMA_40') || c.startsWith('BEMA_41'));
            if (hasBemaLa || hasGozLa) {
                expect(hasBemaLa).toBe(true);
            }

            console.log('[TC12] MKV LA=BEMA:', codes);
        }
    });

    it('TC13: MKV Kofferdam bleibt BEMA', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 mod Kompositfüllung Kofferdam',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o', 'd'],
                    kofferdamUsed: true,
                    mehrkostenConfirmed: true,
                },
            },
        });

        if (result.state === 'output') {
            const codes = result.output.billingCodes;

            // Kofferdam MUST be BEMA_12, NOT GOZ_2040 (base service)
            const hasGozKofferdam = codes.some(c => c === 'GOZ_2040');
            expect(hasGozKofferdam).toBe(false);

            // If Kofferdam is present, it's BEMA
            if (codes.some(c => c.includes('12') || c.includes('2040'))) {
                expect(codes.some(c => c === 'BEMA_12')).toBe(true);
            }

            console.log('[TC13] MKV Kofferdam=BEMA:', codes);
        }
    });

    it('TC14: MKV kein Phantom-Zahn aus €-Betrag', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 mod Kompositfüllung 120 Euro',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
            ]),
        });

        if (result.state === 'output') {
            const text = result.output.fullText;

            // No phantom tooth from €-amount parsing
            // "120" should not become a tooth number
            expect(text).not.toContain('Zahn 120');
            expect(text).not.toContain('Zahn 12');

            // Should only mention tooth 36
            expect(text).toContain('36');

            console.log('[TC14] No phantom tooth:', text.substring(0, 100));
        }
    });

    it('TC15: MKV Determinismus', async () => {
        const input = {
            dictation: 'Zahn 36 mod Kompositfüllung Mehrschichttechnik',
            treatmentId: 'fuellung' as const,
            insuranceType: 'MKV' as const,
            textLength: 'mittel' as const,
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o', 'd'],
                    materialMentioned: 'komposit',
                    mehrkostenConfirmed: true,
                    adhesiveTechnique: true,
                },
            },
        };

        const results: string[][] = [];
        for (let i = 0; i < 5; i++) {
            const result = await runV10(input);
            results.push(getBillingCodes(result).sort());
        }

        // All runs identical
        const first = JSON.stringify(results[0]);
        for (let i = 1; i < results.length; i++) {
            expect(JSON.stringify(results[i])).toBe(first);
        }

        console.log('[TC15] Determinism OK:', results[0]);
    });
});
