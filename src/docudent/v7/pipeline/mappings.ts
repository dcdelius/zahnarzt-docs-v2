/**
 * ID Mapping Tables — Semantic to Canonical Translation
 *
 * This file contains ALL translation mappings.
 * NO regex or string matching in other files.
 *
 * To add a new treatment:
 * 1. Add entry to QUESTION_ID_ALIASES[treatmentId]
 * 2. Add entry to OPTION_ID_ALIASES[treatmentId]
 */

import {
    CANONICAL_QUESTION_IDS,
    CANONICAL_OPTION_IDS,
    type CanonicalQuestionId,
    type CanonicalOptionId
} from '../../contracts/canonicalIds';

// ═══════════════════════════════════════════════════════════════
// QUESTION ID ALIASES
// Maps semantic questionId → canonical questionId
// ═══════════════════════════════════════════════════════════════

export const QUESTION_ID_ALIASES: Record<string, Record<string, CanonicalQuestionId>> = {
    fuellung: {
        // Forensic questions
        'vitality': CANONICAL_QUESTION_IDS.VITALITY,
        'rule_vitality': CANONICAL_QUESTION_IDS.VITALITY,
        'forensic_vitality': CANONICAL_QUESTION_IDS.VITALITY,

        'percussion': CANONICAL_QUESTION_IDS.PERCUSSION,
        'rule_percussion': CANONICAL_QUESTION_IDS.PERCUSSION,
        'forensic_percussion': CANONICAL_QUESTION_IDS.PERCUSSION,

        'isolation': CANONICAL_QUESTION_IDS.KOFFERDAM,
        'kofferdam': CANONICAL_QUESTION_IDS.KOFFERDAM,
        'forensic_isolation': CANONICAL_QUESTION_IDS.KOFFERDAM,
        'forensic_kofferdam': CANONICAL_QUESTION_IDS.KOFFERDAM,
        'upsell_kofferdam': CANONICAL_QUESTION_IDS.KOFFERDAM,

        'tiefe': CANONICAL_QUESTION_IDS.TIEFE,
        'rule_tiefe': CANONICAL_QUESTION_IDS.TIEFE,
        'forensic_tiefe': CANONICAL_QUESTION_IDS.TIEFE,
        'cavity_depth': CANONICAL_QUESTION_IDS.TIEFE,

        'material': CANONICAL_QUESTION_IDS.CAPPING_MATERIAL,
        'capping': CANONICAL_QUESTION_IDS.CAPPING_MATERIAL,
        'forensic_material': CANONICAL_QUESTION_IDS.CAPPING_MATERIAL,
        'forensic_capping': CANONICAL_QUESTION_IDS.CAPPING_MATERIAL,

        // MKV
        'mkv_vereinbarung': CANONICAL_QUESTION_IDS.MKV_VEREINBARUNG,
        'mkv_betrag': CANONICAL_QUESTION_IDS.MKV_BETRAG,

        // Upsell
        'mehrschicht': CANONICAL_QUESTION_IDS.MEHRSCHICHT,
        'mkv_mehrschicht': CANONICAL_QUESTION_IDS.MEHRSCHICHT,
        'upsell_mehrschicht': CANONICAL_QUESTION_IDS.MEHRSCHICHT,

        'adhaesiv': CANONICAL_QUESTION_IDS.ADHAESIV,
        'adhasiv': CANONICAL_QUESTION_IDS.ADHAESIV, // typo alias
        'upsell_adhaesiv': CANONICAL_QUESTION_IDS.ADHAESIV,

        // Anesthesia (if asked)
        'anesthesia': CANONICAL_QUESTION_IDS.ANESTHESIA,
        'forensic_anesthesia': CANONICAL_QUESTION_IDS.ANESTHESIA,
    }
};

// ═══════════════════════════════════════════════════════════════
// OPTION ID ALIASES
// Maps semantic optionId → canonical optionId
// Keyed by canonical questionId for clarity
// ═══════════════════════════════════════════════════════════════

export const OPTION_ID_ALIASES: Record<string, Record<string, Record<string, CanonicalOptionId>>> = {
    fuellung: {
        // Vitality
        [CANONICAL_QUESTION_IDS.VITALITY]: {
            'pos': CANONICAL_OPTION_IDS.POSITIVE,
            'positive': CANONICAL_OPTION_IDS.POSITIVE,
            '+': CANONICAL_OPTION_IDS.POSITIVE,
            'neg': CANONICAL_OPTION_IDS.NEGATIVE,
            'negative': CANONICAL_OPTION_IDS.NEGATIVE,
            '-': CANONICAL_OPTION_IDS.NEGATIVE,
        },

        // Percussion
        [CANONICAL_QUESTION_IDS.PERCUSSION]: {
            'pos': CANONICAL_OPTION_IDS.POSITIVE,
            'positive': CANONICAL_OPTION_IDS.POSITIVE,
            '+': CANONICAL_OPTION_IDS.POSITIVE,
            'neg': CANONICAL_OPTION_IDS.NEGATIVE,
            'negative': CANONICAL_OPTION_IDS.NEGATIVE,
            '-': CANONICAL_OPTION_IDS.NEGATIVE,
        },

        // Kofferdam/Isolation
        [CANONICAL_QUESTION_IDS.KOFFERDAM]: {
            'kofferdam': CANONICAL_OPTION_IDS.YES,
            'yes': CANONICAL_OPTION_IDS.YES,
            'ja': CANONICAL_OPTION_IDS.YES,
            'relativ': CANONICAL_OPTION_IDS.NO,
            'relative': CANONICAL_OPTION_IDS.NO,
            'no': CANONICAL_OPTION_IDS.NO,
            'nein': CANONICAL_OPTION_IDS.NO,
        },

        // Tiefe
        [CANONICAL_QUESTION_IDS.TIEFE]: {
            'normal': CANONICAL_OPTION_IDS.NORMAL,
            'flach': CANONICAL_OPTION_IDS.NORMAL,
            'tief': CANONICAL_OPTION_IDS.DEEP,
            'deep': CANONICAL_OPTION_IDS.DEEP,
            'pulpanah': CANONICAL_OPTION_IDS.DEEP,
            'profunda': CANONICAL_OPTION_IDS.DEEP,
        },

        // Capping Material
        [CANONICAL_QUESTION_IDS.CAPPING_MATERIAL]: {
            'caoh': CANONICAL_OPTION_IDS.CAOH,
            'ca(oh)2': CANONICAL_OPTION_IDS.CAOH,
            'calciumhydroxid': CANONICAL_OPTION_IDS.CAOH,
            'mta': CANONICAL_OPTION_IDS.MTA,
            'biodentine': CANONICAL_OPTION_IDS.BIODENTINE,
            'keine': CANONICAL_OPTION_IDS.KEINE,
            'none': CANONICAL_OPTION_IDS.KEINE,
        },

        // Binary yes/no for other questions
        [CANONICAL_QUESTION_IDS.MKV_VEREINBARUNG]: {
            'yes': CANONICAL_OPTION_IDS.YES,
            'ja': CANONICAL_OPTION_IDS.YES,
            'no': CANONICAL_OPTION_IDS.NO,
            'nein': CANONICAL_OPTION_IDS.NO,
        },

        [CANONICAL_QUESTION_IDS.MEHRSCHICHT]: {
            'yes': CANONICAL_OPTION_IDS.YES,
            'ja': CANONICAL_OPTION_IDS.YES,
            'no': CANONICAL_OPTION_IDS.NO,
            'nein': CANONICAL_OPTION_IDS.NO,
        },

        [CANONICAL_QUESTION_IDS.ADHAESIV]: {
            'yes': CANONICAL_OPTION_IDS.YES,
            'ja': CANONICAL_OPTION_IDS.YES,
            'no': CANONICAL_OPTION_IDS.NO,
            'nein': CANONICAL_OPTION_IDS.NO,
        },

        // Anesthesia
        [CANONICAL_QUESTION_IDS.ANESTHESIA]: {
            'infiltr': CANONICAL_OPTION_IDS.INFILTRATION,
            'infiltration': CANONICAL_OPTION_IDS.INFILTRATION,
            'leitung': CANONICAL_OPTION_IDS.LEITUNGS,
            'leitungs': CANONICAL_OPTION_IDS.LEITUNGS,
            'keine': CANONICAL_OPTION_IDS.KEINE_LA,
            'none': CANONICAL_OPTION_IDS.KEINE_LA,
        },
    }
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Get available treatments
// ═══════════════════════════════════════════════════════════════

export function getAvailableTreatments(): string[] {
    return Object.keys(QUESTION_ID_ALIASES);
}

export function hasTreatmentMappings(treatmentId: string): boolean {
    return treatmentId in QUESTION_ID_ALIASES && treatmentId in OPTION_ID_ALIASES;
}
