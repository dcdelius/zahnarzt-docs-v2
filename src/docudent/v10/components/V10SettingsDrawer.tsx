/**
 * V10SettingsDrawer — Practice + User Settings Modal
 * 
 * M36: V8-style settings drawer with tabs for Practice and User defaults.
 */

import React, { useState } from 'react';
import './V10SettingsDrawer.css';
import type { PracticeSettings, UserSettings } from '../settings/settingsTypes';
import {
    getPracticeDefaultIsolation,
    getUserDefaultCappingMaterial,
    getUserDefaultLAType,
    patchPracticeDefaultIsolation,
    patchUserDefaultCappingMaterial,
    patchUserDefaultLAType,
} from '../settings/medicalDefaults';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Props {
    isOpen: boolean;
    onClose: () => void;
    practiceSettings: PracticeSettings;
    userSettings: UserSettings;
    onUpdatePractice: (updates: Partial<PracticeSettings>) => void;
    onUpdateUser: (updates: Partial<UserSettings>) => void;
    onReset: () => void;
}

type TabType = 'practice' | 'user';

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function V10SettingsDrawer({
    isOpen,
    onClose,
    practiceSettings,
    userSettings,
    onUpdatePractice,
    onUpdateUser,
    onReset,
}: Props) {
    const [activeTab, setActiveTab] = useState<TabType>('practice');

    if (!isOpen) return null;

    return (
        <div className="v10-settings-overlay" onClick={onClose}>
            <div className="v10-settings-drawer" onClick={e => e.stopPropagation()} data-testid="v10-settings-drawer">
                <div className="v10-settings-header">
                    <h2>Einstellungen</h2>
                    <button className="v10-close-btn" onClick={onClose}>×</button>
                </div>

                <div className="v10-settings-tabs">
                    <button
                        className={`v10-tab ${activeTab === 'practice' ? 'active' : ''}`}
                        onClick={() => setActiveTab('practice')}
                        data-testid="v10-settings-tab-practice"
                    >
                        Praxis
                    </button>
                    <button
                        className={`v10-tab ${activeTab === 'user' ? 'active' : ''}`}
                        onClick={() => setActiveTab('user')}
                        data-testid="v10-settings-tab-user"
                    >
                        Benutzer
                    </button>
                </div>

                <div className="v10-settings-content">
                    {activeTab === 'practice' && (
                        <PracticeSettingsPanel
                            settings={practiceSettings}
                            onUpdate={onUpdatePractice}
                        />
                    )}
                    {activeTab === 'user' && (
                        <UserSettingsPanel
                            settings={userSettings}
                            onUpdate={onUpdateUser}
                        />
                    )}
                </div>

                <div className="v10-settings-footer">
                    <button className="v10-reset-btn" onClick={onReset} data-testid="v10-settings-reset">
                        Auf Werkseinstellungen zurücksetzen
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// PRACTICE SETTINGS PANEL
// ═══════════════════════════════════════════════════════════════

interface PracticeSettingsPanelProps {
    settings: PracticeSettings;
    onUpdate: (updates: Partial<PracticeSettings>) => void;
}

function PracticeSettingsPanel({ settings, onUpdate }: PracticeSettingsPanelProps) {
    return (
        <div className="v10-settings-panel" data-testid="v10-practice-settings">
            <SettingRow
                label="Standard Isolation"
                value={getPracticeDefaultIsolation(settings) || ''}
                options={[
                    { value: '', label: 'Keine Vorgabe' },
                    { value: 'kofferdam', label: 'Kofferdam' },
                    { value: 'relative', label: 'Relative Trockenlegung' },
                    { value: 'none', label: 'Ohne Isolation' },
                ]}
                onChange={v => onUpdate(
                    patchPracticeDefaultIsolation(settings, v as PracticeSettings['defaultIsolation'] || undefined)
                )}
            />

            <SettingRow
                label="Standard WL-Methode"
                value={settings.defaultWLMethod || ''}
                options={[
                    { value: '', label: 'Keine Vorgabe' },
                    { value: 'elektrisch', label: 'Elektrisch (Apexlocator)' },
                    { value: 'roentgen', label: 'Röntgenologisch' },
                    { value: 'both', label: 'Beide' },
                ]}
                onChange={v => onUpdate({ defaultWLMethod: v as PracticeSettings['defaultWLMethod'] || undefined })}
            />

            <SettingRow
                label="Standard WF-Technik"
                value={settings.defaultWFTechnique || ''}
                options={[
                    { value: '', label: 'Keine Vorgabe' },
                    { value: 'kalt', label: 'Laterale Kondensation (kalt)' },
                    { value: 'warm', label: 'Warme Kondensation' },
                    { value: 'einzel', label: 'Einzelstifttechnik' },
                ]}
                onChange={v => onUpdate({ defaultWFTechnique: v as PracticeSettings['defaultWFTechnique'] || undefined })}
            />

            <SettingRow
                label="Spülprotokoll"
                value={settings.defaultIrrigationProtocol || ''}
                options={[
                    { value: '', label: 'Keine Vorgabe' },
                    { value: 'naocl_edta', label: 'NaOCl + EDTA' },
                    { value: 'naocl_only', label: 'Nur NaOCl' },
                    { value: 'none', label: 'Ohne Spülung' },
                ]}
                onChange={v => onUpdate({ defaultIrrigationProtocol: v as PracticeSettings['defaultIrrigationProtocol'] || undefined })}
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// USER SETTINGS PANEL
// ═══════════════════════════════════════════════════════════════

interface UserSettingsPanelProps {
    settings: UserSettings;
    onUpdate: (updates: Partial<UserSettings>) => void;
}

function UserSettingsPanel({ settings, onUpdate }: UserSettingsPanelProps) {
    return (
        <div className="v10-settings-panel" data-testid="v10-user-settings">
            <SettingRow
                label="Standard Anästhesie"
                value={getUserDefaultLAType(settings) || ''}
                options={[
                    { value: '', label: 'Keine Vorgabe' },
                    { value: 'infiltration', label: 'Infiltration' },
                    { value: 'leitung', label: 'Leitungsanästhesie' },
                    { value: 'none', label: 'Ohne Anästhesie' },
                ]}
                onChange={v => onUpdate(
                    patchUserDefaultLAType(settings, v as UserSettings['defaultLAType'] || undefined)
                )}
            />

            <SettingRow
                label="Standard Überkappung"
                value={getUserDefaultCappingMaterial(settings) || ''}
                options={[
                    { value: '', label: 'Keine Vorgabe' },
                    { value: 'caoh2', label: 'Ca(OH)2' },
                    { value: 'mta', label: 'MTA' },
                    { value: 'biodentin', label: 'Biodentin' },
                ]}
                onChange={v => onUpdate(
                    patchUserDefaultCappingMaterial(settings, v as UserSettings['defaultCappingMaterial'] || undefined)
                )}
            />

            <SettingRow
                label="Bevorzugte Textlänge"
                value={settings.preferredTextLength || 'mittel'}
                options={[
                    { value: 'kurz', label: 'Kurz' },
                    { value: 'mittel', label: 'Mittel' },
                    { value: 'lang', label: 'Lang' },
                ]}
                onChange={v => onUpdate({ preferredTextLength: v as UserSettings['preferredTextLength'] })}
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// SETTING ROW
// ═══════════════════════════════════════════════════════════════

interface SettingRowProps {
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
}

function SettingRow({ label, value, options, onChange }: SettingRowProps) {
    return (
        <div className="v10-setting-row">
            <label className="v10-setting-label">{label}</label>
            <select
                className="v10-setting-select"
                value={value}
                onChange={e => onChange(e.target.value)}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}
