/**
 * Gate M9: No Text Without Chip
 *
 * Verifies that all output text comes from KB chips via SSOT renderer.
 */

import { describe, it, expect } from 'vitest';
import { GOLDEN_MEDICAL_CASES } from '../fixtures/goldenMedicalCases.v1';
import { stubExtractFromDictation } from '../../pipeline/__test__/stubExtractor';
import { createFactsFromExtracted, applyAnswersToFacts } from '../../medical/facts';
import { applyMedicalKb } from '../../medical';
import { renderFromKbChips } from '../../output';

describe('Gate M9: No Text Without Chip', () => {
    // ═══════════════════════════════════════════════════════════════
    // TEST: Renderer produces no missing chips for golden cases
    // ═══════════════════════════════════════════════════════════════

    describe('Golden cases render with no missing chips', () => {
        const casesWithChips = GOLDEN_MEDICAL_CASES.filter(
            c => c.expect.chips && c.expect.chips.length > 0
        );

        for (const testCase of casesWithChips) {
            it(`${testCase.id}: no missing chips in output`, () => {
                const extracted = stubExtractFromDictation(
                    testCase.input.dictation,
                    testCase.input.treatmentId
                );

                let facts = createFactsFromExtracted(
                    extracted as Record<string, unknown>,
                    testCase.input.treatmentId
                );

                // Apply answers if provided
                if (testCase.input.answers) {
                    facts = applyAnswersToFacts(facts, testCase.input.answers);
                }

                const engineResult = applyMedicalKb({
                    facts: facts as unknown as Record<string, unknown>,
                    treatmentId: testCase.input.treatmentId,
                });

                // Render chips through SSOT renderer
                const renderResult = renderFromKbChips({
                    chips: engineResult.emittedChips,
                    treatmentId: testCase.input.treatmentId,
                    insuranceType: testCase.input.insuranceType,
                    textLength: testCase.input.textLength,
                    context: { material: 'Ca(OH)₂' },
                });

                // GATE: No missing chips
                expect(renderResult.meta.missingChips).toHaveLength(0);
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Medical chips render to expected text content
    // ═══════════════════════════════════════════════════════════════

    describe('Medical chip rendering', () => {
        it('cp chip renders with material substitution', () => {
            const result = renderFromKbChips({
                chips: ['cp'],
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                context: { material: 'MTA' },
            });

            expect(result.fullText).toContain('MTA');
            expect(result.billingCodes).toContain('BEMA_25');
            expect(result.meta.missingChips).toHaveLength(0);
        });

        it('cp_not_required chip renders as TEXT_ONLY', () => {
            const result = renderFromKbChips({
                chips: ['cp_not_required'],
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'kurz',
            });

            // Should have text but no billing
            expect(result.fullText.length).toBeGreaterThan(0);
            expect(result.meta.textOnlyChips).toContain('cp_not_required');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Renderer handles all insurance types
    // ═══════════════════════════════════════════════════════════════

    describe('Insurance type handling', () => {
        it('GKV uses BEMA codes', () => {
            const result = renderFromKbChips({
                chips: ['kofferdam'],
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'kurz',
            });

            expect(result.billingCodes).toContain('BEMA_12');
        });

        it('PKV uses GOZ codes', () => {
            const result = renderFromKbChips({
                chips: ['kofferdam'],
                treatmentId: 'fuellung',
                insuranceType: 'PKV',
                textLength: 'kurz',
            });

            expect(result.billingCodes).toContain('GOZ_2040');
        });

        it('MKV falls back to GKV codes', () => {
            const result = renderFromKbChips({
                chips: ['kofferdam'],
                treatmentId: 'fuellung',
                insuranceType: 'MKV',
                textLength: 'kurz',
            });

            expect(result.billingCodes).toContain('BEMA_12');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Text length variants
    // ═══════════════════════════════════════════════════════════════

    describe('Text length variants', () => {
        it('kurz produces shorter text than lang', () => {
            const shortResult = renderFromKbChips({
                chips: ['la_infiltr'],
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'kurz',
            });

            const longResult = renderFromKbChips({
                chips: ['la_infiltr'],
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'lang',
            });

            expect(shortResult.fullText.length).toBeLessThan(longResult.fullText.length);
        });
    });
});
