/**
 * Gate: MultiInstance candidates come from extraction (SSOT)
 * 
 * Verifies that:
 * 1. stubExtractor extracts all teeth into teeth[] array
 * 2. Teeth are unique and sorted
 * 3. Primary tooth is set correctly
 * 4. Deciduous teeth are filtered correctly
 * 
 * P14.X GIGAPROMPT 1: Extraction Teeth SSOT
 */

import { describe, it, expect } from 'vitest';
import { stubExtractFromDictation } from '../../v7/pipeline/__test__/stubExtractor';

describe('Gate: MultiInstance Extraction SSOT', () => {
    describe('stubExtractor teeth[] extraction', () => {
        it('should extract multiple teeth into teeth[] array', () => {
            const result = stubExtractFromDictation(
                'Zahn 16 mod Karies, Zahn 15 mo Karies',
                'fuellung'
            );

            expect(result.teeth).toBeDefined();
            expect(result.teeth).toContain('16');
            expect(result.teeth).toContain('15');
            expect(result.teeth?.length).toBe(2);
        });

        it('should sort teeth numerically', () => {
            const result = stubExtractFromDictation(
                'Zahn 36 Karies, Zahn 15 Karies, Zahn 26 Karies',
                'fuellung'
            );

            expect(result.teeth).toBeDefined();
            expect(result.teeth).toEqual(['15', '26', '36']);
        });

        it('should deduplicate teeth', () => {
            const result = stubExtractFromDictation(
                'Zahn 16 mod, Zahn 16 nochmal erwähnt, Zahn 15 auch',
                'fuellung'
            );

            expect(result.teeth).toContain('16');
            expect(result.teeth).toContain('15');
            // Count 16 occurrences - should be 1 (unique)
            const count16 = result.teeth?.filter(t => t === '16').length;
            expect(count16).toBe(1);
        });

        it('should set primary tooth as first extracted', () => {
            const result = stubExtractFromDictation(
                'Zahn 15 mo, Zahn 16 mod',
                'fuellung'
            );

            // After sorting: ['15', '16'], so primary should be '15'
            expect(result.tooth).toBe('15');
        });

        it('should handle single tooth correctly', () => {
            const result = stubExtractFromDictation(
                'Zahn 16 mod Karies',
                'fuellung'
            );

            expect(result.tooth).toBe('16');
            expect(result.teeth).toEqual(['16']);
        });

        it('should return empty array for no teeth', () => {
            const result = stubExtractFromDictation(
                'Prophylaxe durchgeführt',
                'pzr'
            );

            expect(result.tooth).toBeNull();
            expect(result.teeth).toEqual([]);
        });

        it('should extract teeth with Zahn prefix', () => {
            const result = stubExtractFromDictation(
                'Bei Zahn 16 und Zahn 15 wurde Füllung gelegt',
                'fuellung'
            );

            expect(result.teeth).toContain('16');
            expect(result.teeth).toContain('15');
        });

        it('should extract teeth without Zahn prefix (FDI notation)', () => {
            const result = stubExtractFromDictation(
                '16 mod, 15 mo',
                'fuellung'
            );

            expect(result.teeth).toContain('16');
            expect(result.teeth).toContain('15');
        });

        it('should validate FDI format (reject invalid numbers)', () => {
            const result = stubExtractFromDictation(
                'Zahn 99 invalid, Zahn 16 valid',
                'fuellung'
            );

            // 99 is not valid FDI (8x8 max)
            expect(result.teeth).not.toContain('99');
            expect(result.teeth).toContain('16');
        });
    });

    describe('deciduous teeth handling', () => {
        it('should include deciduous teeth in extraction', () => {
            const result = stubExtractFromDictation(
                'Zahn 55 Karies bei Kind',
                'fuellung'
            );

            // Deciduous tooth IS extracted (pipeline handles unsupported state separately)
            expect(result.teeth).toContain('55');
            expect(result.tooth).toBe('55');
        });

        it('should extract mixed permanent and deciduous teeth', () => {
            const result = stubExtractFromDictation(
                'Zahn 16 und Milchzahn 55',
                'fuellung'
            );

            // Both are extracted - UI filters deciduous for multi-instance
            expect(result.teeth).toContain('16');
            expect(result.teeth).toContain('55');
        });
    });

    describe('determinism', () => {
        it('should produce identical results for same input', () => {
            const dictation = 'Zahn 36 mod, Zahn 15 mo, Zahn 26 od';

            const result1 = stubExtractFromDictation(dictation, 'fuellung');
            const result2 = stubExtractFromDictation(dictation, 'fuellung');

            expect(result1.teeth).toEqual(result2.teeth);
            expect(result1.tooth).toEqual(result2.tooth);
        });
    });
});
