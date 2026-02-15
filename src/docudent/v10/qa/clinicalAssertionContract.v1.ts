/**
 * M32: Clinical Assertion Contract v1
 * 
 * Provides invariant-based assertions that don't rely on exact billing matches.
 * Uses mustHave/mustNotHave patterns for robustness.
 */

import type { V10PipelineOutput } from '../types';

// ═══════════════════════════════════════════════════════════════
// CONTRACT TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Expected askback assertions with mustHave/mustNotHave.
 */
export interface ExpectedAskbacks {
    /** Askback IDs that MUST be present */
    mustHave?: string[];
    /** Askback IDs that MUST NOT be present */
    mustNotHave?: string[];
}

/**
 * Expected chip assertions with mustHave/mustNotHave.
 */
export interface ExpectedChips {
    /** Chip IDs that MUST be present */
    mustHave?: string[];
    /** Chip IDs that MUST NOT be present */
    mustNotHave?: string[];
}

/**
 * Billing invariants - not exact match, but must include/exclude + explainability.
 */
export interface BillingInvariants {
    /** Billing codes that MUST be present (when corresponding chip exists) */
    mustIncludeCodes?: string[];
    /** Billing codes that MUST NOT be present (negations / "ohne") */
    mustNotIncludeCodes?: string[];
    /** If true, every billing code must trace back to a chip */
    mustBeExplainableByChips?: boolean;
}

/**
 * Full clinical contract for a truthcase.
 */
export interface ClinicalContract {
    /** Expected pipeline state */
    expectedState: 'output' | 'questions' | 'error';
    /** Askback expectations */
    askbacks?: ExpectedAskbacks;
    /** Chip expectations */
    chips?: ExpectedChips;
    /** Billing invariants */
    billing?: BillingInvariants;
    /** Text that must be in output */
    textMustContain?: string[];
    /** Text that must NOT be in output */
    textMustNotContain?: string[];
}

/**
 * V3 Truthcase with contract-based assertions.
 */
export interface ClinicalTruthcaseV3 {
    id: string;
    treatmentId: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    dictation: string;
    answers?: Record<string, unknown>;
    contract: ClinicalContract;
    description?: string;
    category?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONTRACT EVALUATION
// ═══════════════════════════════════════════════════════════════

export interface ContractViolation {
    type: 'state' | 'askback' | 'chip' | 'billing' | 'text';
    message: string;
    expected?: string;
    actual?: string;
}

export interface ContractResult {
    passed: boolean;
    violations: ContractViolation[];
}

/**
 * Evaluate a V10 result against a clinical contract.
 */
export function evaluateContract(
    result: V10PipelineOutput,
    contract: ClinicalContract
): ContractResult {
    const violations: ContractViolation[] = [];

    // 1. State check
    if (result.state !== contract.expectedState) {
        violations.push({
            type: 'state',
            message: `Expected state '${contract.expectedState}', got '${result.state}'`,
            expected: contract.expectedState,
            actual: result.state,
        });
    }

    // 2. Askback checks
    if (contract.askbacks) {
        const actualAskbacks = result.questions?.map(q => q.id) || [];

        for (const id of contract.askbacks.mustHave || []) {
            if (!actualAskbacks.includes(id)) {
                violations.push({
                    type: 'askback',
                    message: `Missing required askback: ${id}`,
                    expected: id,
                });
            }
        }

        for (const id of contract.askbacks.mustNotHave || []) {
            if (actualAskbacks.includes(id)) {
                violations.push({
                    type: 'askback',
                    message: `Forbidden askback present: ${id}`,
                    actual: id,
                });
            }
        }
    }

    // 3. Chip checks
    if (contract.chips) {
        const actualChips = result.trace?.allChips || result.trace?.instances?.[0]?.chips || [];

        for (const id of contract.chips.mustHave || []) {
            if (!actualChips.includes(id)) {
                violations.push({
                    type: 'chip',
                    message: `Missing required chip: ${id}`,
                    expected: id,
                });
            }
        }

        for (const id of contract.chips.mustNotHave || []) {
            if (actualChips.includes(id)) {
                violations.push({
                    type: 'chip',
                    message: `Forbidden chip present: ${id}`,
                    actual: id,
                });
            }
        }
    }

    // 4. Billing invariants
    if (contract.billing) {
        const actualCodes = result.output?.billingCodes || [];

        for (const code of contract.billing.mustIncludeCodes || []) {
            if (!actualCodes.includes(code)) {
                violations.push({
                    type: 'billing',
                    message: `Missing required billing code: ${code}`,
                    expected: code,
                });
            }
        }

        for (const code of contract.billing.mustNotIncludeCodes || []) {
            if (actualCodes.includes(code)) {
                violations.push({
                    type: 'billing',
                    message: `Forbidden billing code present: ${code}`,
                    actual: code,
                });
            }
        }

        // Explainability check
        if (contract.billing.mustBeExplainableByChips && result.state === 'output') {
            const chips = result.trace?.allChips || [];
            // If we have billing codes but no chips, that's unexplainable
            if (actualCodes.length > 0 && chips.length === 0) {
                violations.push({
                    type: 'billing',
                    message: 'Billing codes present but no chips to explain them',
                });
            }
        }
    }

    // 5. Text checks
    if (contract.textMustContain && result.state === 'output') {
        const text = result.output?.fullText?.toLowerCase() || '';

        for (const phrase of contract.textMustContain) {
            if (!text.includes(phrase.toLowerCase())) {
                violations.push({
                    type: 'text',
                    message: `Missing required text: "${phrase}"`,
                    expected: phrase,
                });
            }
        }
    }

    if (contract.textMustNotContain && result.state === 'output') {
        const text = result.output?.fullText?.toLowerCase() || '';

        for (const phrase of contract.textMustNotContain) {
            if (text.includes(phrase.toLowerCase())) {
                violations.push({
                    type: 'text',
                    message: `Forbidden text present: "${phrase}"`,
                    actual: phrase,
                });
            }
        }
    }

    return {
        passed: violations.length === 0,
        violations,
    };
}

/**
 * Format contract violations as readable diff.
 */
export function formatViolations(violations: ContractViolation[]): string {
    if (violations.length === 0) return '✅ All checks passed';

    return violations.map(v => {
        let line = `❌ [${v.type.toUpperCase()}] ${v.message}`;
        if (v.expected) line += ` (expected: ${v.expected})`;
        if (v.actual) line += ` (actual: ${v.actual})`;
        return line;
    }).join('\n');
}
