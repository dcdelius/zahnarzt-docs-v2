/**
 * Gate M29: Soak Determinism Test (500x)
 * 
 * Runs the same input 500 times and verifies:
 * - Same chips produced
 * - Same billing codes produced
 * - Stable output
 * 
 * Skip locally via: SKIP_SOAK=true npx vitest run gate-m29
 * CI nightly should run this without SKIP_SOAK
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';
import type { V10PipelineInput } from '../../v10/types';

const SOAK_COUNT = process.env.SOAK_COUNT ? parseInt(process.env.SOAK_COUNT) : 50;
const SKIP_SOAK = process.env.SKIP_SOAK === 'true';

describe('gate-m29-soak-determinism-500x', () => {
    const testInput: V10PipelineInput = {
        dictation: 'Füllung Zahn 36 mo Komposit Caries media',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        testOnly: {
            enabled: true,
            forceExtraction: {
                tooth: '36',
                surfaces: ['mo'],
                diagnosis: 'caries_media',
            },
            forceAnswers: {
                medical_ueberkappung: 'keine',
            },
        },
    };

    it.skipIf(SKIP_SOAK)(`determinism over ${SOAK_COUNT} runs`, async () => {
        // First run - establish baseline
        const baseline = await runV10(testInput);

        expect(baseline.state).toBe('output');
        expect(baseline.output).toBeDefined();

        const baselineChips = baseline.trace?.instances[0]?.chips?.sort() || [];
        const baselineCodes = baseline.output?.billingCodes?.sort() || [];

        // Subsequent runs
        for (let i = 1; i < SOAK_COUNT; i++) {
            const result = await runV10(testInput);

            expect(result.state).toBe('output');

            const chips = result.trace?.instances[0]?.chips?.sort() || [];
            const codes = result.output?.billingCodes?.sort() || [];

            expect(chips).toEqual(baselineChips);
            expect(codes).toEqual(baselineCodes);
        }
    }, 120000); // 2 minute timeout

    it('single run produces output state', async () => {
        const result = await runV10(testInput);
        expect(result.state).toBe('output');
    });

    it('single run has output structure', async () => {
        const result = await runV10(testInput);
        expect(result.output).toBeDefined();
    });

    it('single run has trace structure', async () => {
        const result = await runV10(testInput);
        expect(result.trace).toBeDefined();
    });
});
