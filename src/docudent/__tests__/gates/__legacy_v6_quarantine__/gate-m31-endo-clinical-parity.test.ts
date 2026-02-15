/**
 * Gate M31: Endo Clinical Parity
 * 
 * Focus on Endo clinical correctness:
 * - Trepanation chip
 * - WL methods (elektrisch vs Röntgen)
 * - Canal count chips
 * - Spülung (NaOCl/EDTA)
 * - Einlage + provisorischer Verschluss
 * - WF variants (kalt/warm/einzel)
 * - Röntgen billing
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';
import {
    expectChipsIncludeExclude,
    expectBillingIncludeExclude
} from '../../v10/qa/clinicalAssertions';

describe('gate-m31-endo-clinical-parity', () => {
    // WL methods
    describe('WL → correct chips', () => {
        it('WL elektrisch → laengenmessung_elek', async () => {
            const result = await runV10({
                dictation: 'WKB 46 Arbeitslänge elektrisch Apexlocator',
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '46', canalCount: 3, wl_method: 'elektrisch' },
                },
            });

            expect(result.state).toBe('output');
            const chips = expectChipsIncludeExclude(result, ['laengenmessung_elek'], ['laengenmessung_roentgen']);
            expect(chips.passed).toBe(true);
        });

        it('WL Röntgen → laengenmessung_roentgen + BEMA_Ä925a', async () => {
            const result = await runV10({
                dictation: 'WKB 46 Längenmessröntgen',
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '46', canalCount: 3, wl_method: 'roentgen' },
                },
            });

            expect(result.state).toBe('output');
            const chips = expectChipsIncludeExclude(result, ['laengenmessung_roentgen'], []);
            const billing = expectBillingIncludeExclude(result, ['BEMA_Ä925a'], []);
            expect(chips.passed).toBe(true);
            expect(billing.passed).toBe(true);
        });
    });

    // Canal count
    describe('Canal count → correct chips', () => {
        it('1 canal → kanalaufbereitung_1', async () => {
            const result = await runV10({
                dictation: 'WKB 11 Frontzahn 1 Kanal',
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '11', canalCount: 1 },
                },
            });

            expect(result.state).toBe('output');
            const chips = expectChipsIncludeExclude(result, ['kanalaufbereitung_1'], []);
            expect(chips.passed).toBe(true);
        });

        it('3 canals → kanalaufbereitung_3', async () => {
            const result = await runV10({
                dictation: 'WKB 36 Molar 3 Kanäle',
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '36', canalCount: 3 },
                },
            });

            expect(result.state).toBe('output');
            const chips = expectChipsIncludeExclude(result, ['kanalaufbereitung_3'], []);
            expect(chips.passed).toBe(true);
        });
    });

    // Spülung
    describe('Spülung → correct chips', () => {
        it('NaOCl → spuelung_naocl', async () => {
            const result = await runV10({
                dictation: 'WKB 46 Spülung NaOCl 3%',
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '46', canalCount: 3, spuelung: ['naocl'] },
                },
            });

            expect(result.state).toBe('output');
            const chips = expectChipsIncludeExclude(result, ['spuelung_naocl'], []);
            expect(chips.passed).toBe(true);
        });

        it('EDTA → spuelung_edta', async () => {
            const result = await runV10({
                dictation: 'WKB 46 Spülung EDTA 17%',
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '46', canalCount: 3, spuelung: ['edta'] },
                },
            });

            expect(result.state).toBe('output');
            const chips = expectChipsIncludeExclude(result, ['spuelung_edta'], []);
            expect(chips.passed).toBe(true);
        });
    });

    // WF variants
    describe('WF → correct chips', () => {
        it('kalt → wf_kalt', async () => {
            const result = await runV10({
                dictation: 'WKB 36 WF lateral Kondensation kalt',
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '36', canalCount: 3, wf_method: 'kalt' },
                },
            });

            expect(result.state).toBe('output');
            const chips = expectChipsIncludeExclude(result, ['wf_kalt'], ['wf_warm']);
            expect(chips.passed).toBe(true);
        });

        it('warm → wf_warm', async () => {
            const result = await runV10({
                dictation: 'WKB 46 WF warme vertikale Kondensation',
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '46', canalCount: 3, wf_method: 'warm' },
                },
            });

            expect(result.state).toBe('output');
            const chips = expectChipsIncludeExclude(result, ['wf_warm'], ['wf_kalt']);
            expect(chips.passed).toBe(true);
        });
    });

    // PKV
    describe('PKV → GOZ codes', () => {
        it('PKV endo → GOZ_2410', async () => {
            const result = await runV10({
                dictation: 'WKB 46 3 Kanäle Aufbereitung maschinell',
                treatmentId: 'endo',
                insuranceType: 'PKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '46', canalCount: 3 },
                },
            });

            expect(result.state).toBe('output');
            const billing = expectBillingIncludeExclude(result, ['GOZ_2410'], ['BEMA_32']);
            expect(billing.passed).toBe(true);
        });
    });
});
