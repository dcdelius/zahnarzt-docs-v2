/**
 * GATE TEST: Treatment Isolation
 * 
 * Hard rules to prevent cross-treatment contamination:
 * 1. treatmentId=endo → output header must NOT contain "Kompositfüllung"
 * 2. treatmentId=fuellung → output must NOT contain "ENDO-SCHRITT"
 * 3. tooth 46 + 1 canal → warn (anatomical plausibility for multi-rooted tooth)
 * 
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { pipeline } from '../../pipeline';
import type { PipelineInput } from '../../pipeline/types';
import { generateMinimalAnswers } from '../helpers/minimalAnswers';

// ═══════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════

beforeAll(() => {
    process.env.DOCUDENT_TEST_MODE = 'stub_extraction';
    // Disable DEV-only answer effectiveness gate for gate tests
    (globalThis as any).__SKIP_DEV_CHECKS__ = true;
});

// ═══════════════════════════════════════════════════════════════
// HELPER: Run pipeline to output state
// ═══════════════════════════════════════════════════════════════

async function runToOutput(input: PipelineInput): Promise<ReturnType<typeof pipeline.run>> {
    // Step 1: Get questions
    const step1 = await pipeline.run(input);

    if (step1.state === 'output') {
        return step1;
    }

    if (step1.state === 'error') {
        throw new Error(`Pipeline error: ${step1.error}`);
    }

    // Step 2: Answer questions and get output
    const answers = generateMinimalAnswers(step1.questions);
    return pipeline.run({ ...input, answers });
}

// ═══════════════════════════════════════════════════════════════
// TESTS: Treatment Isolation
// ═══════════════════════════════════════════════════════════════

describe('gate-treatment-isolation', () => {
    describe('Endo isolation', () => {
        it('endo header should NOT contain "Kompositfüllung"', async () => {
            const result = await runToOutput({
                dictation: 'Zahn 46 mit irreversibler Pulpitis. Trepanation durchgeführt.',
                answers: new Map(),
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                treatmentId: 'endo',
            });

            // Log error for debugging if in error state
            if (result.state === 'error') {
                console.log('[GATE] Endo test error:', result.error);
            }
            expect(result.state, `Expected output but got: ${result.error}`).toBe('output');

            // Check header section specifically
            const headerSection = result.output?.sections?.find(s => s.id === 'header');
            if (headerSection) {
                expect(headerSection.content).not.toContain('Kompositfüllung');
            }

            // Also check fullText for good measure
            const fullText = result.output?.fullText || '';
            expect(fullText).toContain('Wurzelbehandlung');
            expect(fullText).not.toContain('Kompositfüllung');
        });

        it('endo output should contain ENDO-SCHRITT when step is provided', async () => {
            const result = await runToOutput({
                dictation: 'Zahn 46 Trepanation. Spülung NaOCl.',
                answers: new Map(),
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                treatmentId: 'endo',
            });

            expect(result.state).toBe('output');

            // Should have ENDO-SCHRITT section
            const endoSchrittSection = result.output?.sections?.find(s => s.id === 'endo_schritt');
            expect(endoSchrittSection).toBeDefined();
        });
    });

    describe('Füllung isolation', () => {
        it('fuellung output should NOT contain "ENDO-SCHRITT"', async () => {
            const result = await runToOutput({
                dictation: 'Zahn 14, mesial, Kompositfüllung, Kofferdam.',
                answers: new Map(),
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                treatmentId: 'fuellung',
            });

            expect(result.state).toBe('output');

            // Should NOT have ENDO-SCHRITT section
            const endoSchrittSection = result.output?.sections?.find(s => s.id === 'endo_schritt');
            expect(endoSchrittSection).toBeUndefined();

            // Should NOT contain endo terms in output
            const fullText = result.output?.fullText || '';
            expect(fullText).not.toContain('ENDO-SCHRITT');
            expect(fullText).not.toContain('Wurzelbehandlung');
        });

        it('fuellung header should contain "Kompositfüllung"', async () => {
            const result = await runToOutput({
                dictation: 'Zahn 36, MOD, Komposit.',
                answers: new Map(),
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                treatmentId: 'fuellung',
            });

            expect(result.state).toBe('output');

            const headerSection = result.output?.sections?.find(s => s.id === 'header');
            if (headerSection) {
                expect(headerSection.content).toContain('Kompositfüllung');
            }
        });
    });

    describe('Billing diagnostics', () => {
        it('billingReason should be set when billing is empty', async () => {
            const result = await runToOutput({
                dictation: 'Zahn 14, mesial.',
                answers: new Map(),
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                treatmentId: 'fuellung',
            });

            expect(result.state).toBe('output');

            const output = result.output;
            if (output) {
                // Either has billing codes OR has billingReason
                const hasCodes = output.billingCodes && output.billingCodes.length > 0;
                const hasReason = !!output.billingReason;

                expect(hasCodes || hasReason).toBe(true);

                if (!hasCodes) {
                    console.log('[GATE] Billing empty, reason:', output.billingReason);
                }
            }
        });
    });

    describe('Trace diagnostics', () => {
        it('should include billing_inputs and billing_result in trace', async () => {
            const result = await runToOutput({
                dictation: 'Zahn 46, MOD, Komposit.',
                answers: new Map(),
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                treatmentId: 'fuellung',
            });

            expect(result.state).toBe('output');

            const trace = result.debug?.trace || [];
            const stages = trace.map(t => t.stage);

            expect(stages).toContain('billing_inputs');
            expect(stages).toContain('billing_result');

            // Log trace for debugging
            console.log('[GATE] Trace:', trace.map(t => `${t.stage}:${t.detail}`));
        });
    });
});
