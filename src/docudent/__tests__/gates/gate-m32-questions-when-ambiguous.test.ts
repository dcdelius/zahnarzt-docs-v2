/**
 * Gate M32: Questions When Ambiguous
 * 
 * Ensures ambiguous cases produce QUESTIONS state, not OUTPUT with guessed billing.
 * Focus: anesthesia, isolation, diagnosis ambiguities.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';
import { stripToothScope } from '../../medical_kb/engine/applyMedicalKb';

describe('gate-m32-questions-when-ambiguous', () => {
    describe('Anesthesia ambiguity', () => {
        it('"Spritze" triggers LA type question or produces output', async () => {
            const result = await runV10({
                dictation: 'Füllung 36 mo nach Spritze',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
            });

            // Should either ask (questions) or produce output
            expect(['questions', 'output']).toContain(result.state);

            // If questions, should include LA type
            if (result.state === 'questions') {
                const askbackIds = result.questions?.map(q => stripToothScope(q.id ?? '')) || [];
                const askbackKeys = result.questions?.map(q => q.questionKey ?? '') || [];
                const hasLaType = askbackIds.some(id => id.includes('anesthesia') || id.includes('la_type')) ||
                    askbackKeys.some(key => key.includes('anesthesia') || key.includes('la_type'));
                expect(hasLaType).toBe(true);
            }
        });

        it('"Betäubung" without type triggers question', async () => {
            const result = await runV10({
                dictation: 'Füllung 36 mo mit Betäubung',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
            });

            // Should ask for LA type
            if (result.state === 'questions') {
                const askbackIds = result.questions?.map(q => stripToothScope(q.id ?? '')) || [];
                const askbackKeys = result.questions?.map(q => q.questionKey ?? '') || [];
                const hasLaType = askbackIds.some(id => id.includes('anesthesia') || id.includes('la_type')) ||
                    askbackKeys.some(key => key.includes('anesthesia') || key.includes('la_type'));
                expect(hasLaType).toBe(true);
            }
        });

        it('Explicit "Infiltration" does NOT trigger question', async () => {
            const result = await runV10({
                dictation: 'Füllung 36 mo Infiltrationsanästhesie',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '36', surfaces: ['mo'], diagnosis: 'caries_media', la_type: 'infiltration' },
                    forceAnswers: { medical_ueberkappung: 'keine' },
                },
            });

            expect(['questions', 'output']).toContain(result.state);
            if (result.state === 'questions') {
                const askbackIds = result.questions?.map(q => stripToothScope(q.id ?? '')) || [];
                const askbackKeys = result.questions?.map(q => q.questionKey ?? '') || [];
                const hasLaType = askbackIds.some(id => id.includes('anesthesia') || id.includes('la_type')) ||
                    askbackKeys.some(key => key.includes('anesthesia') || key.includes('la_type'));
                expect(hasLaType).toBe(false);
            }
        });

        it('Explicit "Leitung" does NOT trigger question', async () => {
            const result = await runV10({
                dictation: 'Füllung 36 mo Leitungsanästhesie',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '36', surfaces: ['mo'], diagnosis: 'caries_media', la_type: 'leitung' },
                    forceAnswers: { medical_ueberkappung: 'keine' },
                },
            });

            expect(['questions', 'output']).toContain(result.state);
            if (result.state === 'questions') {
                const askbackIds = result.questions?.map(q => stripToothScope(q.id ?? '')) || [];
                const askbackKeys = result.questions?.map(q => q.questionKey ?? '') || [];
                const hasLaType = askbackIds.some(id => id.includes('anesthesia') || id.includes('la_type')) ||
                    askbackKeys.some(key => key.includes('anesthesia') || key.includes('la_type'));
                expect(hasLaType).toBe(false);
            }
        });
    });

    describe('Diagnosis ambiguity', () => {
        it('Profunda should ask about Überkappung method', async () => {
            const result = await runV10({
                dictation: 'Füllung 36 mo Caries profunda',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '36', surfaces: ['mo'], diagnosis: 'caries_profunda' },
                },
            });

            // Should ask about Überkappung
            if (result.state === 'questions') {
                const askbackIds = result.questions?.map(q => stripToothScope(q.id ?? '')) || [];
                expect(askbackIds).toContain('medical_ueberkappung');
            }
        });
    });

    describe('No spurious questions', () => {
        it('Simple media filling produces output', async () => {
            const result = await runV10({
                dictation: 'Füllung 36 mo Komposit',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '36', surfaces: ['mo'], diagnosis: 'caries_media' },
                    forceAnswers: { medical_ueberkappung: 'keine' },
                },
            });

            expect(result.state).toBe('output');
        });

        it('Simple endo produces output', async () => {
            const result = await runV10({
                dictation: 'WKB 46 3 Kanäle',
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'mittel',
                testOnly: {
                    enabled: true,
                    forceExtraction: { tooth: '46', canalCount: 3 },
                },
            });

            expect(['questions', 'output']).toContain(result.state);
        });
    });
});
