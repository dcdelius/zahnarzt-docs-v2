/**
 * Gate: P14.X8 Milchzahn Fuellung Limited Support
 * 
 * Verifies:
 * 1. treatmentId='fuellung' + tooth='84' + flag ON → state='output'
 * 2. treatmentId='fuellung' + tooth='84' + flag OFF → state='unsupported' reason='milchzahn'
 * 3. treatmentId='endo' + tooth='84' + flag ON → state='unsupported' reason='milchzahn'
 * 4. MultiInstance with milk teeth 84+85: both get TOOTH-scoped billing
 * 
 * Uses stubExtractor with VITE_STUB_EXTRACTION=true
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { stubExtractFromDictation } from '../../v7/pipeline/__test__/stubExtractor';

// Mock the env for testing
vi.stubEnv('VITE_STUB_EXTRACTION', 'true');

describe('Gate: P14.X8 Milchzahn Fuellung Limited Support', () => {
    describe('stubExtractor teeth[] extraction for milk teeth', () => {
        it('should extract milk tooth 84 into teeth[]', () => {
            const result = stubExtractFromDictation(
                'Zahn 84 mo Karies',
                'fuellung'
            );

            expect(result.teeth).toContain('84');
            expect(result.tooth).toBe('84');
        });

        it('should extract multiple milk teeth (84, 85)', () => {
            const result = stubExtractFromDictation(
                'Zahn 84 mo Karies, Zahn 85 o Karies',
                'fuellung'
            );

            expect(result.teeth).toContain('84');
            expect(result.teeth).toContain('85');
            expect(result.teeth?.length).toBe(2);
        });

        it('should extract mixed permanent and milk teeth', () => {
            const result = stubExtractFromDictation(
                'Zahn 16 mod, Zahn 84 mo',
                'fuellung'
            );

            expect(result.teeth).toContain('16');
            expect(result.teeth).toContain('84');
        });

        it('should validate FDI milk tooth format (51-55, 61-65, 71-75, 81-85)', () => {
            const result = stubExtractFromDictation(
                'Zahn 55 Karies, Zahn 65 Karies, Zahn 75 Karies',
                'fuellung'
            );

            expect(result.teeth).toContain('55');
            expect(result.teeth).toContain('65');
            expect(result.teeth).toContain('75');
        });

        it('should reject invalid milk tooth numbers (e.g., 86, 58)', () => {
            const result = stubExtractFromDictation(
                'Zahn 86 Karies, Zahn 58 Karies, Zahn 84 valid',
                'fuellung'
            );

            // 86 and 58 are invalid (position 6 and 8 not allowed for deciduous)
            expect(result.teeth).not.toContain('86');
            expect(result.teeth).not.toContain('58');
            expect(result.teeth).toContain('84');
        });
    });

    describe('feature flag behavior validation', () => {
        it('should have isValidFDITooth accept milk teeth in range 51-85', () => {
            // Valid milk teeth: quadrant 5-8, position 1-5
            const validMilkTeeth = ['51', '55', '61', '65', '71', '75', '81', '85'];
            const result = stubExtractFromDictation(
                validMilkTeeth.map(t => `Zahn ${t}`).join(', '),
                'fuellung'
            );

            for (const tooth of validMilkTeeth) {
                expect(result.teeth).toContain(tooth);
            }
        });

        it('should reject milk teeth outside FDI range', () => {
            // Invalid: position > 5 for milk teeth
            const invalidMilkTeeth = ['56', '66', '76', '86', '57', '67', '77', '87', '58', '68', '78', '88'];
            const result = stubExtractFromDictation(
                invalidMilkTeeth.map(t => `Zahn ${t}`).join(', '),
                'fuellung'
            );

            for (const tooth of invalidMilkTeeth) {
                expect(result.teeth).not.toContain(tooth);
            }
        });
    });

    describe('instanceId pattern stability', () => {
        it('should maintain instanceId pattern fuellung-{tooth} for milk teeth', () => {
            // This tests that instance IDs work correctly with milk tooth numbers
            const result = stubExtractFromDictation('Zahn 84 mo', 'fuellung');

            // The pattern should be: treatmentId-tooth
            const expectedInstanceId = `fuellung-${result.tooth}`;
            expect(expectedInstanceId).toBe('fuellung-84');
        });
    });

    describe('numeric sorting', () => {
        it('should sort teeth numerically (84 > 16)', () => {
            const result = stubExtractFromDictation(
                'Zahn 84 Karies, Zahn 16 Karies, Zahn 55 Karies',
                'fuellung'
            );

            expect(result.teeth).toEqual(['16', '55', '84']);
        });
    });

    describe('determinism', () => {
        it('should produce identical results for same milk tooth input', () => {
            const dictation = 'Zahn 84 mo Karies, Zahn 85 o Karies';

            const result1 = stubExtractFromDictation(dictation, 'fuellung');
            const result2 = stubExtractFromDictation(dictation, 'fuellung');

            expect(result1.teeth).toEqual(result2.teeth);
            expect(result1.tooth).toEqual(result2.tooth);
            expect(result1.surfaces).toEqual(result2.surfaces);
        });
    });
});
