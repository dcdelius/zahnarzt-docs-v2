import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('V10 ueberkappung baseline', () => {
    it('asks for type/material evidence when missing', async () => {
        const result = await runV10({
            dictation: 'Ueberkappung bei pulpanaher Karies durchgefuehrt.',
            treatmentId: 'ueberkappung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_ueberkappung'))).toBe(true);
        expect(ids.some(id => id.includes('medical_ueberkappung_material'))).toBe(true);
    });

    it('emits direct chip and PKV billing from DB', async () => {
        const result = await runV10({
            dictation: 'Direkte Ueberkappung mit MTA bei Pulpaeroeffnung an Zahn 36.',
            treatmentId: 'ueberkappung',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_ueberkappung', 'direkt'],
                ['medical_ueberkappung_material', 'MTA'],
            ]),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const chips = Object.values(result.output.perInstance).flatMap(instance => instance.chips);
        expect(chips).toContain('ueberkappung_direkt');
        expect(result.output.billingCodes).toContain('GOZ_2340');
    });

    it('pre-fills direct capping evidence from rich dictation and reduces askbacks', async () => {
        const result = await runV10({
            dictation: 'Direkte Ueberkappung mit MTA bei Pulpaeroeffnung an Zahn 36.',
            treatmentId: 'ueberkappung',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        if (result.state === 'output') {
            expect(result.output.billingCodes).toContain('GOZ_2340');
            return;
        }

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_ueberkappung'))).toBe(false);
        expect(ids.some(id => id.includes('medical_ueberkappung_material'))).toBe(false);
    });
});
