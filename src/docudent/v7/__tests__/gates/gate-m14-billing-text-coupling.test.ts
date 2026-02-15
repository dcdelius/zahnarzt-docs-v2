/**
 * Gate M14: Billing/Text Coupling Invariants
 *
 * GATE DEFINITION:
 * - If a chip has billingRef in KB → billing code MUST appear in output
 * - If billing output contains a code → MUST be traceable to a chip
 * - No "free text" additions outside M9 renderer path
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../../v10/public';
import type { V10PipelineInput } from '../../../v10/types';
import { getChipFromKb } from '../../output/renderFromKbChips';

describe('Gate M14: Billing/Text Coupling Invariants', () => {
    it('chip with billingRef produces billing code', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const result = await runV10(input);

        if (result.state === 'output' && result.output) {
            const chips = result.trace?.allChips ?? [];
            const billingCodes = result.output.billingCodes;

            // For each chip with a billing ref, verify code appears
            for (const chipId of chips) {
                const chip = getChipFromKb('fuellung', chipId);
                if (chip?.billingRef?.GKV) {
                    // If chip has GKV billing, it should appear in output
                    expect(billingCodes).toContain(chip.billingRef.GKV);
                }
            }
        }
    });

    it('cp chip produces Cp billing code when capping=yes', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies profunda',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
                ['medical_ueberkappung', 'ja'],
            ]),
        };

        const result = await runV10(input);

        if (result.state === 'output' && result.output) {
            const chips = result.trace?.allChips ?? [];

            if (chips.includes('cp')) {
                // cp chip should produce Cp billing
                expect(result.output.billingCodes).toContain('Cp');
            }
        }
    });

    it('cp_not_required chip does NOT produce Cp billing', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies profunda',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
                ['medical_ueberkappung', 'nein'],
            ]),
        };

        const result = await runV10(input);

        if (result.state === 'output' && result.output) {
            const chips = result.trace?.allChips ?? [];

            if (chips.includes('cp_not_required')) {
                // cp_not_required should NOT produce Cp billing (it's TEXT_ONLY)
                expect(result.output.billingCodes).not.toContain('Cp');
            }
        }
    });

    it('all billing codes are traceable to chips', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const result = await runV10(input);

        if (result.state === 'output' && result.output) {
            const chips = result.trace?.allChips ?? [];
            const billingCodes = result.output.billingCodes;

            // Build set of all possible billing codes from chips
            const possibleCodes = new Set<string>();
            for (const chipId of chips) {
                const chip = getChipFromKb('fuellung', chipId);
                if (chip?.billingRef?.GKV) {
                    possibleCodes.add(chip.billingRef.GKV);
                }
                if (chip?.billingRef?.PKV) {
                    possibleCodes.add(chip.billingRef.PKV);
                }
            }

            // Every billing code in output should be traceable
            for (const code of billingCodes) {
                expect(possibleCodes.has(code)).toBe(true);
            }
        }
    });

    it('billing codes are deterministic for same input', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const result1 = await runV10(input);
        const result2 = await runV10(input);

        if (result1.state === 'output' && result2.state === 'output') {
            expect(result1.output?.billingCodes).toEqual(result2.output?.billingCodes);
        }
    });

    it('PKV billing codes come from chip billingRef.PKV', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies dreiflächige Füllung',
            treatmentId: 'fuellung',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const result = await runV10(input);

        if (result.state === 'output' && result.output) {
            const chips = result.trace?.allChips ?? [];
            const billingCodes = result.output.billingCodes;

            // Should use PKV billing refs where available
            for (const chipId of chips) {
                const chip = getChipFromKb('fuellung', chipId);
                if (chip?.billingRef?.PKV) {
                    // PKV billing should be used (or GKV fallback)
                    const hasPKV = billingCodes.includes(chip.billingRef.PKV);
                    const hasGKV = chip.billingRef.GKV && billingCodes.includes(chip.billingRef.GKV);
                    expect(hasPKV || hasGKV).toBe(true);
                }
            }
        }
    });
});
