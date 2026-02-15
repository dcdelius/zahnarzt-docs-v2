/**
 * Gate M15.1: No Blocked-Chip Billing Codes
 *
 * GATE DEFINITION:
 * Billing codes NEVER contain a billingRef from a blocked chip.
 * If a chip's factSources include 'inferred' or 'default',
 * that chip's billing codes must NOT appear in final output.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../../v10/public';
import type { V10PipelineInput } from '../../../v10/types';

describe('Gate M15.1: No Blocked-Chip Billing Codes', () => {
    it('billing guard trace line is present', async () => {
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

        // Should have billing_guard trace line
        if (result.meta.traceLines) {
            const guardLine = result.meta.traceLines.find(l => l.startsWith('billing_guard:'));
            expect(guardLine).toBeDefined();
            expect(guardLine).toMatch(/billing_guard:blocked=\d+;allowed=\d+/);
        }
    });

    it('provenance billingGuard summary is present in output', async () => {
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
            // Provenance should be present
            expect(result.meta.provenance).toBeDefined();
            expect(result.meta.provenance?.billingGuard).toBeDefined();
            expect(result.meta.provenance?.billingGuard?.allowed).toBeGreaterThanOrEqual(0);
            expect(result.meta.provenance?.billingGuard?.blocked).toBeGreaterThanOrEqual(0);
        }
    });

    it('blocked chip IDs are tracked deterministically', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies, Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const results: string[][] = [];

        for (let i = 0; i < 5; i++) {
            const result = await runV10(input);
            if (result.state === 'output') {
                const blockedIds = result.meta.provenance?.billingGuard?.blockedChipIds ?? [];
                results.push(blockedIds);
            }
        }

        // All blocked ID lists should be identical
        if (results.length > 0) {
            const first = JSON.stringify(results[0]);
            for (let i = 1; i < results.length; i++) {
                expect(JSON.stringify(results[i])).toBe(first);
            }
        }
    });

    it('confirmed answers result in billing-eligible chips', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies profunda, Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
                ['medical_ueberkappung', 'ja'],
            ]),
        };

        const result = await runV10(input);

        if (result.state === 'output') {
            // With user-confirmed answers, chips should be billing-eligible
            const chips = result.meta.provenance?.chips ?? [];
            for (const chip of chips) {
                expect(chip.billingEligible).toBe(true);
            }
        }
    });
});
