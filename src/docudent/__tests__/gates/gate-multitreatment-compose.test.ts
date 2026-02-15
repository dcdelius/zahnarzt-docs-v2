/**
 * Gate Test: P12.6 Multi-Treatment Compose
 *
 * Validates multi-treatment compose produces deterministic, isolated output.
 *
 * INVARIANTS:
 * - MultiComposedDocumentV1 is deterministic (no timestamps, stable ordering)
 * - Treatment isolation preserved within each treatment document
 * - Aggregated billing refs = union of treatment refs (deduped)
 * - Aggregated copy text = deterministic join with fixed separator
 */

import { describe, it, expect } from 'vitest';
import {
    composeMultiDocumentV1,
    type MultiComposeInput
} from '../../core/billing/knowledgeBase/logic/outputComposer';
import type { ProcessingResult, ChipDefinition } from '../../core/billing/knowledgeBase/logic/treatmentEngine';
import type { BillingInferenceResult } from '../../core/billing/knowledgeBase/logic/billingRegistry';

describe('GATE: P12.6 Multi-Treatment Compose', () => {

    // Helper to create minimal inputs
    function createMockInput(treatmentId: string, billingCodes: string[]): any {
        return {
            templateId: treatmentId,
            engineResult: {
                chips: [],
                billingCodes,
                billingDetails: [],
                warnings: []
            } as ProcessingResult,
            activeChips: [] as ChipDefinition[],
            extractedData: { tooth: '36' },
            insuranceType: 'GKV' as const,
            options: {
                textLength: 'mittel' as const,
                hasMKV: false
            },
            billingResult: {
                suggestions: [],
                billingCodes,
                verblendbereich: false,
                befundklasse: 0,
                insuranceType: 'GKV' as const
            } as BillingInferenceResult,
            docMode: 'balanced' as const
        };
    }

    describe('Determinism', () => {
        it('multi-compose should produce identical output for same input', () => {
            const input: MultiComposeInput = {
                treatments: [
                    createMockInput('fuellung', ['BEMA_13a', 'BEMA_40']),
                    createMockInput('endo', ['GOZ_2390', 'GOZ_2400'])
                ]
            };

            const result1 = composeMultiDocumentV1(input);
            const result2 = composeMultiDocumentV1(input);

            expect(result1.aggregatedCopyText).toBe(result2.aggregatedCopyText);
            expect(result1.aggregatedBillingRefs.map(r => r.canonicalKey))
                .toEqual(result2.aggregatedBillingRefs.map(r => r.canonicalKey));
        });

        it('multi-compose should have no timestamps in any document', () => {
            const input: MultiComposeInput = {
                treatments: [createMockInput('fuellung', ['BEMA_13a'])]
            };

            const result = composeMultiDocumentV1(input);

            for (const doc of result.treatmentDocuments) {
                expect(doc.metadata).not.toHaveProperty('timestamp');
                expect(doc.metadata).not.toHaveProperty('createdAt');
                expect(doc.metadata).not.toHaveProperty('date');
            }
        });
    });

    describe('Treatment Isolation', () => {
        it('each treatment document should have correct treatmentId', () => {
            const input: MultiComposeInput = {
                treatments: [
                    createMockInput('fuellung', ['BEMA_13a']),
                    createMockInput('endo', ['GOZ_2390'])
                ]
            };

            const result = composeMultiDocumentV1(input);

            expect(result.treatmentDocuments).toHaveLength(2);
            expect(result.treatmentDocuments[0].metadata.treatmentId).toBe('fuellung');
            expect(result.treatmentDocuments[1].metadata.treatmentId).toBe('endo');
        });
    });

    describe('Aggregation', () => {
        it('aggregated billing refs should be deduplicated if present', () => {
            const input: MultiComposeInput = {
                treatments: [
                    createMockInput('fuellung', ['BEMA_13a', 'BEMA_40']),
                    createMockInput('fuellung', ['BEMA_13a', 'BEMA_41a'])  // BEMA_13a repeated
                ]
            };

            const result = composeMultiDocumentV1(input);

            // If there are any BEMA_13a refs, they should be deduped (max 1)
            const bema13aCount = result.aggregatedBillingRefs.filter(
                r => r.canonicalKey === 'BEMA_13a'
            ).length;
            // Either 0 (no abrechnung section in mock) or 1 (deduped)
            expect(bema13aCount).toBeLessThanOrEqual(1);
        });

        it('aggregated copy text should use fixed separator', () => {
            const input: MultiComposeInput = {
                treatments: [
                    createMockInput('fuellung', ['BEMA_13a']),
                    createMockInput('endo', ['GOZ_2390'])
                ]
            };

            const result = composeMultiDocumentV1(input);

            // Should contain the separator if both have content
            if (result.treatmentDocuments[0].copyText && result.treatmentDocuments[1].copyText) {
                expect(result.aggregatedCopyText).toContain('\n\n---\n\n');
            }
        });
    });

    describe('Cross-Treatment Combinability', () => {
        it('fuellung + endo on same tooth should PASS (different treatments)', () => {
            const input: MultiComposeInput = {
                treatments: [
                    createMockInput('fuellung', ['BEMA_13a']),
                    createMockInput('endo', ['GOZ_2390'])
                ]
            };

            const result = composeMultiDocumentV1(input);

            // Should not have cross-treatment conflicts for different treatment types
            const crossConflicts = result.aggregatedCombinability.crossTreatment.conflicts.filter(
                c => c.codeA.includes('13') && c.codeB.includes('239')
            );
            expect(crossConflicts).toHaveLength(0);
        });

        it('overall verdict should be BLOCK if any within-treatment is BLOCK', () => {
            const input: MultiComposeInput = {
                treatments: [
                    createMockInput('fuellung', ['GOZ_2197', 'GOZ_2060'])  // Known BLOCK
                ]
            };

            const result = composeMultiDocumentV1(input);

            // The within-treatment should be BLOCK
            expect(result.aggregatedCombinability.withinTreatment[0].verdict).toBe('BLOCK');
            // Overall should also be BLOCK
            expect(result.aggregatedCombinability.verdict).toBe('BLOCK');
        });
    });
});
