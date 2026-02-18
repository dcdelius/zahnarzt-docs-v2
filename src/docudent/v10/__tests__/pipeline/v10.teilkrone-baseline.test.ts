import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('V10 teilkrone baseline', () => {
    it('asks for teilkrone evidence when missing', async () => {
        const result = await runV10({
            dictation: 'Teilkronenversorgung an Zahn 16 durchgefuehrt.',
            treatmentId: 'teilkrone',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_teilkrone_art'))).toBe(true);
        expect(ids.some(id => id.includes('medical_teilkrone_eingliederung'))).toBe(true);
    });

    it('emits teilkrone chip and billing via billing DB', async () => {
        const result = await runV10({
            dictation: 'Teilkronenversorgung an Zahn 16 definitiv eingegliedert.',
            treatmentId: 'teilkrone',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_teilkrone_art', 'teilkrone'],
                ['medical_teilkrone_eingliederung', 'definitiv'],
            ]),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const chips = Object.values(result.output.perInstance).flatMap(instance => instance.chips);
        expect(chips).toContain('teilkrone_definitiv');
        expect(result.output.billingCodes).toContain('GOZ_2220');
    });

    it('pre-fills teilkrone evidence from rich dictation and reduces askbacks', async () => {
        const result = await runV10({
            dictation: 'Teilkronenversorgung an Zahn 16, Teilkrone definitiv eingegliedert.',
            treatmentId: 'teilkrone',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        if (result.state === 'output') {
            expect(result.output.billingCodes).toContain('GOZ_2220');
            return;
        }

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_teilkrone_art'))).toBe(false);
        expect(ids.some(id => id.includes('medical_teilkrone_eingliederung'))).toBe(false);
    });
});
