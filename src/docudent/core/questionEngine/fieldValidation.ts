/**
 * Field Validation — Canonical Code Enforcement
 *
 * ═══════════════════════════════════════════════════════════════
 * Validates that normalized fields contain only canonical codes.
 * Rejects label strings (e.g., "Fistel / Exsudat") that should be codes.
 * 
 * HARD RULE: DB payloads must only contain canonical codes.
 * ═══════════════════════════════════════════════════════════════
 */

import type { EngineQuestion, NormalizedFields } from '../../contracts/questionEngineTypes';

import {
    DEVIATION_REASON_CODES,
    FISTULA_STATUS_CODES,
    SUPPURATION_STATUS_CODES,
    NEGOTIATION_STATUS_CODES,
    PLAN_NEXT_CODES,
    IRRIGATION_SOLUTION_CODES,
    MEDICATION_CODES,
    TEMP_SEAL_CODES,
    WORKING_LENGTH_METHOD_CODES,
    INSTRUMENTATION_MODE_CODES,
    CANAL_CODES,
    ISO_FILE_SIZES,
    TAPER_VALUES,
} from '../endo/vocab/endoCanonicalVocab';

// ═══════════════════════════════════════════════════════════════
// FIELD → ALLOWED CODES MAPPING
// ═══════════════════════════════════════════════════════════════

const FIELD_ALLOWED_CODES: Record<string, readonly string[]> = {
    deviationReason: DEVIATION_REASON_CODES,
    fistulaStatus: FISTULA_STATUS_CODES,
    suppurationStatus: SUPPURATION_STATUS_CODES,
    negotiationStatus: NEGOTIATION_STATUS_CODES,
    planNext: PLAN_NEXT_CODES,
    irrigationSolutions: IRRIGATION_SOLUTION_CODES,
    medication: MEDICATION_CODES,
    tempSeal: TEMP_SEAL_CODES,
    workingLengthMethod: WORKING_LENGTH_METHOD_CODES,
    instrumentationMode: INSTRUMENTATION_MODE_CODES,
    canalsAffected: CANAL_CODES,
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ValidationResult {
    ok: boolean;
    errors: string[];
    sanitized: NormalizedFields;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Check if value looks like a label (contains spaces/umlauts)
// ═══════════════════════════════════════════════════════════════

function looksLikeLabel(value: string): boolean {
    // Labels often contain spaces, umlauts, or lowercase mixed with uppercase
    // Codes are typically SCREAMING_SNAKE_CASE or simple alphanumeric
    return /[äöüß\s\/]/.test(value);
}

// ═══════════════════════════════════════════════════════════════
// MAIN VALIDATION FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Validate normalized fields against canonical vocabularies.
 * Returns sanitized fields with invalid values removed.
 */
export function validateNormalizedFields(
    _questions: EngineQuestion[],
    fields: NormalizedFields
): ValidationResult {
    const errors: string[] = [];
    const sanitized: NormalizedFields = {};

    for (const [fieldName, value] of Object.entries(fields)) {
        if (value === undefined || value === null) {
            continue;
        }

        const allowedCodes = FIELD_ALLOWED_CODES[fieldName];

        // Field not in vocabulary - pass through (e.g., workingLengths, masterFileByCanal)
        if (!allowedCodes) {
            // Special validation for masterFileByCanal
            if (fieldName === 'masterFileByCanal' && typeof value === 'object') {
                const masterFileResult = validateMasterFile(value as Record<string, unknown>);
                if (!masterFileResult.ok) {
                    errors.push(...masterFileResult.errors);
                } else {
                    sanitized[fieldName] = masterFileResult.sanitized;
                }
            } else {
                sanitized[fieldName] = value;
            }
            continue;
        }

        // Array field (e.g., irrigationSolutions, canalsAffected)
        if (Array.isArray(value)) {
            const validItems: string[] = [];
            for (const item of value) {
                if (typeof item !== 'string') {
                    errors.push(`Invalid type for ${fieldName}[]: expected string, got ${typeof item}`);
                    continue;
                }
                if (!allowedCodes.includes(item)) {
                    if (looksLikeLabel(item)) {
                        errors.push(
                            `Invalid label-string for ${fieldName}: '${item}' (expected code: ${allowedCodes.slice(0, 3).join('|')}...)`
                        );
                    } else {
                        errors.push(
                            `Invalid code for ${fieldName}: '${item}' (expected one of ${allowedCodes.join('|')})`
                        );
                    }
                    continue;
                }
                validItems.push(item);
            }
            if (validItems.length > 0) {
                sanitized[fieldName] = validItems;
            }
            continue;
        }

        // String field
        if (typeof value === 'string') {
            if (!allowedCodes.includes(value)) {
                if (looksLikeLabel(value)) {
                    errors.push(
                        `Invalid label-string for ${fieldName}: '${value}' (expected code: ${allowedCodes.slice(0, 3).join('|')}...)`
                    );
                } else {
                    errors.push(
                        `Invalid code for ${fieldName}: '${value}' (expected one of ${allowedCodes.join('|')})`
                    );
                }
                continue;
            }
            sanitized[fieldName] = value;
            continue;
        }

        // Other types - pass through
        sanitized[fieldName] = value;
    }

    return {
        ok: errors.length === 0,
        errors,
        sanitized,
    };
}

// ═══════════════════════════════════════════════════════════════
// MASTER FILE VALIDATION
// ═══════════════════════════════════════════════════════════════

interface MasterFileValidationResult {
    ok: boolean;
    errors: string[];
    sanitized: Record<string, { iso: number; taper?: string }>;
}

function validateMasterFile(masterFile: Record<string, unknown>): MasterFileValidationResult {
    const errors: string[] = [];
    const sanitized: Record<string, { iso: number; taper?: string }> = {};

    for (const [canal, entry] of Object.entries(masterFile)) {
        if (typeof entry !== 'object' || entry === null) {
            errors.push(`Invalid masterFileByCanal entry for ${canal}: expected object`);
            continue;
        }

        const typedEntry = entry as { iso?: unknown; taper?: unknown };
        const sanitizedEntry: { iso: number; taper?: string } = { iso: 0 };

        // Validate ISO
        if (typedEntry.iso !== undefined) {
            const iso = Number(typedEntry.iso);
            if (!ISO_FILE_SIZES.includes(iso as typeof ISO_FILE_SIZES[number])) {
                errors.push(
                    `Invalid ISO for ${canal}: ${typedEntry.iso} (expected one of ${ISO_FILE_SIZES.join(',')})`
                );
            } else {
                sanitizedEntry.iso = iso;
            }
        }

        // Validate taper
        if (typedEntry.taper !== undefined) {
            const taper = String(typedEntry.taper);
            if (!TAPER_VALUES.includes(taper as typeof TAPER_VALUES[number])) {
                errors.push(
                    `Invalid taper for ${canal}: ${typedEntry.taper} (expected one of ${TAPER_VALUES.join(',')})`
                );
            } else {
                sanitizedEntry.taper = taper;
            }
        }

        if (sanitizedEntry.iso > 0) {
            sanitized[canal] = sanitizedEntry;
        }
    }

    return {
        ok: errors.length === 0,
        errors,
        sanitized,
    };
}

// ═══════════════════════════════════════════════════════════════
// DEV-ONLY WARNING: Option looks like label
// ═══════════════════════════════════════════════════════════════

/**
 * Check if question options look like labels instead of codes.
 * For dev-time validation only.
 */
export function warnIfOptionsLookLikeLabels(questions: EngineQuestion[]): string[] {
    const warnings: string[] = [];

    for (const q of questions) {
        if (!q.options) continue;

        for (const opt of q.options) {
            if (typeof opt === 'string' && looksLikeLabel(opt)) {
                warnings.push(
                    `[DEV WARNING] Question ${q.id} option '${opt}' looks like a label, expected code`
                );
            }
        }
    }

    return warnings;
}
