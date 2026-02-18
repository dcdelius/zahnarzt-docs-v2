import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('V10 implant baseline', () => {
    it('asks for implant evidence when missing', async () => {
        const result = await runV10({
            dictation: 'Implantologische Behandlung regio 36 dokumentiert.',
            treatmentId: 'implant',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_implant_phase'))).toBe(true);
        expect(ids.some(id => id.includes('medical_implant_nachsorge'))).toBe(true);
    });

    it('emits implant chips and PKV billing via billing DB', async () => {
        const insertionResult = await runV10({
            dictation: 'Implantatinsertion regio 36 durchgefuehrt.',
            treatmentId: 'implant',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_implant_phase', 'insertion'],
                ['medical_implant_nachsorge', 'ja'],
            ]),
        });

        expect(insertionResult.state).toBe('output');
        if (insertionResult.state !== 'output') return;

        const insertionChips = Object.values(insertionResult.output.perInstance).flatMap(instance => instance.chips);
        expect(insertionChips).toContain('implant_insertion');
        expect(insertionChips).not.toContain('implant_freilegung');
        expect(insertionResult.output.billingCodes).toContain('GOZ_9000');

        const freilegungResult = await runV10({
            dictation: 'Implantat regio 46 freigelegt.',
            treatmentId: 'implant',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_implant_phase', 'freilegung'],
                ['medical_implant_nachsorge', 'ja'],
            ]),
        });

        expect(freilegungResult.state).toBe('output');
        if (freilegungResult.state !== 'output') return;

        const freilegungChips = Object.values(freilegungResult.output.perInstance).flatMap(instance => instance.chips);
        expect(freilegungChips).toContain('implant_freilegung');
        expect(freilegungChips).not.toContain('implant_insertion');
        expect(freilegungResult.output.billingCodes).toContain('GOZ_9040');
    });

    it('pre-fills implant evidence from rich dictation and reduces askbacks', async () => {
        const result = await runV10({
            dictation: 'Implantatinsertion regio 36 durchgefuehrt, postoperative Nachsorge und Kontrolltermin dokumentiert.',
            treatmentId: 'implant',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        if (result.state === 'output') {
            expect(result.output.billingCodes).toContain('GOZ_9000');
            return;
        }

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_implant_phase'))).toBe(false);
        expect(ids.some(id => id.includes('medical_implant_nachsorge'))).toBe(false);
    });
});
