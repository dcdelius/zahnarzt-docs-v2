/**
 * Pipeline: Füllung — LA ambiguity defaulting
 *
 * Atlas policy: If anesthesia is mentioned but technique is not specified,
 * default to infiltration (avoid unnecessary askback loops).
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

describe('Pipeline: fuellung LA ambiguity defaulting', () => {
    it('generic "Betäubung"/"Anästhesie" mention defaults to la_infiltr (no askback)', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 MO Komposit, Betäubung.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o'],
                    cariesDepth: 'normal',
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const instance = Object.values(result.output?.perInstance ?? {})[0];
        expect(instance?.chips ?? []).toContain('la_infiltr');

        const codes = result.output?.billingCodes ?? [];
        const hasBemaLa = codes.some(c => c.startsWith('BEMA_40') || c.startsWith('BEMA_41'));
        expect(hasBemaLa).toBe(true);
    });
});

