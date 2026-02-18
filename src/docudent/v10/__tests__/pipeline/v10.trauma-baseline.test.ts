import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('V10 trauma baseline', () => {
    it('asks for trauma evidence when missing', async () => {
        const result = await runV10({
            dictation: 'Zahntrauma an Zahn 11 dokumentiert.',
            treatmentId: 'trauma',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_trauma_art'))).toBe(true);
        expect(ids.some(id => id.includes('medical_trauma_schienung'))).toBe(true);
    });

    it('emits trauma splinting chip and billing via billing DB', async () => {
        const gkvResult = await runV10({
            dictation: 'Zahntrauma an Zahn 11, semipermanente Schienung angelegt.',
            treatmentId: 'trauma',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_trauma_art', 'luxation'],
                ['medical_trauma_schienung', 'ja'],
                ['medical_trauma_kontrolle', 'ja'],
            ]),
        });

        expect(gkvResult.state).toBe('output');
        if (gkvResult.state !== 'output') return;

        const gkvChips = Object.values(gkvResult.output.perInstance).flatMap(instance => instance.chips);
        expect(gkvChips).toContain('trauma_schienung_semipermanent');
        expect(gkvResult.output.billingCodes).toContain('BEMA_100');

        const pkvResult = await runV10({
            dictation: 'Zahntrauma an Zahn 21, semipermanente Schienung angelegt.',
            treatmentId: 'trauma',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_trauma_art', 'luxation'],
                ['medical_trauma_schienung', 'ja'],
                ['medical_trauma_kontrolle', 'ja'],
            ]),
        });

        expect(pkvResult.state).toBe('output');
        if (pkvResult.state !== 'output') return;

        const pkvChips = Object.values(pkvResult.output.perInstance).flatMap(instance => instance.chips);
        expect(pkvChips).toContain('trauma_schienung_semipermanent');
        expect(pkvResult.output.billingCodes).toContain('GOZ_7070');
    });

    it('pre-fills trauma evidence from rich dictation and reduces askbacks', async () => {
        const result = await runV10({
            dictation: 'Zahntrauma an Zahn 11 nach Luxation, semipermanente Schienung angelegt und Verlaufskontrolle geplant.',
            treatmentId: 'trauma',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        if (result.state === 'output') {
            expect(result.output.billingCodes).toContain('BEMA_100');
            return;
        }

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_trauma_art'))).toBe(false);
        expect(ids.some(id => id.includes('medical_trauma_schienung'))).toBe(false);
    });
});
