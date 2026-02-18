import { describe, expect, it } from 'vitest';
import { buildQuestionsFromAskbacks } from '../../askbacks/buildQuestionsFromAskbacks';

describe('buildQuestionsFromAskbacks endo fallback labels', () => {
    it('maps endo fallback keys to human-readable questions', () => {
        const questions = buildQuestionsFromAskbacks({
            required: [
                'medical_wf_technique',
                'medical_irrigation',
                'endo_medication',
                'endo_canal_count',
            ],
        });

        const byId = new Map(questions.map(q => [q.id, q]));

        expect(byId.get('medical_wf_technique')?.question).toBe('Welche Wurzelfuelltechnik wurde verwendet?');
        expect(byId.get('medical_irrigation')?.question).toBe('Welche Spuelloesungen wurden verwendet?');
        expect(byId.get('endo_medication')?.question).toBe('Welche medikamentoese Einlage wurde verwendet?');
        expect(byId.get('endo_canal_count')?.question).toBe('Wie viele Kanaele wurden behandelt?');

        expect(byId.get('medical_wf_technique')?.type).toBe('single');
        expect(byId.get('medical_irrigation')?.type).toBe('single');
        expect(byId.get('endo_medication')?.type).toBe('text');
        expect(byId.get('endo_canal_count')?.type).toBe('text');
    });
});
