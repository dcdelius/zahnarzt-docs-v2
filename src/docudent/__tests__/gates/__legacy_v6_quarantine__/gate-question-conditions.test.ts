/**
 * Gate Test: Conditional Question Logic
 * 
 * Ensures questions with `when` clauses are only shown when conditions are met.
 * - tiefe: Only when caries keywords present
 * - ueberkappung: Only when keywords present OR tiefe=tief
 * - ueberkappung_material: Only when ueberkappung=true
 */

import { describe, it, expect, vi } from 'vitest';
import { generateQuestions } from '../../v6/services/questionService';
import type { ExtractedData } from '../../v6/hooks/useDocudentV6';

// Mock settingsStore to always return 'fragen' so questions appear for testing
// This isolates the when-clause logic from praxis settings
vi.mock('../../v7/settings/settingsStore', () => ({
    getFuellungDefaults: () => ({
        trockenlegung: 'fragen',
        ueberkappungMaterial: 'fragen',
    }),
}));

describe('Gate: Conditional Question Logic', () => {
    // ═══════════════════════════════════════════════════════════════
    // CASE 1: Simple dictation with no depth keywords
    // "Zahn 15 MO" → should NOT ask tiefe, ueberkappung, or material
    // ═══════════════════════════════════════════════════════════════
    describe('Case 1: Dictation without caries/depth keywords', () => {
        const extracted: ExtractedData = {
            tooth: '15',
            surfaces: ['m', 'o'],
            mentioned: {},
        };
        const rawDictation = 'Zahn 15 Flächen mesial oklusal';

        it('should NOT include tiefe question', () => {
            const questions = generateQuestions(
                extracted,
                'GKV',
                false,
                'fuellung',
                new Map(),
                rawDictation
            );
            const tiefeQ = questions.find(q => q.id === 'tiefe');
            expect(tiefeQ).toBeUndefined();
        });

        it('should NOT include ueberkappung question', () => {
            const questions = generateQuestions(
                extracted,
                'GKV',
                false,
                'fuellung',
                new Map(),
                rawDictation
            );
            const ueberkappungQ = questions.find(q => q.id === 'ueberkappung');
            expect(ueberkappungQ).toBeUndefined();
        });

        it('should NOT include ueberkappung_material question', () => {
            const questions = generateQuestions(
                extracted,
                'GKV',
                false,
                'fuellung',
                new Map(),
                rawDictation
            );
            const materialQ = questions.find(q => q.id === 'ueberkappung_material');
            expect(materialQ).toBeUndefined();
        });

        it('should still include basic questions (vitality, percussion, isolation)', () => {
            const questions = generateQuestions(
                extracted,
                'GKV',
                false,
                'fuellung',
                new Map(),
                rawDictation
            );
            // These have no when clause, so should always appear
            expect(questions.find(q => q.id === 'vitality')).toBeDefined();
            expect(questions.find(q => q.id === 'percussion')).toBeDefined();
            expect(questions.find(q => q.id === 'isolation')).toBeDefined();
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CASE 2: Dictation with pulpanah keyword
    // → should ask tiefe and ueberkappung
    // ═══════════════════════════════════════════════════════════════
    describe('Case 2: Dictation with pulpanah keyword', () => {
        const extracted: ExtractedData = {
            tooth: '15',
            surfaces: ['m', 'o'],
            mentioned: {},
        };
        const rawDictation = 'Zahn 15 MO pulpanah';

        it('should include tiefe question', () => {
            const questions = generateQuestions(
                extracted,
                'GKV',
                false,
                'fuellung',
                new Map(),
                rawDictation
            );
            const tiefeQ = questions.find(q => q.id === 'tiefe');
            expect(tiefeQ).toBeDefined();
        });

        it('should include ueberkappung question (keyword match)', () => {
            const questions = generateQuestions(
                extracted,
                'GKV',
                false,
                'fuellung',
                new Map(),
                rawDictation
            );
            const ueberkappungQ = questions.find(q => q.id === 'ueberkappung');
            expect(ueberkappungQ).toBeDefined();
        });

        it('should NOT include ueberkappung_material yet (ueberkappung not answered)', () => {
            const questions = generateQuestions(
                extracted,
                'GKV',
                false,
                'fuellung',
                new Map(),
                rawDictation
            );
            const materialQ = questions.find(q => q.id === 'ueberkappung_material');
            expect(materialQ).toBeUndefined();
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CASE 3: User answered tiefe=tief
    // → should ask ueberkappung (via requiresAnswers)
    // ═══════════════════════════════════════════════════════════════
    describe('Case 3: tiefe answered as tief', () => {
        const extracted: ExtractedData = {
            tooth: '15',
            surfaces: ['m', 'o'],
            mentioned: {},
        };
        const rawDictation = 'Zahn 15 MO Karies';
        const answers = new Map<string, unknown>([['tiefe', 'tief']]);

        it('should include ueberkappung question when tiefe=tief', () => {
            const questions = generateQuestions(
                extracted,
                'GKV',
                false,
                'fuellung',
                answers,
                rawDictation
            );
            const ueberkappungQ = questions.find(q => q.id === 'ueberkappung');
            expect(ueberkappungQ).toBeDefined();
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CASE 4: User answered ueberkappung=true
    // → should ask ueberkappung_material
    // ═══════════════════════════════════════════════════════════════
    describe('Case 4: ueberkappung answered as true', () => {
        const extracted: ExtractedData = {
            tooth: '15',
            surfaces: ['m', 'o'],
            mentioned: {},
        };
        const rawDictation = 'Zahn 15 MO Karies pulpanah';
        const answers = new Map<string, unknown>([
            ['tiefe', 'tief'],
            ['ueberkappung', true],
        ]);

        it('should include ueberkappung_material when ueberkappung=true', () => {
            const questions = generateQuestions(
                extracted,
                'GKV',
                false,
                'fuellung',
                answers,
                rawDictation
            );
            const materialQ = questions.find(q => q.id === 'ueberkappung_material');
            expect(materialQ).toBeDefined();
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CASE 5: ueberkappung=false should NOT show material
    // ═══════════════════════════════════════════════════════════════
    describe('Case 5: ueberkappung answered as false', () => {
        const extracted: ExtractedData = {
            tooth: '15',
            surfaces: ['m', 'o'],
            mentioned: {},
        };
        const rawDictation = 'Zahn 15 MO pulpanah';
        const answers = new Map<string, unknown>([
            ['tiefe', 'tief'],
            ['ueberkappung', false],
        ]);

        it('should NOT include ueberkappung_material when ueberkappung=false', () => {
            const questions = generateQuestions(
                extracted,
                'GKV',
                false,
                'fuellung',
                answers,
                rawDictation
            );
            const materialQ = questions.find(q => q.id === 'ueberkappung_material');
            expect(materialQ).toBeUndefined();
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CASE 6: Caries keyword triggers tiefe
    // ═══════════════════════════════════════════════════════════════
    describe('Case 6: Caries keywords trigger tiefe', () => {
        it('should ask tiefe for "Caries profunda"', () => {
            const extracted: ExtractedData = {
                tooth: '36',
                surfaces: ['o'],
                mentioned: {},
            };
            const questions = generateQuestions(
                extracted,
                'GKV',
                false,
                'fuellung',
                new Map(),
                'Zahn 36 okklusal Caries profunda'
            );
            expect(questions.find(q => q.id === 'tiefe')).toBeDefined();
        });

        it('should ask tiefe for "tiefe Karies"', () => {
            const extracted: ExtractedData = {
                tooth: '36',
                surfaces: ['o'],
                mentioned: {},
            };
            const questions = generateQuestions(
                extracted,
                'GKV',
                false,
                'fuellung',
                new Map(),
                'Zahn 36 tiefe Karies'
            );
            expect(questions.find(q => q.id === 'tiefe')).toBeDefined();
        });
    });
});
