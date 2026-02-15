/**
 * Pipeline: Füllung — finishing facts -> chip -> text
 */

import { describe, it, expect } from 'vitest';
import { runV10WithAutoAnswers } from '../helpers/runV10WithAutoAnswers';

describe('Pipeline: fuellung finishing facts', () => {
    it('emits finishing chip when polishing/occlusion is mentioned', async () => {
        const result = await runV10WithAutoAnswers({
            dictation: 'Zahn 36 MO Komposit, Okklusion geprüft und poliert.',
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

        const instance = Object.values(result.output.perInstance ?? {})[0];
        expect(instance?.chips ?? []).toContain('finishing');
        expect(result.output.fullText).toMatch(/Politur|Okklusion/i);
    });

    it('does not emit finishing chip when finishing is not mentioned', async () => {
        const result = await runV10WithAutoAnswers({
            dictation: 'Zahn 36 MO Komposit.',
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

        const instance = Object.values(result.output.perInstance ?? {})[0];
        expect(instance?.chips ?? []).not.toContain('finishing');
    });
});
