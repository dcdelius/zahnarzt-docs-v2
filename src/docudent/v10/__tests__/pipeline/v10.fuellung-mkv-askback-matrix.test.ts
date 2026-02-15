/**
 * Pipeline: Füllung — MKV Askback Matrix (Anti-Fragmentation)
 *
 * Goals (Simplified):
 * - If MKV is present/mentioned → ask for amount + justification
 * - Do not ask mkv_vereinbarung for fuellung
 * - Never ask upsell questions in MKV context for fuellung
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

describe('Pipeline: fuellung MKV askback matrix', () => {
    it('MKV present → ask mkv_justification + mkv_betrag (no mkv_vereinbarung/upsell)', async () => {
        const result = await runV10({
            dictation: 'Zahn 11 MO, MKV.',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            testOnly: {
                forceExtraction: {
                    tooth: '11',
                    surfaces: ['m', 'o'],
                    cariesDepth: 'normal',
                },
            },
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const questions = result.questions ?? [];

        const hasJustification = questions.some(q =>
            String(q.id ?? '').includes('fuellung_mkv_justification')
        );
        const hasBetrag = questions.some(q =>
            String(q.questionKey ?? '') === 'mkv_betrag'
        );
        expect(hasJustification).toBe(true);
        expect(hasBetrag).toBe(true);

        // No mkv_vereinbarung for fuellung
        expect(questions.some(q => String(q.questionKey ?? '') === 'mkv_vereinbarung')).toBe(false);

        // For fuellung in MKV context: suppress upsell-category questions
        expect(questions.some(q => q.category === 'upsell')).toBe(false);

        const mkvRelated = questions.filter(q => {
            const id = String(q.id ?? '');
            const key = String(q.questionKey ?? '');
            return id.includes('mkv') || key.includes('mkv');
        });
        expect(mkvRelated.length).toBeGreaterThanOrEqual(2);
    });

    it('MKV mention + clear signals → still asks amount + justification', async () => {
        const result = await runV10({
            dictation: 'Zahn 11 MO Komposit, MKV.',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            testOnly: {
                forceExtraction: {
                    tooth: '11',
                    surfaces: ['m', 'o'],
                    cariesDepth: 'normal',
                },
            },
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const questions = result.questions ?? [];
        expect(questions.some(q => String(q.id ?? '').includes('fuellung_mkv_justification'))).toBe(true);
        expect(questions.some(q => String(q.questionKey ?? '') === 'mkv_betrag')).toBe(true);
    });
});

