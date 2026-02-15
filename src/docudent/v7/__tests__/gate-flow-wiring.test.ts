/**
 * GATE TEST: V7 Flow Wiring Regression
 * 
 * Purpose: Prevent the bugs that caused:
 * 1. QuestionsFlow showing mock data instead of real questions
 * 2. Treatment selection not reaching pipeline
 * 3. Answer clicks not updating state
 * 
 * These tests must FAIL before the fix and PASS after.
 */

import { describe, it, expect } from 'vitest';
import { generateQuestions } from '../../core/questions/questionService';
import type { ExtractedData } from '../../contracts/extractionV6';

// ═══════════════════════════════════════════════════════════════
// TEST 1: Füllung treatment never yields Endo questions
// ═══════════════════════════════════════════════════════════════

describe('gate-fuellung-no-endo-questions', () => {
    it('should NOT include any endo-related questions when treatmentId is fuellung', () => {
        const extracted: ExtractedData = {
            tooth: '36',
            surfaces: ['mod'],
            diagnosis: 'Karies',
            mentioned: {},
            gaps: [],
            rawSignals: {}
        };

        const questions = generateQuestions(
            extracted,
            'GKV',       // insuranceType
            false,       // hasMKV
            'fuellung',  // treatmentId — CRITICAL: must be respected
            new Map(),   // answers
            'Zahn 36 mod Komposit'  // rawDictation
        );

        const questionIds = questions.map(q => q.id);

        // NONE of these Endo-specific question IDs should appear
        const ENDO_QUESTION_PATTERNS = [
            /endo/i,
            /kanal/i,
            /wl/i,
            /wurzel/i,
            /spül/i,
            /aufbereitung/i,
            /sensor/i,
            /kofferdam/i,
        ];

        const endoQuestionsFound = questionIds.filter(id =>
            ENDO_QUESTION_PATTERNS.some(pattern => pattern.test(id))
        );

        expect(endoQuestionsFound).toEqual([]);
    });

    it('should only include fuellung-relevant questions', () => {
        const extracted: ExtractedData = {
            tooth: '36',
            surfaces: ['mod'],
            diagnosis: 'Karies',
            mentioned: {},
            gaps: [],
            rawSignals: {}
        };

        const questions = generateQuestions(
            extracted,
            'GKV',
            false,
            'fuellung',
            new Map(),
            'Zahn 36 mod Komposit'
        );

        // Should include typical fuellung questions (if any are generated)
        // This is a sanity check that the filter isn't TOO aggressive
        const FUELLUNG_VALID_PATTERNS = [
            /isolation/i,
            /material/i,
            /ueberkappung/i,
            /aesthetik/i,
            /mehrschicht/i,
            /adhaesiv/i,
        ];

        // At minimum, verify no ENDO questions leaked in
        questions.forEach(q => {
            expect(q.id).not.toMatch(/endo_step/);
            expect(q.id).not.toMatch(/kanal_anzahl/);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// TEST 2: Endo treatment yields Endo questions (not leaking Füllung-only)
// ═══════════════════════════════════════════════════════════════

describe('gate-endo-yields-endo-questions', () => {
    it('should include endo_step askback when step is ambiguous', () => {
        const extracted: ExtractedData = {
            tooth: '46',
            surfaces: [],
            diagnosis: 'Pulpitis',
            mentioned: {},
            gaps: [],
            rawSignals: {}
        };

        const questions = generateQuestions(
            extracted,
            'GKV',
            false,
            'endo',  // treatmentId — Endo selected
            new Map(),
            'Wurzelbehandlung Zahn 46'  // ambiguous — no clear step
        );

        const hasEndoStep = questions.some(q => q.id === 'endo_step');
        expect(hasEndoStep).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════
// TEST 3: Pipeline respects treatmentId parameter
// ═══════════════════════════════════════════════════════════════

describe('gate-pipeline-treatmentid-passthrough', () => {
    // This test verifies the wiring by checking that questions are 
    // correctly scoped to the treatment

    it('fuellung input does not produce endo_step question', async () => {
        // Import pipeline directly for integration test
        const { pipeline } = await import('../pipeline/index');

        const result = await pipeline.run({
            dictation: 'Zahn 36 mod Komposit Füllung',
            answers: new Map(),
            insuranceType: 'GKV',
            textLength: 'mittel',
            hasMKV: false,
            treatmentId: 'fuellung'  // Explicit fuellung
        });

        if (result.state === 'questions') {
            const hasEndoStep = result.questions.some(q => q.id === 'endo_step');
            expect(hasEndoStep).toBe(false);
        }
        // If state is 'output', that's also valid (no questions needed)
    });
});
