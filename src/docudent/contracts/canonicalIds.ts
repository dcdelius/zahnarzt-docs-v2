/**
 * Canonical IDs — SINGLE SOURCE OF TRUTH
 *
 * This file defines the canonical naming for:
 * - Question IDs
 * - Option IDs (answer values)
 * - Chip IDs
 *
 * All translation from semantic to canonical happens via the mapping layer.
 * ChipResolver and OutputComposer MUST use canonical IDs only.
 *
 * ❌ FORBIDDEN:
 * - Direct use of QuestionBank.option.id in chipResolver
 * - String matching scattered across code
 * - New ID patterns without adding here first
 */

// ═══════════════════════════════════════════════════════════════
// CANONICAL QUESTION IDS
// ═══════════════════════════════════════════════════════════════

/**
 * Canonical question IDs — use these in answer maps and chip resolution
 */
export const CANONICAL_QUESTION_IDS = {
    // Forensic (required for documentation)
    VITALITY: 'forensic_vitality',
    PERCUSSION: 'forensic_percussion',
    KOFFERDAM: 'forensic_kofferdam',
    TIEFE: 'forensic_tiefe',
    CAPPING_MATERIAL: 'forensic_capping_material',

    // MKV (Mehrkostenvereinbarung)
    MKV_VEREINBARUNG: 'mkv_vereinbarung',
    MKV_BETRAG: 'mkv_betrag',

    // Upsell
    MEHRSCHICHT: 'upsell_mehrschicht',
    ADHAESIV: 'upsell_adhaesiv',

    // Anesthesia (usually extracted, sometimes asked)
    ANESTHESIA: 'forensic_anesthesia',
} as const;

export type CanonicalQuestionId = typeof CANONICAL_QUESTION_IDS[keyof typeof CANONICAL_QUESTION_IDS];

// ═══════════════════════════════════════════════════════════════
// CANONICAL OPTION IDS (Answer Values)
// ═══════════════════════════════════════════════════════════════

/**
 * Canonical option IDs — standardized answer values
 */
export const CANONICAL_OPTION_IDS = {
    // Binary
    YES: 'yes',
    NO: 'no',

    // Vitality/Percussion
    POSITIVE: 'positive',
    NEGATIVE: 'negative',

    // Depth
    NORMAL: 'normal',
    DEEP: 'deep',

    // Capping Material
    CAOH: 'material_caoh',
    MTA: 'material_mta',
    BIODENTINE: 'material_biodentine',
    KEINE: 'material_none',

    // Anesthesia
    INFILTRATION: 'anesthesia_infiltr',
    LEITUNGS: 'anesthesia_leitung',
    KEINE_LA: 'anesthesia_none',
} as const;

export type CanonicalOptionId = typeof CANONICAL_OPTION_IDS[keyof typeof CANONICAL_OPTION_IDS];

// ═══════════════════════════════════════════════════════════════
// CANONICAL CHIP IDS
// ═══════════════════════════════════════════════════════════════

/**
 * Canonical chip IDs — must match fuellung_unified.json
 */
export const CANONICAL_CHIP_IDS = {
    // Core procedure
    EXKAVATION: 'exkavation',
    KOMPOSIT_BASIC: 'komposit_basic',
    FINISHING: 'finishing',

    // Isolation
    KOFFERDAM: 'kofferdam',
    REL_TROCKEN: 'rel_trocken',

    // Vitality/Percussion
    VIPR_POS: 'vipr_pos',
    VIPR_NEG: 'vipr_neg',
    PERK_POS: 'perk_pos',
    PERK_NEG: 'perk_neg',

    // Capping
    CP: 'cp',  // Indirect capping
    P: 'p',    // Direct capping

    // Anesthesia
    LA_INFILTR: 'la_infiltr',
    LA_LEITUNG: 'la_leitung',
    OHNE_LA: 'ohne_la',

    // MKV/Upsell
    MEHRSCHICHT: 'mehrschicht',
    ADHAESIV: 'adhaesiv',

    // Fluoride
    FLUOR: 'fluor',
} as const;

export type CanonicalChipId = typeof CANONICAL_CHIP_IDS[keyof typeof CANONICAL_CHIP_IDS];

// ═══════════════════════════════════════════════════════════════
// MAPPING: Canonical Option → Chip Activation
// ═══════════════════════════════════════════════════════════════

/**
 * Direct mapping from canonical answers to chip activations
 */
export const ANSWER_TO_CHIP: Record<CanonicalQuestionId, Record<string, CanonicalChipId | null>> = {
    [CANONICAL_QUESTION_IDS.VITALITY]: {
        [CANONICAL_OPTION_IDS.POSITIVE]: CANONICAL_CHIP_IDS.VIPR_POS,
        [CANONICAL_OPTION_IDS.NEGATIVE]: CANONICAL_CHIP_IDS.VIPR_NEG,
    },
    [CANONICAL_QUESTION_IDS.PERCUSSION]: {
        [CANONICAL_OPTION_IDS.POSITIVE]: CANONICAL_CHIP_IDS.PERK_POS,
        [CANONICAL_OPTION_IDS.NEGATIVE]: CANONICAL_CHIP_IDS.PERK_NEG,
    },
    [CANONICAL_QUESTION_IDS.KOFFERDAM]: {
        [CANONICAL_OPTION_IDS.YES]: CANONICAL_CHIP_IDS.KOFFERDAM,
        [CANONICAL_OPTION_IDS.NO]: CANONICAL_CHIP_IDS.REL_TROCKEN,
    },
    [CANONICAL_QUESTION_IDS.TIEFE]: {
        [CANONICAL_OPTION_IDS.NORMAL]: null,  // No chip activation
        [CANONICAL_OPTION_IDS.DEEP]: CANONICAL_CHIP_IDS.CP,
    },
    [CANONICAL_QUESTION_IDS.CAPPING_MATERIAL]: {
        [CANONICAL_OPTION_IDS.CAOH]: CANONICAL_CHIP_IDS.CP,
        [CANONICAL_OPTION_IDS.MTA]: CANONICAL_CHIP_IDS.CP,
        [CANONICAL_OPTION_IDS.BIODENTINE]: CANONICAL_CHIP_IDS.CP,
        [CANONICAL_OPTION_IDS.KEINE]: null,
    },
    [CANONICAL_QUESTION_IDS.MEHRSCHICHT]: {
        [CANONICAL_OPTION_IDS.YES]: CANONICAL_CHIP_IDS.MEHRSCHICHT,
        [CANONICAL_OPTION_IDS.NO]: null,
    },
    [CANONICAL_QUESTION_IDS.ADHAESIV]: {
        [CANONICAL_OPTION_IDS.YES]: CANONICAL_CHIP_IDS.ADHAESIV,
        [CANONICAL_OPTION_IDS.NO]: null,
    },
    [CANONICAL_QUESTION_IDS.ANESTHESIA]: {
        [CANONICAL_OPTION_IDS.INFILTRATION]: CANONICAL_CHIP_IDS.LA_INFILTR,
        [CANONICAL_OPTION_IDS.LEITUNGS]: CANONICAL_CHIP_IDS.LA_LEITUNG,
        [CANONICAL_OPTION_IDS.KEINE_LA]: CANONICAL_CHIP_IDS.OHNE_LA,
    },
    // MKV questions don't directly activate chips
    [CANONICAL_QUESTION_IDS.MKV_VEREINBARUNG]: {},
    [CANONICAL_QUESTION_IDS.MKV_BETRAG]: {},
};

// ═══════════════════════════════════════════════════════════════
// EXCLUSIVE GROUPS
// ═══════════════════════════════════════════════════════════════

/**
 * Chips that are mutually exclusive (only one can be active)
 */
export const EXCLUSIVE_GROUPS: Record<string, CanonicalChipId[]> = {
    vitality: [CANONICAL_CHIP_IDS.VIPR_POS, CANONICAL_CHIP_IDS.VIPR_NEG],
    percussion: [CANONICAL_CHIP_IDS.PERK_POS, CANONICAL_CHIP_IDS.PERK_NEG],
    isolation: [CANONICAL_CHIP_IDS.KOFFERDAM, CANONICAL_CHIP_IDS.REL_TROCKEN],
    anesthesia: [CANONICAL_CHIP_IDS.LA_INFILTR, CANONICAL_CHIP_IDS.LA_LEITUNG, CANONICAL_CHIP_IDS.OHNE_LA],
    capping: [CANONICAL_CHIP_IDS.CP, CANONICAL_CHIP_IDS.P],
};
