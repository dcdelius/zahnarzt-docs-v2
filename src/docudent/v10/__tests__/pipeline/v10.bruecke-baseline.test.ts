import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('V10 bruecke baseline', () => {
    it('asks for bruecke evidence when missing', async () => {
        const result = await runV10({
            dictation: 'Brueckenversorgung dokumentiert.',
            treatmentId: 'bruecke',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_bruecke_typ'))).toBe(true);
        expect(ids.some(id => id.includes('medical_bruecke_phase'))).toBe(true);
    });

    it('emits bruecke chips and PKV billing via billing DB', async () => {
        const definitivResult = await runV10({
            dictation: 'Definitive Bruecke regio 36 eingegliedert.',
            treatmentId: 'bruecke',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_bruecke_typ', 'definitiv'],
                ['medical_bruecke_phase', 'eingliederung'],
            ]),
        });

        expect(definitivResult.state).toBe('output');
        if (definitivResult.state !== 'output') return;

        const definitivChips = Object.values(definitivResult.output.perInstance).flatMap(instance => instance.chips);
        expect(definitivChips).toContain('bruecke_definitiv');
        expect(definitivChips).not.toContain('bruecke_provisorisch');
        expect(definitivResult.output.billingCodes).toContain('GOZ_5070');

        const provResult = await runV10({
            dictation: 'Provisorische Bruecke kontrolliert.',
            treatmentId: 'bruecke',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_bruecke_typ', 'provisorisch'],
                ['medical_bruecke_phase', 'kontrolle'],
            ]),
        });

        expect(provResult.state).toBe('output');
        if (provResult.state !== 'output') return;

        const provChips = Object.values(provResult.output.perInstance).flatMap(instance => instance.chips);
        expect(provChips).toContain('bruecke_provisorisch');
        expect(provChips).toContain('bruecke_kontrolle');
        expect(provResult.output.billingCodes).toContain('GOZ_5120');
    });

    it('pre-fills bruecke evidence from rich dictation and reduces askbacks', async () => {
        const result = await runV10({
            dictation: 'Definitive Bruecke regio 36 eingegliedert und Okklusionskontrolle dokumentiert.',
            treatmentId: 'bruecke',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        if (result.state === 'output') {
            expect(result.output.billingCodes).toContain('GOZ_5070');
            return;
        }

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_bruecke_typ'))).toBe(false);
        expect(ids.some(id => id.includes('medical_bruecke_phase'))).toBe(false);
    });
});
