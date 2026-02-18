import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('V10 fissurenversiegelung baseline', () => {
    it('asks for required evidence when missing', async () => {
        const result = await runV10({
            dictation: 'Fissurenversiegelung an Zahn 16 durchgefuehrt.',
            treatmentId: 'fissurenversiegelung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_fissuren_indikation'))).toBe(true);
        expect(ids.some(id => id.includes('medical_fissuren_material'))).toBe(true);
    });

    it('emits baseline chip and billing via billing DB', async () => {
        const result = await runV10({
            dictation: 'Fissurenversiegelung an Zahn 16 zur Kariesprophylaxe mit Kunststoff durchgefuehrt.',
            treatmentId: 'fissurenversiegelung',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_fissuren_indikation', 'kariesprophylaxe'],
                ['medical_fissuren_material', 'kunststoff'],
            ]),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const chips = Object.values(result.output.perInstance).flatMap(instance => instance.chips);
        expect(chips).toContain('fissurenversiegelung_standard');
        expect(result.output.billingCodes).toContain('GOZ_2000');
    });

    it('pre-fills evidences from rich dictation and reduces askbacks', async () => {
        const result = await runV10({
            dictation: 'Fissurenversiegelung an Zahn 16 zur Kariesprophylaxe mit Kunststoff durchgefuehrt.',
            treatmentId: 'fissurenversiegelung',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        if (result.state === 'output') {
            expect(result.output.billingCodes).toContain('GOZ_2000');
            return;
        }

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_fissuren_indikation'))).toBe(false);
        expect(ids.some(id => id.includes('medical_fissuren_material'))).toBe(false);
    });
});
