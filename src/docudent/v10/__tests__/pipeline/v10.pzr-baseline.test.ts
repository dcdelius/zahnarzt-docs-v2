import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';
import { runV10WithAutoAnswers } from '../helpers/runV10WithAutoAnswers';

describe('V10 pzr baseline', () => {
    it('asks for pzr evidence when missing', async () => {
        const result = await runV10({
            dictation: 'PZR durchgeführt.',
            treatmentId: 'pzr',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('pzr_zahnstein'))).toBe(true);
        expect(ids.some(id => id.includes('pzr_fluoridation'))).toBe(true);
    });

    it('emits pzr output and billing with auto answers', async () => {
        const result = await runV10WithAutoAnswers({
            dictation: 'PZR vollständig durchgeführt, Zahnstein entfernt und Fluoridierung vorgenommen.',
            treatmentId: 'pzr',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        expect(result.output.billingCodes).toContain('BEMA_107');
    });
});
