/**
 * Review Types — Type Definitions for Case Review
 *
 * ═══════════════════════════════════════════════════════════════
 * Categories, severities, and finding structures for review engine.
 * Calm, professional language — no fear-inducing terms.
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════

/**
 * Finding categories for grouping in UI.
 */
export type ReviewCategory = 'completeness' | 'billing' | 'medical' | 'formal';

/**
 * German labels for categories.
 */
export const CATEGORY_LABELS: Record<ReviewCategory, string> = {
    completeness: 'Vollständigkeit',
    billing: 'Abrechnung',
    medical: 'Medizinisch',
    formal: 'Formales',
};

/**
 * Category descriptions for UI headers.
 */
export const CATEGORY_DESCRIPTIONS: Record<ReviewCategory, string> = {
    completeness: 'Prüfung auf fehlende Angaben',
    billing: 'Hinweise zur Abrechnung',
    medical: 'Klinische Plausibilität',
    formal: 'Dokumentationsstandards',
};

// ═══════════════════════════════════════════════════════════════
// SEVERITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Finding severities — calm language only.
 * - info: Everything is fine
 * - note: Worth knowing, no action required
 * - attention: Should be reviewed before finalizing
 */
export type FindingSeverity = 'info' | 'note' | 'attention';

/**
 * German labels for severities.
 */
export const SEVERITY_LABELS: Record<FindingSeverity, string> = {
    info: 'OK',
    note: 'Hinweis',
    attention: 'Empfehlung',
};

// ═══════════════════════════════════════════════════════════════
// CONFIDENCE LEVELS (internal only)
// ═══════════════════════════════════════════════════════════════

/**
 * Internal confidence level — affects copy tone only.
 * NOT shown in UI.
 * - high: Neutral statement
 * - medium: "möglicherweise"
 * - low: "Hinweis, falls relevant"
 */
export type FindingConfidence = 'high' | 'medium' | 'low';

// ═══════════════════════════════════════════════════════════════
// FINDING STRUCTURE
// ═══════════════════════════════════════════════════════════════

/**
 * A single review finding.
 */
export interface Finding {
    /** Unique identifier for this finding type */
    id: string;

    /** Category for grouping */
    category: ReviewCategory;

    /** Severity level */
    severity: FindingSeverity;

    /** Internal confidence level — affects copy tone */
    confidence?: FindingConfidence;

    /** Short, human-readable message (German) */
    message: string;

    /** Optional helpful hint for resolution */
    hint?: string;

    /** Optional route for CTA button */
    ctaRoute?: string;

    /** Optional label for CTA button */
    ctaLabel?: string;
}

/**
 * Result of reviewing a case.
 */
export interface ReviewResult {
    caseId: string;
    findings: Finding[];
    reviewedAt: Date;
    overallSeverity: FindingSeverity;
}

