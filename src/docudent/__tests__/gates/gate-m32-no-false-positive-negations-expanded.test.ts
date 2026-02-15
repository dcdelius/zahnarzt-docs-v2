/**
 * Gate M32: No False Positive Negations Expanded
 * 
 * Specifically asserts MUST NOT billing for negations across both treatments.
 * Focus: "kein/ohne/nicht" must reliably prevent triggers.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';
function expectNoBillingCodes(result: Awaited<ReturnType<typeof runV10>>, codes: string[]) {
    if (result.state === 'output') {
        for (const code of codes) {
            expect(result.output?.billingCodes || []).not.toContain(code);
        }
    }
}

function expectNoChips(result: Awaited<ReturnType<typeof runV10>>, chips: string[]) {
    const actualChips = result.trace?.allChips || [];
    for (const chip of chips) {
        expect(actualChips).not.toContain(chip);
    }
}

describe('gate-m32-no-false-positive-negations-expanded', () => {
    // Füllung negation cases
    describe('Füllung negations', () => {
        it('kein Kofferdam → no BEMA_12', async () => {
            const result = await runV10({
                dictation: 'Füllung 36 mo kein Kofferdam',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '36', surfaces: ['mo'], diagnosis: 'caries_media' },
                    forceAnswers: { medical_ueberkappung: 'keine' },
                },
            });

            expect(result.state).not.toBe('error');
            expectNoChips(result, ['kofferdam']);
            expectNoBillingCodes(result, ['BEMA_12']);
        });

        it('ohne Betäubung → no BEMA_40/41a', async () => {
            const result = await runV10({
                dictation: 'Füllung 36 mo ohne Betäubung',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '36', surfaces: ['mo'], diagnosis: 'caries_media', la_type: 'none' },
                    forceAnswers: { medical_ueberkappung: 'keine' },
                },
            });

            expect(result.state).not.toBe('error');
            expectNoChips(result, ['la_infiltr', 'la_leitung']);
            expectNoBillingCodes(result, ['BEMA_40', 'BEMA_41a']);
        });

        it('keine Überkappung → no BEMA_25/26', async () => {
            const result = await runV10({
                dictation: 'Füllung 36 mo Caries media keine Überkappung',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '36', surfaces: ['mo'], diagnosis: 'caries_media' },
                    forceAnswers: { medical_ueberkappung: 'keine' },
                },
            });

            expect(result.state).not.toBe('error');
            expectNoChips(result, ['cp', 'p']);
            expectNoBillingCodes(result, ['BEMA_25', 'BEMA_26']);
        });
    });

    // Endo negation cases
    describe('Endo negations', () => {
        it('keine Einlage → no BEMA_33', async () => {
            const result = await runV10({
                dictation: 'WKB 46 keine Einlage direkt WF',
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '46', canalCount: 3, einlage: false },
                },
            });

            expect(result.state).not.toBe('error');
            expectNoChips(result, ['einlage_caoh2']);
            expectNoBillingCodes(result, ['BEMA_33']);
        });

        it('kein Röntgen → no BEMA_Ä925a', async () => {
            const result = await runV10({
                dictation: 'WKB 46 kein Röntgen WL elektrisch',
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '46', canalCount: 3, wl_method: 'elektrisch' },
                },
            });

            expect(result.state).not.toBe('error');
            expectNoChips(result, ['roentgen', 'laengenmessung_roentgen']);
            expectNoBillingCodes(result, ['BEMA_Ä925a']);
        });
    });

    // Confusable protections
    describe('Confusable protections', () => {
        it('NaCl ≠ NaOCl (no false positive)', async () => {
            const result = await runV10({
                dictation: 'WKB 46 Spülung NaCl physiologisch',
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '46', canalCount: 3 },
                },
            });

            expect(result.state).not.toBe('error');
            expectNoChips(result, ['spuelung_naocl']);
        });

        it('Patient spült zuhause ≠ intraop', async () => {
            const result = await runV10({
                dictation: 'WKB 46 Patient soll zuhause spülen',
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '46', canalCount: 3 },
                },
            });

            expect(result.state).not.toBe('error');
            expectNoChips(result, ['spuelung_naocl', 'spuelung_edta']);
        });
    });
});
