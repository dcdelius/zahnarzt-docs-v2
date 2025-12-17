/**
 * SettingsForm — Curated Settings Editor
 *
 * ═══════════════════════════════════════════════════════════════
 * Premium pill-style form for 5 curated settings.
 * Values from SSOT (contracts/settingsUiRegistry).
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { colors, gradients, space, radii, typography, glass, motion as motionTokens } from '../app/designTokens';
import {
    SETTINGS_UI_REGISTRY,
    getSettingsAllowedValues,
    type SettingOptionDef,
} from '../../contracts/settingsUiRegistry';

// ═══════════════════════════════════════════════════════════════
// CURATED SETTINGS (5 as per spec)
// ═══════════════════════════════════════════════════════════════

const CURATED_SETTINGS_PATHS = [
    'fuellung.defaults.trockenlegung',
    'fuellung.defaults.ueberkappungMaterial',
    'fuellung.defaults.anesthesia.ukPosteriorMode',
    // Add endo paths once they're in registry, using fuellung for now
    'fuellung.defaults.matrix.approximalMode',
    'fuellung.defaults.matrix.wedge',
] as const;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface SettingsFormProps {
    onSave: (overrides: Record<string, unknown>) => Promise<void>;
    isSaving: boolean;
}

interface SettingRowProps {
    path: string;
    label: string;
    options: SettingOptionDef[];
    value: string;
    onChange: (value: string) => void;
    disabled: boolean;
}

// ═══════════════════════════════════════════════════════════════
// SETTING ROW
// ═══════════════════════════════════════════════════════════════

function SettingRow({ path, label, options, value, onChange, disabled }: SettingRowProps) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${space['4']} 0`,
                borderBottom: `1px solid ${colors.hairlineSubtle}`,
            }}
        >
            <div>
                <div
                    style={{
                        fontSize: typography.body,
                        fontWeight: typography.medium,
                        color: colors.textPrimary,
                    }}
                >
                    {label}
                </div>
                <div
                    style={{
                        fontSize: typography.label,
                        color: colors.textMuted,
                        marginTop: space['1'],
                    }}
                >
                    {path}
                </div>
            </div>

            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                style={{
                    padding: `${space['2']} ${space['4']}`,
                    borderRadius: radii.md,
                    border: `1px solid ${colors.hairline}`,
                    background: disabled ? colors.hairlineSubtle : colors.surface,
                    color: colors.textPrimary,
                    fontSize: typography.small,
                    fontWeight: typography.medium,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    minWidth: '180px',
                    outline: 'none',
                }}
            >
                {options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function SettingsForm({ onSave, isSaving }: SettingsFormProps) {
    // Initialize state from curated paths
    const [values, setValues] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        for (const path of CURATED_SETTINGS_PATHS) {
            const options = getSettingsAllowedValues(path);
            initial[path] = options[0]?.id ?? '';
        }
        return initial;
    });

    const [hasChanges, setHasChanges] = useState(false);

    const handleChange = (path: string, value: string) => {
        setValues((prev) => ({ ...prev, [path]: value }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        await onSave(values);
        setHasChanges(false);
    };

    return (
        <div>
            {/* Settings list */}
            <div style={{ marginBottom: space['6'] }}>
                {CURATED_SETTINGS_PATHS.map((path) => {
                    const group = SETTINGS_UI_REGISTRY[path];
                    if (!group) return null;

                    return (
                        <SettingRow
                            key={path}
                            path={path}
                            label={group.description}
                            options={group.allowedValues}
                            value={values[path] ?? ''}
                            onChange={(v) => handleChange(path, v)}
                            disabled={isSaving}
                        />
                    );
                })}
            </div>

            {/* Save button */}
            <motion.button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                style={{
                    padding: `${space['3']} ${space['6']}`,
                    borderRadius: radii.pill,
                    border: 'none',
                    background: hasChanges ? gradients.primary : colors.hairline,
                    color: hasChanges ? colors.textOnAccent : colors.textMuted,
                    fontSize: typography.body,
                    fontWeight: typography.semibold,
                    cursor: isSaving || !hasChanges ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.7 : 1,
                }}
                whileHover={hasChanges && !isSaving ? { scale: 1.02 } : {}}
                whileTap={hasChanges && !isSaving ? { scale: 0.98 } : {}}
            >
                {isSaving ? 'Speichern...' : 'Einstellungen speichern'}
            </motion.button>
        </div>
    );
}

export default SettingsForm;
