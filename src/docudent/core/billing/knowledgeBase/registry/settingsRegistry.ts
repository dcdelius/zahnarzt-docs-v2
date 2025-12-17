/**
 * Settings Registry — SSOT for Füllung Practice Settings
 * 
 * This registry defines all valid setting options with:
 * - Stable IDs for programmatic access
 * - UI labels for display
 * - Mappings to chip IDs (if they affect billing)
 * - Mappings to docFacts (if they affect documentation only)
 * 
 * ❌ FORBIDDEN: Direct string comparisons ('kofferdam', 'leitung') in output composers
 * ✅ REQUIRED: Use this registry to resolve setting values to labels/chips/facts
 */

import { CANONICAL_CHIP_IDS } from '../../../../contracts/canonicalIds';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type SettingCategory = 'billingChip' | 'docFact' | 'uiOnly';

export interface SettingOptionDef {
    /** Stable ID (matches settingsStore value) */
    id: string;
    /** German UI label */
    label: string;
    /** What category this affects */
    category: SettingCategory;
    /** If billingChip: which canonical chip to activate */
    activatesChipId?: string;
    /** If docFact: what fact to set in documentation */
    setsDocFact?: Record<string, string | boolean>;
    /** Optional: GOZ/BEMA code references */
    billingRefs?: string[];
}

export interface SettingGroupDef {
    /** Group identifier matching settingsStore path */
    path: string;
    /** Group description */
    description: string;
    /** Ordered list of valid options */
    options: SettingOptionDef[];
}

// ═══════════════════════════════════════════════════════════════
// TROCKENLEGUNG
// ═══════════════════════════════════════════════════════════════

export const TROCKENLEGUNG_OPTIONS: SettingGroupDef = {
    path: 'fuellung.defaults.trockenlegung',
    description: 'Trockenlegungsmethode als Praxis-Standard',
    options: [
        {
            id: 'kofferdam',
            label: 'Kofferdam',
            category: 'billingChip',
            activatesChipId: CANONICAL_CHIP_IDS.KOFFERDAM,
            setsDocFact: { trockenlegung: 'absolut', method: 'Kofferdam' },
        },
        {
            id: 'relativ',
            label: 'Relative Trockenlegung',
            category: 'billingChip',
            activatesChipId: CANONICAL_CHIP_IDS.REL_TROCKEN,
            setsDocFact: { trockenlegung: 'relativ', method: 'Watterollen' },
        },
        {
            id: 'fragen',
            label: 'Jedes Mal fragen',
            category: 'uiOnly',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════
// ÜBERKAPPUNGSMATERIAL
// ═══════════════════════════════════════════════════════════════

export const UEBERKAPPUNG_MATERIAL_OPTIONS: SettingGroupDef = {
    path: 'fuellung.defaults.ueberkappungMaterial',
    description: 'Standard-Material für Pulpaüberkappung',
    options: [
        {
            id: 'caoh',
            label: 'Ca(OH)₂',
            category: 'docFact',
            setsDocFact: { ueberkappungMaterial: 'Ca(OH)₂ (Calciumhydroxid)' },
        },
        {
            id: 'mta',
            label: 'MTA',
            category: 'docFact',
            setsDocFact: { ueberkappungMaterial: 'MTA (Mineral Trioxide Aggregate)' },
        },
        {
            id: 'biodentine',
            label: 'Biodentine',
            category: 'docFact',
            setsDocFact: { ueberkappungMaterial: 'Biodentine' },
        },
        {
            id: 'fragen',
            label: 'Jedes Mal fragen',
            category: 'uiOnly',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════
// ANÄSTHESIE
// ═══════════════════════════════════════════════════════════════

export const ANESTHESIA_UK_POSTERIOR_OPTIONS: SettingGroupDef = {
    path: 'fuellung.defaults.anesthesia.ukPosteriorMode',
    description: 'Anästhesie-Standard für UK-Seitenzähne',
    options: [
        {
            id: 'leitung',
            label: 'Leitungsanästhesie',
            category: 'billingChip',
            activatesChipId: CANONICAL_CHIP_IDS.LA_LEITUNG,
            setsDocFact: { anesthesiaType: 'Leitungsanästhesie', region: 'UK-Seitenzahn' },
            billingRefs: ['BEMA 41a', 'GOZ 0090'],
        },
        {
            id: 'intraligamentaer',
            label: 'Intraligamentär (ILA)',
            // ILA is a DISTINCT technique but uses SAME billing codes as infiltration
            // Therefore: docFact (not billingChip) - text differs, billing same
            category: 'docFact',
            // NO activatesChipId - billing is handled by the anesthesia question flow, not settings
            setsDocFact: { anesthesiaType: 'Intraligamentäranästhesie (ILA)', technique: 'ila', region: 'UK-Seitenzahn' },
            billingRefs: ['BEMA 41a', 'GOZ 0090'],
        },
        {
            id: 'infiltration',
            label: 'Infiltration',
            category: 'billingChip',
            activatesChipId: CANONICAL_CHIP_IDS.LA_INFILTR,
            setsDocFact: { anesthesiaType: 'Infiltrationsanästhesie', region: 'UK-Seitenzahn' },
            billingRefs: ['BEMA 41a', 'GOZ 0090'],
        },
        {
            id: 'fragen',
            label: 'Jedes Mal fragen',
            category: 'uiOnly',
        },
    ],
};

export const ANESTHESIA_OK_POSTERIOR_OPTIONS: SettingGroupDef = {
    path: 'fuellung.defaults.anesthesia.okPosteriorMode',
    description: 'Anästhesie-Standard für OK-Seitenzähne',
    options: [
        {
            id: 'infiltration',
            label: 'Infiltration',
            category: 'billingChip',
            activatesChipId: CANONICAL_CHIP_IDS.LA_INFILTR,
            setsDocFact: { anesthesiaType: 'Infiltrationsanästhesie', region: 'OK-Seitenzahn' },
            billingRefs: ['BEMA 41a', 'GOZ 0090'],
        },
        {
            id: 'fragen',
            label: 'Jedes Mal fragen',
            category: 'uiOnly',
        },
    ],
};

export const ANESTHESIA_FRONT_OPTIONS: SettingGroupDef = {
    path: 'fuellung.defaults.anesthesia.frontMode',
    description: 'Anästhesie-Standard für Frontzähne',
    options: [
        {
            id: 'infiltration',
            label: 'Infiltration',
            category: 'billingChip',
            activatesChipId: CANONICAL_CHIP_IDS.LA_INFILTR,
            setsDocFact: { anesthesiaType: 'Infiltrationsanästhesie', region: 'Frontzahn' },
            billingRefs: ['BEMA 41a', 'GOZ 0090'],
        },
        {
            id: 'fragen',
            label: 'Jedes Mal fragen',
            category: 'uiOnly',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════
// MATRIX
// ═══════════════════════════════════════════════════════════════

export const MATRIX_APPROX_OPTIONS: SettingGroupDef = {
    path: 'fuellung.defaults.matrix.approximalMode',
    description: 'Matrizensystem bei approximalen Füllungen',
    options: [
        {
            id: 'sektional',
            label: 'Sektionalmatrize',
            category: 'docFact',
            setsDocFact: { matrixSystem: 'Sektionalmatrize' },
        },
        {
            id: 'tofflemire',
            label: 'Tofflemire-Matrize',
            category: 'docFact',
            setsDocFact: { matrixSystem: 'Tofflemire-Matrize' },
        },
        {
            id: 'fragen',
            label: 'Jedes Mal fragen',
            category: 'uiOnly',
        },
    ],
};

export const MATRIX_WEDGE_OPTIONS: SettingGroupDef = {
    path: 'fuellung.defaults.matrix.wedge',
    description: 'Interdentalkeile',
    options: [
        {
            id: 'holz',
            label: 'Holzkeil',
            category: 'docFact',
            setsDocFact: { wedge: 'Holzkeil' },
        },
        {
            id: 'kunststoff',
            label: 'Kunststoffkeil',
            category: 'docFact',
            setsDocFact: { wedge: 'Kunststoffkeil' },
        },
        {
            id: 'fragen',
            label: 'Jedes Mal fragen',
            category: 'uiOnly',
        },
    ],
};

export const MATRIX_RING_OPTIONS: SettingGroupDef = {
    path: 'fuellung.defaults.matrix.ring',
    description: 'Separationsring',
    options: [
        {
            id: 'ja',
            label: 'Mit Separationsring',
            category: 'docFact',
            setsDocFact: { separationRing: true },
        },
        {
            id: 'nein',
            label: 'Ohne Separationsring',
            category: 'docFact',
            setsDocFact: { separationRing: false },
        },
        {
            id: 'fragen',
            label: 'Jedes Mal fragen',
            category: 'uiOnly',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════
// REGISTRY LOOKUP
// ═══════════════════════════════════════════════════════════════

export const FUELLUNG_SETTINGS_REGISTRY: Record<string, SettingGroupDef> = {
    'trockenlegung': TROCKENLEGUNG_OPTIONS,
    'ueberkappungMaterial': UEBERKAPPUNG_MATERIAL_OPTIONS,
    'anesthesia.ukPosteriorMode': ANESTHESIA_UK_POSTERIOR_OPTIONS,
    'anesthesia.okPosteriorMode': ANESTHESIA_OK_POSTERIOR_OPTIONS,
    'anesthesia.frontMode': ANESTHESIA_FRONT_OPTIONS,
    'matrix.approximalMode': MATRIX_APPROX_OPTIONS,
    'matrix.wedge': MATRIX_WEDGE_OPTIONS,
    'matrix.ring': MATRIX_RING_OPTIONS,
};

/**
 * Resolve a setting ID to its definition.
 * @param groupKey - Group key like 'trockenlegung' or 'matrix.wedge'
 * @param optionId - Option ID like 'kofferdam' or 'holz'
 */
export function resolveSettingOption(
    groupKey: string,
    optionId: string
): SettingOptionDef | undefined {
    const group = FUELLUNG_SETTINGS_REGISTRY[groupKey];
    if (!group) return undefined;
    return group.options.find(opt => opt.id === optionId);
}

/**
 * Get the UI label for a setting value.
 */
export function getSettingLabel(groupKey: string, optionId: string): string {
    const option = resolveSettingOption(groupKey, optionId);
    return option?.label ?? optionId;
}

/**
 * Get the chip ID that should be activated for a setting value.
 * Returns undefined if the setting doesn't activate a chip.
 */
export function getSettingChipId(groupKey: string, optionId: string): string | undefined {
    const option = resolveSettingOption(groupKey, optionId);
    return option?.activatesChipId;
}

/**
 * Get the doc facts that should be set for a setting value.
 */
export function getSettingDocFacts(
    groupKey: string,
    optionId: string
): Record<string, string | boolean> | undefined {
    const option = resolveSettingOption(groupKey, optionId);
    return option?.setsDocFact;
}

/**
 * Check if a setting option is a billing chip (affects codes).
 */
export function isSettingBillingRelevant(groupKey: string, optionId: string): boolean {
    const option = resolveSettingOption(groupKey, optionId);
    return option?.category === 'billingChip';
}
