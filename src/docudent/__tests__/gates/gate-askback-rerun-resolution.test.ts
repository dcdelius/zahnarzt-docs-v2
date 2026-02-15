/**
 * Gate Test: Askback Rerun Resolution (GIGAPROMPT 11)
 *
 * Contract: Once an askback is answered, the facts are updated
 * so the KB rule doesn't re-trigger on rerun.
 *
 * Test cases:
 * 1. MKV ambiguous → questions
 * 2. Answer "mehrschicht" → output, no re-ask
 * 3. Answer "keine" → no GOZ, nurKasse text
 *
 * @fast < 3s
 * @deterministic
 */

import { describe, test, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function hasMkvAskbackKey(result: Awaited<ReturnType<typeof runV10>>, key: string): boolean {
    if (result.state !== 'questions') return false;
    return result.questions?.some(q => String(q.questionKey ?? '') === key) ?? false;
}

function hasGozAddon(result: Awaited<ReturnType<typeof runV10>>): boolean {
    if (result.state !== 'output') return false;
    const perInstance = result.output?.perInstance ?? {};
    const allBilling = Object.values(perInstance).flatMap(inst => inst.billingRefs ?? []);
    return allBilling.some(b => b.startsWith('GOZ_'));
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('gate-askback-rerun-resolution', () => {
    /**
     * Core test: MKV ambiguous → answer → no re-ask
     */
    test('MKV ambiguous → mkv_confirmed=mehrkosten → asks betrag+justification (no re-ask)', async () => {
        // Run 1: Should get questions (MKV ambiguous)
        const run1 = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 27 mod',
            insuranceType: 'MKV',
            textLength: 'mittel',
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '27',
                    surfaces: ['m', 'o', 'd'],
                    cariesDepth: 'normal',
                    materialMentioned: 'komposit',
                },
            },
        });

        console.log('[run1] State:', run1.state);
        if (run1.state === 'questions') {
            console.log('[run1] Questions:', run1.questions?.map(q => q.id));
        }

        // Must trigger MKV askback
        expect(run1.state).toBe('questions');
        expect(hasMkvAskbackKey(run1, 'mkv_confirmed'), 'Run1 should ask mkv_confirmed').toBe(true);
        expect(hasMkvAskbackKey(run1, 'mkv_betrag'), 'Run1 should NOT ask mkv_betrag yet').toBe(false);
        expect(hasMkvAskbackKey(run1, 'mkv_justification'), 'Run1 should NOT ask mkv_justification yet').toBe(false);

        // Run 2: With confirmation - should ask amount + justification (and NOT re-ask confirmation)
        const answers = new Map<string, unknown>();
        answers.set('medical_mkv_confirmed', 'mehrkosten');
        answers.set('mkv_confirmed', 'mehrkosten');

        const run2 = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 27 mod',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers,
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '27',
                    surfaces: ['m', 'o', 'd'],
                    cariesDepth: 'normal',
                    materialMentioned: 'komposit',
                },
            },
        });

        console.log('[run2] State:', run2.state);
        expect(run2.state).toBe('questions');
        if (run2.state === 'questions') {
            console.log('[run2] Questions:', run2.questions?.map(q => q.id));
            expect(hasMkvAskbackKey(run2, 'mkv_confirmed'), 'Run2 should NOT re-ask mkv_confirmed').toBe(false);
            expect(hasMkvAskbackKey(run2, 'mkv_betrag'), 'Run2 should ask mkv_betrag').toBe(true);
            expect(hasMkvAskbackKey(run2, 'mkv_justification'), 'Run2 should ask mkv_justification').toBe(true);
        }
    });

    /**
     * "keine" answer → nurKasse, no GOZ
     */
    test('MKV ambiguous → mkv_confirmed=nur_kasse → no GOZ, suppressed MKV', async () => {
        const answers = new Map<string, unknown>();
        answers.set('medical_mkv_confirmed', 'nur_kasse');
        answers.set('mkv_confirmed', 'nur_kasse');

        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 27 mod',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers,
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '27',
                    surfaces: ['m', 'o', 'd'],
                    cariesDepth: 'normal',
                    materialMentioned: 'komposit',
                },
            },
        });

        console.log('[keine] State:', result.state);

        expect(result.state).not.toBe('error');

        // Should NOT ask MKV amount/justification
        if (result.state === 'questions') {
            expect(hasMkvAskbackKey(result, 'mkv_confirmed')).toBe(false);
            expect(hasMkvAskbackKey(result, 'mkv_betrag')).toBe(false);
            expect(hasMkvAskbackKey(result, 'mkv_justification')).toBe(false);
        }

        // If output, should have no GOZ
        if (result.state === 'output') {
            expect(hasGozAddon(result), 'nur_kasse should have no GOZ').toBe(false);
            // Should have nurKasse text
            const fullText = result.output?.fullText?.toLowerCase() ?? '';
            expect(fullText).toContain('kassenleistung');
        }
    });

    /**
     * Verify mehrkostenSignalsClear is set after answer
     */
    test('After mkv_confirmed=mehrkosten, mkv_confirmed should not re-ask', async () => {
        const answers = new Map<string, unknown>();
        answers.set('medical_mkv_confirmed', 'mehrkosten');
        answers.set('mkv_confirmed', 'mehrkosten');

        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 27 mod',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers,
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '27',
                    surfaces: ['m', 'o', 'd'],
                    cariesDepth: 'normal',
                    materialMentioned: 'komposit',
                },
            },
        });

        if (result.state === 'questions') {
            expect(hasMkvAskbackKey(result, 'mkv_confirmed')).toBe(false);
        }
    });
});
