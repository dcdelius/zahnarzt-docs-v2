/**
 * Answer ID Translator Tests
 *
 * Verifies that semantic QuestionBank IDs are correctly translated
 * to canonical AnswerMap IDs for proper chip resolution.
 */

import { describe, it, expect } from 'vitest';
import {
    translateQuestionId,
    translateOptionId,
    translateAnswers
} from '../../core/billing/knowledgeBase/logic/answerIdTranslator';

describe('Answer ID Translator', () => {
    describe('translateQuestionId', () => {
        it('should translate isolation to kofferdam', () => {
            expect(translateQuestionId('fuellung', 'isolation')).toBe('kofferdam');
        });

        it('should translate tiefe to cavity_depth', () => {
            expect(translateQuestionId('fuellung', 'tiefe')).toBe('cavity_depth');
        });

        it('should pass through already canonical IDs', () => {
            expect(translateQuestionId('fuellung', 'vitality')).toBe('vitality');
            expect(translateQuestionId('fuellung', 'percussion')).toBe('percussion');
        });

        it('should throw for unknown treatment', () => {
            expect(() => translateQuestionId('unknown', 'isolation'))
                .toThrow(/Unknown treatment.*unknown/i);
        });
    });

    describe('translateOptionId', () => {
        it('should translate kofferdam option to yes', () => {
            expect(translateOptionId('fuellung', 'isolation', 'kofferdam')).toBe('yes');
        });

        it('should translate relativ option to no', () => {
            expect(translateOptionId('fuellung', 'isolation', 'relativ')).toBe('no');
        });

        it('should translate tiefe tief to deep', () => {
            expect(translateOptionId('fuellung', 'tiefe', 'tief')).toBe('deep');
        });

        it('should translate material caoh to cp', () => {
            expect(translateOptionId('fuellung', 'material', 'caoh')).toBe('cp');
        });

        it('should pass through canonical option IDs', () => {
            expect(translateOptionId('fuellung', 'vitality', 'pos')).toBe('pos');
            expect(translateOptionId('fuellung', 'vitality', 'neg')).toBe('neg');
        });
    });

    describe('translateAnswers', () => {
        it('should translate entire answers map', () => {
            const answers = new Map<string, unknown>([
                ['isolation', 'kofferdam'],
                ['tiefe', 'tief'],
                ['vitality', 'pos'],
            ]);

            const canonical = translateAnswers('fuellung', answers);

            expect(canonical.get('kofferdam')).toBe('yes');
            expect(canonical.get('cavity_depth')).toBe('deep');
            expect(canonical.get('vitality')).toBe('pos');
        });

        it('should preserve number values', () => {
            const answers = new Map<string, unknown>([
                ['mkv_betrag', 120],
            ]);

            const canonical = translateAnswers('fuellung', answers);

            expect(canonical.get('mkv_betrag')).toBe(120);
        });

        it('should handle empty map', () => {
            const answers = new Map<string, unknown>();
            const canonical = translateAnswers('fuellung', answers);
            expect(canonical.size).toBe(0);
        });
    });
});

describe('Integration: Answers → Chip Selection', () => {
    it('isolation:kofferdam should result in chip kofferdam', async () => {
        // Import at test time to avoid circular issues
        const { resolveActiveChipIds } = await import('../../core/billing/knowledgeBase/logic/chipResolver');

        const extracted = {
            tooth: '36',
            surfaces: ['m', 'o', 'd'],
            mentioned: {}
        };

        const answers = new Map<string, string>([
            ['isolation', 'kofferdam'],  // Semantic IDs from QuestionBank
        ]);

        const chips = resolveActiveChipIds('fuellung', extracted, answers, {
            hasMKV: false,
            insuranceType: 'GKV'
        });

        expect(chips).toContain('kofferdam');
        expect(chips).not.toContain('rel_trocken');
    });

    it('tiefe:tief should activate cp chip', async () => {
        const { resolveActiveChipIds } = await import('../../core/billing/knowledgeBase/logic/chipResolver');

        const extracted = {
            tooth: '36',
            surfaces: ['m', 'o', 'd'],
            mentioned: {}
        };

        const answers = new Map<string, string>([
            ['tiefe', 'tief'],  // Semantic IDs
        ]);

        const chips = resolveActiveChipIds('fuellung', extracted, answers, {
            hasMKV: false,
            insuranceType: 'GKV'
        });

        expect(chips).toContain('cp');
    });
});
