/**
 * Endo Types V2 — Canal-Level State & Deviation Tracking
 *
 * ═══════════════════════════════════════════════════════════════
 * Types for handling real-world deviations from ideal endo plan:
 * - Partial canal negotiability
 * - Pain persists
 * - Cannot reach apex
 * - Re-medication despite planned obturation
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// CANAL IDENTIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Standard canal identifiers used in endo.
 * Generic labels (K1/K2/K3) for when specific anatomy is unknown.
 */
export type CanalId =
    // Upper molars
    | 'MB' | 'MB1' | 'MB2' | 'DB' | 'P'
    // Lower molars
    | 'ML' | 'DL' | 'D'
    // Premolars/Single canal
    | 'B' | 'L'
    // Generic labels
    | 'K1' | 'K2' | 'K3' | 'K4'
    // Unknown/single canal
    | 'single' | 'unknown';

/**
 * German to CanalId mapping for parser
 */
export const CANAL_SYNONYMS: Record<string, CanalId> = {
    // German full names
    'mesiobukkal': 'MB',
    'mesio-bukkal': 'MB',
    'distobukkal': 'DB',
    'disto-bukkal': 'DB',
    'palatinal': 'P',
    'palatal': 'P',
    'mesiolingual': 'ML',
    'mesio-lingual': 'ML',
    'distolingual': 'DL',
    'disto-lingual': 'DL',
    'distal': 'D',
    'bukkal': 'B',
    'lingual': 'L',
    // Abbreviations
    'mb': 'MB',
    'mb1': 'MB1',
    'mb2': 'MB2',
    'db': 'DB',
    'p': 'P',
    'ml': 'ML',
    'dl': 'DL',
    'd': 'D',
    'b': 'B',
    'l': 'L',
    // Generic
    'k1': 'K1',
    'k2': 'K2',
    'k3': 'K3',
    'k4': 'K4',
    'kanal 1': 'K1',
    'kanal 2': 'K2',
    'kanal 3': 'K3',
    'kanal 4': 'K4',
};

// ═══════════════════════════════════════════════════════════════
// CANAL STATE (per canal)
// ═══════════════════════════════════════════════════════════════

/**
 * Reason why a canal cannot be fully negotiated to apex.
 */
export type LimitationReason =
    | 'calcified'           // Obliterated/calcified canal
    | 'ledge'               // Iatrogenic ledge
    | 'blocked'             // Debris/dentin plug
    | 'curved'              // Severe curvature
    | 'instrumentSeparation' // Separated instrument
    | 'other'
    | 'unknown';

/**
 * State of a single canal during treatment.
 */
export interface CanalState {
    /** Canal identifier */
    canalId: CanalId;

    /** Can the canal be negotiated to the apex? */
    negotiableToApex: boolean | null; // null = unknown

    /** Working length in mm (if apex reached) */
    workingLengthMm?: number;

    /** Depth reached in mm (if apex NOT reached) */
    reachedLengthMm?: number;

    /** ISO file size at working length / MAF */
    fileIso?: number;

    /** Taper if mentioned (e.g., ".04", ".06") */
    fileTaper?: string;

    /** Reason for limitation if not negotiable */
    limitationReason?: LimitationReason;

    /** Evidence snippet from dictation */
    evidence?: string;
}

// ═══════════════════════════════════════════════════════════════
// VISIT INTENT & OUTCOME
// ═══════════════════════════════════════════════════════════════

/**
 * Planned next step for the visit (detected from dictation).
 */
export type PlannedStep =
    | 'instrumentation'
    | 'medication'
    | 'obturation'
    | 'review'
    | 'unknown';

/**
 * Steps that were actually performed during the visit.
 */
export type PerformedStep =
    | 'kofferdam'
    | 'removalMed'           // Removal of old medicament
    | 'wlCheck'              // Working length check/verification
    | 'instrumentation'       // Shaping
    | 'irrigation'
    | 'medication'            // Placed medicament
    | 'tempSeal'              // Temporary seal
    | 'obturationPartial'     // Partial obturation
    | 'obturationComplete';   // Complete obturation

/**
 * What was intended/planned for this visit.
 */
export interface VisitIntent {
    plannedStep: PlannedStep;
    evidence?: string;
}

/**
 * What was actually done during this visit.
 */
export interface VisitOutcome {
    performedSteps: Set<PerformedStep>;
    evidence: string[];
}

// ═══════════════════════════════════════════════════════════════
// DEVIATION FLAGS
// ═══════════════════════════════════════════════════════════════

/**
 * Types of deviation from standard endo plan.
 */
export type DeviationFlagType =
    | 'PAIN_PERSISTENT'           // Patient still has pain
    | 'NO_OBTURATION_DESPITE_PLAN' // Planned obturation but didn't do it
    | 'PARTIAL_NEGOTIABILITY'      // Some canals not fully negotiable
    | 'WL_NOT_REACHED'             // Cannot reach working length
    | 'EXUDATE_PRESENT'            // Pus/exudate present
    | 'RE_MEDICATION'              // Re-applied medicament (implies not ready)
    | 'INSTRUMENT_SEPARATION'      // Broken file
    | 'LEDGE_CREATED'              // Iatrogenic ledge
    | 'PERFORATION'                // Root perforation
    | 'RETREATMENT';               // Revision/retreatment case

/**
 * A detected deviation from the standard plan.
 */
export interface DeviationFlag {
    type: DeviationFlagType;
    evidence: string[];          // Snippets from dictation
    affectedCanals?: CanalId[];  // If canal-specific
}

// ═══════════════════════════════════════════════════════════════
// PARSED SIGNALS (EXTENDED)
// ═══════════════════════════════════════════════════════════════

/**
 * Extended parsed signals for deviation mode.
 */
export interface EndoDeviationSignals {
    /** Is deviation mode triggered? */
    deviationMode: boolean;

    /** List of detected deviations */
    deviationFlags: DeviationFlag[];

    /** Canal-specific states */
    canalStates: Map<CanalId, CanalState>;

    /** Detected canals (for table questions) */
    detectedCanals: CanalId[];

    /** Planned intent for this visit */
    intent?: VisitIntent;

    /** Outcome of this visit */
    outcome?: VisitOutcome;
}

// ═══════════════════════════════════════════════════════════════
// QUESTION EXTENSIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Why obturation was not performed as planned.
 */
export type NoObturationReason =
    | 'painPersisted'
    | 'exudate'
    | 'drynessNotAchieved'
    | 'time'
    | 'negotiationFailed'
    | 'other';

/**
 * Plan for next visit.
 */
export type NextVisitPlan =
    | 'retryNegotiation'
    | 'partialObturation'
    | 'completeObturation'
    | 'refer'
    | 'monitor'
    | 'other';

// ═══════════════════════════════════════════════════════════════
// QUESTION OUTPUT EXTENSIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Extended question with explainability fields.
 */
export interface ExplainableQuestion {
    id: string;
    title: string;
    prompt: string;
    severity: 'required' | 'recommended';
    answerType: string;
    options?: string[];
    order: number;

    /** Why this question is being asked */
    reason: string;

    /** Evidence from dictation that triggered this question */
    evidence: string[];

    /** For canal table questions: which canals to include */
    canals?: CanalId[];

    /** Schema for table-type answers */
    tableSchema?: {
        columns: string[];
    };
}
