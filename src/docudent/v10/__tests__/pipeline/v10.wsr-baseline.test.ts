import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('V10 wsr baseline', () => {
    it('asks for insurance-specific WSR evidence when missing', async () => {
        const gkvResult = await runV10({
            dictation: 'Wurzelspitzenresektion an Zahn 11 durchgefuehrt.',
            treatmentId: 'wsr',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(gkvResult.state).toBe('questions');
        if (gkvResult.state !== 'questions') return;

        const gkvIds = gkvResult.questions.map(question => question.id);
        expect(gkvIds.some(id => id.includes('medical_wsr_zugang'))).toBe(true);

        const pkvResult = await runV10({
            dictation: 'Wurzelspitzenresektion an Zahn 36 durchgefuehrt.',
            treatmentId: 'wsr',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(pkvResult.state).toBe('questions');
        if (pkvResult.state !== 'questions') return;

        const pkvIds = pkvResult.questions.map(question => question.id);
        expect(pkvIds.some(id => id.includes('medical_wsr_lokalisation'))).toBe(true);
    });

    it('emits WSR chips and billing via billing DB', async () => {
        const gkvResult = await runV10({
            dictation: 'Wurzelspitzenresektion am eroeffneten Zahn 11 durchgefuehrt.',
            treatmentId: 'wsr',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_wsr_zugang', 'trepaniert'],
            ]),
        });

        expect(gkvResult.state).toBe('output');
        if (gkvResult.state !== 'output') return;

        const gkvChips = Object.values(gkvResult.output.perInstance).flatMap(instance => instance.chips);
        expect(gkvChips).toContain('wsr_bema_54');
        expect(gkvResult.output.billingCodes).toContain('BEMA_54');

        const pkvResult = await runV10({
            dictation: 'Wurzelspitzenresektion an Zahn 36 mit Osteotomie im Molarenbereich.',
            treatmentId: 'wsr',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_wsr_lokalisation', 'molar'],
            ]),
        });

        expect(pkvResult.state).toBe('output');
        if (pkvResult.state !== 'output') return;

        const pkvChips = Object.values(pkvResult.output.perInstance).flatMap(instance => instance.chips);
        expect(pkvChips).toContain('wsr_goz_3120');
        expect(pkvResult.output.billingCodes).toContain('GOZ_3120');
    });

    it('pre-fills WSR evidence from rich dictation and reduces askbacks', async () => {
        const result = await runV10({
            dictation: 'Wurzelspitzenresektion an Zahn 36 durch Osteotomie im Molarenbereich durchgefuehrt.',
            treatmentId: 'wsr',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        if (result.state === 'output') {
            expect(result.output.billingCodes).toContain('GOZ_3120');
            return;
        }

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_wsr_lokalisation'))).toBe(false);
    });
});
