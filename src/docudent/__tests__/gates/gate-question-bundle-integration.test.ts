/**
 * Gate Test: QuestionBundle Integration
 *
 * Validates that when questionServiceV2 + presentation policy are wired:
 * - HARD askbacks go to bundle.required
 * - SOFT askbacks go to optionalVisible/optionalHidden
 * - Set equality holds for optional
 * - No duplicates across buckets
 * - Cross-treatment isolation maintained
 *
 * INVARIANTS:
 * - MEDICAL decides necessity; ASK/UI only groups
 * - No questions deleted, only regrouped
 * - Namespacing respected
 */

import { describe, it, expect } from 'vitest';
import { processMedical } from '../../core/medical/medicalEngine';
import {
    presentQuestions,
    validateSetEquality,
    type DocMode
} from '../../core/questions/questionPresentationPolicy';
import { createEmptyExtraction } from '../../contracts/extraction';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

interface MockQuestion {
    id: string;
    questionId: string;
    medicalSeverity: 'hard' | 'soft';
}

function medicalToMockQuestions(result: ReturnType<typeof processMedical>): {
    hard: MockQuestion[];
    soft: MockQuestion[];
} {
    return {
        hard: result.hardAskbacks.map(a => ({
            id: a.id,
            questionId: a.questionId,
            medicalSeverity: 'hard' as const
        })),
        soft: result.softAskbacks.map(a => ({
            id: a.id,
            questionId: a.questionId,
            medicalSeverity: 'soft' as const
        }))
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUNDLE STRUCTURE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE: QuestionBundle Integration - Endo', () => {

    it('HARD askbacks should be in required, not optional', () => {
        const extracted = createEmptyExtraction('Zahn 46 Endo.', 'zahn 46 endo');

        const medResult = processMedical('endo', extracted);
        const questions = medicalToMockQuestions(medResult);

        const bundle = presentQuestions({
            required: questions.hard,
            optional: questions.soft,
            options: { docMode: 'balanced' }
        });

        // All hard askbacks should be in required
        expect(bundle.required.length).toBe(questions.hard.length);
        for (const q of bundle.required) {
            expect(q.medicalSeverity).toBe('hard');
        }

        // No hard askbacks in optional
        const allOptional = [...bundle.optionalVisible, ...bundle.optionalHidden];
        for (const q of allOptional) {
            expect(q.medicalSeverity).not.toBe('hard');
        }
    });

    it('SOFT askbacks should be in optional buckets only', () => {
        const extracted = createEmptyExtraction('Zahn 46 Endo.', 'zahn 46 endo');

        const medResult = processMedical('endo', extracted);
        const questions = medicalToMockQuestions(medResult);

        const bundle = presentQuestions({
            required: questions.hard,
            optional: questions.soft,
            options: { docMode: 'balanced' }
        });

        const allOptional = [...bundle.optionalVisible, ...bundle.optionalHidden];
        expect(allOptional.length).toBe(questions.soft.length);
        for (const q of allOptional) {
            expect(q.medicalSeverity).toBe('soft');
        }
    });

    it('set equality should hold for optional (balanced mode)', () => {
        const extracted = createEmptyExtraction('Zahn 46 Endo.', 'zahn 46 endo');

        const medResult = processMedical('endo', extracted);
        const questions = medicalToMockQuestions(medResult);

        const bundle = presentQuestions({
            required: questions.hard,
            optional: questions.soft,
            options: { docMode: 'balanced' }
        });

        const isValid = validateSetEquality(questions.soft, bundle, q => q.id);
        expect(isValid).toBe(true);
    });

    it('set equality should hold for optional (forensic mode)', () => {
        const extracted = createEmptyExtraction('Zahn 46 Endo.', 'zahn 46 endo');

        const medResult = processMedical('endo', extracted);
        const questions = medicalToMockQuestions(medResult);

        const bundle = presentQuestions({
            required: questions.hard,
            optional: questions.soft,
            options: { docMode: 'forensic' }
        });

        const isValid = validateSetEquality(questions.soft, bundle, q => q.id);
        expect(isValid).toBe(true);
    });
});

describe('GATE: QuestionBundle Integration - Fuellung', () => {

    it('HARD askbacks should be in required for fuellung', () => {
        const extracted = createEmptyExtraction('Zahn 36 Füllung.', 'zahn 36 füllung');

        const medResult = processMedical('fuellung', extracted);
        const questions = medicalToMockQuestions(medResult);

        const bundle = presentQuestions({
            required: questions.hard,
            optional: questions.soft,
            options: { docMode: 'balanced' }
        });

        expect(bundle.required.length).toBe(questions.hard.length);
        expect(bundle.required.length).toBeGreaterThan(0); // vitality, percussion are HARD
    });

    it('set equality should hold for fuellung optional', () => {
        const extracted = createEmptyExtraction('Zahn 36 Füllung.', 'zahn 36 füllung');

        const medResult = processMedical('fuellung', extracted);
        const questions = medicalToMockQuestions(medResult);

        const bundle = presentQuestions({
            required: questions.hard,
            optional: questions.soft,
            options: { docMode: 'balanced' }
        });

        const isValid = validateSetEquality(questions.soft, bundle, q => q.id);
        expect(isValid).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NO DUPLICATES
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE: QuestionBundle No Duplicates', () => {

    it('no duplicate questionIds across all bundle buckets (endo)', () => {
        const extracted = createEmptyExtraction('Zahn 46 Endo.', 'zahn 46 endo');

        const medResult = processMedical('endo', extracted);
        const questions = medicalToMockQuestions(medResult);

        const bundle = presentQuestions({
            required: questions.hard,
            optional: questions.soft,
            options: { docMode: 'balanced' }
        });

        const allIds = [
            ...bundle.required.map(q => q.questionId),
            ...bundle.optionalVisible.map(q => q.questionId),
            ...bundle.optionalHidden.map(q => q.questionId)
        ];

        const uniqueIds = new Set(allIds);
        expect(uniqueIds.size).toBe(allIds.length);
    });

    it('no duplicate questionIds across all bundle buckets (fuellung)', () => {
        const extracted = createEmptyExtraction('Zahn 36 Füllung.', 'zahn 36 füllung');

        const medResult = processMedical('fuellung', extracted);
        const questions = medicalToMockQuestions(medResult);

        const bundle = presentQuestions({
            required: questions.hard,
            optional: questions.soft,
            options: { docMode: 'balanced' }
        });

        const allIds = [
            ...bundle.required.map(q => q.questionId),
            ...bundle.optionalVisible.map(q => q.questionId),
            ...bundle.optionalHidden.map(q => q.questionId)
        ];

        const uniqueIds = new Set(allIds);
        expect(uniqueIds.size).toBe(allIds.length);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-TREATMENT ISOLATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE: QuestionBundle Cross-Treatment Isolation', () => {

    it('fuellung bundle should contain no endo.* questionIds', () => {
        const extracted = createEmptyExtraction('Zahn 36 Füllung mod.', 'zahn 36 füllung mod');

        const medResult = processMedical('fuellung', extracted);
        const questions = medicalToMockQuestions(medResult);

        const bundle = presentQuestions({
            required: questions.hard,
            optional: questions.soft,
            options: { docMode: 'forensic' }  // Show all
        });

        const allQuestionIds = [
            ...bundle.required.map(q => q.questionId),
            ...bundle.optionalVisible.map(q => q.questionId),
            ...bundle.optionalHidden.map(q => q.questionId)
        ];

        for (const id of allQuestionIds) {
            expect(id.startsWith('endo.')).toBe(false);
        }
    });

    it('endo bundle should contain no fuellung.* questionIds', () => {
        const extracted = createEmptyExtraction('Zahn 46 Wurzelbehandlung.', 'zahn 46 wurzelbehandlung');

        const medResult = processMedical('endo', extracted);
        const questions = medicalToMockQuestions(medResult);

        const bundle = presentQuestions({
            required: questions.hard,
            optional: questions.soft,
            options: { docMode: 'forensic' }  // Show all
        });

        const allQuestionIds = [
            ...bundle.required.map(q => q.questionId),
            ...bundle.optionalVisible.map(q => q.questionId),
            ...bundle.optionalHidden.map(q => q.questionId)
        ];

        for (const id of allQuestionIds) {
            expect(id.startsWith('fuellung.')).toBe(false);
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DOCMODE BEHAVIOR
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE: QuestionBundle DocMode Behavior', () => {

    it('balanced mode: optional hidden by default', () => {
        const extracted = createEmptyExtraction('Zahn 46 Endo.', 'zahn 46 endo');

        const medResult = processMedical('endo', extracted);
        const questions = medicalToMockQuestions(medResult);

        const bundle = presentQuestions({
            required: questions.hard,
            optional: questions.soft,
            options: { docMode: 'balanced' }
        });

        // In balanced mode, all optional should be hidden
        expect(bundle.optionalVisible.length).toBe(0);
        expect(bundle.optionalHidden.length).toBe(questions.soft.length);
    });

    it('forensic mode: optional visible by default', () => {
        const extracted = createEmptyExtraction('Zahn 46 Endo.', 'zahn 46 endo');

        const medResult = processMedical('endo', extracted);
        const questions = medicalToMockQuestions(medResult);

        const bundle = presentQuestions({
            required: questions.hard,
            optional: questions.soft,
            options: { docMode: 'forensic' }
        });

        // In forensic mode, all optional should be visible
        expect(bundle.optionalVisible.length).toBe(questions.soft.length);
        expect(bundle.optionalHidden.length).toBe(0);
    });
});
