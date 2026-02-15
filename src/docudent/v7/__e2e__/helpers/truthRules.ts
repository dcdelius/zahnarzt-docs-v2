/**
 * Truth Rules — Deterministic Medical + Billing Gates
 * 
 * These rules are HARD FAIL rules for V7 E2E tests.
 * They enforce clinical correctness and billing plausibility.
 */

import type { RealCaseFixture } from '../fixtures/realCases';

// ═══════════════════════════════════════════════════════════════
// CROSS-TREATMENT LEAKAGE TERMS
// ═══════════════════════════════════════════════════════════════

const ENDO_ONLY_TERMS = [
    'Trepanation',
    'Vitalexstirpation',
    'Wurzelkanal',
    'NaOCl',
    'Kanalaufbereitung',
    'Obturation',
    'Wurzelfüllung',
    'apikale Parodontitis',
    'Guttapercha',
    'medikamentöse Einlage',
    'Arbeitslänge',
    'Spülung NaOCl',
    'EDTA',
];

const FUELLUNG_ONLY_TERMS = [
    'Mehrschichttechnik',
    'Kompositpolitur',
    'Matrize und Keil',
    'Adhäsiv-Mehrkosten',
];

// ═══════════════════════════════════════════════════════════════
// FORBIDDEN MOCK STRINGS (always fail)
// ═══════════════════════════════════════════════════════════════

const FORBIDDEN_MOCK_STRINGS = [
    'Max Müller',
    'Mustermann',
    'Musterfrau',
    'Behandlungsblatt',
    'Dr. Musterarzt',
    'Beispielpraxis',
    'TODO:',
    'PLACEHOLDER',
    'Lorem ipsum',
];

// ═══════════════════════════════════════════════════════════════
// RULE RESULT TYPES
// ═══════════════════════════════════════════════════════════════

export interface RuleViolation {
    rule: string;
    severity: 'hard' | 'soft';
    message: string;
    found?: string[];
}

export interface RuleCheckResult {
    passed: boolean;
    violations: RuleViolation[];
}

// ═══════════════════════════════════════════════════════════════
// TRUTH RULES
// ═══════════════════════════════════════════════════════════════

/**
 * Check for cross-treatment leakage
 */
export function checkCrossTreatmentLeakage(
    treatmentId: 'fuellung' | 'endo',
    outputText: string,
    dictation: string
): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const lowerOutput = outputText.toLowerCase();
    const lowerDictation = dictation.toLowerCase();

    if (treatmentId === 'fuellung') {
        // Check for endo-only terms in füllung output
        const found = ENDO_ONLY_TERMS.filter(term => {
            const lowerTerm = term.toLowerCase();
            // Only violate if term is in output but NOT in dictation
            return lowerOutput.includes(lowerTerm) && !lowerDictation.includes(lowerTerm);
        });

        if (found.length > 0) {
            violations.push({
                rule: 'CROSS_TREATMENT_LEAKAGE',
                severity: 'hard',
                message: `Füllung output contains endo-only terms: ${found.join(', ')}`,
                found,
            });
        }
    } else if (treatmentId === 'endo') {
        // Check for filling-only terms in endo output
        const found = FUELLUNG_ONLY_TERMS.filter(term => {
            const lowerTerm = term.toLowerCase();
            return lowerOutput.includes(lowerTerm) && !lowerDictation.includes(lowerTerm);
        });

        if (found.length > 0) {
            violations.push({
                rule: 'CROSS_TREATMENT_LEAKAGE',
                severity: 'hard',
                message: `Endo output contains füllung-only terms: ${found.join(', ')}`,
                found,
            });
        }
    }

    return violations;
}

/**
 * Check tooth number presence
 */
export function checkToothPresence(
    expectedTooth: string | undefined,
    outputText: string
): RuleViolation[] {
    const violations: RuleViolation[] = [];

    if (expectedTooth) {
        const lowerOutput = outputText.toLowerCase();
        if (!lowerOutput.includes(expectedTooth.toLowerCase())) {
            violations.push({
                rule: 'TOOTH_PRESENCE',
                severity: 'hard',
                message: `Output missing expected tooth number: ${expectedTooth}`,
            });
        }
    }

    return violations;
}

/**
 * Check for forbidden mock strings
 */
export function checkForbiddenMocks(outputText: string): RuleViolation[] {
    const violations: RuleViolation[] = [];

    const found = FORBIDDEN_MOCK_STRINGS.filter(mock => outputText.includes(mock));

    if (found.length > 0) {
        violations.push({
            rule: 'FORBIDDEN_MOCK_STRINGS',
            severity: 'hard',
            message: `Output contains forbidden mock strings: ${found.join(', ')}`,
            found,
        });
    }

    return violations;
}

/**
 * Check must-contain terms
 */
export function checkMustContain(
    mustContain: string[],
    outputText: string
): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const lowerOutput = outputText.toLowerCase();

    const missing = mustContain.filter(term => !lowerOutput.includes(term.toLowerCase()));

    if (missing.length > 0) {
        violations.push({
            rule: 'MUST_CONTAIN',
            severity: 'hard',
            message: `Output missing required terms: ${missing.join(', ')}`,
            found: missing,
        });
    }

    return violations;
}

/**
 * Check must-not-contain terms
 */
export function checkMustNotContain(
    mustNotContain: string[],
    outputText: string
): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const lowerOutput = outputText.toLowerCase();

    const found = mustNotContain.filter(term => lowerOutput.includes(term.toLowerCase()));

    if (found.length > 0) {
        violations.push({
            rule: 'MUST_NOT_CONTAIN',
            severity: 'hard',
            message: `Output contains forbidden terms: ${found.join(', ')}`,
            found,
        });
    }

    return violations;
}

/**
 * Check billing plausibility
 */
export function checkBillingPlausibility(
    billingCodes: string[],
    billingReason: string | undefined,
    expectedBilling?: RealCaseFixture['expected']['expectedBilling']
): RuleViolation[] {
    const violations: RuleViolation[] = [];

    // If billing is empty, must have reason
    if (billingCodes.length === 0) {
        if (!billingReason) {
            // Check if empty is explicitly allowed
            if (!expectedBilling?.allowEmptyOnlyIfReason?.length) {
                violations.push({
                    rule: 'BILLING_PLAUSIBILITY',
                    severity: 'soft',
                    message: 'Billing is empty with no reason provided',
                });
            }
        }
    }

    // Check must-include codes
    if (expectedBilling?.mustIncludeCodes) {
        const missing = expectedBilling.mustIncludeCodes.filter(
            code => !billingCodes.some(bc => bc.includes(code))
        );
        if (missing.length > 0) {
            violations.push({
                rule: 'BILLING_MUST_INCLUDE',
                severity: 'soft',
                message: `Billing missing expected codes: ${missing.join(', ')}`,
                found: missing,
            });
        }
    }

    // Check must-exclude codes
    if (expectedBilling?.mustExcludeCodes) {
        const found = expectedBilling.mustExcludeCodes.filter(
            code => billingCodes.some(bc => bc.includes(code))
        );
        if (found.length > 0) {
            violations.push({
                rule: 'BILLING_MUST_EXCLUDE',
                severity: 'hard',
                message: `Billing contains forbidden codes: ${found.join(', ')}`,
                found,
            });
        }
    }

    return violations;
}

/**
 * Check question necessity (for step 2)
 */
export function checkQuestionNecessity(
    requiredQuestions: string[] | undefined,
    shownQuestionIds: string[]
): RuleViolation[] {
    const violations: RuleViolation[] = [];

    if (requiredQuestions) {
        const missing = requiredQuestions.filter(
            reqId => !shownQuestionIds.some(shown => shown.includes(reqId))
        );
        if (missing.length > 0) {
            violations.push({
                rule: 'QUESTION_NECESSITY',
                severity: 'soft',
                message: `Missing required questions: ${missing.join(', ')}`,
                found: missing,
            });
        }
    }

    return violations;
}

// ═══════════════════════════════════════════════════════════════
// MASTER VALIDATOR
// ═══════════════════════════════════════════════════════════════

export interface ValidationContext {
    fixture: RealCaseFixture;
    outputText: string;
    billingCodes: string[];
    billingReason?: string;
    shownQuestionIds: string[];
}

/**
 * Run all truth rules against a test result
 */
export function validateResult(ctx: ValidationContext): RuleCheckResult {
    const allViolations: RuleViolation[] = [];

    // 1. Cross-treatment leakage
    allViolations.push(
        ...checkCrossTreatmentLeakage(ctx.fixture.treatmentId, ctx.outputText, ctx.fixture.dictation)
    );

    // 2. Tooth presence
    allViolations.push(
        ...checkToothPresence(ctx.fixture.expected.expectedTooth, ctx.outputText)
    );

    // 3. Forbidden mocks
    allViolations.push(
        ...checkForbiddenMocks(ctx.outputText)
    );

    // 4. Must-contain
    allViolations.push(
        ...checkMustContain(ctx.fixture.expected.mustContain, ctx.outputText)
    );

    // 5. Must-not-contain
    allViolations.push(
        ...checkMustNotContain(ctx.fixture.expected.mustNotContain, ctx.outputText)
    );

    // 6. Billing plausibility
    allViolations.push(
        ...checkBillingPlausibility(
            ctx.billingCodes,
            ctx.billingReason,
            ctx.fixture.expected.expectedBilling
        )
    );

    // 7. Question necessity
    allViolations.push(
        ...checkQuestionNecessity(ctx.fixture.expected.requiredQuestions, ctx.shownQuestionIds)
    );

    // Filter to hard failures for pass/fail decision
    const hardViolations = allViolations.filter(v => v.severity === 'hard');

    return {
        passed: hardViolations.length === 0,
        violations: allViolations,
    };
}

/**
 * Format violations for test output
 */
export function formatViolations(violations: RuleViolation[]): string {
    if (violations.length === 0) return 'No violations';

    return violations.map(v => {
        const prefix = v.severity === 'hard' ? '❌' : '⚠️';
        return `${prefix} [${v.rule}] ${v.message}`;
    }).join('\n');
}

export default {
    validateResult,
    formatViolations,
    checkCrossTreatmentLeakage,
    checkToothPresence,
    checkForbiddenMocks,
    checkMustContain,
    checkMustNotContain,
    checkBillingPlausibility,
    checkQuestionNecessity,
};
