/**
 * Tooth Normalizer Tests
 * 
 * Tests per Masterplan V3: Normalisierung von Zahnnummern
 */

import { describe, it, expect } from 'vitest';
import {
    extractToothNumber,
    normalizeToothInText,
    isValidFDI,
    getToothQuadrant,
    requiresLeitungsanaesthesie
} from '../docudent/v6/services/toothNormalizer';

describe('ToothNormalizer', () => {

    describe('isValidFDI', () => {
        it('should accept valid FDI teeth', () => {
            // All quadrants
            expect(isValidFDI(11)).toBe(true);
            expect(isValidFDI(18)).toBe(true);
            expect(isValidFDI(21)).toBe(true);
            expect(isValidFDI(28)).toBe(true);
            expect(isValidFDI(31)).toBe(true);
            expect(isValidFDI(38)).toBe(true);
            expect(isValidFDI(41)).toBe(true);
            expect(isValidFDI(48)).toBe(true);
        });

        it('should reject invalid FDI teeth', () => {
            expect(isValidFDI(19)).toBe(false);  // No 9 position
            expect(isValidFDI(10)).toBe(false);  // No 0 position
            expect(isValidFDI(39)).toBe(false);
            expect(isValidFDI(50)).toBe(false);  // No quadrant 5
            expect(isValidFDI(0)).toBe(false);
            expect(isValidFDI(99)).toBe(false);
        });
    });

    describe('extractToothNumber', () => {
        describe('German word numbers', () => {
            it('should parse "elf" → 11', () => {
                expect(extractToothNumber('Zahn elf')).toBe('11');
            });

            it('should parse "sechsunddreißig" → 36', () => {
                expect(extractToothNumber('Füllung sechsunddreißig')).toBe('36');
            });

            it('should parse "fünfzehn" → 15', () => {
                expect(extractToothNumber('Zahn fünfzehn mod')).toBe('15');
            });

            it('should parse "achtundvierzig" → 48', () => {
                expect(extractToothNumber('achtundvierzig')).toBe('48');
            });
        });

        describe('Spoken pairs', () => {
            it('should parse "eins eins" → 11', () => {
                expect(extractToothNumber('Zahn eins eins')).toBe('11');
            });

            it('should parse "drei sechs" → 36', () => {
                expect(extractToothNumber('drei sechs mod')).toBe('36');
            });

            it('should parse "vier acht" → 48', () => {
                expect(extractToothNumber('Zahn vier acht')).toBe('48');
            });
        });

        describe('Whisper errors', () => {
            it('should fix "110" → 11', () => {
                expect(extractToothNumber('Zahn 110')).toBe('11');
            });

            it('should fix "360" → 36', () => {
                expect(extractToothNumber('Füllung 360')).toBe('36');
            });

            it('should fix "3-6" → 36', () => {
                expect(extractToothNumber('Zahn 3-6')).toBe('36');
            });

            it('should fix "36a" → 36', () => {
                expect(extractToothNumber('Zahn 36a')).toBe('36');
            });
        });

        describe('Direct numeric', () => {
            it('should parse "36" directly', () => {
                expect(extractToothNumber('36 mod')).toBe('36');
            });

            it('should parse "15" directly', () => {
                expect(extractToothNumber('Zahn 15 ob')).toBe('15');
            });
        });

        describe('Invalid inputs', () => {
            it('should return null for "19"', () => {
                expect(extractToothNumber('Zahn 19')).toBe(null);
            });

            it('should return null for "39"', () => {
                expect(extractToothNumber('Zahn 39')).toBe(null);
            });

            it('should return null for no tooth', () => {
                expect(extractToothNumber('Füllung mod tief')).toBe(null);
            });
        });
    });

    describe('normalizeToothInText', () => {
        it('should normalize German words in text', () => {
            const result = normalizeToothInText('Füllung sechsunddreißig mod');
            expect(result).toContain('36');
            expect(result).not.toContain('sechsunddreißig');
        });

        it('should normalize spoken pairs in text', () => {
            const result = normalizeToothInText('Zahn drei sechs mod');
            expect(result).toContain('36');
        });

        it('should fix Whisper errors in text', () => {
            const result = normalizeToothInText('Zahn 110 ob');
            expect(result).toContain('11');
            expect(result).not.toContain('110');
        });

        it('should preserve non-tooth content', () => {
            const result = normalizeToothInText('36 mod Anästhesie Kofferdam');
            expect(result).toContain('mod');
            expect(result).toContain('Anästhesie');
            expect(result).toContain('Kofferdam');
        });
    });

    describe('getToothQuadrant', () => {
        it('should identify UK Molaren', () => {
            const info36 = getToothQuadrant('36');
            expect(info36?.isUK).toBe(true);
            expect(info36?.isMolar).toBe(true);

            const info48 = getToothQuadrant('48');
            expect(info48?.isUK).toBe(true);
            expect(info48?.isMolar).toBe(true);
        });

        it('should identify OK Frontzähne', () => {
            const info11 = getToothQuadrant('11');
            expect(info11?.isUK).toBe(false);
            expect(info11?.isAnterior).toBe(true);
        });

        it('should return null for invalid teeth', () => {
            expect(getToothQuadrant('19')).toBe(null);
            expect(getToothQuadrant('abc')).toBe(null);
        });
    });

    describe('requiresLeitungsanaesthesie', () => {
        it('should return true for UK Molaren', () => {
            expect(requiresLeitungsanaesthesie('36')).toBe(true);
            expect(requiresLeitungsanaesthesie('37')).toBe(true);
            expect(requiresLeitungsanaesthesie('38')).toBe(true);
            expect(requiresLeitungsanaesthesie('46')).toBe(true);
            expect(requiresLeitungsanaesthesie('47')).toBe(true);
            expect(requiresLeitungsanaesthesie('48')).toBe(true);
        });

        it('should return false for OK teeth', () => {
            expect(requiresLeitungsanaesthesie('16')).toBe(false);
            expect(requiresLeitungsanaesthesie('26')).toBe(false);
        });

        it('should return false for UK Frontzähne', () => {
            expect(requiresLeitungsanaesthesie('31')).toBe(false);
            expect(requiresLeitungsanaesthesie('41')).toBe(false);
        });
    });
});
