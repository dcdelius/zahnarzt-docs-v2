/**
 * Unit Tests for fzCode.ts
 */
import { describe, it, expect } from 'vitest';
import { parseFzCode, extractBk, isValidFzCode, FZ_CODE_PATTERN } from '../core/billing/knowledgeBase/logic/fzCode';

describe('fzCode', () => {
    describe('parseFzCode', () => {
        describe('valid cases', () => {
            it('FZ_1.1 → bk "1", code "1.1"', () => {
                const result = parseFzCode('FZ_1.1');
                expect(result.isValid).toBe(true);
                expect(result.bk).toBe('1');
                expect(result.code).toBe('1.1');
            });

            it('FZ_6.8.1 → bk "6", code "6.8.1"', () => {
                const result = parseFzCode('FZ_6.8.1');
                expect(result.isValid).toBe(true);
                expect(result.bk).toBe('6');
                expect(result.code).toBe('6.8.1');
            });

            it('FZ_3.2a → bk "3", code "3.2a"', () => {
                const result = parseFzCode('FZ_3.2a');
                expect(result.isValid).toBe(true);
                expect(result.bk).toBe('3');
                expect(result.code).toBe('3.2a');
            });

            it('FZ_7.2 → bk "7", code "7.2"', () => {
                const result = parseFzCode('FZ_7.2');
                expect(result.isValid).toBe(true);
                expect(result.bk).toBe('7');
                expect(result.code).toBe('7.2');
            });

            it('FZ_4.1 → bk "4", code "4.1"', () => {
                const result = parseFzCode('FZ_4.1');
                expect(result.isValid).toBe(true);
                expect(result.bk).toBe('4');
                expect(result.code).toBe('4.1');
            });

            it('FZ_5.2 → bk "5", code "5.2"', () => {
                const result = parseFzCode('FZ_5.2');
                expect(result.isValid).toBe(true);
                expect(result.bk).toBe('5');
                expect(result.code).toBe('5.2');
            });
        });

        describe('invalid cases', () => {
            it('FZ_ (empty after prefix) → isValid false', () => {
                const result = parseFzCode('FZ_');
                expect(result.isValid).toBe(false);
                expect(result.bk).toBeNull();
                expect(result.code).toBeNull();
            });

            it('FZ_6..8 (double dot) → isValid false', () => {
                const result = parseFzCode('FZ_6..8');
                expect(result.isValid).toBe(false);
                expect(result.bk).toBeNull();
                expect(result.code).toBeNull();
            });

            it('FZ_6.8.a (letter in middle) → isValid false', () => {
                const result = parseFzCode('FZ_6.8.a');
                expect(result.isValid).toBe(false);
                expect(result.bk).toBeNull();
                expect(result.code).toBeNull();
            });

            it('6.8 (missing prefix) → isValid false', () => {
                const result = parseFzCode('6.8');
                expect(result.isValid).toBe(false);
                expect(result.bk).toBeNull();
                expect(result.code).toBeNull();
            });

            it('empty string → isValid false', () => {
                const result = parseFzCode('');
                expect(result.isValid).toBe(false);
                expect(result.bk).toBeNull();
                expect(result.code).toBeNull();
            });

            it('FZ_abc (no digits) → isValid false', () => {
                const result = parseFzCode('FZ_abc');
                expect(result.isValid).toBe(false);
                expect(result.bk).toBeNull();
                expect(result.code).toBeNull();
            });

            it('FZ_1.2AB (uppercase letters) → isValid false', () => {
                const result = parseFzCode('FZ_1.2AB');
                expect(result.isValid).toBe(false);
                expect(result.bk).toBeNull();
                expect(result.code).toBeNull();
            });
        });
    });

    describe('extractBk', () => {
        it('returns BK for valid codes', () => {
            expect(extractBk('FZ_1.1')).toBe('1');
            expect(extractBk('FZ_6.8.1')).toBe('6');
            expect(extractBk('FZ_3.2a')).toBe('3');
        });

        it('returns null for invalid codes', () => {
            expect(extractBk('invalid')).toBeNull();
            expect(extractBk('6.8')).toBeNull();
            expect(extractBk('')).toBeNull();
        });
    });

    describe('isValidFzCode', () => {
        it('returns true for valid codes', () => {
            expect(isValidFzCode('FZ_1.1')).toBe(true);
            expect(isValidFzCode('FZ_6.8.1')).toBe(true);
            expect(isValidFzCode('FZ_3.2a')).toBe(true);
        });

        it('returns false for invalid codes', () => {
            expect(isValidFzCode('invalid')).toBe(false);
            expect(isValidFzCode('FZ_')).toBe(false);
            expect(isValidFzCode('6.8')).toBe(false);
        });
    });

    describe('FZ_CODE_PATTERN', () => {
        it('is exported and usable', () => {
            expect(FZ_CODE_PATTERN).toBeInstanceOf(RegExp);
            expect(FZ_CODE_PATTERN.test('FZ_1.1')).toBe(true);
        });
    });
});
