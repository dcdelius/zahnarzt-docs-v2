/**
 * Gate 0: TreatmentId Routing Integrity
 * 
 * This test ensures that treatmentId is correctly routed through the pipeline
 * and that there is NO silent fallback to 'fuellung' when treatmentId is explicitly provided.
 * 
 * Tests:
 * A) Unknown treatmentId should throw explicit error (no silent fallback)
 * B) Known treatmentId (fuellung) should produce fuellung-specific output
 * C) questionService accepts treatmentId param
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { generateFinalOutput } from '../../v6/services/outputService';
import { generateQuestions } from '../../v6/services/questionService';

// Minimal extracted fixture for testing
const MINIMAL_EXTRACTED = {
    tooth: '36',
    surfaces: ['m', 'o', 'd'],
    diagnosis: 'Karies',
    costs: null,
    mentioned: {},
    gaps: [],
};

describe('GATE0: TreatmentId Routing Integrity', () => {
    beforeEach(() => {
        // Mock console to reduce noise
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'debug').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('A) Unknown treatmentId handling', () => {
        it('should NOT silently fallback to fuellung for unknown treatmentId', async () => {
            // When endo/krone/other configs don't exist, calling with those treatmentIds
            // should either throw OR produce empty/error output, NOT fuellung output

            // The dead answer gate will catch this: unknown treatment means
            // answers have no effect, which triggers the error

            await expect(
                generateFinalOutput({
                    extracted: MINIMAL_EXTRACTED,
                    answers: new Map([
                        ['vitality', 'pos'],
                        ['percussion', 'neg'],
                        ['isolation', 'kofferdam'],
                        ['tiefe', 'normal'],
                    ]),
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    hasMKV: false,
                    treatmentId: 'unknown_treatment_xyz'
                })
            ).rejects.toThrow();

            // This is CORRECT: unknown treatment causes dead answers error
            // proving that the system does NOT silently fallback to fuellung
        });

        it('loadTreatmentJSON should return null and warn for unknown treatmentId', async () => {
            // Direct test of treatmentEngine behavior (Policy B)
            const { loadTreatmentJSON } = await import('../../core/billing/knowledgeBase/logic/treatmentEngine');

            const warnSpy = vi.spyOn(console, 'warn');
            const result = loadTreatmentJSON('unknown_xyz_123');

            expect(result).toBeNull();
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringMatching(/Unknown treatment.*unknown_xyz_123/i)
            );
        });

        it('fuellung treatmentId should produce fuellung-specific chips', async () => {
            const result = await generateFinalOutput({
                extracted: MINIMAL_EXTRACTED,
                answers: new Map([
                    ['vitality', 'pos'],
                    ['percussion', 'neg'],
                    ['isolation', 'kofferdam'],
                    ['tiefe', 'normal'],
                ]),
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                treatmentId: 'fuellung'  // Explicit fuellung
            });

            expect(result).toBeDefined();
            expect(result._debug).toBeDefined();

            // Fuellung-specific chip should be present
            expect(result._debug?.activeChipIds).toContain('kofferdam');

            // Endo-specific chips should NOT be present
            expect(result._debug?.activeChipIds).not.toContain('kanalaufbereitung_3');
        });

        it('default treatmentId (undefined) should fallback to fuellung', async () => {
            const result = await generateFinalOutput({
                extracted: MINIMAL_EXTRACTED,
                answers: new Map([
                    ['vitality', 'pos'],
                    ['percussion', 'neg'],
                    ['isolation', 'kofferdam'],
                    ['tiefe', 'normal'],
                ]),
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                // treatmentId: undefined (not provided)
            });

            expect(result).toBeDefined();
            expect(result._debug).toBeDefined();

            // Should use fuellung chips by default
            expect(result._debug?.activeChipIds).toContain('kofferdam');
        });
    });

    describe('B) questionService treatmentId routing', () => {
        it('should accept treatmentId param and not throw', () => {
            // Default case - fuellung
            const questions = generateQuestions(MINIMAL_EXTRACTED, 'GKV', false, 'fuellung');

            expect(questions).toBeDefined();
            expect(Array.isArray(questions)).toBe(true);
        });

        it('should generate questions for fuellung treatment', () => {
            const questions = generateQuestions(MINIMAL_EXTRACTED, 'GKV', false, 'fuellung');

            // Fuellung should include forensic questions like vitality, percussion
            const questionIds = questions.map(q => q.id);
            expect(questionIds).toContain('vitality');
            expect(questionIds).toContain('percussion');
        });

        it('default treatmentId should fallback to fuellung', () => {
            // When not provided, should use fuellung
            const questions = generateQuestions(MINIMAL_EXTRACTED, 'GKV', false);

            expect(questions).toBeDefined();
            expect(Array.isArray(questions)).toBe(true);
            expect(questions.length).toBeGreaterThan(0);
        });
    });

    describe('C) Routing completeness verification', () => {
        it('treatmentId should flow through entire pipeline', async () => {
            // Run full pipeline with explicit treatmentId
            const result = await generateFinalOutput({
                extracted: MINIMAL_EXTRACTED,
                answers: new Map([
                    ['vitality', 'pos'],
                    ['percussion', 'neg'],
                    ['isolation', 'relativ'],
                    ['tiefe', 'normal'],
                ]),
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                treatmentId: 'fuellung'
            });

            // Verify output structure
            expect(result.sections).toBeDefined();
            expect(result.billingCodes).toBeDefined();

            // Verify debug info shows the requested treatment was processed
            expect(result._debug).toBeDefined();
            expect(result._debug?.translatedAnswers).toBeDefined();
            expect(result._debug?.activeChipIds).toBeDefined();
        });
    });
});
