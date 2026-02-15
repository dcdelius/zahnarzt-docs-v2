/**
 * Gate M31: Füllung Clinical Parity
 * 
 * Focus on Füllung clinical correctness:
 * - Profunda/Überkappung → CP/P chips + BEMA_25/26
 * - LA type → correct billing
 * - Isolation → Kofferdam billing
 * - Surface count → correct F-code
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';
import {
    expectChipsIncludeExclude,
    expectBillingIncludeExclude
} from '../../v10/qa/clinicalAssertions';

describe('gate-m31-fuellung-clinical-parity', () => {
    // Profunda/CP cases
    describe('Profunda → BEMA_25', () => {
        it('profunda with CP triggers BEMA_25', async () => {
            const result = await runV10({
                dictation: 'Füllung 36 mo Caries profunda CP Ca(OH)2',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '36', surfaces: ['mo'], diagnosis: 'caries_profunda' },
                    forceAnswers: { medical_ueberkappung: 'indirekt' },
                },
            });

            expect(result.state).toBe('output');
            const r = expectBillingIncludeExclude(result, ['BEMA_25'], []);
            expect(r.passed).toBe(true);
        });

        it('media without CP excludes BEMA_25/26', async () => {
            const result = await runV10({
                dictation: 'Füllung 36 mo Caries media',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '36', surfaces: ['mo'], diagnosis: 'caries_media' },
                    forceAnswers: { medical_ueberkappung: 'keine' },
                },
            });

            expect(result.state).toBe('output');
            const r = expectBillingIncludeExclude(result, [], ['BEMA_25', 'BEMA_26']);
            expect(r.passed).toBe(true);
        });
    });

    // LA cases
    describe('LA → correct billing', () => {
        it('Infiltration → BEMA_40', async () => {
            const result = await runV10({
                dictation: 'Füllung 16 mo nach Infiltration',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '16', surfaces: ['mo'], diagnosis: 'caries_media', la_type: 'infiltration' },
                    forceAnswers: { medical_ueberkappung: 'keine' },
                },
            });

            expect(result.state).toBe('output');
            const chips = expectChipsIncludeExclude(result, ['la_infiltr'], ['la_leitung']);
            const billing = expectBillingIncludeExclude(result, ['BEMA_40'], ['BEMA_41a']);
            expect(chips.passed).toBe(true);
            expect(billing.passed).toBe(true);
        });

        it('Leitung → BEMA_41a', async () => {
            const result = await runV10({
                dictation: 'Füllung 36 mo nach Leitungsanästhesie',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '36', surfaces: ['mo'], diagnosis: 'caries_media', la_type: 'leitung' },
                    forceAnswers: { medical_ueberkappung: 'keine' },
                },
            });

            expect(result.state).toBe('output');
            const chips = expectChipsIncludeExclude(result, ['la_leitung'], ['la_infiltr']);
            const billing = expectBillingIncludeExclude(result, ['BEMA_41a'], ['BEMA_40']);
            expect(chips.passed).toBe(true);
            expect(billing.passed).toBe(true);
        });
    });

    // Kofferdam
    describe('Isolation → Kofferdam billing', () => {
        it('Kofferdam → BEMA_12', async () => {
            const result = await runV10({
                dictation: 'Füllung 36 mo unter Kofferdam',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '36', surfaces: ['mo'], diagnosis: 'caries_media', isolation: 'kofferdam' },
                    forceAnswers: { medical_ueberkappung: 'keine' },
                },
            });

            expect(result.state).toBe('output');
            const chips = expectChipsIncludeExclude(result, ['kofferdam'], []);
            const billing = expectBillingIncludeExclude(result, ['BEMA_12'], []);
            expect(chips.passed).toBe(true);
            expect(billing.passed).toBe(true);
        });
    });

    // PKV
    describe('PKV → GOZ codes', () => {
        it('PKV composite → GOZ_2080', async () => {
            const result = await runV10({
                dictation: 'Füllung 36 mo Komposit',
                treatmentId: 'fuellung',
                insuranceType: 'PKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '36', surfaces: ['mo'], diagnosis: 'caries_media' },
                    forceAnswers: { medical_ueberkappung: 'keine' },
                },
            });

            expect(result.state).toBe('output');
            const billing = expectBillingIncludeExclude(result, ['GOZ_2080'], ['BEMA_13b']);
            expect(billing.passed).toBe(true);
        });
    });
});
