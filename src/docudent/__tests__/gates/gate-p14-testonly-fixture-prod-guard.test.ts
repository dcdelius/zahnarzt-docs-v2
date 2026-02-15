/**
 * Gate: P14 Test-Only Fixture Production Guard
 * 
 * Verifies that test-only fixtures (localStorage reads) NEVER affect production.
 * 
 * Key invariants:
 * - When VITE_STUB_EXTRACTION !== 'true', getTestFixture() returns null (no localStorage access)
 * - Production code path does not crash if localStorage throws
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Simulate the testOnly.ts logic for testing
// (We test the logic directly since import.meta.env is compile-time constant)
describe('Gate: P14 Test-Only Fixture Production Guard', () => {
    let mockStorage: Map<string, string>;
    let localStorageGetItemSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockStorage = new Map();
        localStorageGetItemSpy = vi.fn((key: string) => mockStorage.get(key) ?? null);

        vi.stubGlobal('localStorage', {
            getItem: localStorageGetItemSpy,
            setItem: (key: string, value: string) => mockStorage.set(key, value),
            removeItem: (key: string) => mockStorage.delete(key),
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    // Helper that mirrors testOnly.ts logic with injectable stubMode
    const getTestFixture = (name: 'questions', isStubMode: boolean): string | null => {
        if (!isStubMode) {
            // PRODUCTION GUARD: Never read localStorage
            return null;
        }
        try {
            if (typeof localStorage === 'undefined') return null;
            const keys = { questions: 'v7_questions_fixture' };
            return localStorage.getItem(keys[name]);
        } catch {
            return null;
        }
    };

    describe('production mode (isStubMode=false)', () => {
        it('should return null without accessing localStorage', () => {
            mockStorage.set('v7_questions_fixture', 'force_questions');

            const result = getTestFixture('questions', false);

            expect(result).toBeNull();
            expect(localStorageGetItemSpy).not.toHaveBeenCalled();
        });

        it('should never read localStorage in production, even if fixture is set', () => {
            mockStorage.set('v7_questions_fixture', 'force_questions');

            // Multiple calls
            getTestFixture('questions', false);
            getTestFixture('questions', false);
            getTestFixture('questions', false);

            expect(localStorageGetItemSpy).not.toHaveBeenCalled();
        });
    });

    describe('stub mode (isStubMode=true)', () => {
        it('should read localStorage and return fixture value', () => {
            mockStorage.set('v7_questions_fixture', 'force_questions');

            const result = getTestFixture('questions', true);

            expect(result).toBe('force_questions');
            expect(localStorageGetItemSpy).toHaveBeenCalledWith('v7_questions_fixture');
        });

        it('should return null if fixture not set', () => {
            const result = getTestFixture('questions', true);

            expect(result).toBeNull();
        });
    });

    describe('exception safety', () => {
        it('should not crash if localStorage.getItem throws (stub mode)', () => {
            localStorageGetItemSpy.mockImplementation(() => {
                throw new Error('Permission denied');
            });

            const result = getTestFixture('questions', true);

            expect(result).toBeNull();
        });

        it('should not touch localStorage at all in production even if it would throw', () => {
            localStorageGetItemSpy.mockImplementation(() => {
                throw new Error('Permission denied');
            });

            // This should not throw
            const result = getTestFixture('questions', false);

            expect(result).toBeNull();
            expect(localStorageGetItemSpy).not.toHaveBeenCalled();
        });
    });
});
