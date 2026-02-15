import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

describe('Pipeline: fuellung capping material askback', () => {
    it('asks for capping material when capping performed and material missing', async () => {
        const result = await runV10({
            dictation: 'Zahn 16 o',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '16',
                    surfaces: ['o'],
                    cariesDepth: 'profunda',
                    cappingPerformed: true,
                },
            },
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const questions = result.questions ?? [];
        const hasMedicalCappingMaterialAskback = questions.some(q => {
            const id = String(q.id ?? '');
            const key = String(q.questionKey ?? '');
            return (
                id.startsWith('medical_ueberkappung_material')
                || (q.category === 'medical' && key === 'ueberkappung_material')
            );
        });

        expect(hasMedicalCappingMaterialAskback).toBe(true);
    });
});
