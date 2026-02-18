import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('V10 krone baseline', () => {
    it('asks for crown evidence when missing', async () => {
        const result = await runV10({
            dictation: 'Kronenversorgung an Zahn 16 durchgefuehrt.',
            treatmentId: 'krone',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_krone_art'))).toBe(true);
        expect(ids.some(id => id.includes('medical_krone_eingliederung'))).toBe(true);
    });

    it('emits crown chip and billing via billing DB', async () => {
        const result = await runV10({
            dictation: 'Vollkrone an Zahn 16 definitiv eingegliedert.',
            treatmentId: 'krone',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_krone_art', 'vollkrone'],
                ['medical_krone_eingliederung', 'definitiv'],
            ]),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const chips = Object.values(result.output.perInstance).flatMap(instance => instance.chips);
        expect(chips).toContain('krone_vollkrone');
        expect(result.output.billingCodes).toContain('GOZ_2210');
    });

    it('pre-fills crown evidence from rich dictation and reduces askbacks', async () => {
        const result = await runV10({
            dictation: 'Vollkrone an Zahn 16 definitiv eingegliedert und okklusal kontrolliert.',
            treatmentId: 'krone',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        if (result.state === 'output') {
            expect(result.output.billingCodes).toContain('GOZ_2210');
            return;
        }

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_krone_art'))).toBe(false);
        expect(ids.some(id => id.includes('medical_krone_eingliederung'))).toBe(false);
    });
});
