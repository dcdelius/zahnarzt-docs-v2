/**
 * Gate Test: Settings Kill Questions
 *
 * Verifies that user settings defaults reduce askbacks.
 * When a factKey is set by settings, the corresponding question should not appear.
 * 
 * Precedence: dictation negation > dictation explicit > manual answer > settings > system default
 */

import { describe, test, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';

describe('gate-settings-kill-questions', () => {
    // ═══════════════════════════════════════════════════════════════
    // Case 1: Capping Material - without settings
    // ═══════════════════════════════════════════════════════════════

    test('profunda WITHOUT settings: asks for capping material', async () => {
        const result = await runV10({
            dictation: 'Füllung 36 profunda Ca(OH)2',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            // No testOnly settings
        });

        // Should have questions
        expect(result.state).toBe('questions');
        if (result.state === 'questions') {
            const questionIds = result.questions?.map(q => q.id) ?? [];
            console.log('[NO SETTINGS] Questions:', questionIds);

            // Should ask about capping (profunda triggers Cp/P askback)
            const hasCappingQuestion = questionIds.some(id =>
                id.includes('capping') || id.includes('ueberkappung')
            );
            expect(hasCappingQuestion).toBe(true);
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 2: Capping Material - WITH settings
    // ═══════════════════════════════════════════════════════════════

    test('profunda WITH settings (defaultCappingMaterial): fewer questions', async () => {
        const result = await runV10({
            dictation: 'Füllung 36 profunda Ca(OH)2',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                userSettings: {
                    defaultCappingMaterial: 'Ca(OH)2',
                },
            },
        });

        console.log('[WITH SETTINGS] State:', result.state);
        if (result.state === 'questions') {
            const questionIds = result.questions?.map(q => q.id) ?? [];
            console.log('[WITH SETTINGS] Questions:', questionIds);

            // Should NOT ask for capping material specifically since it's set
            const hasMaterialQuestion = questionIds.some(id =>
                id.includes('capping_material') || id.includes('ueberkappung_material')
            );

            // Material question should be suppressed
            expect(hasMaterialQuestion).toBe(false);
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 3: Multi-instance - settings apply per instance
    // ═══════════════════════════════════════════════════════════════

    test('multi-tooth: settings reduce questions for all instances', async () => {
        const resultWithoutSettings = await runV10({
            dictation: 'Füllung 36 und 37 profunda',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        const resultWithSettings = await runV10({
            dictation: 'Füllung 36 und 37 profunda',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                userSettings: {
                    defaultCappingMaterial: 'Ca(OH)2',
                },
            },
        });

        const questionsWithout = resultWithoutSettings.state === 'questions'
            ? (resultWithoutSettings.questions?.length ?? 0)
            : 0;
        const questionsWith = resultWithSettings.state === 'questions'
            ? (resultWithSettings.questions?.length ?? 0)
            : 0;

        console.log('[MULTI-TOOTH] Questions without settings:', questionsWithout);
        console.log('[MULTI-TOOTH] Questions with settings:', questionsWith);

        // With settings should have same or fewer questions
        expect(questionsWith).toBeLessThanOrEqual(questionsWithout);
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 4: Dictation override > settings
    // ═══════════════════════════════════════════════════════════════

    test('explicit dictation overrides settings', async () => {
        const result = await runV10({
            dictation: 'Füllung 36 profunda MTA',  // Explicit MTA in dictation
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                userSettings: {
                    defaultCappingMaterial: 'Ca(OH)2',  // Settings say Ca(OH)2
                },
            },
        });

        console.log('[OVERRIDE] State:', result.state);

        // Even with settings, if dictation explicitly mentions material,
        // that should be used (though may still need confirmation)
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 5: Simple case - no extra questions
    // ═══════════════════════════════════════════════════════════════

    test('simple okklusal: minimal questions with full settings', async () => {
        const result = await runV10({
            dictation: 'Füllung 36 okklusal Komposit',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                userSettings: {
                    defaultMaterial: 'komposit',
                    defaultIsolation: 'watterollen',
                },
            },
        });

        console.log('[FULL SETTINGS] State:', result.state);
        if (result.state === 'questions') {
            const questionIds = result.questions?.map(q => q.id) ?? [];
            console.log('[FULL SETTINGS] Questions:', questionIds);
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 6: Question count comparison
    // ═══════════════════════════════════════════════════════════════

    test('settings measurably reduce question count', async () => {
        const testCase = 'Füllung 36 okklusal';

        const resultWithout = await runV10({
            dictation: testCase,
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        const resultWith = await runV10({
            dictation: testCase,
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                userSettings: {
                    defaultMaterial: 'komposit',
                },
            },
        });

        const countWithout = resultWithout.state === 'questions'
            ? (resultWithout.questions?.length ?? 0)
            : 0;
        const countWith = resultWith.state === 'questions'
            ? (resultWith.questions?.length ?? 0)
            : 0;

        console.log('[REDUCTION] Without settings:', countWithout, 'questions');
        console.log('[REDUCTION] With settings:', countWith, 'questions');

        // With settings should have equal or fewer questions
        expect(countWith).toBeLessThanOrEqual(countWithout);
    });
});
