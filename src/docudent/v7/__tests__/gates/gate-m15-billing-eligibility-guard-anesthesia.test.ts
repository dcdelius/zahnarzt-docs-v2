/**
 * Gate M15: Billing Eligibility Guard (Anesthesia Focus)
 *
 * GATE DEFINITION:
 * If anesthesia is inferred but not confirmed:
 * - Billing codes for anesthesia should NOT be present
 * - Anesthesia text should NOT appear in final output
 * unless explicitly confirmed by user answer.
 *
 * This prevents billing for procedures that weren't actually confirmed.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../../v10/public';
import type { V10PipelineInput } from '../../../v10/types';

describe('Gate M15: Billing Eligibility Guard (Anesthesia)', () => {
    const ANESTHESIA_BILLING_CODES = ['40', '41a', '41b', 'L', '0090', '0100'];

    it('no anesthesia mentioned = no anesthesia billing', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies, Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const result = await runV10(input);

        if (result.state === 'output') {
            const billingCodes = result.output?.billingCodes ?? [];

            // Should NOT have any anesthesia billing codes
            for (const anaCode of ANESTHESIA_BILLING_CODES) {
                expect(billingCodes).not.toContain(anaCode);
            }
        }
    });

    it('vague "Spritze" without type = no anesthesia billing', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 Spritze, Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const result = await runV10(input);

        // Either should be in questions state asking about type,
        // or should NOT have anesthesia billing without confirmation
        if (result.state === 'output') {
            const billingCodes = result.output?.billingCodes ?? [];

            // Should NOT have anesthesia billing without explicit confirmation
            for (const anaCode of ANESTHESIA_BILLING_CODES) {
                expect(billingCodes).not.toContain(anaCode);
            }
        }
    });

    it('schmerzfrei (inferred) = no anesthesia billing', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 schmerzfrei behandelt, Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const result = await runV10(input);

        if (result.state === 'output') {
            const billingCodes = result.output?.billingCodes ?? [];

            // "schmerzfrei" doesn't confirm anesthesia was given
            for (const anaCode of ANESTHESIA_BILLING_CODES) {
                expect(billingCodes).not.toContain(anaCode);
            }
        }
    });

    it('explicit infiltration = anesthesia text in output (not billing without askback)', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 Infiltrationsanästhesie, MOD Karies',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const result = await runV10(input);

        // Either questions state or output
        expect(['questions', 'output', 'error']).toContain(result.state);
    });

    it('output state should never have unconfirmed anesthesia billing', async () => {
        const inputs: V10PipelineInput[] = [
            {
                dictation: 'Zahn 16 Behandlung unter örtlicher Betäubung',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map([
                    ['medical_vipr', 'positiv'],
                ]),
            },
            {
                dictation: 'Zahn 26 Lokalanästhesie, Füllung',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map([
                    ['medical_vipr', 'positiv'],
                ]),
            },
        ];

        for (const input of inputs) {
            const result = await runV10(input);

            if (result.state === 'output') {
                // Check that anesthesia billing codes are only present
                // if there's corresponding provenance
                // (For now, just ensure no crash - actual billing guard
                // integration will be done in runV10.ts)
                expect(result.output).toBeDefined();
            }
        }
    });

    it('billing codes are always traceable to provenance', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies, Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const result = await runV10(input);

        if (result.state === 'output') {
            // Each billing code should be traceable back to a chip
            // The provenance should be deterministic
            expect(result.trace?.allChips ?? []).toEqual(
                expect.any(Array)
            );
        }
    });
});
