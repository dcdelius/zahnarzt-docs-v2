/**
 * Gate Test: Question Presentation Policy
 *
 * Validates that presentation policy:
 * 1. NEVER deletes questions (set equality)
 * 2. Groups correctly by docMode
 * 3. Respects softAskbacksMaxVisible cap
 * 4. Required questions unchanged
 *
 * INVARIANTS:
 * - (optionalVisible ∪ optionalHidden) === original optional
 * - required unchanged
 * - Pure presentation, no medical logic
 */

import { describe, it, expect } from 'vitest';
import {
    presentQuestions,
    validateSetEquality,
    type DocMode,
    type PresentedQuestions
} from '../../core/questions/questionPresentationPolicy';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

interface MockQuestion {
    id: string;
    label: string;
}

function createMockQuestions(count: number, prefix: string): MockQuestion[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `${prefix}_${i + 1}`,
        label: `${prefix} Question ${i + 1}`
    }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCMODE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE: Presentation Policy - DocMode Behavior', () => {

    it('balanced mode: optional collapsed (all hidden)', () => {
        const required = createMockQuestions(3, 'hard');
        const optional = createMockQuestions(5, 'soft');

        const result = presentQuestions({
            required,
            optional,
            options: { docMode: 'balanced' }
        });

        expect(result.required.length).toBe(3);
        expect(result.optionalVisible.length).toBe(0);
        expect(result.optionalHidden.length).toBe(5);
        expect(result.optionalTotal).toBe(5);
    });

    it('fast mode: optional collapsed (all hidden)', () => {
        const required = createMockQuestions(2, 'hard');
        const optional = createMockQuestions(4, 'soft');

        const result = presentQuestions({
            required,
            optional,
            options: { docMode: 'fast' }
        });

        expect(result.required.length).toBe(2);
        expect(result.optionalVisible.length).toBe(0);
        expect(result.optionalHidden.length).toBe(4);
        expect(result.optionalTotal).toBe(4);
    });

    it('forensic mode: optional expanded (all visible)', () => {
        const required = createMockQuestions(3, 'hard');
        const optional = createMockQuestions(5, 'soft');

        const result = presentQuestions({
            required,
            optional,
            options: { docMode: 'forensic' }
        });

        expect(result.required.length).toBe(3);
        expect(result.optionalVisible.length).toBe(5);
        expect(result.optionalHidden.length).toBe(0);
        expect(result.optionalTotal).toBe(5);
    });

    it('default mode is balanced (collapsed)', () => {
        const required = createMockQuestions(1, 'hard');
        const optional = createMockQuestions(3, 'soft');

        const result = presentQuestions({ required, optional });

        expect(result.optionalVisible.length).toBe(0);
        expect(result.optionalHidden.length).toBe(3);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VISIBILITY OVERRIDE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE: Presentation Policy - Visibility Override', () => {

    it('softAskbacksVisibility=expanded overrides docMode', () => {
        const required = createMockQuestions(1, 'hard');
        const optional = createMockQuestions(4, 'soft');

        const result = presentQuestions({
            required,
            optional,
            options: {
                docMode: 'fast',  // Would normally collapse
                softAskbacksVisibility: 'expanded'  // Override
            }
        });

        expect(result.optionalVisible.length).toBe(4);
        expect(result.optionalHidden.length).toBe(0);
    });

    it('softAskbacksVisibility=collapsed overrides docMode', () => {
        const required = createMockQuestions(1, 'hard');
        const optional = createMockQuestions(4, 'soft');

        const result = presentQuestions({
            required,
            optional,
            options: {
                docMode: 'forensic',  // Would normally expand
                softAskbacksVisibility: 'collapsed'  // Override
            }
        });

        expect(result.optionalVisible.length).toBe(0);
        expect(result.optionalHidden.length).toBe(4);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAX VISIBLE CAP TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE: Presentation Policy - softAskbacksMaxVisible Cap', () => {

    it('cap=2 shows 2 visible, rest hidden (collapsed mode)', () => {
        const required = createMockQuestions(3, 'hard');
        const optional = createMockQuestions(5, 'soft');

        const result = presentQuestions({
            required,
            optional,
            options: {
                docMode: 'balanced',
                softAskbacksMaxVisible: 2
            }
        });

        expect(result.required.length).toBe(3);
        expect(result.optionalVisible.length).toBe(2);
        expect(result.optionalHidden.length).toBe(3);
        expect(result.optionalTotal).toBe(5);
    });

    it('cap=0 shows none visible (all hidden)', () => {
        const optional = createMockQuestions(3, 'soft');

        const result = presentQuestions({
            required: [],
            optional,
            options: { softAskbacksMaxVisible: 0 }
        });

        expect(result.optionalVisible.length).toBe(0);
        expect(result.optionalHidden.length).toBe(3);
    });

    it('cap larger than optional shows all visible', () => {
        const optional = createMockQuestions(3, 'soft');

        const result = presentQuestions({
            required: [],
            optional,
            options: {
                softAskbacksVisibility: 'collapsed',
                softAskbacksMaxVisible: 10
            }
        });

        expect(result.optionalVisible.length).toBe(3);
        expect(result.optionalHidden.length).toBe(0);
    });

    it('cap ignored when expanded', () => {
        const optional = createMockQuestions(5, 'soft');

        const result = presentQuestions({
            required: [],
            optional,
            options: {
                softAskbacksVisibility: 'expanded',
                softAskbacksMaxVisible: 2  // Should be ignored
            }
        });

        expect(result.optionalVisible.length).toBe(5);
        expect(result.optionalHidden.length).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SET EQUALITY TESTS (Critical Invariant)
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE: Presentation Policy - Set Equality', () => {

    it('set equality holds for balanced mode', () => {
        const optional = createMockQuestions(5, 'soft');

        const result = presentQuestions({
            required: [],
            optional,
            options: { docMode: 'balanced' }
        });

        const isValid = validateSetEquality(optional, result, q => q.id);
        expect(isValid).toBe(true);
    });

    it('set equality holds for forensic mode', () => {
        const optional = createMockQuestions(5, 'soft');

        const result = presentQuestions({
            required: [],
            optional,
            options: { docMode: 'forensic' }
        });

        const isValid = validateSetEquality(optional, result, q => q.id);
        expect(isValid).toBe(true);
    });

    it('set equality holds with cap', () => {
        const optional = createMockQuestions(5, 'soft');

        const result = presentQuestions({
            required: [],
            optional,
            options: { softAskbacksMaxVisible: 2 }
        });

        const isValid = validateSetEquality(optional, result, q => q.id);
        expect(isValid).toBe(true);
    });

    it('required questions unchanged', () => {
        const required = createMockQuestions(3, 'hard');
        const optional = createMockQuestions(5, 'soft');

        const result = presentQuestions({
            required,
            optional,
            options: { docMode: 'balanced' }
        });

        expect(result.required).toHaveLength(3);
        expect(result.required.map(q => q.id)).toEqual(required.map(q => q.id));
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE: Presentation Policy - Edge Cases', () => {

    it('empty inputs return empty groups', () => {
        const result = presentQuestions({
            required: [],
            optional: [],
            options: { docMode: 'balanced' }
        });

        expect(result.required.length).toBe(0);
        expect(result.optionalVisible.length).toBe(0);
        expect(result.optionalHidden.length).toBe(0);
        expect(result.optionalTotal).toBe(0);
    });

    it('only required, no optional', () => {
        const required = createMockQuestions(3, 'hard');

        const result = presentQuestions({
            required,
            optional: []
        });

        expect(result.required.length).toBe(3);
        expect(result.optionalTotal).toBe(0);
    });

    it('only optional, no required', () => {
        const optional = createMockQuestions(5, 'soft');

        const result = presentQuestions({
            required: [],
            optional,
            options: { docMode: 'forensic' }
        });

        expect(result.required.length).toBe(0);
        expect(result.optionalVisible.length).toBe(5);
    });
});
