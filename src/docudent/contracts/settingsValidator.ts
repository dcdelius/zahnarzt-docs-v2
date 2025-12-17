/**
 * Settings Validator — SSOT Validation for Settings Overrides
 *
 * ═══════════════════════════════════════════════════════════════
 * Validates overrides against contracts/settingsUiRegistry (SSOT).
 * Use before Firestore writes to prevent invalid settings values.
 * ═══════════════════════════════════════════════════════════════
 *
 * RULES:
 * ✅ Import allowed values from settingsUiRegistry (SSOT)
 * ✅ Return machine-readable validation issues
 * ❌ No v7/** imports
 * ❌ No core/billing/** imports
 */

import { SETTINGS_UI_REGISTRY, isValidSettingsValue } from './settingsUiRegistry';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ValidationIssueCode =
    | 'UNKNOWN_PATH'
    | 'INVALID_VALUE'
    | 'TYPE_MISMATCH'
    | 'EMPTY_PATCH';

export interface ValidationIssue {
    path: string;
    code: ValidationIssueCode;
    message: string;
    value?: unknown;
    allowedValues?: string[];
}

export interface ValidationResult {
    ok: boolean;
    issues: ValidationIssue[];
}

export interface SanitizeResult {
    sanitized: Record<string, unknown>;
    issues: ValidationIssue[];
}

// ═══════════════════════════════════════════════════════════════
// ALLOWED SETTINGS PATHS (derived from registry)
// ═══════════════════════════════════════════════════════════════

/**
 * All paths that are allowed in overrides.
 * Includes registry paths + boolean paths.
 */
export const ALLOWED_SETTINGS_PATHS = new Set([
    // Registry paths (string enums)
    ...Object.keys(SETTINGS_UI_REGISTRY),

    // Boolean paths not in registry
    'fuellung.defaults.anesthesia.enabled',
    'fuellung.defaults.aufklaerungEnabled',
    'fuellung.mkvDefaults.mehrschicht',
    'fuellung.mkvDefaults.adhasiv',
    'endo.defaults.mikroskop',
    'endo.defaults.kofferdam',
    'endo.defaults.aufklaerungEnabled',

    // Endo enum paths
    'endo.defaults.eal',
    'endo.defaults.spuelprotokoll',
    'endo.defaults.aktivierung',
    'endo.defaults.obturation',
]);

/**
 * Boolean-only paths (true/false only allowed).
 */
const BOOLEAN_PATHS = new Set([
    'fuellung.defaults.anesthesia.enabled',
    'fuellung.defaults.aufklaerungEnabled',
    'fuellung.mkvDefaults.mehrschicht',
    'fuellung.mkvDefaults.adhasiv',
    'endo.defaults.mikroskop',
    'endo.defaults.kofferdam',
    'endo.defaults.aufklaerungEnabled',
]);

/**
 * Endo enum paths with allowed values.
 */
const ENDO_ENUMS: Record<string, string[]> = {
    'endo.defaults.eal': ['immer', 'bei_aufbereitung', 'fragen'],
    'endo.defaults.spuelprotokoll': ['naocl_edta', 'naocl', 'fragen'],
    'endo.defaults.aktivierung': ['ultraschall', 'sonic', 'keine', 'fragen'],
    'endo.defaults.obturation': ['thermoplastisch', 'lateral', 'fragen'],
};

// ═══════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate a single override entry.
 */
function validateEntry(path: string, value: unknown): ValidationIssue | null {
    // Check if path is allowed
    if (!ALLOWED_SETTINGS_PATHS.has(path)) {
        return {
            path,
            code: 'UNKNOWN_PATH',
            message: `Unknown settings path: '${path}'. Check contracts/settingsUiRegistry for valid paths.`,
            value,
        };
    }

    // Boolean paths
    if (BOOLEAN_PATHS.has(path)) {
        if (typeof value !== 'boolean') {
            return {
                path,
                code: 'TYPE_MISMATCH',
                message: `Expected boolean for '${path}', got ${typeof value}.`,
                value,
                allowedValues: ['true', 'false'],
            };
        }
        return null;
    }

    // Endo enum paths
    if (path in ENDO_ENUMS) {
        const allowed = ENDO_ENUMS[path];
        if (typeof value !== 'string' || !allowed.includes(value)) {
            return {
                path,
                code: 'INVALID_VALUE',
                message: `Invalid value '${value}' for '${path}'.`,
                value,
                allowedValues: allowed,
            };
        }
        return null;
    }

    // Registry paths (checked via settingsUiRegistry)
    if (path in SETTINGS_UI_REGISTRY) {
        if (typeof value !== 'string') {
            return {
                path,
                code: 'TYPE_MISMATCH',
                message: `Expected string for '${path}', got ${typeof value}.`,
                value,
            };
        }
        if (!isValidSettingsValue(path, value)) {
            const allowed = SETTINGS_UI_REGISTRY[path].allowedValues.map(v => v.id);
            return {
                path,
                code: 'INVALID_VALUE',
                message: `Invalid value '${value}' for '${path}'.`,
                value,
                allowedValues: allowed,
            };
        }
        return null;
    }

    // Should not reach here if ALLOWED_SETTINGS_PATHS is correct
    return null;
}

/**
 * Validate all overrides.
 * Returns ok=true if all entries are valid.
 */
export function validateOverrides(overrides: Record<string, unknown>): ValidationResult {
    const entries = Object.entries(overrides);

    // Empty check
    if (entries.length === 0) {
        return {
            ok: false,
            issues: [{
                path: '',
                code: 'EMPTY_PATCH',
                message: 'Overrides cannot be empty.',
            }],
        };
    }

    const issues: ValidationIssue[] = [];

    for (const [path, value] of entries) {
        const issue = validateEntry(path, value);
        if (issue) {
            issues.push(issue);
        }
    }

    return {
        ok: issues.length === 0,
        issues,
    };
}

/**
 * Sanitize overrides: keep only valid entries, return dropped entries as issues.
 */
export function sanitizeOverrides(overrides: Record<string, unknown>): SanitizeResult {
    const entries = Object.entries(overrides);
    const sanitized: Record<string, unknown> = {};
    const issues: ValidationIssue[] = [];

    for (const [path, value] of entries) {
        const issue = validateEntry(path, value);
        if (issue) {
            issues.push(issue);
        } else {
            sanitized[path] = value;
        }
    }

    return { sanitized, issues };
}

/**
 * Get all allowed paths as an array (for UI enumeration).
 */
export function getAllowedSettingsPaths(): string[] {
    return Array.from(ALLOWED_SETTINGS_PATHS);
}
