import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';
import { runV10WithAutoAnswers } from '../helpers/runV10WithAutoAnswers';

describe('V10 fuellung baseline', () => {
    it('asks for fuellung evidence when missing', async () => {
        const result = await runV10({
            dictation: 'Füllung dokumentiert.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('fuellung_material'))).toBe(true);
        expect(ids.some(id => id.includes('fuellung_isolation'))).toBe(true);
    });

    it('emits fuellung output and surface billing with auto answers', async () => {
        const result = await runV10WithAutoAnswers({
            dictation: 'Zahn 36 MOD Karies, Kompositfüllung mit Kofferdam und Abschlusskontrolle.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        expect(result.output.billingCodes.some(code => code.startsWith('BEMA_13'))).toBe(true);
    });
});
