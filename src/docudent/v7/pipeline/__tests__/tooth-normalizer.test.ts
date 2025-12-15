/**
 * Tooth Normalizer Tests
 * 
 * Verifies currency amounts are NOT mangled by tooth number normalization.
 */

import { describe, it, expect } from 'vitest';
import { normalizeToothInText, extractToothNumber } from '../../../v6/services/toothNormalizer';

describe('Tooth Normalizer', () => {
    describe('normalizeToothInText', () => {
        it('should preserve 120€ (not mangle to 12€)', () => {
            const input = '36 mod tief 120€';
            const result = normalizeToothInText(input);

            expect(result).toContain('120€');
            expect(result).not.toContain('12€');
        });

        it('should preserve "120 EUR"', () => {
            const input = '36 mod 120 EUR';
            const result = normalizeToothInText(input);

            expect(result).toContain('120');
            expect(result).not.toMatch(/\b12\b.*EUR/);
        });

        it('should preserve "120 euro"', () => {
            const input = '36 mod 120 euro';
            const result = normalizeToothInText(input);

            expect(result).toContain('120');
        });

        it('should still fix Whisper error 110 → 11 when not currency', () => {
            const input = '110 mod tief'; // Whisper transcribed "elf" as "110"
            const result = normalizeToothInText(input);

            expect(result).toMatch(/\b11\b/);
        });

        it('should preserve 36 as tooth number', () => {
            const input = '36 mod tief 120€';
            const result = normalizeToothInText(input);

            expect(result).toContain('36');
        });

        it('should normalize German word "sechsunddreißig" to 36', () => {
            const input = 'sechsunddreißig mod tief';
            const result = normalizeToothInText(input);

            expect(result).toContain('36');
        });
    });

    describe('extractToothNumber', () => {
        it('should extract 36 from "36 mod tief 120€"', () => {
            const result = extractToothNumber('36 mod tief 120€');
            expect(result).toBe('36');
        });

        it('should extract 36 from "sechsunddreißig"', () => {
            const result = extractToothNumber('sechsunddreißig mod');
            expect(result).toBe('36');
        });

        it('should not extract 12 from 120€', () => {
            const result = extractToothNumber('mod 120€');
            // After fix: 120€ should not match the Whisper-error pattern
            // Since 120 is not a valid FDI, it should return null
            expect(result).toBeNull();
        });
    });
});
