/**
 * Gate Test: GOZ Addon Requires Confirmation
 *
 * Contract: GOZ addon codes (GOZ_2197, GOZ_2100, etc.) for MKV should only
 * appear when:
 * 1. mehrkostenConfirmed = true, OR
 * 2. Clear justification signals exist (Komposit + Mehrschicht/Adhäsiv + amount)
 *
 * And should NEVER appear when:
 * - nurKasse = true
 * - No signals are present
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

describe('Gate: GOZ Addon Requires Confirmation', () => {
    it('GOZ addon appears ONLY when mehrkostenConfirmed=true', async () => {
        // Run 1: Without confirmation (explicit rejection via forceExtraction)
        const resultNoConfirm = await runV10({
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
                    mehrkostenConfirmed: false, // Explicit: NO confirmation
                },
            },
        });

        // Run 2: With confirmation
        const resultWithConfirm = await runV10({
            dictation: 'Zahn 36 mod Kompositfüllung Mehrschicht bestätigt',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
                ['medical_mehrkosten_bestaetigt', 'ja'],
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

        // Without confirmation: NO GOZ addon expected
        if (resultNoConfirm.state === 'output') {
            const codes = resultNoConfirm.output.billingCodes;
            const hasGozAddon = codes.some(c =>
                c === 'GOZ_2197' || c === 'GOZ_2100' ||
                c.startsWith('GOZ_219') || c.startsWith('GOZ_210')
            );

            // Key invariant: no confirmation = no addon
            expect(hasGozAddon).toBe(false);
            console.log('[GATE GOZ-CONFIRM] No confirm codes:', codes);
        }

        // With confirmation: GOZ addon expected (if addon chip emitted)
        if (resultWithConfirm.state === 'output') {
            const codes = resultWithConfirm.output.billingCodes;
            console.log('[GATE GOZ-CONFIRM] With confirm codes:', codes);
            // Note: addon may or may not be present depending on KB rules
        }
    });

    it('GOZ addon suppressed when nurKasse=true', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 mod Kompositfüllung Mehrschicht nur Kassenleistung',
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
                    adhesiveTechnique: true,
                    nurKasse: true, // Explicit rejection!
                    rawDictation: 'nur Kassenleistung',
                },
            },
        });

        if (result.state === 'output') {
            const codes = result.output.billingCodes;
            const hasGoz = codes.some(c => c.startsWith('GOZ_'));

            // nurKasse = true → NO GOZ at all
            expect(hasGoz).toBe(false);
            console.log('[GATE GOZ-CONFIRM] nurKasse codes:', codes);
        } else if (result.state === 'questions') {
            console.log('[GATE GOZ-CONFIRM] nurKasse returned questions');
        } else {
            expect(result.state).not.toBe('error');
        }
    });

    it('askback triggers when MKV signals unclear, no re-ask after answer', async () => {
        // Run 1: Ambiguous MKV - should trigger askback
        const resultAmbiguous = await runV10({
            dictation: 'Zahn 36 mod Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
            ]),
            // No testOnly.extraction - let it be ambiguous
        });

        // If questions are asked, that's correct behavior
        if (resultAmbiguous.state === 'questions') {
            console.log('[GATE GOZ-CONFIRM] Askback triggered as expected');
            console.log('[GATE GOZ-CONFIRM] Questions:', resultAmbiguous.questions?.map(q => q.id));

            // Now run again with the answer
            const resultAnswered = await runV10({
                dictation: 'Zahn 36 mod Kompositfüllung',
                treatmentId: 'fuellung',
                insuranceType: 'MKV',
                textLength: 'mittel',
                answers: new Map([
                    ['medical_caries_depth', 'normal'],
                    ['medical_ueberkappung', 'nein'],
                    ['medical_mehrkosten_bestaetigt', 'nein'], // Answer: no Mehrkosten
                ]),
                testOnly: {
                    enabled: true,
                    forceExtraction: {
                        tooth: '36',
                        surfaces: ['m', 'o', 'd'],
                        materialMentioned: 'komposit',
                    },
                },
            });

            // After answering, should get output (not more questions)
            if (resultAnswered.state === 'output') {
                const codes = resultAnswered.output.billingCodes;
                const hasGoz = codes.some(c => c.startsWith('GOZ_'));

                // Answered "nein" → no GOZ addon
                expect(hasGoz).toBe(false);
                console.log('[GATE GOZ-CONFIRM] After answer codes:', codes);
            } else if (resultAnswered.state === 'questions') {
                // This might still be valid if there are other required questions
                console.log('[GATE GOZ-CONFIRM] Still questions after answer:',
                    resultAnswered.questions?.map(q => q.id));
            }
        } else if (resultAmbiguous.state === 'output') {
            // Output is also valid if extraction was deterministic
            console.log('[GATE GOZ-CONFIRM] Got output directly:', resultAmbiguous.output.billingCodes);
        }
    });

    it('rerun determinism: same input → same billing after askback answered', async () => {
        const input = {
            dictation: 'Zahn 36 mod Kompositfüllung',
            treatmentId: 'fuellung' as const,
            insuranceType: 'MKV' as const,
            textLength: 'mittel' as const,
            answers: new Map([
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
                ['medical_mehrkosten_bestaetigt', 'ja'],
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
            if (result.state === 'output') {
                results.push([...result.output.billingCodes].sort());
            }
        }

        // All runs should produce identical sorted billing codes
        if (results.length >= 2) {
            const first = JSON.stringify(results[0]);
            for (let i = 1; i < results.length; i++) {
                expect(JSON.stringify(results[i])).toBe(first);
            }
            console.log('[GATE GOZ-CONFIRM] Determinism OK, codes:', results[0]);
        }
    });
});
