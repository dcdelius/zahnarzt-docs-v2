/**
 * Gate Test: Fuellung Medical Golden Dictations
 * 
 * Regression protection against medically illogical questions.
 * Tests that question flow follows real clinical workflows.
 * 
 * Mock settings to 'fragen' so we can test when-clause logic independently.
 */

import { describe, it, expect, vi } from 'vitest';
import { generateQuestions } from '../../v6/services/questionService';
import type { ExtractedData } from '../../v6/hooks/useDocudentV6';

// Mock settingsStore to 'fragen' for most tests, allowing when-clause logic to run
vi.mock('../../v7/settings/settingsStore', () => ({
    getFuellungDefaults: () => ({
        trockenlegung: 'fragen',
        ueberkappungMaterial: 'fragen',
    }),
}));

describe('Gate: Fuellung Medical Golden Dictations', () => {
    // Helper to get question IDs from dictation
    const getQuestionIds = (
        extracted: Partial<ExtractedData>,
        dictation: string,
        answers: Map<string, unknown> = new Map()
    ): string[] => {
        const fullExtracted: ExtractedData = {
            tooth: extracted.tooth ?? '15',
            surfaces: extracted.surfaces ?? ['m', 'o'],
            diagnosis: extracted.diagnosis ?? '',
            costs: extracted.costs ?? 0,
            gaps: extracted.gaps ?? '',
            mentioned: extracted.mentioned ?? {},
        };

        const questions = generateQuestions(
            fullExtracted,
            'GKV',
            false, // hasMKV
            'fuellung',
            answers,
            dictation
        );
        return questions.map(q => q.id);
    };

    // ═══════════════════════════════════════════════════════════════
    // Case 1: Simple Composite — basic forensic only
    // ═══════════════════════════════════════════════════════════════
    describe('Case 1: "Zahn 15 MO Composite"', () => {
        const dictation = 'Zahn 15 MO Composite';
        const extracted = { tooth: '15', surfaces: ['m', 'o'] };

        it('✓ asks vitality + percussion', () => {
            const ids = getQuestionIds(extracted, dictation);
            expect(ids).toContain('vitality');
            expect(ids).toContain('percussion');
        });

        it('✗ does NOT ask tiefe (no caries keyword)', () => {
            const ids = getQuestionIds(extracted, dictation);
            expect(ids).not.toContain('tiefe');
        });

        it('✗ does NOT ask ueberkappung (no deep caries)', () => {
            const ids = getQuestionIds(extracted, dictation);
            expect(ids).not.toContain('ueberkappung');
        });

        it('✗ does NOT ask anesthesia_type (not mentioned)', () => {
            const ids = getQuestionIds(extracted, dictation);
            expect(ids).not.toContain('anesthesia_type');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 2: Anesthesia mentioned — asks type
    // ═══════════════════════════════════════════════════════════════
    describe('Case 2: "Zahn 15 MO Composite mit Anästhesie"', () => {
        const dictation = 'Zahn 15 MO Composite mit Anästhesie';
        const extracted = { tooth: '15', surfaces: ['m', 'o'] };

        it('✓ asks vitality + percussion + anesthesia_type', () => {
            const ids = getQuestionIds(extracted, dictation);
            expect(ids).toContain('vitality');
            expect(ids).toContain('percussion');
            expect(ids).toContain('anesthesia_type');
        });

        it('✗ still no tiefe/ueberkappung (no caries)', () => {
            const ids = getQuestionIds(extracted, dictation);
            expect(ids).not.toContain('tiefe');
            expect(ids).not.toContain('ueberkappung');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 3: Caries without severity — asks confirmation
    // ═══════════════════════════════════════════════════════════════
    describe('Case 3: "Zahn 36 MOD Karies" (severity missing)', () => {
        const dictation = 'Zahn 36 MOD Karies';
        const extracted = { tooth: '36', surfaces: ['m', 'o', 'd'] };

        it('✓ asks tiefe (caries keyword present)', () => {
            const ids = getQuestionIds(extracted, dictation);
            expect(ids).toContain('tiefe');
        });

        it('✓ asks diagnose_confirmation (severity unknown)', () => {
            const ids = getQuestionIds(extracted, dictation);
            expect(ids).toContain('diagnose_confirmation');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 4: Caries media — severity known, no confirmation
    // ═══════════════════════════════════════════════════════════════
    describe('Case 4: "Zahn 36 MOD Karies media"', () => {
        const dictation = 'Zahn 36 MOD Karies media';
        const extracted = { tooth: '36', surfaces: ['m', 'o', 'd'] };

        it('✓ asks tiefe', () => {
            const ids = getQuestionIds(extracted, dictation);
            expect(ids).toContain('tiefe');
        });

        it('✗ does NOT ask diagnose_confirmation (severity known)', () => {
            const ids = getQuestionIds(extracted, dictation);
            expect(ids).not.toContain('diagnose_confirmation');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 5: Deep caries — ueberkappung + material flow
    // ═══════════════════════════════════════════════════════════════
    describe('Case 5: "Zahn 46 distal Karies profunda pulpanah"', () => {
        const dictation = 'Zahn 46 distal Karies profunda pulpanah';
        const extracted = { tooth: '46', surfaces: ['d'] };

        it('✓ asks tiefe', () => {
            const ids = getQuestionIds(extracted, dictation);
            expect(ids).toContain('tiefe');
        });

        it('✓ asks ueberkappung (pulpanah keyword)', () => {
            const ids = getQuestionIds(extracted, dictation);
            expect(ids).toContain('ueberkappung');
        });

        it('✗ does NOT ask ueberkappung_material without answer', () => {
            const ids = getQuestionIds(extracted, dictation);
            expect(ids).not.toContain('ueberkappung_material');
        });

        it('✓ asks ueberkappung_material when ueberkappung=true', () => {
            const answers = new Map<string, unknown>([['ueberkappung', true]]);
            const ids = getQuestionIds(extracted, dictation, answers);
            expect(ids).toContain('ueberkappung_material');
        });

        it('✗ does NOT ask ueberkappung_material when ueberkappung=false', () => {
            const answers = new Map<string, unknown>([['ueberkappung', false]]);
            const ids = getQuestionIds(extracted, dictation, answers);
            expect(ids).not.toContain('ueberkappung_material');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 6: Kofferdam mentioned — no isolation question
    // ═══════════════════════════════════════════════════════════════
    describe('Case 6: "Zahn 36 MOD Kofferdam"', () => {
        const dictation = 'Zahn 36 MOD Kofferdam';
        const extracted = {
            tooth: '36',
            surfaces: ['m', 'o', 'd'],
            mentioned: { kofferdam: true }
        };

        it('✗ does NOT ask isolation (Kofferdam detected in when-clause noneOf)', () => {
            const ids = getQuestionIds(extracted, dictation);
            expect(ids).not.toContain('isolation');
        });

        it('✓ still asks vitality + percussion', () => {
            const ids = getQuestionIds(extracted, dictation);
            expect(ids).toContain('vitality');
            expect(ids).toContain('percussion');
        });
    });
});
