/**
 * V10 testOnly Fixtures
 *
 * Test-only fixture injection for V10 pipeline.
 * Only active when:
 * - import.meta.env.MODE === 'test'
 * - input.testOnly?.enabled === true
 *
 * Allows tests to override:
 * - extraction result
 * - answers
 * - chips
 * - skipCombinability
 */

import type { V10TestOnlyOptions } from '../types';

// ═══════════════════════════════════════════════════════════════
// TEST MODE CHECK
// ═══════════════════════════════════════════════════════════════

/**
 * Check if we're in test mode.
 */
export function isTestMode(): boolean {
    // Node/test environment
    if (typeof process !== 'undefined' && process.env) {
        if (process.env.NODE_ENV === 'test') return true;
        if (process.env.VITEST === 'true') return true;
    }
    // Browser environment
    if (typeof window !== 'undefined') {
        try {
            if ((import.meta as any)?.env?.MODE === 'test') return true;
        } catch {
            // Ignore
        }
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════
// FIXTURE APPLICATION
// ═══════════════════════════════════════════════════════════════

export interface TestOnlyOverrides {
    /** Whether any overrides were applied */
    applied: boolean;
    /** List of override types applied (for trace) */
    appliedTypes: string[];
    /** Forced extraction result */
    extraction?: Record<string, unknown>;
    /** Forced answers */
    answers?: Map<string, unknown>;
    /** Forced chips */
    chips?: string[];
    /** Skip combinability check */
    skipCombinability: boolean;
    /** M62: User settings (e.g., defaultCappingMaterial) */
    settings?: Record<string, unknown>;
}

/**
 * Get testOnly overrides from input.
 *
 * Returns overrides only if:
 * 1. We're in test mode, OR
 * 2. testOnly.enabled is explicitly true
 *
 * @param testOnly - testOnly options from input
 * @returns Overrides to apply
 */
export function getTestOnlyOverrides(
    testOnly?: V10TestOnlyOptions
): TestOnlyOverrides {
    // Check if testOnly should be active
    const active = isTestMode() || testOnly?.enabled === true;

    if (!active || !testOnly) {
        return {
            applied: false,
            appliedTypes: [],
            skipCombinability: false,
        };
    }

    const appliedTypes: string[] = [];

    if (testOnly.forceExtraction) {
        appliedTypes.push('extraction');
    }
    if (testOnly.forceAnswers) {
        appliedTypes.push('answers');
    }
    if (testOnly.forceChips) {
        appliedTypes.push('chips');
    }
    if (testOnly.skipCombinability) {
        appliedTypes.push('skipCombinability');
    }
    if (testOnly.settings || (testOnly as { userSettings?: unknown }).userSettings) {
        appliedTypes.push('settings');
    }

    const rawSettings = testOnly.settings
        ?? (testOnly as { userSettings?: Record<string, unknown> }).userSettings;

    return {
        applied: appliedTypes.length > 0,
        appliedTypes,
        extraction: testOnly.forceExtraction,
        answers: testOnly.forceAnswers instanceof Map
            ? testOnly.forceAnswers
            : testOnly.forceAnswers
                ? new Map(Object.entries(testOnly.forceAnswers))
                : undefined,
        chips: testOnly.forceChips,
        skipCombinability: testOnly.skipCombinability ?? false,
        settings: rawSettings,
    };
}
