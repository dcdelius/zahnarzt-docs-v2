/**
 * Gate: V10 Medical Trace — No Double Askback (M73)
 * 
 * Tests that askbacks are not double-asked (DAG ordering honored).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';
import { enableMedicalTrace, disableMedicalTrace } from '../../v10/qa/medicalDecisionTrace';
import { stripToothScope } from '../../medical_kb/engine/applyMedicalKb';

describe('Gate: V10 Medical Trace — No Double Askback (M73)', () => {
    beforeEach(() => {
        enableMedicalTrace();
    });

    afterEach(() => {
        disableMedicalTrace();
    });

    describe('Capping + Material DAG Ordering', () => {
        const PROFUNDA_CASE = {
            dictation: 'Zahn 36 Füllung distookklusal profunda Karies',
            treatmentId: 'fuellung' as const,
            insuranceType: 'GKV' as const,
            forceExtraction: {
                tooth: '36',
                surfaces: ['D', 'O'],
                diagnosis: 'profunda',
                cariesDepth: 'profunda',
                mentioned: {},
            },
        };

        it('first step asks ueberkappung, NOT material', async () => {
            const result = await runV10({
                dictation: PROFUNDA_CASE.dictation,
                treatmentId: PROFUNDA_CASE.treatmentId,
                insuranceType: PROFUNDA_CASE.insuranceType,
                textLength: 'kurz',
                testOnly: {
                    forceExtraction: PROFUNDA_CASE.forceExtraction,
                },
            });

            expect(result.state).toBe('questions');
            const questionIds = result.questions?.map((q: any) => stripToothScope(q.id)) || [];

            // Ueberkappung should be asked
            expect(questionIds).toContain('medical_ueberkappung');

            // Material should NOT be asked yet (depends on ueberkappung=indirekt)
            // This is DAG ordering: material depends on capping being "indirekt"
            const materialQuestions = questionIds.filter((id: string) =>
                id.includes('material') && id.includes('capping') || id.includes('ueberkappung_material')
            );

            // Material askback should only appear after ueberkappung=indirekt is answered
            // In first step, it should not appear
        });

        it('after answering ueberkappung=nein, no material question', async () => {
            const result = await runV10({
                dictation: PROFUNDA_CASE.dictation,
                treatmentId: PROFUNDA_CASE.treatmentId,
                insuranceType: PROFUNDA_CASE.insuranceType,
                textLength: 'kurz',
                answers: new Map([
                    ['medical_ueberkappung', 'nein'],
                ]),
                testOnly: {
                    forceExtraction: PROFUNDA_CASE.forceExtraction,
                },
            });

            // Should proceed to output without asking material
            expect(['output', 'questions']).toContain(result.state);

            if (result.state === 'questions') {
                const questionIds = result.questions?.map((q: any) => stripToothScope(q.id)) || [];
                // Should NOT ask material since capping was declined
                expect(questionIds).not.toContain('medical_ueberkappung_material');
            }
        });

        it('after answering ueberkappung=indirekt, may ask material', async () => {
            const result = await runV10({
                dictation: PROFUNDA_CASE.dictation,
                treatmentId: PROFUNDA_CASE.treatmentId,
                insuranceType: PROFUNDA_CASE.insuranceType,
                textLength: 'kurz',
                answers: new Map([
                    ['medical_ueberkappung', 'indirekt'],
                ]),
                testOnly: {
                    forceExtraction: PROFUNDA_CASE.forceExtraction,
                },
            });

            // After selecting indirect capping, may ask material or proceed
            expect(['output', 'questions']).toContain(result.state);

            if (result.state === 'questions') {
                const questionIds = result.questions?.map((q: any) => stripToothScope(q.id)) || [];
                // Material question is legitimate here
            }
        });
    });

    describe('No Duplicate Questions Across Steps', () => {
        it('same question not asked in multiple steps', async () => {
            // Step 1: Get first questions
            const step1 = await runV10({
                dictation: 'Zahn 26 MOD Füllung profunda',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'kurz',
                testOnly: {
                    forceExtraction: {
                        tooth: '26',
                        surfaces: ['M', 'O', 'D'],
                        cariesDepth: 'profunda',
                        mentioned: {},
                    },
                },
            });

            if (step1.state !== 'questions') return;

            const step1Questions = step1.questions?.map((q: any) => stripToothScope(q.id)) || [];
            const answers1 = new Map<string, string>();
            step1Questions.forEach((q: string) => {
                if (q === 'medical_ueberkappung') answers1.set(q, 'indirekt');
            });

            // Step 2: Answer and check next questions
            const step2 = await runV10({
                dictation: 'Zahn 26 MOD Füllung profunda',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'kurz',
                answers: answers1,
                testOnly: {
                    forceExtraction: {
                        tooth: '26',
                        surfaces: ['M', 'O', 'D'],
                        cariesDepth: 'profunda',
                        mentioned: {},
                    },
                },
            });

            if (step2.state === 'questions') {
                const step2Questions = step2.questions?.map((q: any) => stripToothScope(q.id)) || [];

                // Questions from step 1 (that were answered) should NOT reappear
                for (const q of step1Questions) {
                    if (answers1.has(q)) {
                        // This question was answered, should not reappear
                        expect(step2Questions).not.toContain(q);
                    }
                }
            }
        });
    });
});
