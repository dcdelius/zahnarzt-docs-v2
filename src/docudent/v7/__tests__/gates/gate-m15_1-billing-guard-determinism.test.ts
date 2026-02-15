/**
 * Gate M15.1: Billing Guard Determinism
 *
 * GATE DEFINITION:
 * The billing guard must produce deterministic results:
 * - blockedChipIds order is stable across runs
 * - allowed/blocked counts are identical for same input
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../../v10/public';
import type { V10PipelineInput } from '../../../v10/types';
import { applyBillingGuard, type ChipWithProvenance } from '../../../v10/pipeline/billingEligibilityGuard';

describe('Gate M15.1: Billing Guard Determinism', () => {
    it('applyBillingGuard is deterministic', () => {
        const chips: ChipWithProvenance[] = [
            { chipId: 'c_third', emittedByRuleId: 'r1', factSources: ['dictation'], scope: 'session' },
            { chipId: 'b_second', emittedByRuleId: 'r2', factSources: ['inferred'], scope: 'session' },
            { chipId: 'a_first', emittedByRuleId: 'r3', factSources: ['user'], scope: 'session' },
        ];

        const results: string[] = [];

        for (let i = 0; i < 10; i++) {
            const result = applyBillingGuard(chips);
            results.push(result.traceLine);
        }

        // All should be identical
        const first = results[0];
        for (let i = 1; i < results.length; i++) {
            expect(results[i]).toBe(first);
        }
    });

    it('blockedChipIds are sorted alphabetically', () => {
        const chips: ChipWithProvenance[] = [
            { chipId: 'z_chip', emittedByRuleId: 'r1', factSources: ['inferred'], scope: 'session' },
            { chipId: 'a_chip', emittedByRuleId: 'r2', factSources: ['default'], scope: 'session' },
            { chipId: 'm_chip', emittedByRuleId: 'r3', factSources: ['inferred'], scope: 'session' },
        ];

        const result = applyBillingGuard(chips);

        // Should be alphabetically sorted
        expect(result.blocked.map(c => c.chipId)).toEqual(['a_chip', 'm_chip', 'z_chip']);
    });

    it('allowedChipIds are sorted alphabetically', () => {
        const chips: ChipWithProvenance[] = [
            { chipId: 'z_chip', emittedByRuleId: 'r1', factSources: ['dictation'], scope: 'session' },
            { chipId: 'a_chip', emittedByRuleId: 'r2', factSources: ['user'], scope: 'session' },
            { chipId: 'm_chip', emittedByRuleId: 'r3', factSources: ['settings'], scope: 'session' },
        ];

        const result = applyBillingGuard(chips);

        // Should be alphabetically sorted
        expect(result.allowed.map(c => c.chipId)).toEqual(['a_chip', 'm_chip', 'z_chip']);
    });

    it('pipeline output has deterministic billing guard', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies, Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const traceLines: string[] = [];

        for (let i = 0; i < 10; i++) {
            const result = await runV10(input);
            const guardLine = result.meta.traceLines?.find(l => l.startsWith('billing_guard:')) ?? '';
            traceLines.push(guardLine);
        }

        // All should be identical
        const first = traceLines[0];
        for (let i = 1; i < traceLines.length; i++) {
            expect(traceLines[i]).toBe(first);
        }
    });

    it('mixed eligible/ineligible chips are correctly partitioned', () => {
        const chips: ChipWithProvenance[] = [
            { chipId: 'eligible_1', emittedByRuleId: 'r1', factSources: ['dictation'], scope: 'session' },
            { chipId: 'ineligible_1', emittedByRuleId: 'r2', factSources: ['inferred'], scope: 'session' },
            { chipId: 'eligible_2', emittedByRuleId: 'r3', factSources: ['user', 'dictation'], scope: 'session' },
            { chipId: 'ineligible_2', emittedByRuleId: 'r4', factSources: ['default'], scope: 'session' },
        ];

        const result = applyBillingGuard(chips);

        expect(result.allowed.map(c => c.chipId)).toEqual(['eligible_1', 'eligible_2']);
        expect(result.blocked.map(c => c.chipId)).toEqual(['ineligible_1', 'ineligible_2']);
        expect(result.traceLine).toBe('billing_guard:blocked=2;allowed=2;blockedIds=ineligible_1,ineligible_2');
    });
});
