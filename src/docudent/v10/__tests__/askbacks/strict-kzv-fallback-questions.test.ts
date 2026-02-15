import { describe, expect, it } from 'vitest';

import { buildQuestionsFromAskbacks } from '../../askbacks/buildQuestionsFromAskbacks';

describe('Askback builder: strict KZV fallback questions', () => {
    it('maps radiology evidence askbacks to human-readable forensic questions', () => {
        const questions = buildQuestionsFromAskbacks({
            required: [
                'medical_roentgen_indikation',
                'medical_roentgen_typ',
                'medical_roentgen_zeitpunkt',
                'medical_roentgen_befund',
            ],
        });

        expect(questions.map(q => q.questionKey)).toEqual([
            'radiology_indication',
            'radiology_type',
            'radiology_timing',
            'radiology_findings',
        ]);
        expect(questions.every(q => q.category === 'forensic')).toBe(true);
    });

    it('provides explicit options for vitality/percussion strict evidence asks', () => {
        const questions = buildQuestionsFromAskbacks({
            required: ['medical_vipr', 'medical_percussion'],
        });

        const vitality = questions.find(q => q.questionKey === 'vitality');
        const percussion = questions.find(q => q.questionKey === 'percussion');

        expect(vitality?.type).toBe('single');
        expect(percussion?.type).toBe('single');
        expect(vitality?.options?.map(opt => opt.id)).toEqual(['pos', 'neg', 'unknown']);
        expect(percussion?.options?.map(opt => opt.id)).toEqual(['pos', 'neg', 'unknown']);
    });
});
