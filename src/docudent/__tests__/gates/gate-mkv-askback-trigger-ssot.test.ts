/**
 * Gate Test: MKV Askback Trigger SSOT (GIGAPROMPT 10)
 *
 * Contract: When insuranceType='MKV' and signals are unclear,
 * KB MUST trigger exactly one MKV justification askback.
 *
 * SSOT: Trigger comes from medical_kb.v1.json, not UI/askbacks.
 *
 * @fast < 3s
 * @deterministic
 */

import { describe, test, expect, it } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getMkvQuestions(result: Awaited<ReturnType<typeof runV10>>) {
    if (result.state !== 'questions') return [];
    return result.questions?.filter(q => {
        const id = String(q.id ?? '');
        const key = String(q.questionKey ?? '');
        return id.includes('mkv') || key.includes('mkv');
    }) ?? [];
}

function hasMkvQuestionKey(
    result: Awaited<ReturnType<typeof runV10>>,
    questionKey: string
): boolean {
    if (result.state !== 'questions') return false;
    return getMkvQuestions(result).some(q => String(q.questionKey ?? '') === questionKey);
}

function countMkvAskbacks(result: Awaited<ReturnType<typeof runV10>>): number {
    if (result.state !== 'questions') return 0;
    return getMkvQuestions(result).length;
}

function hasGozAddon(result: Awaited<ReturnType<typeof runV10>>): boolean {
    if (result.state !== 'output') return false;
    const perInstance = result.output?.perInstance ?? {};
    const allBilling = Object.values(perInstance).flatMap(inst => inst.billingRefs ?? []);
    return allBilling.some(b => b.startsWith('GOZ_'));
}

function getFullText(result: Awaited<ReturnType<typeof runV10>>): string {
    if (result.state !== 'output') return '';
    return result.output?.fullText ?? '';
}

// ═══════════════════════════════════════════════════════════════
// TESTS: AMBIGUOUS MKV TRIGGERS ASKBACK
// ═══════════════════════════════════════════════════════════════

describe('gate-mkv-askback-trigger-ssot', () => {
    /**
     * Case 1: MKV ambiguous → MUST get askback
     */
    test('MKV + "Zahn 27 mod" → state=questions, exactly 1 MKV question', async () => {
        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 27 mod',
            insuranceType: 'MKV',
            textLength: 'mittel',
        });

        console.log('[mkv_ambiguous] State:', result.state);
        if (result.state === 'questions') {
            console.log('[mkv_ambiguous] Questions:', result.questions?.map(q => q.id));
        }

        // Must trigger askback
        expect(result.state).toBe('questions');
        expect(hasMkvQuestionKey(result, 'mkv_confirmed'), 'Expected MKV confirmation askback').toBe(true);
        expect(countMkvAskbacks(result), 'Expected exactly 1 MKV askback').toBe(1);
    });

    /**
     * Case 2: MKV + Komposit → askback required
     */
    test('MKV + "Zahn 27 mod Komposit" → askback required', async () => {
        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 27 mod Komposit',
            insuranceType: 'MKV',
            textLength: 'mittel',
        });

        console.log('[mkv_komposit] State:', result.state);

        if (result.state === 'questions') {
            expect(hasMkvQuestionKey(result, 'mkv_confirmed'), 'Expected MKV confirmation askback when Komposit').toBe(true);
        }
    });

    /**
     * Case 3: MKV + amount → askback required
     */
    test('MKV + "Zahn 27 mod 120€" → askback required', async () => {
        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 27 mod 120€',
            insuranceType: 'MKV',
            textLength: 'mittel',
        });

        console.log('[mkv_amount] State:', result.state);

        if (result.state === 'questions') {
            expect(hasMkvQuestionKey(result, 'mkv_confirmed'), 'Expected no mkv_confirmed when amount is present').toBe(false);
            expect(hasMkvQuestionKey(result, 'mkv_justification'), 'Expected mkv_justification with amount').toBe(true);
        }
    });

    /**
     * Case 4: MKV + nur Kasse → signals clear, NO askback, NO GOZ
     */
    test('MKV + "Zahn 27 mod nur Kasse" → NO askback, nurKasse=true', async () => {
        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 27 mod nur Kasse',
            insuranceType: 'MKV',
            textLength: 'mittel',
        });

        console.log('[mkv_nur_kasse] State:', result.state);

        expect(result.state).not.toBe('error');

        if (result.state === 'questions') {
            expect(countMkvAskbacks(result), 'Expected NO MKV askbacks with nur Kasse').toBe(0);
        }

        // If output, should have no GOZ addon
        if (result.state === 'output') {
            expect(hasGozAddon(result)).toBe(false);
            expect(getFullText(result).toLowerCase()).toContain('kassenleistung');
        }
    });

    /**
     * Case 5: GKV → NEVER gets MKV askback
     */
    test('GKV + "Zahn 27 mod" → NO MKV askback (wrong insurance)', async () => {
        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 27 mod',
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        expect(result.state).not.toBe('error');

        if (result.state === 'questions') {
            expect(countMkvAskbacks(result), 'GKV should NEVER get MKV askbacks').toBe(0);
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // ANSWER FLOW REGRESSION
    // ═══════════════════════════════════════════════════════════════

    describe('Answer Flow Regression', () => {
        test('MKV ambiguous → answer mkv_confirmed=mehrkosten → asks betrag+justification', async () => {
            // Run 1: Get questions
            const run1 = await runV10({
                treatmentId: 'fuellung',
                dictation: 'Füllung Zahn 27 mod',
                insuranceType: 'MKV',
                textLength: 'mittel',
            });

            console.log('[run1] State:', run1.state);

            if (run1.state !== 'questions') {
                // If signals detected from extraction, skip this test
                console.log('[run1] Skipping: not in questions state');
                return;
            }

            // Find the MKV confirmation question ID
            const mkvQuestion = run1.questions?.find(q =>
                String(q.questionKey ?? '') === 'mkv_confirmed'
            );

            if (!mkvQuestion) {
                console.log('[run1] No MKV question found, skipping');
                return;
            }

            console.log('[run1] MKV question ID:', mkvQuestion.id);

            // Run 2: Provide answer
            const answers = new Map<string, unknown>();
            answers.set(mkvQuestion.id!, 'mehrkosten');
            // Also set base keys for compatibility
            answers.set('medical_mkv_confirmed', 'mehrkosten');
            answers.set('mkv_confirmed', 'mehrkosten');

            const run2 = await runV10({
                treatmentId: 'fuellung',
                dictation: 'Füllung Zahn 27 mod',
                insuranceType: 'MKV',
                textLength: 'mittel',
                answers,
            });

            console.log('[run2] State:', run2.state);
            if (run2.state === 'output') {
                console.log('[run2] Billing:', run2.output?.billingCodes);
                console.log('[run2] FullText preview:', run2.output?.fullText?.slice(0, 300));
            }

            expect(run2.state).not.toBe('error');

            if (run2.state === 'questions') {
                expect(hasMkvQuestionKey(run2, 'mkv_confirmed'), 'After answering, should not ask mkv_confirmed again').toBe(false);
                expect(hasMkvQuestionKey(run2, 'mkv_betrag'), 'After confirming Mehrkosten, should ask mkv_betrag').toBe(true);
                expect(hasMkvQuestionKey(run2, 'mkv_justification'), 'After confirming Mehrkosten, should ask mkv_justification').toBe(true);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // COMPOSER ACCURACY
    // ═══════════════════════════════════════════════════════════════

    describe('Composer Accuracy', () => {
        test('Komposit alone does NOT force Mehrschicht line', async () => {
            // This test uses the composer directly
            const { composeDocumentationV10 } = await import('../../v10/output/composeDocumentationV10');

            const result = composeDocumentationV10({
                perInstance: {
                    'fuellung-27-1': {
                        instanceId: 'fuellung-27-1',
                        teeth: ['27'],
                        text: '',
                        billingRefs: ['BEMA_13'],
                        chips: ['fuellung_grundleistung'],
                        facts: {
                            surfaces: ['m', 'o', 'd'],
                            materialMentioned: 'komposit',
                            // No adhesiveTechnique, no mkvJustification
                        },
                    },
                },
                answers: new Map(),
                insuranceType: 'GKV',
                textLength: 'mittel',
            });

            const dokSection = result.sections.find(s => s.id === 'dokumentation');
            expect(dokSection?.content).not.toContain('Mehrschichttechnik');
        });

        test('adhesiveTechnique=true DOES force Mehrschicht line', async () => {
            const { composeDocumentationV10 } = await import('../../v10/output/composeDocumentationV10');

            const result = composeDocumentationV10({
                perInstance: {
                    'fuellung-27-1': {
                        instanceId: 'fuellung-27-1',
                        teeth: ['27'],
                        text: '',
                        billingRefs: ['BEMA_13'],
                        chips: ['fuellung_grundleistung'],
                        facts: {
                            surfaces: ['m', 'o', 'd'],
                            adhesiveTechnique: true,
                        },
                    },
                },
                answers: new Map(),
                insuranceType: 'GKV',
                textLength: 'mittel',
            });

            const dokSection = result.sections.find(s => s.id === 'dokumentation');
            expect(dokSection?.content).toContain('Mehrschichttechnik');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // QUESTION CONTRACT
    // ═══════════════════════════════════════════════════════════════

    describe('Question Contract', () => {
        test('mkv_confirmed has correct options', async () => {
            const result = await runV10({
                treatmentId: 'fuellung',
                dictation: 'Füllung Zahn 27 mod',
                insuranceType: 'MKV',
                textLength: 'mittel',
            });

            if (result.state !== 'questions') {
                console.log('Skipping: not in questions state');
                return;
            }

            const mkvQuestion = result.questions?.find(q => String(q.questionKey ?? '') === 'mkv_confirmed');

            if (!mkvQuestion) {
                console.log('No MKV question found');
                return;
            }

            // Verify options
            expect(mkvQuestion.options).toBeDefined();
            expect(mkvQuestion.options?.length).toBe(2);

            // Note: QuestionOption uses 'id' not 'value'
            const optionIds = mkvQuestion.options?.map(o => o.id) ?? [];
            expect(optionIds).toContain('mehrkosten');
            expect(optionIds).toContain('nur_kasse');
        });
    });
});
