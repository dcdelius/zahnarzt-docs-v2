import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';
import { runV10WithAutoAnswers } from '../helpers/runV10WithAutoAnswers';

describe('V10 extraction baseline', () => {
    it('asks for extraction evidence when missing', async () => {
        const result = await runV10({
            dictation: 'Extraktion Zahn 28 durchgeführt.',
            treatmentId: 'extraction',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_la_type'))).toBe(true);
        expect(ids.some(id => id.includes('wound_care'))).toBe(true);
    });

    it('emits extraction output and billing with auto answers', async () => {
        const result = await runV10WithAutoAnswers({
            dictation: 'Extraktion Zahn 28 mit Infiltrationsanästhesie und Wundversorgung durchgeführt.',
            treatmentId: 'extraction',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        expect(result.output.billingCodes).toContain('BEMA_41a');
    });
});
