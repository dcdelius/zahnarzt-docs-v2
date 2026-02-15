/**
 * M44: Control Mapping — Param Controls to Multiple Chips
 * 
 * Maps virtual param controls (like 'wf_technique') to underlying chip IDs.
 */

import type { ChipOverride } from './useChipOverrides';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ParamControlMapping {
    /** Virtual control ID (e.g., 'wf_technique') */
    controlId: string;
    /** Underlying chip IDs that this control maps to */
    chipIds: string[];
    /** Maps option value → chip ID */
    valueToChipId: Record<string, string>;
}

export type ChipOverrides = Record<string, ChipOverride>;

// ═══════════════════════════════════════════════════════════════
// CONTROL MAPPINGS
// ═══════════════════════════════════════════════════════════════

/** WF Technique mapping (Endo) */
export const WF_TECHNIQUE_MAPPING: ParamControlMapping = {
    controlId: 'wf_technique',
    chipIds: ['wf_kalt', 'wf_warm', 'wf_einzel'],
    valueToChipId: {
        'kalt': 'wf_kalt',
        'warm': 'wf_warm',
        'einzel': 'wf_einzel',
    },
};

/** WL Method mapping (Endo) */
export const WL_METHOD_MAPPING: ParamControlMapping = {
    controlId: 'wl_method',
    chipIds: ['laengenmessung_elek', 'laengenmessung_roentgen'],
    valueToChipId: {
        'elektrisch': 'laengenmessung_elek',
        'roentgen': 'laengenmessung_roentgen',
    },
};

/** LA Type mapping (common) */
export const LA_TYPE_MAPPING: ParamControlMapping = {
    controlId: 'la_type',
    chipIds: ['la_infiltr', 'la_leitung'],
    valueToChipId: {
        'infiltr': 'la_infiltr',
        'leitung': 'la_leitung',
    },
};

/** Überkappung mapping (Fuellung) */
export const UEBERKAPPUNG_MAPPING: ParamControlMapping = {
    controlId: 'ueberkappung',
    chipIds: ['p', 'cp'],
    valueToChipId: {
        'direkt': 'p',
        'indirekt': 'cp',
    },
};

// ═══════════════════════════════════════════════════════════════
// FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Apply a param control selection to chip overrides.
 * Sets the selected chip to 'on', others to 'off'.
 * 
 * @param overrides Current chip overrides
 * @param mapping The param control mapping
 * @param value Selected option value (or 'none' to turn all off)
 * @returns New overrides with applied changes
 */
export function applyParamControl(
    overrides: ChipOverrides,
    mapping: ParamControlMapping,
    value: string
): ChipOverrides {
    const result = { ...overrides };

    // Set all chips in the mapping to 'off' first
    for (const chipId of mapping.chipIds) {
        result[chipId] = { state: 'off' };
    }

    // If 'none' or empty, just turn everything off
    if (!value || value === 'none') {
        return result;
    }

    // Set the selected chip to 'on'
    const selectedChipId = mapping.valueToChipId[value];
    if (selectedChipId) {
        result[selectedChipId] = { state: 'on' };
    }

    return result;
}

/**
 * Get current value for a param control from chip overrides.
 * 
 * @param overrides Current chip overrides
 * @param mapping The param control mapping
 * @returns The current option value, or 'none' if nothing selected
 */
export function getParamControlValue(
    overrides: ChipOverrides,
    mapping: ParamControlMapping
): string {
    for (const [value, chipId] of Object.entries(mapping.valueToChipId)) {
        const override = overrides[chipId];
        if (override?.state === 'on') {
            return value;
        }
    }
    return 'none';
}

/**
 * Get mapping by control ID.
 */
export function getMappingByControlId(controlId: string): ParamControlMapping | null {
    const mappings: ParamControlMapping[] = [
        WF_TECHNIQUE_MAPPING,
        WL_METHOD_MAPPING,
        LA_TYPE_MAPPING,
        UEBERKAPPUNG_MAPPING,
    ];

    return mappings.find(m => m.controlId === controlId) || null;
}
