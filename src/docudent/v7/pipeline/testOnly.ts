/**
 * Test-Only Utilities
 * 
 * Provides safe access to test-only behavior that is STRICTLY guarded
 * by VITE_STUB_EXTRACTION. These utilities NEVER affect production.
 * 
 * INVARIANT: In production builds (VITE_STUB_EXTRACTION !== 'true'),
 * these functions return null/false and NEVER access localStorage.
 */

/**
 * Check if we're in stub/test mode.
 * @returns true if VITE_STUB_EXTRACTION === 'true'
 */
export function isStubMode(): boolean {
    return import.meta.env.VITE_STUB_EXTRACTION === 'true';
}

type TestFixture = 'questions';

const FIXTURE_KEYS: Record<TestFixture, string> = {
    questions: 'v7_questions_fixture',
};

/**
 * Get a test fixture value from localStorage.
 * 
 * SAFETY: This function NEVER reads localStorage in production mode.
 * If not in stub mode, it immediately returns null.
 * 
 * @param name - The fixture name
 * @returns The fixture value, or null if:
 *   - Not in stub mode (production guard)
 *   - localStorage not available
 *   - Fixture key not set
 *   - Any exception occurs
 */
export function getTestFixture(name: TestFixture): string | null {
    // PRODUCTION GUARD: Never read localStorage in production
    if (!isStubMode()) {
        return null;
    }

    // STUB MODE: Safe localStorage read with exception handling
    try {
        if (typeof localStorage === 'undefined') {
            return null;
        }
        const key = FIXTURE_KEYS[name];
        if (!key) {
            return null;
        }
        return localStorage.getItem(key);
    } catch {
        // localStorage access failed (SSR, permissions, etc.)
        return null;
    }
}

/**
 * Check if the 'force_questions' fixture is active.
 * Convenience wrapper for the common case.
 */
export function isForceQuestionsFixtureActive(): boolean {
    return getTestFixture('questions') === 'force_questions';
}

/**
 * Check if we're in Live E2E mode.
 * 
 * This mode runs the real extraction path (regex-based, no LLM)
 * without enabling stub fixtures. Used for sanity E2E testing
 * that validates the real pipeline without network dependencies.
 * 
 * @returns true if VITE_V7_E2E_LIVE === '1'
 */
export function isLiveE2EMode(): boolean {
    return import.meta.env.VITE_V7_E2E_LIVE === '1';
}

/**
 * Check if E2E auth bypass is enabled.
 * 
 * This allows E2E tests to bypass the login page and access protected routes
 * directly. Has MULTIPLE safety guards to prevent production leakage:
 * 
 * PRODUCTION GUARD: Always returns false in production mode.
 * 
 * In non-production mode, returns true if ANY of:
 * - VITE_E2E_BYPASS_AUTH === '1' (explicit E2E flag)
 * - isStubMode() === true (stub extraction mode)
 * - isLiveE2EMode() === true (live E2E mode)
 * 
 * IMPORTANT: This function does NOT access localStorage. It uses only
 * compile-time environment variables for maximum safety.
 * 
 * @returns true if auth bypass should be active
 */
export function isE2EAuthBypassEnabled(): boolean {
    // PRODUCTION GUARD: Never bypass auth in production
    if (import.meta.env.MODE === 'production') {
        return false;
    }

    // Check explicit E2E bypass flag
    if (import.meta.env.VITE_E2E_BYPASS_AUTH === '1') {
        return true;
    }

    // Check stub mode (implies E2E testing)
    if (isStubMode()) {
        return true;
    }

    // Check live E2E mode
    if (isLiveE2EMode()) {
        return true;
    }

    return false;
}
