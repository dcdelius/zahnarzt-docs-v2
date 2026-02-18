import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('V10 parodontologie baseline', () => {
    it('asks for PAR phase when missing', async () => {
        const result = await runV10({
            dictation: 'Parodontalbehandlung an Zahn 36 durchgefuehrt.',
            treatmentId: 'parodontologie',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_parodontologie_phase'))).toBe(true);
    });

    it('emits AIT chip and GKV billing via billing DB', async () => {
        const result = await runV10({
            dictation: 'Geschlossene antiinfektioese Parodontaltherapie an 36 und 37 durchgefuehrt.',
            treatmentId: 'parodontologie',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_parodontologie_phase', 'ait'],
            ]),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const chips = Object.values(result.output.perInstance).flatMap(instance => instance.chips);
        expect(chips).toContain('parodontologie_ait');
        expect(result.output.billingCodes).toContain('BEMA_AIT');
    });

    it('pre-fills PAR phase from rich dictation and reduces askbacks', async () => {
        const result = await runV10({
            dictation: 'Geschlossene antiinfektioese Parodontaltherapie an 36 und 37 durchgefuehrt.',
            treatmentId: 'parodontologie',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        if (result.state === 'output') {
            expect(result.output.billingCodes).toContain('BEMA_AIT');
            return;
        }

        const ids = result.questions.map(question => question.id);
        expect(ids.some(id => id.includes('medical_parodontologie_phase'))).toBe(false);
    });

    it('deduplicates identical documentation paragraphs across multi-instance aggregation', async () => {
        const result = await runV10({
            dictation: 'Geschlossene antiinfektioese Parodontaltherapie an 36 und 37 durchgefuehrt.',
            treatmentId: 'parodontologie',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_parodontologie_phase', 'ait'],
            ]),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const documentationSection = result.output.sections.find(section => section.id === 'dokumentation')?.content ?? result.output.fullText;
        const paragraphs = documentationSection
            .split(/\n{2,}/)
            .map(paragraph => paragraph.trim())
            .filter(Boolean);
        const duplicateParagraphs = paragraphs.filter((paragraph, index) => paragraphs.indexOf(paragraph) !== index);
        expect(duplicateParagraphs).toEqual([]);
    });
});
