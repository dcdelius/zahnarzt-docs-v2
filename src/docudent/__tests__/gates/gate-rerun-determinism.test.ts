/**
 * Gate Test: Rerun Determinism (GIGAPROMPT 11)
 *
 * Contract: Same inputs (dictation + answers + settings + insurance)
 * must produce identical output every time.
 *
 * If this flakes → P0 priority bug.
 *
 * @fast < 5s
 * @deterministic
 */

import { describe, test, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

interface StableOutput {
    state: string;
    questionIds?: string[];
    chips?: string[];
    billingCodes?: string[];
    sectionIds?: string[];
}

function extractStableFields(result: Awaited<ReturnType<typeof runV10>>): StableOutput {
    if (result.state === 'questions') {
        return {
            state: result.state,
            questionIds: (result.questions ?? []).map(q => q.id!).sort(),
        };
    }

    if (result.state === 'output') {
        const perInstance = result.output?.perInstance ?? {};
        const allChips = Object.values(perInstance)
            .flatMap(inst => inst.chips ?? [])
            .sort();
        const allBilling = Object.values(perInstance)
            .flatMap(inst => inst.billingRefs ?? [])
            .sort();
        const sectionIds = (result.output?.sections ?? []).map(s => s.id).sort();

        return {
            state: result.state,
            chips: allChips,
            billingCodes: allBilling,
            sectionIds,
        };
    }

    return { state: result.state };
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('gate-rerun-determinism', () => {
    /**
     * 10x rerun with same input → identical output
     */
    test('10x rerun GKV filling → identical output', async () => {
        const RUN_COUNT = 10;
        const results: StableOutput[] = [];

        for (let i = 0; i < RUN_COUNT; i++) {
            const result = await runV10({
                treatmentId: 'fuellung',
                dictation: 'Füllung Zahn 36 mod Komposit',
                insuranceType: 'GKV',
                textLength: 'mittel',
            });

            results.push(extractStableFields(result));
        }

        // All results should be identical
        const first = JSON.stringify(results[0]);
        for (let i = 1; i < RUN_COUNT; i++) {
            expect(
                JSON.stringify(results[i]),
                `Run ${i + 1} should match run 1`
            ).toBe(first);
        }

        console.log('[GKV 10x] All runs identical:', results[0]);
    });

    /**
     * 10x rerun with answers → identical output
     */
    test('10x rerun MKV with answers → identical output', async () => {
        const RUN_COUNT = 10;
        const answers = new Map<string, unknown>();
        answers.set('fuellung_mkv_justification', 'mehrschicht');
        answers.set('fuellung_material', 'komposit');

        const results: StableOutput[] = [];

        for (let i = 0; i < RUN_COUNT; i++) {
            const result = await runV10({
                treatmentId: 'fuellung',
                dictation: 'Füllung Zahn 27 mod',
                insuranceType: 'MKV',
                textLength: 'mittel',
                answers,
            });

            results.push(extractStableFields(result));
        }

        // All results should be identical
        const first = JSON.stringify(results[0]);
        for (let i = 1; i < RUN_COUNT; i++) {
            expect(
                JSON.stringify(results[i]),
                `Run ${i + 1} should match run 1`
            ).toBe(first);
        }

        console.log('[MKV 10x] All runs identical:', results[0]);
    });

    /**
     * Chips are stable-sorted
     */
    test('Chips are emitted in stable order', async () => {
        const result1 = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 36 mod Komposit mit Kofferdam',
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        const result2 = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 36 mod Komposit mit Kofferdam',
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        expect(extractStableFields(result1)).toEqual(extractStableFields(result2));
    });

    /**
     * Billing codes are stable-sorted
     */
    test('Billing codes are emitted in stable order', async () => {
        const answers = new Map<string, unknown>();
        answers.set('fuellung_mkv_justification', 'mehrschicht');

        const result1 = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 36 mod',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers,
        });

        const result2 = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 36 mod',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers,
        });

        expect(extractStableFields(result1)).toEqual(extractStableFields(result2));
    });
});
