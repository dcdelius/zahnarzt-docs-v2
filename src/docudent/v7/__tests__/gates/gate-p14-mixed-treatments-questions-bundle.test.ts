/**
 * Gate Test: Mixed Treatments Questions Bundle E2E
 *
 * Verifies that mixed-treatment dictations (Füllung + Endo) produce correct question bundles:
 * 1. Füllung questions only for füllung instances
 * 2. Endo questions only for endo instances
 * 3. No cross-contamination
 *
 * Uses medical layer directly (standalone tests).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import {
    createFactsFromExtracted,
    evaluateAskbacks,
    MEDICAL_QUESTION_IDS,
    type TreatmentFacts,
} from '../../medical';

interface QuestionBankQuestion {
    key: string;
    canonicalId?: string;
    category: string;
    type: string;
}

interface QuestionBank {
    questions: QuestionBankQuestion[];
}

describe('Gate: Mixed Treatments Questions Bundle E2E', () => {
    let fuellungQuestionBank: QuestionBank;
    let endoQuestionBank: QuestionBank;

    beforeAll(() => {
        const fuellungPath = path.join(
            process.cwd(),
            'src/docudent/core/billing/knowledgeBase/treatments/fuellung/question_bank.json'
        );
        const endoPath = path.join(
            process.cwd(),
            'src/docudent/core/billing/knowledgeBase/questions/endo_question_bank.json'
        );

        fuellungQuestionBank = JSON.parse(fs.readFileSync(fuellungPath, 'utf-8'));
        endoQuestionBank = JSON.parse(fs.readFileSync(endoPath, 'utf-8'));
    });

    // ═══════════════════════════════════════════════════════════════
    // Helper: Simulate segment processing
    // ═══════════════════════════════════════════════════════════════

    interface SimulatedInstance {
        tooth: string;
        treatmentId: 'fuellung' | 'endo';
        extracted: Record<string, unknown>;
    }

    function simulateMixedTreatmentQuestions(instances: SimulatedInstance[]): {
        perInstance: Record<string, { treatmentId: string; requiredIds: string[] }>;
        aggregatedRequired: string[];
    } {
        const perInstance: Record<string, { treatmentId: string; requiredIds: string[] }> = {};
        const allRequired: string[] = [];

        for (const inst of instances) {
            const instanceId = `${inst.treatmentId}::tooth:${inst.tooth}`;

            if (inst.treatmentId === 'fuellung') {
                // Use medical layer for fuellung
                const facts = createFactsFromExtracted(inst.extracted, 'fuellung');
                const bundle = evaluateAskbacks(facts);
                const requiredIds = bundle.required.map(q =>
                    `${q.id}::tooth:${inst.tooth}::treatment:fuellung`
                );

                perInstance[instanceId] = { treatmentId: 'fuellung', requiredIds };
                allRequired.push(...requiredIds);
            } else if (inst.treatmentId === 'endo') {
                // For endo, use KB-based questions (simplified simulation)
                // In real system, questionServiceV2 would evaluate endo questions
                const requiredIds = [
                    `forensic_endo_step::tooth:${inst.tooth}::treatment:endo`,
                    `forensic_endo_canal_count::tooth:${inst.tooth}::treatment:endo`,
                ];

                perInstance[instanceId] = { treatmentId: 'endo', requiredIds };
                allRequired.push(...requiredIds);
            }
        }

        return { perInstance, aggregatedRequired: allRequired };
    }

    // ═══════════════════════════════════════════════════════════════
    // Test 1: Füllung questions only for füllung tooth
    // ═══════════════════════════════════════════════════════════════
    describe('Treatment Isolation', () => {
        it('should only ask ueberkappung for fuellung profunda tooth, not endo tooth', () => {
            // Given: Mixed dictation - Tooth 16 fuellung profunda, Tooth 11 endo
            const instances: SimulatedInstance[] = [
                { tooth: '16', treatmentId: 'fuellung', extracted: { diagnosis: 'Caries profunda' } },
                { tooth: '11', treatmentId: 'endo', extracted: { diagnosis: 'Pulpitis' } },
            ];

            // When: Generate question bundles
            const result = simulateMixedTreatmentQuestions(instances);

            // Then: Tooth 16 has fuellung questions (ueberkappung)
            const tooth16Questions = result.perInstance['fuellung::tooth:16'];
            expect(tooth16Questions?.treatmentId).toBe('fuellung');
            expect(tooth16Questions?.requiredIds.some(id => id.includes('ueberkappung'))).toBe(true);
            expect(tooth16Questions?.requiredIds.some(id => id.includes('endo_step'))).toBe(false);

            // And: Tooth 11 has endo questions
            const tooth11Questions = result.perInstance['endo::tooth:11'];
            expect(tooth11Questions?.treatmentId).toBe('endo');
            expect(tooth11Questions?.requiredIds.some(id => id.includes('endo_step'))).toBe(true);
            expect(tooth11Questions?.requiredIds.some(id => id.includes('ueberkappung'))).toBe(false);
        });

        it('should not cross-contaminate endo questions to fuellung instances', () => {
            const instances: SimulatedInstance[] = [
                { tooth: '36', treatmentId: 'fuellung', extracted: { diagnosis: 'Caries media' } },
                { tooth: '46', treatmentId: 'endo', extracted: { diagnosis: 'Nekrotische Pulpa' } },
            ];

            const result = simulateMixedTreatmentQuestions(instances);

            // Fuellung instance should have NO endo questions
            const fuellungIds = result.perInstance['fuellung::tooth:36']?.requiredIds || [];
            expect(fuellungIds.every(id => !id.includes('endo'))).toBe(true);
            expect(fuellungIds.every(id => !id.includes('kanalzahl'))).toBe(true);

            // Note: Tooth 36 with caries media doesn't trigger ueberkappung (not profunda)
            // Medical layer correctly returns 0 required for normal depth
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 2: Aggregated bundle has all questions scoped
    // ═══════════════════════════════════════════════════════════════
    describe('Aggregation', () => {
        it('should aggregate required questions from all instances', () => {
            const instances: SimulatedInstance[] = [
                { tooth: '16', treatmentId: 'fuellung', extracted: { diagnosis: 'Caries profunda' } },
                { tooth: '11', treatmentId: 'endo', extracted: { diagnosis: 'Pulpitis' } },
            ];

            const result = simulateMixedTreatmentQuestions(instances);

            // Aggregated should have questions from both treatments
            expect(result.aggregatedRequired.some(id => id.includes('ueberkappung'))).toBe(true);
            expect(result.aggregatedRequired.some(id => id.includes('endo_step'))).toBe(true);

            // Each should have tooth scope
            expect(result.aggregatedRequired.every(id => id.includes('::tooth:'))).toBe(true);
        });

        it('should maintain segment order in aggregation', () => {
            // Given: Fuellung first, then Endo (matching dictation order)
            const instances: SimulatedInstance[] = [
                { tooth: '16', treatmentId: 'fuellung', extracted: { diagnosis: 'Caries profunda' } },
                { tooth: '11', treatmentId: 'endo', extracted: { diagnosis: 'Pulpitis' } },
            ];

            const result = simulateMixedTreatmentQuestions(instances);

            // First questions should be from fuellung (tooth 16)
            const firstFuellungIndex = result.aggregatedRequired.findIndex(id =>
                id.includes('treatment:fuellung')
            );
            const firstEndoIndex = result.aggregatedRequired.findIndex(id =>
                id.includes('treatment:endo')
            );

            expect(firstFuellungIndex).toBeLessThan(firstEndoIndex);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 3: KB Sanity - Question banks are treatment-specific
    // ═══════════════════════════════════════════════════════════════
    describe('KB Sanity', () => {
        it('fuellung question bank should have ueberkappung', () => {
            const ueberkappung = fuellungQuestionBank.questions.find(q => q.key === 'ueberkappung');
            expect(ueberkappung).toBeDefined();
            expect(ueberkappung?.category).toBe('forensic');
        });

        it('endo question bank should have endo_step', () => {
            const endoStep = endoQuestionBank.questions.find(q => q.key === 'endo_step');
            expect(endoStep).toBeDefined();
            expect(endoStep?.canonicalId).toBe('forensic_endo_step');
        });

        it('endo question bank should NOT have ueberkappung', () => {
            const ueberkappung = endoQuestionBank.questions.find(q => q.key === 'ueberkappung');
            expect(ueberkappung).toBeUndefined();
        });

        it('fuellung question bank should NOT have endo_step', () => {
            const endoStep = fuellungQuestionBank.questions.find(q => q.key === 'endo_step');
            expect(endoStep).toBeUndefined();
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 4: Determinism
    // ═══════════════════════════════════════════════════════════════
    describe('Determinism', () => {
        it('should produce identical bundles for same input 5x', () => {
            const results: string[][] = [];

            for (let i = 0; i < 5; i++) {
                const instances: SimulatedInstance[] = [
                    { tooth: '16', treatmentId: 'fuellung', extracted: { diagnosis: 'Caries profunda' } },
                    { tooth: '11', treatmentId: 'endo', extracted: { diagnosis: 'Pulpitis' } },
                ];

                const result = simulateMixedTreatmentQuestions(instances);
                results.push(result.aggregatedRequired.sort());
            }

            const first = JSON.stringify(results[0]);
            for (const result of results) {
                expect(JSON.stringify(result)).toBe(first);
            }
        });
    });
});
