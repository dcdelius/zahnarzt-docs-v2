/**
 * Endo Canonical Vocabulary — SSOT for Codes + Labels
 *
 * ═══════════════════════════════════════════════════════════════
 * This file is the SINGLE SOURCE OF TRUTH for:
 * - Canonical codes (string literals used in DB, fields, payloads)
 * - German labels (for UI and rendered notes)
 * - Allowed value lists (ISO sizes, tapers, canal codes)
 *
 * HARD RULE: Renderer and DB payloads MUST use codes from here.
 * Free text (raw dictation, LLM suggestions) is NEVER SSOT.
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// DEVIATION REASON
// ═══════════════════════════════════════════════════════════════

export const DEVIATION_REASON_CODES = [
    'PAIN',
    'FISTULA_EXSUDATE',
    'NOT_DRY_SECRETION',
    'WL_OR_PREP_INCOMPLETE',
    'OTHER',
] as const;

export type DeviationReasonCode = typeof DEVIATION_REASON_CODES[number];

export const DEVIATION_REASON_LABELS: Record<DeviationReasonCode, string> = {
    PAIN: 'Persistierende Beschwerden',
    FISTULA_EXSUDATE: 'Fistel / Exsudat',
    NOT_DRY_SECRETION: 'Kanäle nicht trocken / Sekretion',
    WL_OR_PREP_INCOMPLETE: 'Längenbestimmung/Aufbereitung nicht abgeschlossen',
    OTHER: 'Sonstiges',
};

// ═══════════════════════════════════════════════════════════════
// FISTULA STATUS
// ═══════════════════════════════════════════════════════════════

export const FISTULA_STATUS_CODES = [
    'PRESENT',
    'FREE',
    'UNCLEAR',
] as const;

export type FistulaStatusCode = typeof FISTULA_STATUS_CODES[number];

export const FISTULA_STATUS_LABELS: Record<FistulaStatusCode, string> = {
    PRESENT: 'Fistelgang vorhanden',
    FREE: 'Fistelfrei',
    UNCLEAR: 'Unklar',
};

// ═══════════════════════════════════════════════════════════════
// SUPPURATION STATUS
// ═══════════════════════════════════════════════════════════════

export const SUPPURATION_STATUS_CODES = [
    'PRESENT',
    'ABSENT',
    'UNCLEAR',
] as const;

export type SuppurationStatusCode = typeof SUPPURATION_STATUS_CODES[number];

export const SUPPURATION_STATUS_LABELS: Record<SuppurationStatusCode, string> = {
    PRESENT: 'Eiter/Exsudat',
    ABSENT: 'Kein Exsudat',
    UNCLEAR: 'Unklar',
};

// ═══════════════════════════════════════════════════════════════
// NEGOTIATION STATUS
// ═══════════════════════════════════════════════════════════════

export const NEGOTIATION_STATUS_CODES = [
    'TO_APEX',
    'NOT_TO_APEX_BLOCKAGE',
    'PARTIAL',
    'UNCLEAR',
] as const;

export type NegotiationStatusCode = typeof NEGOTIATION_STATUS_CODES[number];

export const NEGOTIATION_STATUS_LABELS: Record<NegotiationStatusCode, string> = {
    TO_APEX: 'Bis Apex aufbereitet',
    NOT_TO_APEX_BLOCKAGE: 'Nicht bis Apex (Blockade/Stufe)',
    PARTIAL: 'Teilweise',
    UNCLEAR: 'Unklar',
};

// ═══════════════════════════════════════════════════════════════
// PLAN NEXT
// ═══════════════════════════════════════════════════════════════

export const PLAN_NEXT_CODES = [
    'RETRY_NEXT_APPT',
    'OBTURATE_TO_REACHED_LENGTH',
    'REFER_REVISION',
    'OTHER',
] as const;

export type PlanNextCode = typeof PLAN_NEXT_CODES[number];

export const PLAN_NEXT_LABELS: Record<PlanNextCode, string> = {
    RETRY_NEXT_APPT: 'Nächster Termin erneuter Versuch',
    OBTURATE_TO_REACHED_LENGTH: 'Obturation bis zur erreichten Länge',
    REFER_REVISION: 'Überweisung/Revision',
    OTHER: 'Sonstiges',
};

// ═══════════════════════════════════════════════════════════════
// IRRIGATION SOLUTION
// ═══════════════════════════════════════════════════════════════

export const IRRIGATION_SOLUTION_CODES = [
    'NAOCL',
    'EDTA',
    'CHX',
    'NACL',
    'OTHER',
] as const;

export type IrrigationSolutionCode = typeof IRRIGATION_SOLUTION_CODES[number];

export const IRRIGATION_SOLUTION_LABELS: Record<IrrigationSolutionCode, string> = {
    NAOCL: 'NaOCl',
    EDTA: 'EDTA',
    CHX: 'CHX',
    NACL: 'NaCl',
    OTHER: 'Andere',
};

// ═══════════════════════════════════════════════════════════════
// MEDICATION
// ═══════════════════════════════════════════════════════════════

export const MEDICATION_CODES = [
    'CAOH2',
    'CHX_GEL',
    'LEDERMIX',
    'OTHER',
    'NONE',
] as const;

export type MedicationCode = typeof MEDICATION_CODES[number];

export const MEDICATION_LABELS: Record<MedicationCode, string> = {
    CAOH2: 'Calciumhydroxid',
    CHX_GEL: 'CHX-Gel',
    LEDERMIX: 'Ledermix',
    OTHER: 'Andere',
    NONE: 'Keine',
};

// ═══════════════════════════════════════════════════════════════
// TEMP SEAL
// ═══════════════════════════════════════════════════════════════

export const TEMP_SEAL_CODES = [
    'PROVISIONAL',
    'DEFINITIVE',
    'UNCLEAR',
] as const;

export type TempSealCode = typeof TEMP_SEAL_CODES[number];

export const TEMP_SEAL_LABELS: Record<TempSealCode, string> = {
    PROVISIONAL: 'Provisorischer Verschluss',
    DEFINITIVE: 'Definitiver Verschluss',
    UNCLEAR: 'Unklar',
};

// ═══════════════════════════════════════════════════════════════
// WORKING LENGTH METHOD
// ═══════════════════════════════════════════════════════════════

export const WORKING_LENGTH_METHOD_CODES = [
    'APEX_LOCATOR',
    'XRAY',
    'BOTH',
    'NONE',
] as const;

export type WorkingLengthMethodCode = typeof WORKING_LENGTH_METHOD_CODES[number];

export const WORKING_LENGTH_METHOD_LABELS: Record<WorkingLengthMethodCode, string> = {
    APEX_LOCATOR: 'Apexlokator',
    XRAY: 'Röntgenmessaufnahme',
    BOTH: 'Beides',
    NONE: 'Keine',
};

// ═══════════════════════════════════════════════════════════════
// INSTRUMENTATION MODE
// ═══════════════════════════════════════════════════════════════

export const INSTRUMENTATION_MODE_CODES = [
    'ROTARY',
    'MANUAL',
    'BOTH',
] as const;

export type InstrumentationModeCode = typeof INSTRUMENTATION_MODE_CODES[number];

export const INSTRUMENTATION_MODE_LABELS: Record<InstrumentationModeCode, string> = {
    ROTARY: 'Maschinell',
    MANUAL: 'Manuell',
    BOTH: 'Beides',
};

// ═══════════════════════════════════════════════════════════════
// CANAL CODES
// ═══════════════════════════════════════════════════════════════

export const CANAL_CODES = [
    'MB',
    'MB2',
    'ML',
    'DB',
    'D',
    'P',
    'B',
    'L',
    'OTHER',
] as const;

export type CanalCode = typeof CANAL_CODES[number];

export const CANAL_LABELS: Record<CanalCode, string> = {
    MB: 'MB',
    MB2: 'MB2',
    ML: 'ML',
    DB: 'DB',
    D: 'D',
    P: 'P',
    B: 'B',
    L: 'L',
    OTHER: 'Andere',
};

// ═══════════════════════════════════════════════════════════════
// ISO FILE SIZES
// ═══════════════════════════════════════════════════════════════

export const ISO_FILE_SIZES = [
    6, 8, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80,
] as const;

export type ISOFileSize = typeof ISO_FILE_SIZES[number];

// ═══════════════════════════════════════════════════════════════
// TAPER VALUES
// ═══════════════════════════════════════════════════════════════

export const TAPER_VALUES = [
    '0.02',
    '0.04',
    '0.06',
    '0.08',
    '0.10',
] as const;

export type Taper = typeof TAPER_VALUES[number];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get label for a code from any vocabulary.
 */
export function toLabel(code: string, vocabulary: Record<string, string>): string {
    return vocabulary[code] ?? code;
}

/**
 * Type guard: check if value is in a code list.
 */
export function isValidCode<T extends readonly string[]>(
    value: unknown,
    codeList: T
): value is T[number] {
    return typeof value === 'string' && (codeList as readonly string[]).includes(value);
}

/**
 * Get all labels for a vocabulary as an array (for UI dropdowns).
 */
export function getOptionLabels<T extends Record<string, string>>(
    vocabulary: T
): Array<{ code: keyof T; label: string }> {
    return Object.entries(vocabulary).map(([code, label]) => ({
        code: code as keyof T,
        label,
    }));
}

// ═══════════════════════════════════════════════════════════════
// AGGREGATED VOCABULARY EXPORT
// ═══════════════════════════════════════════════════════════════

export const ENDO_VOCAB = {
    deviationReason: {
        codes: DEVIATION_REASON_CODES,
        labels: DEVIATION_REASON_LABELS,
    },
    fistulaStatus: {
        codes: FISTULA_STATUS_CODES,
        labels: FISTULA_STATUS_LABELS,
    },
    suppurationStatus: {
        codes: SUPPURATION_STATUS_CODES,
        labels: SUPPURATION_STATUS_LABELS,
    },
    negotiationStatus: {
        codes: NEGOTIATION_STATUS_CODES,
        labels: NEGOTIATION_STATUS_LABELS,
    },
    planNext: {
        codes: PLAN_NEXT_CODES,
        labels: PLAN_NEXT_LABELS,
    },
    irrigationSolution: {
        codes: IRRIGATION_SOLUTION_CODES,
        labels: IRRIGATION_SOLUTION_LABELS,
    },
    medication: {
        codes: MEDICATION_CODES,
        labels: MEDICATION_LABELS,
    },
    tempSeal: {
        codes: TEMP_SEAL_CODES,
        labels: TEMP_SEAL_LABELS,
    },
    workingLengthMethod: {
        codes: WORKING_LENGTH_METHOD_CODES,
        labels: WORKING_LENGTH_METHOD_LABELS,
    },
    instrumentationMode: {
        codes: INSTRUMENTATION_MODE_CODES,
        labels: INSTRUMENTATION_MODE_LABELS,
    },
    canal: {
        codes: CANAL_CODES,
        labels: CANAL_LABELS,
    },
    isoFileSizes: ISO_FILE_SIZES,
    taperValues: TAPER_VALUES,
} as const;

export default ENDO_VOCAB;
