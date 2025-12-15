/**
 * Analog Export Guard
 * 
 * Ensures that exported billing payloads do not contain any
 * copyrighted Wissing commentary content.
 * 
 * SAFETY: This is a runtime guard that throws if any forbidden
 * content is detected in the export payload.
 */

import type { AnalogJustification, AnalogJustificationMap } from './analogJustificationService';

// ═══════════════════════════════════════════════════════════════
// FORBIDDEN KEYS (must never appear in export)
// ═══════════════════════════════════════════════════════════════

export const FORBIDDEN_EXPORT_KEYS = Object.freeze([
    'sections',
    'topSnippets',
    'evidenceSnippet',
    'rawText',
    'kommentar',
    'comment',
    'snippet',
    'wissing',
]);

export const FORBIDDEN_STRING_MARKERS = Object.freeze([
    'wissing-kommentar',
    'evidenceSnippet',
    'kommentar.bema-goz',
    'sections:',
]);

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AnalogExportItem {
    /** Analog code (e.g., "ANALOG_Kons_04") */
    analogCode: string;

    /** User-written justification text */
    userJustificationText: string;

    /** Selected comparison GOZ code */
    selectedComparisonCode?: string;

    /** Short tags for rationale (safe, not raw snippets) */
    rationaleTags?: string[];

    /** ISO timestamp */
    createdAtISO: string;
}

export interface ExportViolation {
    path: string;
    key?: string;
    marker?: string;
    reason: string;
}

// ═══════════════════════════════════════════════════════════════
// EXPORT BUILDER
// ═══════════════════════════════════════════════════════════════

/**
 * Build a safe export payload for analog billing.
 * Only includes safe fields, never raw commentary.
 */
export function buildAnalogExportPayload(
    justifications: AnalogJustificationMap,
    rationaleTags?: Record<string, string[]>
): AnalogExportItem[] {
    const items: AnalogExportItem[] = [];

    for (const [analogCode, justification] of Object.entries(justifications)) {
        items.push({
            analogCode,
            userJustificationText: justification.justificationText,
            selectedComparisonCode: justification.selectedComparisonCode,
            rationaleTags: rationaleTags?.[analogCode],
            createdAtISO: justification.createdAtISO
        });
    }

    // Sort deterministically
    items.sort((a, b) => a.analogCode.localeCompare(b.analogCode));

    return items;
}

// ═══════════════════════════════════════════════════════════════
// LEAK DETECTOR
// ═══════════════════════════════════════════════════════════════

/**
 * Recursively check an object for forbidden keys or string markers.
 */
function findViolations(
    obj: unknown,
    path: string = 'root'
): ExportViolation[] {
    const violations: ExportViolation[] = [];

    if (obj === null || obj === undefined) {
        return violations;
    }

    // Check strings for forbidden markers
    if (typeof obj === 'string') {
        for (const marker of FORBIDDEN_STRING_MARKERS) {
            if (obj.toLowerCase().includes(marker.toLowerCase())) {
                violations.push({
                    path,
                    marker,
                    reason: `String contains forbidden marker: "${marker}"`
                });
            }
        }
        return violations;
    }

    // Check arrays
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            violations.push(...findViolations(obj[i], `${path}[${i}]`));
        }
        return violations;
    }

    // Check objects
    if (typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
            // Check if key itself is forbidden
            const keyLower = key.toLowerCase();
            for (const forbidden of FORBIDDEN_EXPORT_KEYS) {
                if (keyLower === forbidden.toLowerCase() || keyLower.includes(forbidden.toLowerCase())) {
                    violations.push({
                        path: `${path}.${key}`,
                        key,
                        reason: `Forbidden key found: "${key}"`
                    });
                }
            }
            // Recurse into value
            violations.push(...findViolations(value, `${path}.${key}`));
        }
    }

    return violations;
}

/**
 * Assert that a payload contains no commentary leaks.
 * Throws an error with details if violations found.
 */
export function assertNoCommentaryLeak(payload: unknown): void {
    const violations = findViolations(payload);

    if (violations.length > 0) {
        // Sort deterministically
        violations.sort((a, b) => a.path.localeCompare(b.path));

        const details = violations.map(v =>
            `  - ${v.path}: ${v.reason}`
        ).join('\n');

        throw new Error(
            `Export contains forbidden commentary content:\n${details}`
        );
    }
}

/**
 * Check for commentary leaks without throwing.
 * Returns array of violations sorted by path.
 */
export function checkForCommentaryLeaks(payload: unknown): ExportViolation[] {
    const violations = findViolations(payload);
    violations.sort((a, b) => a.path.localeCompare(b.path));
    return violations;
}

/**
 * Sanitize an object by removing forbidden keys (shallow).
 * Use for cleanup before export.
 */
export function sanitizeForExport<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
        const keyLower = key.toLowerCase();
        const isForbidden = FORBIDDEN_EXPORT_KEYS.some(f =>
            keyLower === f.toLowerCase() || keyLower.includes(f.toLowerCase())
        );

        if (!isForbidden) {
            result[key] = value;
        }
    }

    return result as Partial<T>;
}
