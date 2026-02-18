import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('V10 schiene baseline', () => {
    it('asks for schiene evidence when missing', async () => {
        const result = await runV10({
            dictation: 'Schienentherapie dokumentiert.',
            treatmentId: 'schiene',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_schiene_typ'))).toBe(true);
        expect(ids.some(id => id.includes('medical_schiene_phase'))).toBe(true);
    });

    it('emits schiene chips and billing via billing DB', async () => {
        const gkvResult = await runV10({
            dictation: 'Okklusionsschiene eingegliedert.',
            treatmentId: 'schiene',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_schiene_typ', 'okklusionsschiene'],
                ['medical_schiene_phase', 'eingliederung'],
            ]),
        });

        expect(gkvResult.state).toBe('output');
        if (gkvResult.state !== 'output') return;

        const gkvChips = Object.values(gkvResult.output.perInstance).flatMap(instance => instance.chips);
        expect(gkvChips).toContain('schiene_okklusionsschiene');
        expect(gkvChips).not.toContain('schiene_protrusionsschiene');
        expect(gkvResult.output.billingCodes).toContain('BEMA_K1');

        const pkvResult = await runV10({
            dictation: 'Protrusionsschiene eingegliedert und kontrolliert.',
            treatmentId: 'schiene',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_schiene_typ', 'protrusionsschiene'],
                ['medical_schiene_phase', 'kontrolle'],
            ]),
        });

        expect(pkvResult.state).toBe('output');
        if (pkvResult.state !== 'output') return;

        const pkvChips = Object.values(pkvResult.output.perInstance).flatMap(instance => instance.chips);
        expect(pkvChips).toContain('schiene_protrusionsschiene');
        expect(pkvChips).toContain('schiene_kontrolle');
        expect(pkvResult.output.billingCodes).toContain('GOZ_7010');
    });

    it('pre-fills schiene evidence from rich dictation and reduces askbacks', async () => {
        const result = await runV10({
            dictation: 'Protrusionsschiene eingegliedert und Nachkontrolle dokumentiert.',
            treatmentId: 'schiene',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        if (result.state === 'output') {
            expect(result.output.billingCodes).toContain('GOZ_7010');
            return;
        }

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_schiene_typ'))).toBe(false);
        expect(ids.some(id => id.includes('medical_schiene_phase'))).toBe(false);
    });
});
