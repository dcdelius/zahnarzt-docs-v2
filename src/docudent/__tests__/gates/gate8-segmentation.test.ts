/**
 * Gate 8: Segmentation Contract Tests
 * 
 * Verifies the SegmentationService contract:
 * - Endo-only dictation => 1 segment endo
 * - Fuellung-only dictation => 1 segment fuellung
 * - Both keywords => 2 segments [endo, fuellung]
 * - Context preserves insuranceType/textLength/hasMKV/userDefaults
 * - Deterministic: same input => identical plan
 * - Safety fallback: empty/unknown => 1 segment fuellung
 */
import { describe, it, expect } from 'vitest';
import { segmentDictation } from '../../v7/multitreatment/segmentationService';
import type { SegmentDictationInput } from '../../v7/multitreatment/segmentationService';

describe('Gate 8: Segmentation Contract', () => {
    // Base input for reuse
    const baseInput: SegmentDictationInput = {
        dictation: '',
        insuranceType: 'GKV',
        textLength: 'mittel',
        hasMKV: false,
        sessionId: 'test-session',
    };

    describe('A) Endo-only dictation => 1 segment endo', () => {
        it('should detect "wurzelbehandlung" as endo', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: 'Wurzelbehandlung 36 3 Kanäle',
            });

            expect(plan.segments).toHaveLength(1);
            expect(plan.segments[0].treatmentId).toBe('endo');
            expect(plan.segments[0].id).toBe('seg-1');
        });

        it('should detect "endo" keyword as endo', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: 'Endo Zahn 26',
            });

            expect(plan.segments).toHaveLength(1);
            expect(plan.segments[0].treatmentId).toBe('endo');
        });

        it('should detect "wurzel" keyword as endo', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: 'Wurzel 46 nekrotisch',
            });

            expect(plan.segments).toHaveLength(1);
            expect(plan.segments[0].treatmentId).toBe('endo');
        });
    });

    describe('B) Fuellung-only dictation => 1 segment fuellung', () => {
        it('should detect "füllung" keyword as fuellung', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: 'Füllung 37 mod',
            });

            expect(plan.segments).toHaveLength(1);
            expect(plan.segments[0].treatmentId).toBe('fuellung');
            expect(plan.segments[0].id).toBe('seg-1');
        });

        it('should detect "komposit" keyword as fuellung', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: 'Komposit Kavität tief',
            });

            expect(plan.segments).toHaveLength(1);
            expect(plan.segments[0].treatmentId).toBe('fuellung');
        });

        it('should detect surface abbreviations as fuellung (mod)', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: '36 mod Kofferdam',
            });

            expect(plan.segments).toHaveLength(1);
            expect(plan.segments[0].treatmentId).toBe('fuellung');
        });
    });

    describe('C) Both keywords => 2 segments [endo, fuellung]', () => {
        it('should create 2 segments when both endo and fuellung detected', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: 'Wurzelbehandlung 36 dann Füllung 37 mod',
            });

            expect(plan.segments).toHaveLength(2);
            expect(plan.segments[0].treatmentId).toBe('endo');
            expect(plan.segments[0].id).toBe('seg-1');
            expect(plan.segments[1].treatmentId).toBe('fuellung');
            expect(plan.segments[1].id).toBe('seg-2');
        });

        it('should extract teeth for both segments', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: 'Endo 36 Füllung 37 od',
            });

            expect(plan.segments).toHaveLength(2);
            expect(plan.segments[0].toothScope).toContain('36');
            expect(plan.segments[0].toothScope).toContain('37');
            expect(plan.segments[1].toothScope).toContain('36');
            expect(plan.segments[1].toothScope).toContain('37');
        });
    });

    describe('D) Context preserves all input fields', () => {
        it('should preserve insuranceType in context', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: 'Füllung 36',
                insuranceType: 'PKV',
            });

            expect(plan.context.insuranceType).toBe('PKV');
        });

        it('should preserve textLength in context', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: 'Füllung 36',
                textLength: 'lang',
            });

            expect(plan.context.textLength).toBe('lang');
        });

        it('should preserve hasMKV in context', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: 'Füllung 36',
                hasMKV: true,
            });

            expect(plan.context.hasMKV).toBe(true);
        });

        it('should preserve userDefaults in context', () => {
            const userDefaults = {
                fuellung: { isolation: 'kofferdam' },
                endo: { spuelung: 'naocl' },
            };

            const plan = segmentDictation({
                ...baseInput,
                dictation: 'Füllung 36',
                userDefaults,
            });

            expect(plan.context.userDefaults).toEqual(userDefaults);
        });

        it('should preserve sessionId in context', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: 'Füllung 36',
                sessionId: 'custom-session-123',
            });

            expect(plan.context.sessionId).toBe('custom-session-123');
        });
    });

    describe('E) Deterministic: same input => identical plan', () => {
        it('should produce identical plans for identical inputs', () => {
            const input: SegmentDictationInput = {
                dictation: 'Wurzelbehandlung 36 dann Füllung 37',
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                sessionId: 'deterministic-test',
            };

            const plan1 = segmentDictation(input);
            const plan2 = segmentDictation(input);

            // Compare segment structure (excluding Map which can't be JSON serialized)
            expect(plan1.segments.length).toBe(plan2.segments.length);
            expect(plan1.segments[0].id).toBe(plan2.segments[0].id);
            expect(plan1.segments[0].treatmentId).toBe(plan2.segments[0].treatmentId);
            expect(plan1.segments[1].id).toBe(plan2.segments[1].id);
            expect(plan1.segments[1].treatmentId).toBe(plan2.segments[1].treatmentId);
            expect(plan1.context.sessionId).toBe(plan2.context.sessionId);
            expect(plan1.executionOrder).toBe(plan2.executionOrder);
        });

        it('should produce stable segment IDs', () => {
            const input: SegmentDictationInput = {
                ...baseInput,
                dictation: 'Endo 36 Füllung 37',
            };

            // Run 3 times to ensure stability
            const plans = [
                segmentDictation(input),
                segmentDictation(input),
                segmentDictation(input),
            ];

            const allIds = plans.map(p => p.segments.map(s => s.id).join(','));
            expect(new Set(allIds).size).toBe(1); // All identical
        });
    });

    describe('F) Safety fallback: empty/unknown => 1 segment fuellung', () => {
        it('should fallback to fuellung for empty dictation', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: '',
            });

            expect(plan.segments).toHaveLength(1);
            expect(plan.segments[0].treatmentId).toBe('fuellung');
            expect(plan.segments[0].id).toBe('seg-1');
        });

        it('should fallback to fuellung for unknown keywords', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: 'Hallo Patient hat Schmerzen',
            });

            expect(plan.segments).toHaveLength(1);
            expect(plan.segments[0].treatmentId).toBe('fuellung');
        });

        it('should fallback to fuellung for whitespace-only dictation', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: '   \n\t  ',
            });

            expect(plan.segments).toHaveLength(1);
            expect(plan.segments[0].treatmentId).toBe('fuellung');
        });
    });

    describe('G) Tooth extraction', () => {
        it('should extract single tooth', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: 'Füllung 36 mod',
            });

            expect(plan.segments[0].toothScope).toEqual(['36']);
            expect(plan.segments[0].extracted.tooth).toBe('36');
        });

        it('should extract multiple teeth', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: 'Füllung 36 37 38 mod',
            });

            expect(plan.segments[0].toothScope).toContain('36');
            expect(plan.segments[0].toothScope).toContain('37');
            expect(plan.segments[0].toothScope).toContain('38');
            // Multiple teeth => tooth should be null
            expect(plan.segments[0].extracted.tooth).toBeNull();
        });

        it('should deduplicate teeth', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: 'Füllung 36 36 36 mod',
            });

            expect(plan.segments[0].toothScope).toEqual(['36']);
        });
    });

    describe('H) Execution order', () => {
        it('should set executionOrder to sequential', () => {
            const plan = segmentDictation({
                ...baseInput,
                dictation: 'Endo 36 Füllung 37',
            });

            expect(plan.executionOrder).toBe('sequential');
        });
    });
});
