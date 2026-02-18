import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('V10 totalprothese baseline', () => {
    it('asks for totalprothese evidence when missing', async () => {
        const result = await runV10({
            dictation: 'Totalprothese dokumentiert.',
            treatmentId: 'totalprothese',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_totalprothese_typ'))).toBe(true);
        expect(ids.some(id => id.includes('medical_totalprothese_phase'))).toBe(true);
    });

    it('emits totalprothese chips and PKV billing via billing DB', async () => {
        const konvResult = await runV10({
            dictation: 'Konventionelle Totalprothese eingegliedert.',
            treatmentId: 'totalprothese',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_totalprothese_typ', 'konventionell'],
                ['medical_totalprothese_phase', 'eingliederung'],
            ]),
        });

        expect(konvResult.state).toBe('output');
        if (konvResult.state !== 'output') return;

        const konvChips = Object.values(konvResult.output.perInstance).flatMap(instance => instance.chips);
        expect(konvChips).toContain('totalprothese_konventionell');
        expect(konvChips).not.toContain('totalprothese_immediat');
        expect(konvResult.output.billingCodes).toContain('GOZ_5220');

        const immedResult = await runV10({
            dictation: 'Immediat-Totalprothese kontrolliert.',
            treatmentId: 'totalprothese',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_totalprothese_typ', 'immediat'],
                ['medical_totalprothese_phase', 'kontrolle'],
            ]),
        });

        expect(immedResult.state).toBe('output');
        if (immedResult.state !== 'output') return;

        const immedChips = Object.values(immedResult.output.perInstance).flatMap(instance => instance.chips);
        expect(immedChips).toContain('totalprothese_immediat');
        expect(immedChips).toContain('totalprothese_kontrolle');
        expect(immedResult.output.billingCodes).toContain('GOZ_5230');
    });

    it('pre-fills totalprothese evidence from rich dictation and reduces askbacks', async () => {
        const result = await runV10({
            dictation: 'Konventionelle Totalprothese im Oberkiefer eingegliedert und Druckstellenkontrolle dokumentiert.',
            treatmentId: 'totalprothese',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        if (result.state === 'output') {
            expect(result.output.billingCodes).toContain('GOZ_5220');
            return;
        }

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_totalprothese_typ'))).toBe(false);
        expect(ids.some(id => id.includes('medical_totalprothese_phase'))).toBe(false);
    });
});
