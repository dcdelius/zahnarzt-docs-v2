/**
 * V7 Setting Options — THIN LAYER (imports from contracts/)
 *
 * ═══════════════════════════════════════════════════════════════
 * THIS FILE MUST NOT DEFINE OPTION SETS OR ALLOWED VALUES.
 * All options come from contracts/settingsUiRegistry.ts (SSOT).
 * ═══════════════════════════════════════════════════════════════
 *
 * RULES:
 * ✅ Import from contracts/settingsUiRegistry
 * ✅ Provide convenience re-exports for V7 components
 * ❌ No `options: [...]` arrays
 * ❌ No imports from core/billing/**
 */

// Re-export from SSOT
export {
    type SettingOptionDef,
    type SettingsGroupDef,
    SETTINGS_UI_REGISTRY,
    getSettingsAllowedValues,
    getSettingsLabel,
    isValidSettingsValue,
} from '../../contracts/settingsUiRegistry';

// ═══════════════════════════════════════════════════════════════
// V7 CONVENIENCE TYPES (re-exported for component imports)
// ═══════════════════════════════════════════════════════════════

/** UI option type for settings dropdowns */
export type SettingOptionUI = {
    id: string;
    label: string;
};

// ═══════════════════════════════════════════════════════════════
// V7 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

import { getSettingsAllowedValues as getAllowedValues, getSettingsLabel as getLabel } from '../../contracts/settingsUiRegistry';

/**
 * Get options for a setting group (legacy API for V7 components).
 * Maps settingsUiRegistry format to V7 SettingOptionUI format.
 */
export function getSettingOptions(groupKey: string): SettingOptionUI[] {
    // Map short keys to full paths
    const pathMap: Record<string, string> = {
        'trockenlegung': 'fuellung.defaults.trockenlegung',
        'ueberkappungMaterial': 'fuellung.defaults.ueberkappungMaterial',
        'anaesthesie.ok_frontzahn': 'fuellung.defaults.anesthesia.okPosteriorMode',
        'anaesthesie.uk_frontzahn': 'fuellung.defaults.anesthesia.frontMode',
        'anaesthesie.uk_molar': 'fuellung.defaults.anesthesia.ukPosteriorMode',
        'matrix.approximalMode': 'fuellung.defaults.matrix.approximalMode',
    };

    const fullPath = pathMap[groupKey] ?? groupKey;
    const options = getAllowedValues(fullPath);

    return options.map(o => ({ id: o.id, label: o.label }));
}

/**
 * Get label for an option ID within a group (legacy API).
 */
export function getSettingLabel(groupKey: string, optionId: string): string {
    const pathMap: Record<string, string> = {
        'trockenlegung': 'fuellung.defaults.trockenlegung',
        'ueberkappungMaterial': 'fuellung.defaults.ueberkappungMaterial',
        'anaesthesie.ok_frontzahn': 'fuellung.defaults.anesthesia.okPosteriorMode',
        'anaesthesie.uk_frontzahn': 'fuellung.defaults.anesthesia.frontMode',
        'anaesthesie.uk_molar': 'fuellung.defaults.anesthesia.ukPosteriorMode',
        'matrix.approximalMode': 'fuellung.defaults.matrix.approximalMode',
    };

    const fullPath = pathMap[groupKey] ?? groupKey;
    return getLabel(fullPath, optionId);
}

// ═══════════════════════════════════════════════════════════════
// FUELLUNG_UI_OPTIONS — Legacy API for SummaryChips component
// ═══════════════════════════════════════════════════════════════

/**
 * Pre-built options map for filling-related settings.
 * Used by SummaryChips and EditableSummaryChip components.
 */
// ALLOWED: options are dynamically fetched from contracts/settingsUiRegistry via getSettingOptions()
export const FUELLUNG_UI_OPTIONS: Record<string, { options: SettingOptionUI[] }> = { // ALLOWED
    'trockenlegung': {
        options: getSettingOptions('trockenlegung'),
    },
    'ueberkappungMaterial': {
        options: getSettingOptions('ueberkappungMaterial'),
    },
    'anaesthesie.ok_frontzahn': {
        options: getSettingOptions('anaesthesie.ok_frontzahn'),
    },
    'anaesthesie.uk_frontzahn': {
        options: getSettingOptions('anaesthesie.uk_frontzahn'),
    },
    'anaesthesie.uk_molar': {
        options: getSettingOptions('anaesthesie.uk_molar'),
    },
    'matrix.approximalMode': {
        options: getSettingOptions('matrix.approximalMode'),
    },
};

