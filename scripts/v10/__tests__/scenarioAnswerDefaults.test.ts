import { describe, it, expect } from 'vitest';
import { resolveScenarioAnswer } from '../scenarioAnswerDefaults';

const baseContext = {
    dictation: '',
    insuranceType: 'GKV' as const,
    instanceFacts: {},
};

describe('scenarioAnswerDefaults', () => {
    it('answers endo canal count questions', () => {
        const answer = resolveScenarioAnswer(
            {
                id: 'endo-46-1::endo_canal_count::tooth:46',
                options: [{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }],
            },
            { ...baseContext, dictation: 'Endo 46 mit MB, ML und D Kanälen.' }
        );
        expect(answer).toBe('3');
    });

    it('answers wf technique questions from medical key names', () => {
        const answer = resolveScenarioAnswer(
            {
                id: 'endo-46-1::medical_wf_technique::tooth:46',
                options: [{ value: 'manuell', label: 'manuell' }, { value: 'maschinell', label: 'maschinell' }],
            },
            { ...baseContext, dictation: 'Aufbereitung maschinell mit NiTi.' }
        );
        expect(answer).toBe('maschinell');
    });

    it('answers irrigation questions from medical key names', () => {
        const answer = resolveScenarioAnswer(
            {
                id: 'endo-27-1::medical_endo_irrigation::tooth:27',
                options: [{ value: 'CHX', label: 'CHX' }, { value: 'NaOCl + EDTA', label: 'NaOCl + EDTA' }],
            },
            { ...baseContext, dictation: 'Spülung CHX.' }
        );
        expect(answer).toBe('CHX');
    });

    it('answers endo medication questions from endo key names', () => {
        const answer = resolveScenarioAnswer(
            {
                id: 'endo-36-1::endo_medication::tooth:36',
                options: [{ value: 'Ca(OH)2', label: 'Ca(OH)2' }, { value: 'Ledermix', label: 'Ledermix' }],
            },
            { ...baseContext, dictation: 'Medikamentöse Einlage Ledermix.' }
        );
        expect(answer).toBe('Ledermix');
    });
});
