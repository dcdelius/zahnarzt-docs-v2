/**
 * Case Types — Exported Type Definitions
 *
 * ═══════════════════════════════════════════════════════════════
 * Standalone type exports for case lifecycle and documents.
 * Cleaner imports for consumers.
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// CASE LIFECYCLE
// ═══════════════════════════════════════════════════════════════

/**
 * Case lifecycle states:
 * - draft: Editable, work in progress
 * - finalized: Read-only, complete
 * - amended: Finalized case that was later corrected
 */
export type CaseStatus = 'draft' | 'finalized' | 'amended';

/**
 * German labels for lifecycle states.
 * UI-safe, no logic implications.
 */
export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
    draft: 'Entwurf',
    finalized: 'Final',
    amended: 'Geändert',
};

/**
 * Visual hints for lifecycle states.
 * Calm language, no fear.
 */
export const CASE_STATUS_HINTS: Record<CaseStatus, string> = {
    draft: 'Dieser Fall ist noch in Bearbeitung.',
    finalized: 'Dieser Fall ist abgeschlossen und dokumentiert.',
    amended: 'Dieser Fall wurde nachträglich korrigiert.',
};

// ═══════════════════════════════════════════════════════════════
// INSURANCE & TREATMENT
// ═══════════════════════════════════════════════════════════════

export type InsuranceType = 'GKV' | 'PKV';
export type TreatmentId = 'fuellung' | 'endo';

// ═══════════════════════════════════════════════════════════════
// SUMMARY TYPE (for list views)
// ═══════════════════════════════════════════════════════════════

export interface CaseSummary {
    id: string;
    treatmentId: string;
    patientRef: string;
    status: CaseStatus;
    providerId: string;
    createdAt: Date;
    finalizedAt: Date | null;
    hasReproducibility: boolean;
    amendedFromCaseId?: string;
}
