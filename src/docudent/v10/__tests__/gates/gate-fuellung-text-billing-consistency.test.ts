/**
 * Gate Test: Fuellung Text-Billing Consistency (GP8)
 *
 * Contract: output.fullText must NOT mention any billing code
 * that is NOT in output.billingCodes.
 * DroppedCodes from combinability must be absent from text.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

describe('Gate: Fuellung Text-Billing Consistency (GP8)', () => {
    // ═══════════════════════════════════════════════════════════════
    // Gate 1: Text Only Contains Final BillingCodes
    // ═══════════════════════════════════════════════════════════════
    describe('Gate 1: Text matches final billingCodes', () => {
        const truthcases = [
            { id: 'TC01', dictation: 'Zahn 16 MOD Komposit' },
            { id: 'TC02', dictation: 'Zahn 27 o Amalgam' },
            { id: 'TC03', dictation: 'Zahn 36 MOD Karies profunda Cp' },
            { id: 'TC04', dictation: 'Zahn 46 MO Kofferdam' },
            { id: 'TC05', dictation: 'Zahn 15 OD mit Infiltrationsanästhesie' },
        ];

        for (const tc of truthcases) {
            it(`${tc.id}: billing codes in text are subset of billingCodes`, async () => {
                const material =
                    tc.id === 'TC02' ? 'Amalgam' :
                    tc.id === 'TC03' ? 'Komposit' :
                    'Komposit';

                const ueberkappung =
                    tc.id === 'TC03' ? 'indirekt' : 'nein';

                const answers = new Map<string, string>([
                    ['medical_mkv_confirmed', 'nur_kasse'],
                    ['medical_caries_depth', tc.id === 'TC03' ? 'profunda' : 'normal'],
                    ['medical_ueberkappung', ueberkappung],
                    ['medical_ueberkappung_material', 'Ca(OH)₂'],
                    ['medical_vipr', 'positiv'],
                    ['medical_perk', 'negativ'],
                    ['fuellung_material', material],
                    ['fuellung_isolation', tc.id === 'TC04' ? 'kofferdam' : 'keine'],
                    ['fuellung_layering', 'no'],
                    ['fuellung_adhesive', 'yes'],
                ]);

                const result = await runV10({
                    dictation: tc.dictation,
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    answers,
                    testOnly: { enabled: true },
                });

                expect(result.state).toBe('output');
                if (result.state !== 'output') return;

                const text = result.output.fullText;
                const billingCodes = result.output.billingCodes;

                // Extract BEMA/GOZ codes from text using canonical prefix pattern
                const mentionedCodes = extractBillingCodesFromText(text);

                // Every code mentioned in text must be in billingCodes
                for (const code of mentionedCodes) {
                    expect(billingCodes).toContain(code);
                }
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // Gate 2: DroppedCodes are absent from text
    // ═══════════════════════════════════════════════════════════════
    describe('Gate 2: DroppedCodes absent from text', () => {
        it('MKV Mehrschicht: GOZ_2197 dropped → not in text', async () => {
            // Scenario: MKV with GOZ_2100 and GOZ_2197 → 2197 should be dropped
            const result = await runV10({
                dictation: 'Zahn 16 MOD Komposit Mehrkosten 120€',
                treatmentId: 'fuellung',
                insuranceType: 'MKV',
                textLength: 'mittel',
                answers: new Map([
                    ['medical_mkv_confirmed', 'mehrkosten'],
                    ['mkv_confirmed', 'mehrkosten'],
                    ['fuellung_material', 'Komposit'],
                    ['fuellung_mkv_justification', 'Ästhetik'],
                    ['fuellung_isolation', 'keine'],
                    ['fuellung_layering', 'yes'],
                    ['fuellung_adhesive', 'yes'],
                    ['medical_caries_depth', 'normal'],
                    ['medical_ueberkappung', 'nein'],
                    ['medical_vipr', 'positiv'],
                ]),
                testOnly: {
                    enabled: true,
                    forceExtraction: {
                        tooth: '16',
                        surfaces: ['m', 'o', 'd'],
                        mehrkostenConfirmed: true,
                        mkvAmount: 120,
                    },
                },
            });

            expect(result.state).toBe('output');
            if (result.state !== 'output') return;

            const droppedCodes = result.meta.combinability?.droppedCodes ?? [];

            // If codes were dropped, ensure they're not in text
            for (const droppedCode of droppedCodes) {
                const text = result.output.fullText;
                const codeNumber = droppedCode.replace(/^(GOZ|BEMA)_/, '');

                // Code should not be in billingCodes
                expect(result.output.billingCodes).not.toContain(droppedCode);

                // Code number should not appear in Abrechnung section
                // (This checks for "2197" not appearing after a drop)
                expect(text).not.toContain(`• ${codeNumber}`);
            }
        });

        it('If droppedCodes exist, they must not be in billingCodes', async () => {
            const result = await runV10({
                dictation: 'Zahn 27 MOD Komposit Mehrschicht 150 Euro',
                treatmentId: 'fuellung',
                insuranceType: 'MKV',
                textLength: 'mittel',
                answers: new Map([
                    ['medical_mkv_confirmed', 'mehrkosten'],
                    ['mkv_confirmed', 'mehrkosten'],
                    ['fuellung_material', 'Komposit'],
                    ['fuellung_mkv_justification', 'Adhäsivtechnik'],
                    ['fuellung_isolation', 'keine'],
                    ['fuellung_layering', 'yes'],
                    ['fuellung_adhesive', 'yes'],
                    ['medical_caries_depth', 'normal'],
                    ['medical_ueberkappung', 'nein'],
                    ['medical_vipr', 'positiv'],
                ]),
                testOnly: {
                    enabled: true,
                    forceExtraction: {
                        tooth: '27',
                        surfaces: ['m', 'o', 'd'],
                        mehrkostenConfirmed: true,
                        mkvAmount: 150,
                    },
                },
            });

            expect(result.state).toBe('output');
            if (result.state !== 'output') return;

            const droppedCodes = result.meta.combinability?.droppedCodes ?? [];
            const billingCodes = result.output.billingCodes;

            // Every dropped code must NOT be in final billingCodes
            for (const dropped of droppedCodes) {
                expect(billingCodes).not.toContain(dropped);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Gate 3: Abrechnung section matches billingCodes exactly
    // ═══════════════════════════════════════════════════════════════
    describe('Gate 3: Abrechnung section integrity', () => {
        it('Abrechnung section only contains codes from billingCodes', async () => {
            const result = await runV10({
                dictation: 'Zahn 36 OD Komposit Infiltration',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map([
                    ['medical_mkv_confirmed', 'nur_kasse'],
                    ['medical_caries_depth', 'normal'],
                    ['medical_ueberkappung', 'nein'],
                    ['fuellung_material', 'Komposit'],
                    ['fuellung_isolation', 'keine'],
                    ['fuellung_layering', 'no'],
                    ['fuellung_adhesive', 'yes'],
                    ['medical_vipr', 'positiv'],
                ]),
                testOnly: {
                    enabled: true,
                    forceExtraction: {
                        tooth: '36',
                        surfaces: ['o', 'd'],
                    },
                },
            });

            expect(result.state).toBe('output');
            if (result.state !== 'output') return;

            const abrechnungSection = result.output.sections.find(s => s.id === 'abrechnung');
            expect(abrechnungSection).toBeDefined();

            // Extract code numbers from Abrechnung section
            const codePattern = /• (\d+[a-z]?)/g;
            const matches = [...(abrechnungSection?.content ?? '').matchAll(codePattern)];
            const sectionCodes = matches.map(m => m[1]);

            // Map to canonical form and verify each is in billingCodes
            for (const codeNum of sectionCodes) {
                // Find the canonical code with this number
                const canonical = result.output.billingCodes.find(c =>
                    c.endsWith(`_${codeNum}`)
                );
                expect(canonical).toBeDefined();
            }
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// Helper: Extract billing codes from text
// ═══════════════════════════════════════════════════════════════

function extractBillingCodesFromText(text: string): string[] {
    // Match canonical format: BEMA_XX or GOZ_XXXX
    const canonicalPattern = /\b(GOZ|BEMA)_[0-9a-zA-Z]+\b/g;
    const matches = text.match(canonicalPattern) ?? [];
    return [...new Set(matches)];
}
