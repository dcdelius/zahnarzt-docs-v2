/**
 * Analog Completion Validator
 * 
 * Validates that all analog suggestions have proper justification
 * before allowing finalization/export.
 */

import type { AnalogJustification, AnalogJustificationMap } from './analogJustificationService';
import { JUSTIFICATION_MIN_LENGTH, JUSTIFICATION_MAX_LENGTH } from './analogJustificationService';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AnalogSuggestion {
    id: string;
    meta?: {
        analogCode?: string;
        requiresJustification?: boolean;
        suggestedComparisonCodes?: string[];
        [key: string]: unknown;
    };
}

export type ValidationErrorType =
    | 'missing_justification'
    | 'justification_too_short'
    | 'justification_too_long'
    | 'missing_comparison_code';

export interface AnalogValidationError {
    analogCode: string;
    type: ValidationErrorType;
    reason: string;
    severity: 'error' | 'warning';
}

export interface AnalogValidationResult {
    ok: boolean;
    missing: AnalogValidationError[];
}

// ═══════════════════════════════════════════════════════════════
// VALIDATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Validates that all analog suggestions have proper justification.
 * 
 * @param suggestions - Array of billing suggestions
 * @param justifications - Map of analog code to justification
 * @returns Validation result with ok status and list of errors
 */
export function validateAnalogJustifications(
    suggestions: AnalogSuggestion[],
    justifications: AnalogJustificationMap
): AnalogValidationResult {
    const errors: AnalogValidationError[] = [];

    // Find all analog suggestions requiring justification
    const analogSuggestions = suggestions.filter(s =>
        s.meta?.analogCode && s.meta?.requiresJustification === true
    );

    for (const suggestion of analogSuggestions) {
        const analogCode = suggestion.meta!.analogCode!;
        const justification = justifications[analogCode];
        const suggestedCodes = suggestion.meta!.suggestedComparisonCodes || [];

        // Check 1: Missing justification entirely
        if (!justification) {
            errors.push({
                analogCode,
                type: 'missing_justification',
                reason: `Keine Begründung für ${analogCode} vorhanden`,
                severity: 'error'
            });
            continue; // Skip other checks if no justification at all
        }

        // Check 2: Justification too short
        const textLength = justification.justificationText.trim().length;
        if (textLength < JUSTIFICATION_MIN_LENGTH) {
            errors.push({
                analogCode,
                type: 'justification_too_short',
                reason: `Begründung zu kurz (${textLength}/${JUSTIFICATION_MIN_LENGTH} Zeichen)`,
                severity: 'error'
            });
        }

        // Check 3: Justification too long
        if (textLength > JUSTIFICATION_MAX_LENGTH) {
            errors.push({
                analogCode,
                type: 'justification_too_long',
                reason: `Begründung zu lang (${textLength}/${JUSTIFICATION_MAX_LENGTH} Zeichen)`,
                severity: 'error'
            });
        }

        // Check 4: Missing comparison code (warning, not blocking)
        if (suggestedCodes.length > 0 && !justification.selectedComparisonCode) {
            errors.push({
                analogCode,
                type: 'missing_comparison_code',
                reason: `Keine Vergleichsposition ausgewählt`,
                severity: 'warning'
            });
        }
    }

    // Sort deterministically by analogCode
    errors.sort((a, b) => a.analogCode.localeCompare(b.analogCode));

    // Filter: only blocking errors (severity: error) affect 'ok' status
    const blockingErrors = errors.filter(e => e.severity === 'error');

    return {
        ok: blockingErrors.length === 0,
        missing: errors
    };
}

/**
 * Get list of analog suggestions that require justification.
 */
export function getAnalogSuggestionsRequiringJustification(
    suggestions: AnalogSuggestion[]
): AnalogSuggestion[] {
    return suggestions.filter(s =>
        s.meta?.analogCode && s.meta?.requiresJustification === true
    );
}

/**
 * Check if any analog suggestions require justification.
 */
export function hasAnalogSuggestionsRequiringJustification(
    suggestions: AnalogSuggestion[]
): boolean {
    return getAnalogSuggestionsRequiringJustification(suggestions).length > 0;
}
