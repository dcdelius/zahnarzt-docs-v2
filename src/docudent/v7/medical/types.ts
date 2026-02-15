/**
 * V7 Medical Layer — Types
 *
 * KB SSOT Reference (from question_bank.json + unified.json):
 * - Question key for capping: "ueberkappung"
 * - Question key for capping material: "ueberkappung_material"
 * - Chip ID for indirect capping (Cp): "cp" (BEMA_25 / GOZ_2330)
 * - Chip ID for direct capping (P): "p" (BEMA_26 / GOZ_2340)
 * - No explicit "counseling" chip in KB — counseling is text-only via forensicNotes
 *
 * Option IDs for ueberkappung: "yes" / "no"
 * Aliasing: true → "yes", false → "no"
 */

export type YesNoUnknown = 'yes' | 'no' | 'unknown';

export type CariesDepth = 'normal' | 'profunda' | 'pulp_near' | 'unknown';

export interface CappingFact {
    performed: YesNoUnknown;
    material?: 'Ca(OH)₂' | 'MTA' | 'Biodentine';
    type?: 'indirect' | 'direct'; // cp vs p
}

export interface CounselingFact {
    pulpitisRisk: YesNoUnknown;
}

export interface BleedingFact {
    detected: YesNoUnknown;
    heavy?: boolean;
    hemostasisPerformed?: YesNoUnknown;
}

export interface SensitivityFact {
    reported: YesNoUnknown;
    level?: 'low' | 'medium' | 'high';
    desensitizerApplied?: YesNoUnknown;
}

export interface EndoFact {
    diagnosis?: 'pulpitis' | 'necrosis' | 'apical_periodontitis' | 'trauma' | 'revision' | 'unknown';
    step?: 'trepanation' | 'working_length' | 'preparation' | 'irrigation' | 'medication' | 'obturation' | 'unknown';
    canalCount?: number;
    kofferdam?: boolean;
    workingLengthMethod?: 'electronic' | 'xray';
    irrigationSolutions?: string[];
    medication?: string;
    obturated?: boolean;
    // M23: New properties for allowlist elimination
    anesthesiaType?: 'leitung' | 'infiltration';
    wfTechnique?: 'warm' | 'einzel';
    diagnosticXray?: boolean;
    postEndoAufbau?: boolean;
}

// M24: Fuellung-specific facts
export interface FuellungFact {
    anesthesiaType?: 'leitung' | 'infiltration';
    surfaceAnesthesia?: boolean;
    isolation?: 'kofferdam' | 'relativ' | 'none';
    fluoridation?: boolean;
}

export interface TreatmentFacts {
    treatmentId: 'fuellung' | 'endo';
    cariesDepth: CariesDepth;
    capping: CappingFact;
    counseling: CounselingFact;
    bleeding?: BleedingFact;
    sensitivity?: SensitivityFact;
    /** Endo-specific facts */
    endo?: EndoFact;
    /** Fuellung-specific facts (M24) */
    fuellung?: FuellungFact;
}

export interface AskbackQuestion {
    id: string;
    required: boolean;
    questionKey: string; // KB canonical key
}

export interface AskbackBundle {
    required: AskbackQuestion[];
    optional: AskbackQuestion[];
}

/**
 * Canonical Question IDs (for pipeline/UI)
 * These are prefixed with "medical_" to distinguish from KB keys
 */
export const MEDICAL_QUESTION_IDS = {
    UEBERKAPPUNG: 'medical_ueberkappung',
    UEBERKAPPUNG_MATERIAL: 'medical_ueberkappung_material',
    COUNSEL_PULPITIS_RISK: 'medical_counsel_pulpitis_risk',
} as const;

/**
 * KB Chip IDs (from unified.json)
 */
export const KB_CHIP_IDS = {
    CP: 'cp',           // Indirect capping - BEMA_25 / GOZ_2330
    P: 'p',             // Direct capping - BEMA_26 / GOZ_2340
    CP_NOT_REQUIRED: 'cp_not_required',
} as const;
