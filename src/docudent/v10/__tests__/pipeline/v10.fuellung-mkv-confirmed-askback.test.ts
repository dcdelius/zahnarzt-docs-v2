import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

describe('Pipeline: fuellung MKV confirmed gating', () => {
    it('asks mkv_confirmed when MKV is selected but no Mehrkosten signals are present', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 MO Komposit.',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o'],
                    cariesDepth: 'normal',
                },
            },
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const questions = result.questions ?? [];
        const hasMkvConfirmed = questions.some(q => {
            const id = String(q.id ?? '');
            const key = String(q.questionKey ?? '');
            return id.includes('mkv_confirmed') || key === 'mkv_confirmed';
        });

        expect(hasMkvConfirmed).toBe(true);

        // Should NOT ask amount/justification before confirmation
        expect(questions.some(q => String(q.questionKey ?? '') === 'mkv_betrag')).toBe(false);
        expect(questions.some(q => String(q.questionKey ?? '').includes('mkv_justification'))).toBe(false);
    });
});
