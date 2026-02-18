import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('V10 teilprothese baseline', () => {
    it('asks for teilprothese evidence when missing', async () => {
        const result = await runV10({
            dictation: 'Teilprothese dokumentiert.',
            treatmentId: 'teilprothese',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_teilprothese_typ'))).toBe(true);
        expect(ids.some(id => id.includes('medical_teilprothese_phase'))).toBe(true);
    });

    it('emits teilprothese chips and PKV billing via billing DB', async () => {
        const interimResult = await runV10({
            dictation: 'Interimsteilprothese eingegliedert.',
            treatmentId: 'teilprothese',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_teilprothese_typ', 'interim'],
                ['medical_teilprothese_phase', 'eingliederung'],
            ]),
        });

        expect(interimResult.state).toBe('output');
        if (interimResult.state !== 'output') return;

        const interimChips = Object.values(interimResult.output.perInstance).flatMap(instance => instance.chips);
        expect(interimChips).toContain('teilprothese_interim');
        expect(interimChips).not.toContain('teilprothese_modellguss');
        expect(interimResult.output.billingCodes).toContain('GOZ_5200');

        const mgResult = await runV10({
            dictation: 'Modellgussprothese kontrolliert.',
            treatmentId: 'teilprothese',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_teilprothese_typ', 'modellguss'],
                ['medical_teilprothese_phase', 'kontrolle'],
            ]),
        });

        expect(mgResult.state).toBe('output');
        if (mgResult.state !== 'output') return;

        const mgChips = Object.values(mgResult.output.perInstance).flatMap(instance => instance.chips);
        expect(mgChips).toContain('teilprothese_modellguss');
        expect(mgChips).toContain('teilprothese_kontrolle');
        expect(mgResult.output.billingCodes).toContain('GOZ_5210');
    });

    it('pre-fills teilprothese evidence from rich dictation and reduces askbacks', async () => {
        const result = await runV10({
            dictation: 'Modellgussprothese im Unterkiefer eingesetzt und Druckstellenkontrolle dokumentiert.',
            treatmentId: 'teilprothese',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        if (result.state === 'output') {
            expect(result.output.billingCodes).toContain('GOZ_5210');
            return;
        }

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_teilprothese_typ'))).toBe(false);
        expect(ids.some(id => id.includes('medical_teilprothese_phase'))).toBe(false);
    });
});
