/**
 * Gate: User Defaults Debug Attribution Tests
 * 
 * Verifies that the source tracking metadata (user vs default) is correct.
 */
import { describe, it, expect } from 'vitest';
import { applyUserDefaults, type UserDefaults } from '../../v7/pipeline/applyUserDefaults';

describe('Gate: User Defaults Debug Attribution', () => {
    const mockQuestions = [
        { id: 'vitality', category: 'forensic' },
        { id: 'percussion', category: 'forensic' },
        { id: 'isolation', category: 'prozess' },
        { id: 'tiefe', category: 'befund' },
        { id: 'mehrschicht', category: 'upsell' },
    ];

    const mockExtracted = { tooth: '36', surfaces: ['m', 'o'], mentioned: {} };

    describe('A) Debug metadata for applied defaults', () => {
        it('applied default should be recorded in appliedDefaults array', () => {
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

            expect(result.appliedDefaults).toContain('isolation');
            expect(result.appliedDefaults).toContain('mehrschicht');
            expect(result.appliedDefaults).toHaveLength(2);
        });

        it('applied defaults should appear in defaultsMap', () => {
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

            expect(result.defaultsMap).toEqual({
                isolation: 'kofferdam',
                mehrschicht: 'yes'
            });
        });
    });

    describe('B) Source attribution', () => {
        it('explicit user answer should be recorded as "user" even if defaults exist', () => {
            const userDefaults: UserDefaults = {
                fuellung: { isolation: 'kofferdam' }
            };

            const answers = new Map<string, unknown>([
                ['isolation', 'relativ'],  // User explicitly chose relativ
                ['vitality', 'pos']       // User answered
            ]);

            const result = applyUserDefaults({
                treatmentId: 'fuellung',
                extracted: mockExtracted,
                questions: mockQuestions,
                answers,
                userDefaults
            });

            expect(result.answersSource['isolation']).toBe('user');
            expect(result.answersSource['vitality']).toBe('user');
            expect(result.appliedDefaults).not.toContain('isolation');
        });

        it('default-applied answers should be recorded as "default"', () => {
            const userDefaults: UserDefaults = {
                fuellung: { isolation: 'kofferdam' }
            };

            const answers = new Map<string, unknown>();

            const result = applyUserDefaults({
                treatmentId: 'fuellung',
                extracted: mockExtracted,
                questions: mockQuestions,
                answers,
                userDefaults
            });

            expect(result.answersSource['isolation']).toBe('default');
        });

        it('mixed user and default answers should have correct attribution', () => {
            const userDefaults: UserDefaults = {
                fuellung: { isolation: 'kofferdam', mehrschicht: 'yes' }
            };

            const answers = new Map<string, unknown>([
                ['vitality', 'pos'],   // User answered (forensic - no default possible)
                ['isolation', 'relativ']  // User overrode default
            ]);

            const result = applyUserDefaults({
                treatmentId: 'fuellung',
                extracted: mockExtracted,
                questions: mockQuestions,
                answers,
                userDefaults
            });

            expect(result.answersSource['vitality']).toBe('user');
            expect(result.answersSource['isolation']).toBe('user');
            expect(result.answersSource['mehrschicht']).toBe('default');
        });
    });

    describe('C) Befund questions never show as default', () => {
        it('befund/forensic questions should never appear in appliedDefaults', () => {
            const userDefaults: UserDefaults = {
                fuellung: {
                    vitality: 'pos',       // forensic - blocked
                    tiefe: 'deep',         // befund - blocked
                    isolation: 'kofferdam' // prozess - allowed
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

            expect(result.appliedDefaults).not.toContain('vitality');
            expect(result.appliedDefaults).not.toContain('tiefe');
            expect(result.answersSource['vitality']).toBeUndefined();
            expect(result.answersSource['tiefe']).toBeUndefined();
        });
    });
});
