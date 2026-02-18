import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';
import { runV10WithAutoAnswers } from '../helpers/runV10WithAutoAnswers';

describe('V10 endo baseline', () => {
    it('asks for endo evidence when missing', async () => {
        const result = await runV10({
            dictation: 'Wurzelkanalbehandlung dokumentiert.',
            treatmentId: 'endo',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        expect(result.questions.length).toBeGreaterThan(0);
    });

    it('emits endo output and billing with auto answers', async () => {
        const result = await runV10WithAutoAnswers({
            dictation: 'Zahn 36 Trepanation, Arbeitslängenmessung, Aufbereitung, Spülung und Wurzelfüllung durchgeführt.',
            treatmentId: 'endo',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        expect(result.output.billingCodes).toContain('BEMA_31');
    });
});
