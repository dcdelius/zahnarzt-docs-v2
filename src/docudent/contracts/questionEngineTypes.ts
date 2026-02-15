/**
 * Question Engine Types — Contracts for Endo Question Engine V1/V2
 *
 * ═══════════════════════════════════════════════════════════════
 * SINGLE SOURCE OF TRUTH for question engine input/output types.
 * All modules MUST import from here.
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// PHASE & SEVERITY TYPES
// ═══════════════════════════════════════════════════════════════

/** Endo treatment phases (V2: t1/t2/t3 instead of obturation) */
export type EndoPhase = 't1' | 't2' | 't3' | 'obturation';

/** Question severity determines if user can skip */
export type QuestionSeverity = 'required' | 'recommended';

/** Answer input types */
export type QuestionAnswerType = 'select' | 'text' | 'number' | 'perCanalTable' | 'multiSelect';

// ═══════════════════════════════════════════════════════════════
// QUESTION TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Engine-generated question to present to user.
 * Stable ID format: {TREATMENT}_{PHASE}_{FIELD}
 */
export interface EngineQuestion {
    /** Stable ID (e.g., ENDO_T2_WORKING_LENGTHS) */
    id: string;

    /** Human-readable title (German) */
    title: string;

    /** Question prompt (German, calm, neutral) */
    prompt: string;

    /** Why we ask this (for transparency/observability) */
    rationale: string;

    /** Whether answer is required or just recommended */
    severity: QuestionSeverity;

    /** Input type for UI rendering */
    answerType: QuestionAnswerType;

    /** Options for select/multiSelect types */
    options?: string[];

    /** Fields written when answered (paths in case.answers) */
    fieldsWritten: string[];

    /** Display order (lower = earlier) */
    order: number;
}

// ═══════════════════════════════════════════════════════════════
// V2: CANAL & APICAL SIZE TYPES
// ═══════════════════════════════════════════════════════════════

/** Known canal labels (standard + generic) */
export type CanalLabel =
    | 'MB' | 'MB1' | 'MB2' | 'ML' | 'MV'
    | 'DB' | 'DL' | 'DV' | 'D'
    | 'P' | 'L' | 'B'
    | 'K1' | 'K2' | 'K3' | 'K4'
    | string; // Allow unknown labels

/** ISO file size (e.g., 25, 30, 35) */
export type ISOSize = number;

/** File taper (e.g., '.04', '.06') */
export type FileTaper = '.02' | '.04' | '.06' | '.08' | string;

/** Apical size per canal */
export interface ApicalSizeEntry {
    canal: CanalLabel;
    iso: ISOSize;
    taper?: FileTaper;
    evidence: string;
}

/** Working length per canal */
export interface WorkingLengthEntry {
    canal: CanalLabel;
    mm: number;
    evidence: string;
}

/** Obturation technique (V2) */
export type ObturationTechnique =
    | 'warm_vertical'
    | 'lateral'
    | 'carrier'
    | 'single_cone';

/** Sealer type class (V2: class-level, not brand) */
export type SealerTypeClass = 'resin' | 'bioceramic' | 'other';

// ═══════════════════════════════════════════════════════════════
// SIGNAL TYPES (parsed from dictation)
// ═══════════════════════════════════════════════════════════════

/** Per-canal working lengths (e.g., { MB: 19, ML: 18, D: 20 }) */
export type WorkingLengthsByCanal = Record<string, number>;

/** Irrigation solution identifiers */
export type IrrigationSolution = 'NaOCl' | 'EDTA' | 'CHX' | 'NaCl' | 'H2O2' | 'other';

/** Instrumentation mode */
export type InstrumentationMode = 'rotary' | 'manual';

/** Working length determination method */
export type WorkingLengthMethod = 'apex_locator' | 'xray' | 'both';

/** Medicament type */
export type MedicamentType = 'CaOH2' | 'Ledermix' | 'CHX' | 'none';

/** T2 Deviation: Planned action for the visit */
export type PlannedAction = 'medChange' | 'obturation' | 'unknown';

/**
 * Signals extracted from dictation text (V2 + Deviation).
 * Null = not mentioned, undefined = not applicable.
 */
export interface EndoExtractedSignals {
    /** Detected tooth number (e.g., "36") */
    tooth: string | null;

    /** Visit/termin number (1, 2, 3) */
    visitNumber: number | null;

    /** Endo phase inferred from keywords */
    phase: EndoPhase | null;

    /** Whether Kofferdam was mentioned */
    kofferdam: boolean;

    /** If Kofferdam explicitly not possible (e.g., "kein Kofferdam möglich") */
    kofferdamNotPossible?: boolean;

    /** Medicament mentioned */
    medicament: MedicamentType | null;

    /** Medicament mentioned (generic "Einlage"/"Medikation") */
    medicamentMentioned?: boolean;

    /** Irrigation solutions mentioned */
    irrigationSolutions: IrrigationSolution[];

    /** Whether working lengths were checked */
    workingLengthsChecked: boolean;

    /** Method used to determine working lengths */
    workingLengthMethod: WorkingLengthMethod | null;

    /** Per-canal working lengths (e.g., { MB: 19, ML: 18, D: 20 }) */
    workingLengthsByCanal: WorkingLengthsByCanal | null;

    /** V2: Structured working lengths with evidence */
    workingLengths?: WorkingLengthEntry[];

    /** Instrumentation mode */
    instrumentationMode: InstrumentationMode | null;

    /** V2: Apical ISO sizes per canal */
    apicalSizes?: ApicalSizeEntry[];

    /** V2: Canal labels mentioned (without values) */
    canalLabels?: CanalLabel[];

    /** V2: Obturation technique detected */
    obturationTechnique?: ObturationTechnique | null;

    /** V2: Sealer type class detected */
    sealerTypeClass?: SealerTypeClass | null;

    // ═══════════════════════════════════════════════════════════
    // T2 DEVIATION FIELDS
    // ═══════════════════════════════════════════════════════════

    /** Planned action for the visit (detected from "heute eigentlich...") */
    plannedAction?: PlannedAction | null;

    /** Whether fistula/Fistelgang is present */
    fistulaPresent?: boolean | null;

    /** Whether suppuration (Eiter/Exsudat) is present */
    suppurationPresent?: boolean | null;

    /** Whether patient reports persistent pain/symptoms */
    painPersistent?: boolean | null;

    /** Whether obturation was performed this visit */
    obturationPerformed?: boolean | null;

    /** Whether irrigation was explicitly mentioned ("gespült") */
    irrigationMentioned?: boolean;

    /** Whether instrumentation was mentioned ("aufbereitet") */
    instrumentationMentioned?: boolean;

    /** Whether working length keywords were mentioned */
    workingLengthMentioned?: boolean;

    // ═══════════════════════════════════════════════════════════
    // T4: APEX/NEGOTIATION DEVIATION SIGNALS
    // ═══════════════════════════════════════════════════════════

    /** Whether apex could not be reached (Stufe/Blockade) */
    apexNotReachable?: boolean | null;

    /** Whether canal negotiation issue detected */
    canalNegotiationIssue?: boolean | null;

    /** Specific canals that are incomplete/blocked */
    canalsIncomplete?: string[];
}

// ═══════════════════════════════════════════════════════════════
// T3: MASTER FILE / ISO TYPES
// ═══════════════════════════════════════════════════════════════

/** Master file entry for a canal */
export interface MasterFileEntry {
    iso: number;
    taper?: string;
}

/** Master file by canal (e.g., { MB: { iso: 25, taper: '0.04' } }) */
export type MasterFileByCanal = Record<string, MasterFileEntry>;

// ═══════════════════════════════════════════════════════════════
// ENGINE INPUT/OUTPUT
// ═══════════════════════════════════════════════════════════════

/** Detected fact from dictation (for observability) */
export interface DetectedFact {
    field: string;
    value: unknown;
    evidence: string;
}

/** Missing field that triggers a question */
export interface MissingField {
    field: string;
    severity: QuestionSeverity;
    phase: EndoPhase;
}

/** Input to the question engine */
export interface EngineInput {
    treatmentId: 'endo';
    visit: {
        number: 1 | 2 | 3;
        phase: EndoPhase;
    };
    dictationText: string;
    extracted: EndoExtractedSignals;
    settings: Record<string, unknown>;
}

/** Output from the question engine */
export interface EngineOutput {
    /** Questions to present to user (ordered) */
    questions: EngineQuestion[];

    /** Facts detected from dictation */
    detected: DetectedFact[];

    /** Missing fields that triggered questions */
    missing: MissingField[];

    /** Version info for reproducibility */
    version: {
        playbookVersionId: string;
        engineVersion: string;
    };
}

// ═══════════════════════════════════════════════════════════════
// ANSWER NORMALIZATION TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Answers keyed by question ID (as provided by UI).
 * e.g., { 'ENDO_T2_DEVIATION_REASON': 'Fistel / Exsudat' }
 */
export type AnswersByQuestionId = Record<string, unknown>;

/**
 * Normalized fields keyed by field name (for renderer consumption).
 * e.g., { deviationReason: 'Fistel / Exsudat' }
 */
export type NormalizedFields = Record<string, unknown>;
