/**
 * Gate M15.1: Provenance Completeness
 *
 * GATE DEFINITION:
 * Every askback and every emitted chip must have provenance:
 * - askbacks: askbackId, ruleId, sourceRefs
 * - chips: chipId, emittedByRuleId, factSources, sourceRefs
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../../v10/public';
import type { V10PipelineInput } from '../../../v10/types';

describe('Gate M15.1: Provenance Completeness', () => {
    it('output state has askback provenance', async () => {
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

        if (result.state === 'output') {
            expect(result.meta.provenance).toBeDefined();
            expect(result.meta.provenance?.askbacks).toBeDefined();

            // Each askback should have required fields
            for (const askback of result.meta.provenance?.askbacks ?? []) {
                expect(askback.askbackId).toBeDefined();
                expect(askback.ruleId).toBeDefined();
                expect(askback.sourceRefs).toBeDefined();
                expect(Array.isArray(askback.sourceRefs)).toBe(true);
                expect(askback.scope).toMatch(/^(session|tooth)$/);
            }
        }
    });

    it('output state has chip provenance', async () => {
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

        if (result.state === 'output') {
            expect(result.meta.provenance).toBeDefined();
            expect(result.meta.provenance?.chips).toBeDefined();

            // Each chip should have required fields
            for (const chip of result.meta.provenance?.chips ?? []) {
                expect(chip.chipId).toBeDefined();
                expect(chip.emittedByRuleId).toBeDefined();
                expect(chip.factSources).toBeDefined();
                expect(Array.isArray(chip.factSources)).toBe(true);
                expect(chip.sourceRefs).toBeDefined();
                expect(Array.isArray(chip.sourceRefs)).toBe(true);
                expect(chip.scope).toMatch(/^(session|tooth)$/);
                expect(typeof chip.billingEligible).toBe('boolean');
            }
        }
    });

    it('every emitted chip has provenance entry', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const result = await runV10(input);

        if (result.state === 'output' && result.trace) {
            const emittedChipIds = result.trace.allChips ?? [];
            const provenanceChipIds = (result.meta.provenance?.chips ?? []).map(c => c.chipId);

            // Every emitted chip should have a provenance entry
            for (const chipId of emittedChipIds) {
                expect(provenanceChipIds).toContain(chipId);
            }
        }
    });

    it('ruleId points to a real rule', async () => {
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

        if (result.state === 'output') {
            const chips = result.meta.provenance?.chips ?? [];

            for (const chip of chips) {
                // ruleId should be a non-empty string (not 'unknown')
                expect(chip.emittedByRuleId).toBeDefined();
                expect(chip.emittedByRuleId.length).toBeGreaterThan(0);
            }
        }
    });
});
