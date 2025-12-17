/**
 * Settings UI Registry — SSOT for Settings Option Values + Labels
 *
 * ═══════════════════════════════════════════════════════════════
 * THIS IS THE SINGLE SOURCE OF TRUTH for allowed settings values.
 * V7 UI must import from here. V7 must NOT define its own option sets.
 * ═══════════════════════════════════════════════════════════════
 *
 * RULES:
 * ✅ Allowed values must match settingsStore validation arrays
 * ✅ Labels are German UI display text
 * ❌ No billing logic, no chip activation, no when-clauses
 * ❌ No imports from v7/** or core/billing/**
 */

import { CANONICAL_CHIP_IDS } from './canonicalIds';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface SettingOptionDef {
    /** Stable ID (must match settingsStore enum/type) */
    id: string;
    /** German UI label */
    label: string;
    /** Optional: Maps to a canonical chip ID (for reference, not logic) */
    canonicalChipId?: string;
}

export interface SettingsGroupDef {
    /** Settings path, e.g. 'fuellung.defaults.trockenlegung' */
    path: string;
    /** UI description */
    description: string;
    /** Allowed values (SSOT) */
    allowedValues: SettingOptionDef[];
}

// ═══════════════════════════════════════════════════════════════
// TROCKENLEGUNG
// ═══════════════════════════════════════════════════════════════

export const TROCKENLEGUNG_SETTINGS: SettingsGroupDef = {
    path: 'fuellung.defaults.trockenlegung',
    description: 'Trockenlegungsmethode',
    allowedValues: [
        { id: CANONICAL_CHIP_IDS.KOFFERDAM, label: 'Kofferdam', canonicalChipId: CANONICAL_CHIP_IDS.KOFFERDAM },
        { id: 'relativ', label: 'Relative Trockenlegung', canonicalChipId: CANONICAL_CHIP_IDS.REL_TROCKEN },
        { id: 'fragen', label: 'Jedes Mal fragen' },
    ],
};

// ═══════════════════════════════════════════════════════════════
// ÜBERKAPPUNGSMATERIAL (theracal removed — not in SSOT)
// ═══════════════════════════════════════════════════════════════

export const UEBERKAPPUNG_MATERIAL_SETTINGS: SettingsGroupDef = {
    path: 'fuellung.defaults.ueberkappungMaterial',
    description: 'Standard-Material für Pulpaüberkappung',
    allowedValues: [
        { id: 'caoh', label: 'Ca(OH)₂' },
        { id: 'mta', label: 'MTA' },
        { id: 'biodentine', label: 'Biodentine' },
        { id: 'fragen', label: 'Jedes Mal fragen' },
    ],
};

// ═══════════════════════════════════════════════════════════════
// ANESTHESIA (keine removed — use anesthesia.enabled=false instead)
// ═══════════════════════════════════════════════════════════════

export const ANESTHESIA_UK_POSTERIOR_SETTINGS: SettingsGroupDef = {
    path: 'fuellung.defaults.anesthesia.ukPosteriorMode',
    description: 'Anästhesie-Standard für UK-Seitenzähne',
    allowedValues: [
        { id: 'leitung', label: 'Leitungsanästhesie', canonicalChipId: CANONICAL_CHIP_IDS.LA_LEITUNG },
        { id: 'intraligamentaer', label: 'Intraligamentär (ILA)' },
        { id: 'infiltration', label: 'Infiltration', canonicalChipId: CANONICAL_CHIP_IDS.LA_INFILTR },
        { id: 'fragen', label: 'Jedes Mal fragen' },
    ],
};

export const ANESTHESIA_OK_POSTERIOR_SETTINGS: SettingsGroupDef = {
    path: 'fuellung.defaults.anesthesia.okPosteriorMode',
    description: 'Anästhesie-Standard für OK-Seitenzähne',
    allowedValues: [
        { id: 'infiltration', label: 'Infiltration', canonicalChipId: CANONICAL_CHIP_IDS.LA_INFILTR },
        { id: 'fragen', label: 'Jedes Mal fragen' },
    ],
};

export const ANESTHESIA_FRONT_SETTINGS: SettingsGroupDef = {
    path: 'fuellung.defaults.anesthesia.frontMode',
    description: 'Anästhesie-Standard für Frontzähne',
    allowedValues: [
        { id: 'infiltration', label: 'Infiltration', canonicalChipId: CANONICAL_CHIP_IDS.LA_INFILTR },
        { id: 'fragen', label: 'Jedes Mal fragen' },
    ],
};

// ═══════════════════════════════════════════════════════════════
// MATRIX
// ═══════════════════════════════════════════════════════════════

export const MATRIX_APPROX_SETTINGS: SettingsGroupDef = {
    path: 'fuellung.defaults.matrix.approximalMode',
    description: 'Matrizensystem bei approximalen Füllungen',
    allowedValues: [
        { id: 'sektional', label: 'Sektionalmatrize' },
        { id: 'tofflemire', label: 'Tofflemire' },
        { id: 'fragen', label: 'Jedes Mal fragen' },
    ],
};

export const MATRIX_WEDGE_SETTINGS: SettingsGroupDef = {
    path: 'fuellung.defaults.matrix.wedge',
    description: 'Interdentalkeile',
    allowedValues: [
        { id: 'holz', label: 'Holzkeil' },
        { id: 'kunststoff', label: 'Kunststoffkeil' },
        { id: 'fragen', label: 'Jedes Mal fragen' },
    ],
};

export const MATRIX_RING_SETTINGS: SettingsGroupDef = {
    path: 'fuellung.defaults.matrix.ring',
    description: 'Separationsring',
    allowedValues: [
        { id: 'ja', label: 'Mit Separationsring' },
        { id: 'nein', label: 'Ohne Separationsring' },
        { id: 'fragen', label: 'Jedes Mal fragen' },
    ],
};

// ═══════════════════════════════════════════════════════════════
// REGISTRY LOOKUP
// ═══════════════════════════════════════════════════════════════

export const SETTINGS_UI_REGISTRY: Record<string, SettingsGroupDef> = {
    'fuellung.defaults.trockenlegung': TROCKENLEGUNG_SETTINGS,
    'fuellung.defaults.ueberkappungMaterial': UEBERKAPPUNG_MATERIAL_SETTINGS,
    'fuellung.defaults.anesthesia.ukPosteriorMode': ANESTHESIA_UK_POSTERIOR_SETTINGS,
    'fuellung.defaults.anesthesia.okPosteriorMode': ANESTHESIA_OK_POSTERIOR_SETTINGS,
    'fuellung.defaults.anesthesia.frontMode': ANESTHESIA_FRONT_SETTINGS,
    'fuellung.defaults.matrix.approximalMode': MATRIX_APPROX_SETTINGS,
    'fuellung.defaults.matrix.wedge': MATRIX_WEDGE_SETTINGS,
    'fuellung.defaults.matrix.ring': MATRIX_RING_SETTINGS,
};

/**
 * Get allowed values for a settings path.
 */
export function getSettingsAllowedValues(path: string): SettingOptionDef[] {
    return SETTINGS_UI_REGISTRY[path]?.allowedValues ?? [];
}

/**
 * Get label for a settings value.
 */
export function getSettingsLabel(path: string, valueId: string): string {
    const group = SETTINGS_UI_REGISTRY[path];
    if (!group) return valueId;
    const option = group.allowedValues.find(v => v.id === valueId);
    return option?.label ?? valueId;
}

/**
 * Validate if a value is allowed for a settings path.
 */
export function isValidSettingsValue(path: string, valueId: string): boolean {
    const group = SETTINGS_UI_REGISTRY[path];
    if (!group) return false;
    return group.allowedValues.some(v => v.id === valueId);
}
