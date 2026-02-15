/**
 * Gate M31: False Positive Negations
 * 
 * "kein/ohne/nicht" must reliably prevent triggers.
 * Tests negation handling in extraction and chip logic.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';
import { expectNoFalsePositive } from '../../v10/qa/clinicalAssertions';

describe('gate-m31-false-positive-negations', () => {
    // Cases where negation should prevent chips/billing
    const NEGATION_CASES = [
        {
            id: 'neg_kofferdam',
            dictation: 'Füllung 36 mo kein Kofferdam nur Watterollen',
            forbidden: { chips: ['kofferdam'], billing: ['BEMA_12'] },
        },
        {
            id: 'neg_betaeubung',
            dictation: 'Füllung 16 o ohne Betäubung Patient wünscht keine',
            forbidden: { chips: ['la_infiltr', 'la_leitung'], billing: ['BEMA_40', 'BEMA_41a'] },
        },
        {
            id: 'neg_roentgen',
            dictation: 'Füllung 36 mo keine Röntgenaufnahme',
            forbidden: { billing: ['BEMA_Ä925a'] },
        },
        {
            id: 'neg_cp',
            dictation: 'Füllung 36 mo Caries media keine Überkappung nötig',
            forbidden: { chips: ['cp', 'p'], billing: ['BEMA_25', 'BEMA_26'] },
        },
        {
            id: 'neg_einlage',
            dictation: 'WKB 46 keine medikamentöse Einlage direkt WF',
            forbidden: { chips: ['einlage_caoh2'] },
        },
    ];

    for (const neg of NEGATION_CASES) {
        it(`${neg.id}: negation prevents false positive`, async () => {
            const result = await runV10({
                dictation: neg.dictation,
                treatmentId: neg.dictation.includes('WKB') ? 'endo' : 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '36', surfaces: ['mo'], diagnosis: 'caries_media' },
                },
            });

            // Run false positive check
            const fpResult = expectNoFalsePositive(result, neg.forbidden);

            // Log any failures
            if (!fpResult.passed) {
                console.log(`[${neg.id}] False positives detected:`, fpResult.failures);
            }

            // This is the hard assertion - negations must work
            expect(fpResult.passed).toBe(true);
        });
    }

    // Edge cases with tricky wording
    it('NaCl ≠ NaOCl (similar but different)', async () => {
        const result = await runV10({
            dictation: 'WKB 46 Spülung mit NaCl physiologisch',
            treatmentId: 'endo',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                enabled: true,
                forceExtraction: { tooth: '46', canalCount: 3 },
            },
        });

        // NaCl should NOT trigger NaOCl chip
        const chips = result.trace?.allChips || [];
        expect(chips).not.toContain('spuelung_naocl');
    });

    it('patient spült zuhause ≠ intraoperative Spülung', async () => {
        const result = await runV10({
            dictation: 'WKB 46 Patient soll zuhause mit CHX spülen',
            treatmentId: 'endo',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                enabled: true,
                forceExtraction: { tooth: '46', canalCount: 3 },
            },
        });

        // Home rinse should NOT trigger clinical spülung chips
        const chips = result.trace?.allChips || [];
        expect(chips).not.toContain('spuelung_naocl');
        expect(chips).not.toContain('spuelung_edta');
    });
});
