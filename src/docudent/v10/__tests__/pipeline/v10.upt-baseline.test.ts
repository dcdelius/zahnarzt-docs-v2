import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('V10 upt baseline', () => {
    it('asks for required UPT evidence when missing', async () => {
        const result = await runV10({
            dictation: 'UPT an Zahn 36 durchgefuehrt.',
            treatmentId: 'upt',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_upt_grad'))).toBe(true);
        expect(ids.some(id => id.includes('medical_upt_intervall'))).toBe(true);
    });

    it('emits UPT grade chip and billing via billing DB', async () => {
        const result = await runV10({
            dictation: 'Unterstuetzende Parodontitistherapie Grad B an Zahn 36 durchgefuehrt.',
            treatmentId: 'upt',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_upt_grad', 'b'],
                ['medical_upt_intervall', '6_monate'],
            ]),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const chips = Object.values(result.output.perInstance).flatMap(instance => instance.chips);
        expect(chips).toContain('upt_grad_b');
        expect(result.output.billingCodes).toContain('BEMA_UPTb');
    });

    it('pre-fills grade/interval from rich dictation and reduces askbacks', async () => {
        const result = await runV10({
            dictation: 'UPT Grad B an Zahn 36 mit Recallintervall 6 Monate durchgefuehrt.',
            treatmentId: 'upt',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        if (result.state === 'output') {
            expect(result.output.billingCodes).toContain('BEMA_UPTb');
            return;
        }

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_upt_grad'))).toBe(false);
        expect(ids.some(id => id.includes('medical_upt_intervall'))).toBe(false);
    });
});
