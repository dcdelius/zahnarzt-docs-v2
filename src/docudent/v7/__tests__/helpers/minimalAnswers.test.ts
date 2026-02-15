/**
 * Unit tests for minimalAnswers helper
 */

import { describe, it, expect } from 'vitest';
import {
    generateMinimalAnswers,
    answersToObject,
    fillMissingAnswers
} from './minimalAnswers';
import type { DynamicQuestion } from '../../../contracts/questions';

describe('generateMinimalAnswers', () => {
    it('handles single type with options', () => {
        const questions: DynamicQuestion[] = [{
            id: 'test_choice',
            category: 'forensic',
            question: 'Test?',
            type: 'single',
            options: [
                { id: 'opt1', label: 'Option 1', dataValue: 'value1' },
                { id: 'opt2', label: 'Option 2', dataValue: 'value2' },
            ]
        }];

        const answers = generateMinimalAnswers(questions);
        expect(answers.get('test_choice')).toBe('value1');
    });

    it('prefers "ja" for boolean-like questions', () => {
        const questions: DynamicQuestion[] = [{
            id: 'test_bool',
            category: 'forensic',
            question: 'Ja oder Nein?',
            type: 'single',
            options: [
                { id: 'nein', label: 'Nein', dataValue: false },
                { id: 'ja', label: 'Ja', dataValue: true },
            ]
        }];

        const answers = generateMinimalAnswers(questions);
        expect(answers.get('test_bool')).toBe(true);
    });

    it('handles number type with min', () => {
        const questions: DynamicQuestion[] = [{
            id: 'test_num',
            category: 'forensic',
            question: 'How many?',
            type: 'number',
            min: 3,
            max: 10
        }];

        const answers = generateMinimalAnswers(questions);
        expect(answers.get('test_num')).toBe(3);
    });

    it('handles number type with defaultValue', () => {
        const questions: DynamicQuestion[] = [{
            id: 'test_num',
            category: 'forensic',
            question: 'How many?',
            type: 'number',
            defaultValue: 5
        }];

        const answers = generateMinimalAnswers(questions);
        expect(answers.get('test_num')).toBe(5);
    });

    it('handles multi type', () => {
        const questions: DynamicQuestion[] = [{
            id: 'test_multi',
            category: 'forensic',
            question: 'Select all?',
            type: 'multi',
            options: [
                { id: 'a', label: 'A', dataValue: 'valueA' },
                { id: 'b', label: 'B', dataValue: 'valueB' },
            ]
        }];

        const answers = generateMinimalAnswers(questions);
        expect(answers.get('test_multi')).toEqual(['valueA']);
    });

    it('respects overrides', () => {
        const questions: DynamicQuestion[] = [{
            id: 'test_choice',
            category: 'forensic',
            question: 'Test?',
            type: 'single',
            options: [
                { id: 'opt1', label: 'Option 1', dataValue: 'value1' },
                { id: 'opt2', label: 'Option 2', dataValue: 'value2' },
            ]
        }];

        const answers = generateMinimalAnswers(questions, { test_choice: 'custom_value' });
        expect(answers.get('test_choice')).toBe('custom_value');
    });

    it('handles unknown type with options (defaults to first option)', () => {
        const questions: DynamicQuestion[] = [{
            id: 'test_unknown',
            category: 'forensic',
            question: 'Unknown type?',
            options: [
                { id: 'x', label: 'X', dataValue: 'valueX' },
            ]
        }];

        const answers = generateMinimalAnswers(questions);
        expect(answers.get('test_unknown')).toBe('valueX');
    });
});

describe('fillMissingAnswers', () => {
    it('preserves existing answers and fills gaps', () => {
        const questions: DynamicQuestion[] = [
            {
                id: 'answered',
                category: 'forensic',
                question: 'Already answered',
                type: 'single',
                options: [{ id: 'a', label: 'A', dataValue: 'A' }]
            },
            {
                id: 'unanswered',
                category: 'forensic',
                question: 'Not answered',
                type: 'single',
                options: [{ id: 'b', label: 'B', dataValue: 'B' }]
            }
        ];

        const existing = new Map([['answered', 'my_value']]);
        const filled = fillMissingAnswers(questions, existing);

        expect(filled.get('answered')).toBe('my_value');
        expect(filled.get('unanswered')).toBe('B');
    });
});

describe('answersToObject', () => {
    it('converts Map to plain object', () => {
        const answers = new Map<string, unknown>([
            ['a', 1],
            ['b', 'test']
        ]);

        expect(answersToObject(answers)).toEqual({ a: 1, b: 'test' });
    });
});
