import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';
import { runV10WithAutoAnswers } from '../helpers/runV10WithAutoAnswers';

describe('V10 crown_prep baseline', () => {
    it('asks for crown_prep evidence when missing', async () => {
        const result = await runV10({
            dictation: 'Kronenpräparation dokumentiert.',
            treatmentId: 'crown_prep',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        expect(result.questions.length).toBeGreaterThan(0);
    });

    it('emits crown_prep output and PKV billing with auto answers', async () => {
        const result = await runV10WithAutoAnswers({
            dictation: 'Zahn 11 Kronenpräparation, Abformung und Provisorium durchgeführt.',
            treatmentId: 'crown_prep',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        expect(result.output.billingCodes).toContain('GOZ_2210');
    });
});
