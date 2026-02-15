/**
 * Pipeline: Askbacks are removed when facts are already known.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

describe('Pipeline: askback filtering for known facts', () => {
    it('does not ask for LA type when it is already known', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 MO Kompositfüllung, Leitungsanästhesie.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o'],
                    cariesDepth: 'normal',
                    anesthesia: 'leitung',
                    materialMentioned: 'komposit',
                },
            },
        });

        if (result.state === 'questions') {
            const ids = result.questions?.map(q => q.id) ?? [];
            const hasLaAskback = ids.some(id => id.includes('medical_la_type'));
            expect(hasLaAskback).toBe(false);
            return;
        }

        expect(result.state).toBe('output');
    });
});
