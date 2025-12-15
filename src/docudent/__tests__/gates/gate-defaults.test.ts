/**
 * Gate: User Defaults Tests
 * 
 * Verifies that user defaults are correctly applied to unanswered questions
 * without overriding explicit user answers.
 */
import { describe, it, expect } from 'vitest';
import { applyUserDefaults, type UserDefaults } from '../../v7/pipeline/applyUserDefaults';

describe('Gate: User Defaults', () => {
    const mockQuestions = [
        { id: 'vitality', category: 'forensic' },
        { id: 'percussion', category: 'forensic' },
        { id: 'isolation', category: 'prozess' },
        { id: 'tiefe', category: 'befund' },
        { id: 'mehrschicht', category: 'upsell' },
    ];

    const mockExtracted = { tooth: '36', surfaces: ['m', 'o'], mentioned: {} };

    describe('A) Defaults applied when unanswered', () => {
        it('should apply isolation=kofferdam default when question is unanswered', () => {
            const userDefaults: UserDefaults = {
                fuellung: { isolation: 'kofferdam', mehrschicht: 'yes' }
            };

            const answers = new Map<string, unknown>();

            const result = applyUserDefaults({
                treatmentId: 'fuellung',
                extracted: mockExtracted,
                questions: mockQuestions,
                answers,
                userDefaults
            });

            expect(result.answers.get('isolation')).toBe('kofferdam');
            expect(result.answers.get('mehrschicht')).toBe('yes');
        });

        it('should NOT override explicit user answer isolation=relativ', () => {
            const userDefaults: UserDefaults = {
                fuellung: { isolation: 'kofferdam' }
            };

            const answers = new Map<string, unknown>([
                ['isolation', 'relativ']  // User explicitly chose relativ
            ]);

            const result = applyUserDefaults({
                treatmentId: 'fuellung',
                extracted: mockExtracted,
                questions: mockQuestions,
                answers,
                userDefaults
            });

            // User answer preserved, default NOT applied
            expect(result.answers.get('isolation')).toBe('relativ');
        });
    });

    describe('B) Category restrictions', () => {
        it('should NOT apply defaults to befund/forensic questions', () => {
            const userDefaults: UserDefaults = {
                fuellung: {
                    vitality: 'pos',      // forensic - should NOT apply
                    tiefe: 'deep',        // befund - should NOT apply
                    isolation: 'kofferdam' // prozess - should apply
                }
            };

            const answers = new Map<string, unknown>();

            const result = applyUserDefaults({
                treatmentId: 'fuellung',
                extracted: mockExtracted,
                questions: mockQuestions,
                answers,
                userDefaults
            });

            expect(result.answers.has('vitality')).toBe(false);
            expect(result.answers.has('tiefe')).toBe(false);
            expect(result.answers.get('isolation')).toBe('kofferdam');
        });

        it('should apply defaults to upsell questions', () => {
            const userDefaults: UserDefaults = {
                fuellung: { mehrschicht: 'yes' }
            };

            const answers = new Map<string, unknown>();

            const result = applyUserDefaults({
                treatmentId: 'fuellung',
                extracted: mockExtracted,
                questions: mockQuestions,
                answers,
                userDefaults
            });

            expect(result.answers.get('mehrschicht')).toBe('yes');
        });
    });

    describe('C) Treatment-specific defaults', () => {
        it('should only apply defaults for matching treatmentId', () => {
            const userDefaults: UserDefaults = {
                fuellung: { isolation: 'kofferdam' },
                endo: { spuelung: 'naocl' }
            };

            const answers = new Map<string, unknown>();

            const resultFuellung = applyUserDefaults({
                treatmentId: 'fuellung',
                extracted: mockExtracted,
                questions: mockQuestions,
                answers,
                userDefaults
            });

            // Fuellung default should apply
            expect(resultFuellung.answers.get('isolation')).toBe('kofferdam');
            // Endo default should NOT apply
            expect(resultFuellung.answers.has('spuelung')).toBe(false);
        });

        it('should return answers unchanged if no defaults for treatment', () => {
            const userDefaults: UserDefaults = {
                endo: { spuelung: 'naocl' }
            };

            const answers = new Map<string, unknown>([['foo', 'bar']]);

            const result = applyUserDefaults({
                treatmentId: 'fuellung',
                extracted: mockExtracted,
                questions: mockQuestions,
                answers,
                userDefaults
            });

            expect(result.answers).toBe(answers);  // Same reference = no changes
        });
    });
});
