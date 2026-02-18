import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('V10 roentgen baseline', () => {
    it('asks for strict radiology evidence when missing', async () => {
        const result = await runV10({
            dictation: 'Roentgenaufnahme Zahn 46 angefertigt.',
            treatmentId: 'roentgen',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_roentgen_indikation'))).toBe(true);
        expect(ids.some(id => id.includes('medical_roentgen_typ'))).toBe(true);
        expect(ids.some(id => id.includes('medical_roentgen_zeitpunkt'))).toBe(true);
        expect(ids.some(id => id.includes('medical_roentgen_befund'))).toBe(true);
    });

    it('resolves roentgen type to chip and billing via billing DB', async () => {
        const result = await runV10({
            dictation: 'OPG zur Diagnostik und Therapieplanung angefertigt.',
            treatmentId: 'roentgen',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_roentgen_indikation', 'planung'],
                ['medical_roentgen_typ', 'opg'],
                ['medical_roentgen_zeitpunkt', 'praeoperativ'],
                ['medical_roentgen_befund', 'unauffaellig'],
            ]),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const chips = Object.values(result.output.perInstance).flatMap(instance => instance.chips);
        expect(chips).toContain('roentgen_opg');
        expect(result.output.billingCodes).toContain('GOZ_5004');
    });

    it('pre-fills radiology facts from rich dictation and reduces askbacks', async () => {
        const result = await runV10({
            dictation: 'OPG zur Therapieplanung praeoperativ angefertigt, apikale Auffaelligkeit regio 36 dokumentiert.',
            treatmentId: 'roentgen',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });
        if (result.state === 'output') {
            expect(result.output.billingCodes).toContain('GOZ_5004');
            return;
        }

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_roentgen_typ'))).toBe(false);
        expect(ids.some(id => id.includes('medical_roentgen_indikation'))).toBe(false);
        expect(ids.some(id => id.includes('medical_roentgen_zeitpunkt'))).toBe(false);
        expect(ids.some(id => id.includes('medical_roentgen_befund'))).toBe(false);
    });
});
