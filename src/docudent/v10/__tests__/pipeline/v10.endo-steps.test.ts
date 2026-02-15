import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

describe('Pipeline: Endo steps → chips', () => {
    it('emits trepanation, WL, preparation, irrigation, medication, WF + xray control', async () => {
        const dictation = [
            'Zahn 36 Trepanation.',
            'Arbeitslängenmessung mit Apexlokator.',
            'Aufbereitung 3 Kanäle.',
            'Spülung mit NaOCl und EDTA.',
            'Ca(OH)2 Einlage.',
            'Wurzelfüllung warm, Röntgenkontrolle.',
            'Provisorischer Verschluss.',
        ].join(' ');

        const result = await runV10({
            dictation,
            treatmentId: 'endo',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                forceExtraction: {
                    tooth: '36',
                    treatmentId: 'endo',
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const instance = Object.values(result.output.perInstance ?? {})[0];
        const chips = instance?.chips ?? [];

        expect(chips).toEqual(expect.arrayContaining([
            'trepanation',
            'laengenmessung_elek',
            'kanalaufbereitung_3',
            'spuelung_naocl',
            'spuelung_edta',
            'einlage_caoh2',
            'wf_warm',
            'roentgen_kontrolle',
            'provisorischer_verschluss',
        ]));
    });

    it('emits rel_trocken when relative isolation mentioned', async () => {
        const dictation = 'Zahn 36 Endo, relative Trockenlegung.';

        const result = await runV10({
            dictation,
            treatmentId: 'endo',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                forceExtraction: {
                    tooth: '36',
                    treatmentId: 'endo',
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const instance = Object.values(result.output.perInstance ?? {})[0];
        const chips = instance?.chips ?? [];

        expect(chips).toContain('rel_trocken');
    });
});
