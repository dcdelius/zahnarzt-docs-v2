/**
 * M31: Clinical Assertions — Helper library for clinical truthcase testing
 * 
 * Provides structured assertions for:
 * - Askback exactness (with scope awareness)
 * - Chip include/exclude  
 * - Billing include/exclude
 * - False positive protection
 * - Text content validation
 */

import type { V10PipelineOutput } from '../types';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AssertionResult {
    passed: boolean;
    failures: string[];
}

export interface ClinicalTruthcaseV2 {
    /** Unique identifier */
    id: string;

    /** Treatment type */
    treatmentId: string;

    /** Single or multi-tooth mode */
    mode: 'single' | 'multi';

    /** Instance configuration for multi-mode */
    instances?: Array<{ tooth: string; dictation?: string }>;

    /** Free-form dictation (German, messy allowed) */
    dictation: string;

    /** Insurance type */
    insuranceType?: 'GKV' | 'PKV' | 'MKV';

    /** Expected outcomes */
    expected: {
        /** Expected pipeline state */
        state: 'output' | 'questions' | 'error';

        /** Expected askback IDs (exact match) */
        askbacks?: string[];

        /** Scoped askbacks per tooth (for multi-mode) */
        scopedAskbacks?: Record<string, string[]>;

        /** Chips that must be present */
        chipsInclude?: string[];

        /** Chips that must NOT be present */
        chipsExclude?: string[];

        /** Billing codes that must be present */
        billingInclude?: string[];

        /** Billing codes that must NOT be present */
        billingExclude?: string[];

        /** Text phrases that must be in output */
        textContains?: string[];

        /** Text phrases that must NOT be in output */
        textNotContains?: string[];

        /** No placeholders like {var} allowed */
        noPlaceholders?: boolean;

        /** False positives that must NOT trigger */
        noFalsePositives?: {
            askbacks?: string[];
            chips?: string[];
            billing?: string[];
        };
    };

    /** Description for debugging */
    description?: string;

    /** Category for grouping */
    category?: 'profunda' | 'vipr' | 'la' | 'isolation' | 'wl' | 'wf' | 'spuelung' | 'roentgen' | 'multi' | 'negation' | 'false_positive';
}

// ═══════════════════════════════════════════════════════════════
// ASSERTION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Assert expected askbacks match result exactly.
 */
export function expectAskbacksExact(
    result: V10PipelineOutput,
    expectedIds: string[],
    scopeAware: boolean = false
): AssertionResult {
    const failures: string[] = [];

    const actualAskbacks = result.questions?.map(q => q.id) || [];

    // Check for missing expected
    for (const expected of expectedIds) {
        if (!actualAskbacks.includes(expected)) {
            failures.push(`Missing askback: ${expected}`);
        }
    }

    // Check for unexpected (only if not scope aware)
    if (!scopeAware) {
        for (const actual of actualAskbacks) {
            if (!expectedIds.includes(actual)) {
                failures.push(`Unexpected askback: ${actual}`);
            }
        }
    }

    return { passed: failures.length === 0, failures };
}

/**
 * Assert chips include/exclude constraints.
 */
export function expectChipsIncludeExclude(
    result: V10PipelineOutput,
    include: string[],
    exclude: string[]
): AssertionResult {
    const failures: string[] = [];

    const actualChips = result.trace?.allChips || result.trace?.instances?.[0]?.chips || [];

    for (const chip of include) {
        if (!actualChips.includes(chip)) {
            failures.push(`Missing chip: ${chip}`);
        }
    }

    for (const chip of exclude) {
        if (actualChips.includes(chip)) {
            failures.push(`Forbidden chip present: ${chip}`);
        }
    }

    return { passed: failures.length === 0, failures };
}

/**
 * Assert billing codes include/exclude constraints.
 */
export function expectBillingIncludeExclude(
    result: V10PipelineOutput,
    include: string[],
    exclude: string[]
): AssertionResult {
    const failures: string[] = [];

    const actualCodes = result.output?.billingCodes || [];

    for (const code of include) {
        if (!actualCodes.includes(code)) {
            failures.push(`Missing billing code: ${code}`);
        }
    }

    for (const code of exclude) {
        if (actualCodes.includes(code)) {
            failures.push(`Forbidden billing code present: ${code}`);
        }
    }

    return { passed: failures.length === 0, failures };
}

/**
 * Assert no false positives for askbacks, chips, or billing.
 */
export function expectNoFalsePositive(
    result: V10PipelineOutput,
    forbidden: {
        askbacks?: string[];
        chips?: string[];
        billing?: string[];
    }
): AssertionResult {
    const failures: string[] = [];

    const actualAskbacks = result.questions?.map(q => q.id) || [];
    const actualChips = result.trace?.allChips || [];
    const actualBilling = result.output?.billingCodes || [];

    for (const id of forbidden.askbacks || []) {
        if (actualAskbacks.includes(id)) {
            failures.push(`False positive askback: ${id}`);
        }
    }

    for (const chip of forbidden.chips || []) {
        if (actualChips.includes(chip)) {
            failures.push(`False positive chip: ${chip}`);
        }
    }

    for (const code of forbidden.billing || []) {
        if (actualBilling.includes(code)) {
            failures.push(`False positive billing: ${code}`);
        }
    }

    return { passed: failures.length === 0, failures };
}

/**
 * Assert text contains all required phrases.
 */
export function expectTextContainsAll(
    result: V10PipelineOutput,
    phrases: string[]
): AssertionResult {
    const failures: string[] = [];

    const text = result.output?.fullText || '';

    for (const phrase of phrases) {
        if (!text.toLowerCase().includes(phrase.toLowerCase())) {
            failures.push(`Missing text phrase: "${phrase}"`);
        }
    }

    return { passed: failures.length === 0, failures };
}

/**
 * Assert text does NOT contain forbidden phrases.
 */
export function expectTextNotContains(
    result: V10PipelineOutput,
    phrases: string[]
): AssertionResult {
    const failures: string[] = [];

    const text = result.output?.fullText || '';

    for (const phrase of phrases) {
        if (text.toLowerCase().includes(phrase.toLowerCase())) {
            failures.push(`Forbidden text phrase present: "${phrase}"`);
        }
    }

    return { passed: failures.length === 0, failures };
}

/**
 * Assert no placeholders like {var} in output.
 */
export function expectNoPlaceholders(result: V10PipelineOutput): AssertionResult {
    const failures: string[] = [];

    const text = result.output?.fullText || '';
    const placeholderMatch = text.match(/\{[^}]+\}/g);

    if (placeholderMatch) {
        failures.push(`Placeholders found: ${placeholderMatch.join(', ')}`);
    }

    return { passed: failures.length === 0, failures };
}

// ═══════════════════════════════════════════════════════════════
// COMBINED RUNNER
// ═══════════════════════════════════════════════════════════════

/**
 * Run all assertions for a truthcase.
 */
export function runTruthcaseAssertions(
    truthcase: ClinicalTruthcaseV2,
    result: V10PipelineOutput
): AssertionResult {
    const allFailures: string[] = [];

    const { expected } = truthcase;

    // State assertion
    if (result.state !== expected.state) {
        allFailures.push(`Expected state ${expected.state}, got ${result.state}`);
    }

    // Askbacks
    if (expected.askbacks) {
        const r = expectAskbacksExact(result, expected.askbacks);
        allFailures.push(...r.failures);
    }

    // Chips
    if (expected.chipsInclude || expected.chipsExclude) {
        const r = expectChipsIncludeExclude(
            result,
            expected.chipsInclude || [],
            expected.chipsExclude || []
        );
        allFailures.push(...r.failures);
    }

    // Billing
    if (expected.billingInclude || expected.billingExclude) {
        const r = expectBillingIncludeExclude(
            result,
            expected.billingInclude || [],
            expected.billingExclude || []
        );
        allFailures.push(...r.failures);
    }

    // Text
    if (expected.textContains) {
        const r = expectTextContainsAll(result, expected.textContains);
        allFailures.push(...r.failures);
    }

    if (expected.textNotContains) {
        const r = expectTextNotContains(result, expected.textNotContains);
        allFailures.push(...r.failures);
    }

    // Placeholders
    if (expected.noPlaceholders) {
        const r = expectNoPlaceholders(result);
        allFailures.push(...r.failures);
    }

    // False positives
    if (expected.noFalsePositives) {
        const r = expectNoFalsePositive(result, expected.noFalsePositives);
        allFailures.push(...r.failures);
    }

    return {
        passed: allFailures.length === 0,
        failures: allFailures,
    };
}
