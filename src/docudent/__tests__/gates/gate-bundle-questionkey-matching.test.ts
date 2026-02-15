/**
 * Gate Test: P12 Bundle QuestionKey Matching
 *
 * Ensures that medical questions are correctly matched to hard/soft askbacks
 * using questionKey, not internal q.id which may differ.
 *
 * INVARIANTS:
 * - All questions in bundle.required have non-null questionKey
 * - Medical category questions MUST have questionKey
 * - No medical question with undefined questionKey ends up in required bucket unless forced
 */

import { describe, it, expect } from 'vitest';
import { generateQuestionsV2Bundle } from '../../core/questions/questionServiceV2';
import { createEmptyExtraction } from '../../contracts/extraction';

describe('GATE: P12 Bundle QuestionKey Matching', () => {

    it('all questions in bundle.required should have valid questionKey or be forced safe', () => {
        const extracted = createEmptyExtraction('Zahn 36 Füllung mod.', 'zahn 36 füllung mod');

        const bundle = generateQuestionsV2Bundle(extracted, {
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            hasMKV: false,
            docMode: 'balanced'
        });

        for (const q of bundle.required) {
            // Either has valid questionKey OR was forced into required with regressRisk
            expect(
                q.questionKey !== undefined || q.regressRisk === true,
                `Question ${q.id} in required lacks questionKey without regressRisk safety`
            ).toBe(true);
        }
    });

    it('endo bundle required questions should have valid questionKey', () => {
        const extracted = createEmptyExtraction('Zahn 46 Endo.', 'zahn 46 endo');

        const bundle = generateQuestionsV2Bundle(extracted, {
            treatmentId: 'endo',
            insuranceType: 'GKV',
            hasMKV: false,
            docMode: 'balanced'
        });

        for (const q of bundle.required) {
            expect(
                q.questionKey !== undefined || q.regressRisk === true,
                `Endo question ${q.id} in required lacks questionKey`
            ).toBe(true);
        }
    });

    it('questionKey should match medical askback questionId suffix', () => {
        const extracted = createEmptyExtraction('Zahn 36 Füllung.', 'zahn 36 füllung');

        const bundle = generateQuestionsV2Bundle(extracted, {
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            hasMKV: false,
            docMode: 'forensic'  // Show all
        });

        // All required questions should have questionKey that could form valid fullyQualifiedId
        for (const q of bundle.required) {
            if (q.questionKey) {
                // questionKey should not be an internal ID format
                expect(q.questionKey).not.toMatch(/^medical_/);
                expect(q.questionKey).not.toMatch(/^rule_/);
            }
        }
    });
});
