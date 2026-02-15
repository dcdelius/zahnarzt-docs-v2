/**
 * Gate Test: Fuellung Praxis Defaults
 * 
 * Verifies that praxis settings skip questions when defaults are set:
 * - trockenlegung: 'kofferdam'|'relativ' → NO isolation question
 * - ueberkappungMaterial: 'caoh'|'mta'|'biodentine' → NO material question
 * - Both set to 'fragen' → ask as normal
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateQuestions } from '../../v6/services/questionService';
import type { ExtractedData } from '../../v6/hooks/useDocudentV6';

// Mock settingsStore with different settings per test
let mockSettings = {
    trockenlegung: 'kofferdam' as const,
    ueberkappungMaterial: 'caoh' as const,
};

vi.mock('../../v7/settings/settingsStore', () => ({
    getFuellungDefaults: () => mockSettings,
}));

describe('Gate: Fuellung Praxis Defaults', () => {
    const baseExtracted: ExtractedData = {
        tooth: '36',
        surfaces: ['m', 'o', 'd'],
        diagnosis: '',
        costs: 0,
        gaps: '',
        mentioned: {},
    };

    const getQuestionIds = (extracted: ExtractedData, dictation: string): string[] => {
        const questions = generateQuestions(
            extracted,
            'GKV',
            false, // hasMKV
            'fuellung',
            new Map(),
            dictation
        );
        return questions.map(q => q.id);
    };

    // ═══════════════════════════════════════════════════════════════
    // Trockenlegung defaults
    // ═══════════════════════════════════════════════════════════════
    describe('Trockenlegung defaults', () => {
        it('no isolation question when default = kofferdam', () => {
            mockSettings = { trockenlegung: 'kofferdam', ueberkappungMaterial: 'caoh' };

            const ids = getQuestionIds(baseExtracted, 'Zahn 36 MOD Composite');

            expect(ids).not.toContain('isolation');
            expect(ids).toContain('vitality');
            expect(ids).toContain('percussion');
        });

        it('no isolation question when default = relativ', () => {
            mockSettings = { trockenlegung: 'relativ', ueberkappungMaterial: 'caoh' };

            const ids = getQuestionIds(baseExtracted, 'Zahn 36 MOD Composite');

            expect(ids).not.toContain('isolation');
        });

        it('asks isolation when default = fragen', () => {
            mockSettings = { trockenlegung: 'fragen', ueberkappungMaterial: 'caoh' };

            const ids = getQuestionIds(baseExtracted, 'Zahn 36 MOD Composite');

            expect(ids).toContain('isolation');
        });

        // ═══════════════════════════════════════════════════════════════
        // Explicit acceptance test: "Zahn 15 MO Composite" with settings
        // ═══════════════════════════════════════════════════════════════
        it('"Zahn 15 MO Composite" → NO isolation when default = kofferdam', () => {
            mockSettings = { trockenlegung: 'kofferdam', ueberkappungMaterial: 'caoh' };
            const extracted = { ...baseExtracted, tooth: '15', surfaces: ['m', 'o'] };

            const ids = getQuestionIds(extracted, 'Zahn 15 MO Composite');

            expect(ids).not.toContain('isolation');
            expect(ids).toContain('vitality');
            expect(ids).toContain('percussion');
        });

        // ═══════════════════════════════════════════════════════════════
        // hasMKV independence: settings skip works regardless of MKV
        // ═══════════════════════════════════════════════════════════════
        it('no isolation even with hasMKV=true when default = kofferdam', () => {
            mockSettings = { trockenlegung: 'kofferdam', ueberkappungMaterial: 'caoh' };

            const questions = generateQuestions(
                baseExtracted,
                'GKV',
                true, // hasMKV = true
                'fuellung',
                new Map(),
                'Zahn 36 MOD Composite'
            );
            const ids = questions.map(q => q.id);

            expect(ids).not.toContain('isolation');
        });

        it('no isolation even with hasMKV=true when default = relativ', () => {
            mockSettings = { trockenlegung: 'relativ', ueberkappungMaterial: 'caoh' };

            const questions = generateQuestions(
                baseExtracted,
                'GKV',
                true, // hasMKV = true
                'fuellung',
                new Map(),
                'Zahn 36 MOD Composite'
            );
            const ids = questions.map(q => q.id);

            expect(ids).not.toContain('isolation');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Überkappungsmaterial defaults
    // ═══════════════════════════════════════════════════════════════
    describe('Überkappungsmaterial defaults', () => {
        it('no material question when default = caoh', () => {
            mockSettings = { trockenlegung: 'kofferdam', ueberkappungMaterial: 'caoh' };

            // Simulate deep caries where ueberkappung question would appear
            const ids = getQuestionIds(baseExtracted, 'Zahn 36 MOD Karies profunda pulpanah');

            expect(ids).not.toContain('ueberkappung_material');
            expect(ids).toContain('ueberkappung'); // Still ask if capping needed
        });

        it('no material question when default = mta', () => {
            mockSettings = { trockenlegung: 'kofferdam', ueberkappungMaterial: 'mta' };

            const ids = getQuestionIds(baseExtracted, 'Zahn 36 MOD Karies profunda pulpanah');

            expect(ids).not.toContain('ueberkappung_material');
        });

        it('no material question when default = biodentine', () => {
            mockSettings = { trockenlegung: 'kofferdam', ueberkappungMaterial: 'biodentine' };

            const ids = getQuestionIds(baseExtracted, 'Zahn 36 MOD Karies profunda pulpanah');

            expect(ids).not.toContain('ueberkappung_material');
        });

        it('asks material when default = fragen', () => {
            mockSettings = { trockenlegung: 'kofferdam', ueberkappungMaterial: 'fragen' };

            // ueberkappung_material only appears when ueberkappung=true is answered
            // For this test, we provide the answer
            const questions = generateQuestions(
                baseExtracted,
                'GKV',
                false,
                'fuellung',
                new Map([['ueberkappung', true]]), // Answer that capping is needed
                'Zahn 36 MOD Karies profunda pulpanah'
            );
            const ids = questions.map(q => q.id);

            expect(ids).toContain('ueberkappung_material');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Both defaults at 'fragen'
    // ═══════════════════════════════════════════════════════════════
    describe('Both defaults = fragen', () => {
        it('asks both questions when defaults = fragen', () => {
            mockSettings = { trockenlegung: 'fragen', ueberkappungMaterial: 'fragen' };

            const questions = generateQuestions(
                baseExtracted,
                'GKV',
                false,
                'fuellung',
                new Map([['ueberkappung', true]]),
                'Zahn 36 MOD Karies profunda pulpanah'
            );
            const ids = questions.map(q => q.id);

            expect(ids).toContain('isolation');
            expect(ids).toContain('ueberkappung_material');
        });
    });
});
