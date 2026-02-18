import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('V10 untersuchung baseline', () => {
    it('asks for required evidence when missing', async () => {
        const result = await runV10({
            dictation: 'Eingehende Untersuchung durchgefuehrt.',
            treatmentId: 'untersuchung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_untersuchung_anlass'))).toBe(true);
        expect(ids.some(id => id.includes('medical_untersuchung_befunde'))).toBe(true);
        expect(ids.some(id => id.includes('medical_untersuchung_beurteilung'))).toBe(true);
    });

    it('emits baseline chip and billing via billing DB', async () => {
        const result = await runV10({
            dictation: 'Eingehende Untersuchung zur Kontrolluntersuchung mit unauffaelligen Befunden.',
            treatmentId: 'untersuchung',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_untersuchung_anlass', 'kontrolle'],
                ['medical_untersuchung_befunde', 'unauffaellig'],
                ['medical_untersuchung_beurteilung', 'ohne_therapiebedarf'],
            ]),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const chips = Object.values(result.output.perInstance).flatMap(instance => instance.chips);
        expect(chips).toContain('untersuchung_eingehend');
        expect(result.output.billingCodes).toContain('GOZ_0010');
    });

    it('pre-fills evidences from rich dictation and reduces askbacks', async () => {
        const result = await runV10({
            dictation: 'Eingehende Kontrolluntersuchung, Befunde unauffaellig, derzeit kein Therapiebedarf.',
            treatmentId: 'untersuchung',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        if (result.state === 'output') {
            expect(result.output.billingCodes).toContain('GOZ_0010');
            return;
        }

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_untersuchung_anlass'))).toBe(false);
        expect(ids.some(id => id.includes('medical_untersuchung_befunde'))).toBe(false);
        expect(ids.some(id => id.includes('medical_untersuchung_beurteilung'))).toBe(false);
    });
});
