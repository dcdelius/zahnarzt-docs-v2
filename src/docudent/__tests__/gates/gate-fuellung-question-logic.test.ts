/**
 * Gate Test: Fuellung Question Logic
 * 
 * Verifies medically-correct question flow:
 * - Always: vitality, percussion
 * - Conditional: tiefe, ueberkappung, anesthesia_type, diagnose_confirmation, isolation
 * - Never: optisch_elektronisch (removed from fuellung)
 */

import { describe, it, expect, vi } from 'vitest';
import { generateQuestions } from '../../v6/services/questionService';
import type { ExtractedData } from '../../v6/hooks/useDocudentV6';

// Mock settingsStore to always return 'fragen' so questions appear for testing
// This isolates question/when-clause logic from praxis settings
vi.mock('../../v7/settings/settingsStore', () => ({
    getFuellungDefaults: () => ({
        trockenlegung: 'fragen',
        ueberkappungMaterial: 'fragen',
    }),
}));

describe('Gate: Fuellung Question Logic', () => {
    const baseExtracted: ExtractedData = {
        tooth: '15',
        surfaces: ['m', 'o'],
        diagnosis: '',
        costs: 0,
        gaps: '',
        mentioned: {},
    };

    // Helper to get question IDs
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
    // Case 1: Simple filling - no caries, no anesthesia
    // ═══════════════════════════════════════════════════════════════
    it('Case 1: "Zahn 15 MO Composite" → asks ViPr, Perk; NO tiefe/ueberkappung/anesthesia', () => {
        const ids = getQuestionIds(baseExtracted, 'Zahn 15 MO Composite');

        // Must ask
        expect(ids).toContain('vitality');
        expect(ids).toContain('percussion');

        // Must NOT ask
        expect(ids).not.toContain('tiefe');
        expect(ids).not.toContain('ueberkappung');
        expect(ids).not.toContain('ueberkappung_material');
        expect(ids).not.toContain('anesthesia_type');
        expect(ids).not.toContain('diagnose_confirmation');

        // Removed from fuellung
        expect(ids).not.toContain('optisch_elektronisch');
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 2: Filling with anesthesia → ask anesthesia_type
    // ═══════════════════════════════════════════════════════════════
    it('Case 2: "Zahn 15 MO Composite mit Anästhesie" → asks anesthesia_type', () => {
        const ids = getQuestionIds(baseExtracted, 'Zahn 15 MO Composite mit Anästhesie');

        expect(ids).toContain('vitality');
        expect(ids).toContain('percussion');
        expect(ids).toContain('anesthesia_type');

        // Still no caries-related questions
        expect(ids).not.toContain('tiefe');
        expect(ids).not.toContain('diagnose_confirmation');
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 3: Caries without severity → ask diagnose_confirmation + tiefe
    // ═══════════════════════════════════════════════════════════════
    it('Case 3: "Zahn 36 MOD Karies" (no severity) → asks diagnose_confirmation AND tiefe', () => {
        const extracted = { ...baseExtracted, tooth: '36', surfaces: ['m', 'o', 'd'] };
        const ids = getQuestionIds(extracted, 'Zahn 36 MOD Karies');

        expect(ids).toContain('vitality');
        expect(ids).toContain('percussion');
        expect(ids).toContain('tiefe');
        expect(ids).toContain('diagnose_confirmation');

        // No capping question yet (depends on tiefe answer)
        expect(ids).not.toContain('ueberkappung_material');
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 4: Caries media → NO diagnose_confirmation (severity known)
    // ═══════════════════════════════════════════════════════════════
    it('Case 4: "Zahn 36 MOD Karies media" → NO diagnose_confirmation', () => {
        const extracted = { ...baseExtracted, tooth: '36', surfaces: ['m', 'o', 'd'] };
        const ids = getQuestionIds(extracted, 'Zahn 36 MOD Karies media');

        expect(ids).toContain('vitality');
        expect(ids).toContain('percussion');
        expect(ids).toContain('tiefe'); // Still ask tiefe

        // Severity already known → no confirmation needed
        expect(ids).not.toContain('diagnose_confirmation');
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 5: Kofferdam mentioned → NO isolation question
    // ═══════════════════════════════════════════════════════════════
    it('Case 5: "Zahn 36 MOD Kofferdam" → NO isolation question (recognized)', () => {
        const extracted = {
            ...baseExtracted,
            tooth: '36',
            surfaces: ['m', 'o', 'd'],
            mentioned: { kofferdam: true }
        };
        const ids = getQuestionIds(extracted, 'Zahn 36 MOD Kofferdam');

        expect(ids).toContain('vitality');
        expect(ids).toContain('percussion');

        // Kofferdam was mentioned → don't ask again
        expect(ids).not.toContain('isolation');
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 6: No isolation keyword → ask isolation
    // ═══════════════════════════════════════════════════════════════
    it('Case 6: "Zahn 36 MOD Composite" (no isolation keyword) → asks isolation', () => {
        const extracted = { ...baseExtracted, tooth: '36', surfaces: ['m', 'o', 'd'] };
        const ids = getQuestionIds(extracted, 'Zahn 36 MOD Composite');

        expect(ids).toContain('vitality');
        expect(ids).toContain('percussion');
        expect(ids).toContain('isolation');
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 7: Ultracain keyword → asks anesthesia_type
    // ═══════════════════════════════════════════════════════════════
    it('Case 7: "Zahn 15 Ultracain Composite" → asks anesthesia_type', () => {
        const ids = getQuestionIds(baseExtracted, 'Zahn 15 Ultracain Composite');

        expect(ids).toContain('anesthesia_type');
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 8: Profunda keyword → NO diagnose_confirmation (severity known)
    // ═══════════════════════════════════════════════════════════════
    it('Case 8: "Karies profunda" → NO diagnose_confirmation', () => {
        const ids = getQuestionIds(baseExtracted, 'Zahn 15 Karies profunda');

        expect(ids).toContain('tiefe');
        expect(ids).not.toContain('diagnose_confirmation');
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 9: optisch_elektronisch never appears (removed)
    // ═══════════════════════════════════════════════════════════════
    it('Case 9: optisch_elektronisch never appears for fuellung (even with MKV)', () => {
        const questionsMkv = generateQuestions(
            baseExtracted,
            'GKV',
            true, // hasMKV
            'fuellung',
            new Map(),
            'Zahn 15 MO Composite'
        );
        const ids = questionsMkv.map(q => q.id);

        expect(ids).not.toContain('optisch_elektronisch');
    });
});
