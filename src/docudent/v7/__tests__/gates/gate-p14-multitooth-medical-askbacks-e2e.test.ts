/**
 * Gate Test: Multi-Tooth Medical Askbacks E2E
 *
 * Verifies the medical layer works correctly for multi-tooth cases:
 * 1. Two teeth with different caries depths → askback only for profunda tooth
 * 2. Question IDs are instance-scoped (unique per tooth)
 *
 * Uses medical layer directly (standalone) since orchestrator integration is pending.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import {
    createFactsFromExtracted,
    applyAnswersToFacts,
    evaluateAskbacks,
    getChipIdsFromFacts,
    MEDICAL_QUESTION_IDS,
    KB_CHIP_IDS,
    type TreatmentFacts,
    type AskbackBundle,
} from '../../medical';

interface UnifiedChip {
    id: string;
    billingRef?: { GKV?: string; PKV?: string } | null;
}

interface UnifiedJson {
    chips: UnifiedChip[];
}

/**
 * Helper: Scope a question ID to a specific tooth/instance
 * Pattern matches existing instanceId format: "fuellung::tooth:16"
 */
function scopeQuestionId(questionId: string, tooth: string): string {
    return `${questionId}::tooth:${tooth}`;
}

/**
 * Helper: Create facts for a specific tooth extraction
 */
function createFactsForTooth(
    tooth: string,
    diagnosis: string,
    tiefe?: string
): TreatmentFacts {
    const extracted = {
        tooth,
        diagnosis,
        tiefe,
    };
    return createFactsFromExtracted(extracted, 'fuellung');
}

describe('Gate: Multi-Tooth Medical Askbacks E2E', () => {
    let unifiedJson: UnifiedJson;
    let cpChip: UnifiedChip | undefined;

    beforeAll(() => {
        const unifiedPath = path.join(
            process.cwd(),
            'src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json'
        );
        const unifiedContent = fs.readFileSync(unifiedPath, 'utf-8');
        unifiedJson = JSON.parse(unifiedContent) as UnifiedJson;
        cpChip = unifiedJson.chips.find(c => c.id === 'cp');
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 1: Different caries depths → askback only for profunda tooth
    // ═══════════════════════════════════════════════════════════════
    describe('Askback Scoping per Tooth', () => {
        it('should require ueberkappung only for tooth 16 (profunda), not tooth 17 (normal)', () => {
            // Given: Two teeth with different diagnoses
            const tooth16Facts = createFactsForTooth('16', 'Caries profunda');
            const tooth17Facts = createFactsForTooth('17', 'Karies', 'normal');

            // When: Evaluate askbacks for each
            const bundle16 = evaluateAskbacks(tooth16Facts);
            const bundle17 = evaluateAskbacks(tooth17Facts);

            // Then: Tooth 16 requires ueberkappung, tooth 17 does not
            expect(bundle16.required.length).toBeGreaterThan(0);
            expect(bundle16.required.some(q => q.id === MEDICAL_QUESTION_IDS.UEBERKAPPUNG)).toBe(true);

            expect(bundle17.required.length).toBe(0);
        });

        it('should generate scoped question IDs per tooth', () => {
            const tooth16Facts = createFactsForTooth('16', 'Caries profunda');
            const bundle16 = evaluateAskbacks(tooth16Facts);

            // Scope the question IDs for this specific tooth
            const scopedQuestions = bundle16.required.map(q => ({
                ...q,
                scopedId: scopeQuestionId(q.id, '16'),
            }));

            // Verify scoped IDs are unique and contain tooth
            expect(scopedQuestions[0]?.scopedId).toBe('medical_ueberkappung::tooth:16');
        });

        it('should allow separate answers per tooth via scoped IDs', () => {
            const tooth16Facts = createFactsForTooth('16', 'Caries profunda');
            const tooth17Facts = createFactsForTooth('17', 'Caries profunda');

            // Both teeth are profunda, both need ueberkappung
            const bundle16 = evaluateAskbacks(tooth16Facts);
            const bundle17 = evaluateAskbacks(tooth17Facts);

            expect(bundle16.required.length).toBeGreaterThan(0);
            expect(bundle17.required.length).toBeGreaterThan(0);

            // Apply different answers to each
            const tooth16Answered = applyAnswersToFacts(tooth16Facts, {
                [MEDICAL_QUESTION_IDS.UEBERKAPPUNG]: true, // Yes for tooth 16
            });
            const tooth17Answered = applyAnswersToFacts(tooth17Facts, {
                [MEDICAL_QUESTION_IDS.UEBERKAPPUNG]: false, // No for tooth 17
            });

            // Chips differ based on answers
            const chips16 = getChipIdsFromFacts(tooth16Answered);
            const chips17 = getChipIdsFromFacts(tooth17Answered);

            expect(chips16).toContain(KB_CHIP_IDS.CP);
            expect(chips16).not.toContain(KB_CHIP_IDS.CP_NOT_REQUIRED);

            expect(chips17).toContain(KB_CHIP_IDS.CP_NOT_REQUIRED);
            expect(chips17).not.toContain(KB_CHIP_IDS.CP);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 2: Aggregated askbacks for multi-instance
    // ═══════════════════════════════════════════════════════════════
    describe('Multi-Instance Askback Aggregation', () => {
        it('should aggregate required questions from multiple instances', () => {
            // Simulate two instances
            const instances = [
                { tooth: '16', facts: createFactsForTooth('16', 'Caries profunda') },
                { tooth: '17', facts: createFactsForTooth('17', 'Caries media', 'normal') },
            ];

            // Evaluate askbacks per instance
            const allRequired: Array<{ tooth: string; questionId: string }> = [];

            for (const inst of instances) {
                const bundle = evaluateAskbacks(inst.facts);
                for (const q of bundle.required) {
                    allRequired.push({
                        tooth: inst.tooth,
                        questionId: scopeQuestionId(q.id, inst.tooth),
                    });
                }
            }

            // Only tooth 16 should have required questions
            expect(allRequired.length).toBe(1);
            expect(allRequired[0].tooth).toBe('16');
            expect(allRequired[0].questionId).toContain('tooth:16');
        });

        it('should produce separate chips per instance after answers applied', () => {
            const instances = [
                { tooth: '16', facts: createFactsForTooth('16', 'Caries profunda') },
                { tooth: '17', facts: createFactsForTooth('17', 'Caries profunda') },
            ];

            // Apply answers per instance
            const answeredInstances = instances.map(inst => ({
                ...inst,
                answeredFacts: applyAnswersToFacts(inst.facts, {
                    [MEDICAL_QUESTION_IDS.UEBERKAPPUNG]: inst.tooth === '16', // Yes for 16, No for 17
                }),
            }));

            // Get chips per instance
            const allChips: Array<{ tooth: string; chips: string[] }> = answeredInstances.map(inst => ({
                tooth: inst.tooth,
                chips: getChipIdsFromFacts(inst.answeredFacts),
            }));

            // Verify per-tooth chip differences
            const chips16 = allChips.find(c => c.tooth === '16')?.chips || [];
            const chips17 = allChips.find(c => c.tooth === '17')?.chips || [];

            expect(chips16).toContain(KB_CHIP_IDS.CP);
            expect(chips17).toContain(KB_CHIP_IDS.CP_NOT_REQUIRED);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 3: Billing codes are KB-derived
    // ═══════════════════════════════════════════════════════════════
    describe('KB-Derived Billing', () => {
        it('cp chip should have BEMA_25 billing (from KB)', () => {
            expect(cpChip).toBeDefined();
            expect(cpChip?.billingRef?.GKV).toBe('BEMA_25');
        });

        it('should only emit billing for teeth that have capping', () => {
            const tooth16 = createFactsForTooth('16', 'Caries profunda');
            const tooth16Answered = applyAnswersToFacts(tooth16, {
                [MEDICAL_QUESTION_IDS.UEBERKAPPUNG]: true,
            });

            const tooth17 = createFactsForTooth('17', 'Caries media', 'normal');
            // No capping needed for normal depth

            const chips16 = getChipIdsFromFacts(tooth16Answered);
            const chips17 = getChipIdsFromFacts(tooth17);

            // Only tooth 16 should have cp chip (which has billing)
            expect(chips16).toContain(KB_CHIP_IDS.CP);
            expect(chips17.length).toBe(0);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 4: Determinism
    // ═══════════════════════════════════════════════════════════════
    describe('Determinism', () => {
        it('should produce same askbacks for same multi-tooth input 5x', () => {
            const results: Array<{ tooth16Required: number; tooth17Required: number }> = [];

            for (let i = 0; i < 5; i++) {
                const tooth16Facts = createFactsForTooth('16', 'Caries profunda');
                const tooth17Facts = createFactsForTooth('17', 'Karies', 'normal');

                const bundle16 = evaluateAskbacks(tooth16Facts);
                const bundle17 = evaluateAskbacks(tooth17Facts);

                results.push({
                    tooth16Required: bundle16.required.length,
                    tooth17Required: bundle17.required.length,
                });
            }

            // All 5 runs should be identical
            const first = JSON.stringify(results[0]);
            for (const result of results) {
                expect(JSON.stringify(result)).toBe(first);
            }
        });
    });
});
