/**
 * V10ChipsPanel — Editable Chips & Defaults (Left Side)
 * 
 * M36: Shows chips per instance with source badges (dictation/settings/user).
 * Allows inline editing of key settings like LA type, isolation, etc.
 */

import React from 'react';
import { getPack } from '../packs';
import './V10ChipsPanel.css';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ChipWithSource {
    id: string;
    label: string;
    source: 'dictation' | 'settings' | 'user' | 'inferred';
    editable?: boolean;
    category?: string;
}

export interface ChipsPanelInstance {
    instanceId: string;
    treatmentType: 'endo' | 'fuellung' | string;
    treatmentId?: string;
    tooth?: string;
    chips: ChipWithSource[];
}

interface Props {
    instances: ChipsPanelInstance[];
    onChipToggle?: (instanceId: string, chipId: string, enabled: boolean) => void;
    onEditField?: (instanceId: string, fieldId: string, value: unknown) => void;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function V10ChipsPanel({ instances, onChipToggle, onEditField }: Props) {
    if (instances.length === 0) {
        return (
            <div className="v10-chips-panel empty" data-testid="v10-chips-panel">
                <p className="v10-chips-empty">Keine Chips verfügbar</p>
            </div>
        );
    }

    return (
        <div className="v10-chips-panel" data-testid="v10-chips-panel">
            <div className="v10-chips-header">
                <h4>Chips & Defaults</h4>
            </div>

            {instances.map(instance => (
                <InstanceChips
                    key={instance.instanceId}
                    instance={instance}
                    onChipToggle={(chipId, enabled) => onChipToggle?.(instance.instanceId, chipId, enabled)}
                    onEditField={(fieldId, value) => onEditField?.(instance.instanceId, fieldId, value)}
                />
            ))}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// INSTANCE CHIPS
// ═══════════════════════════════════════════════════════════════

interface InstanceChipsProps {
    instance: ChipsPanelInstance;
    onChipToggle: (chipId: string, enabled: boolean) => void;
    onEditField: (fieldId: string, value: unknown) => void;
}

function InstanceChips({ instance, onChipToggle, onEditField }: InstanceChipsProps) {
    const treatmentId = instance.treatmentId ?? instance.treatmentType;
    const pack = treatmentId ? getPack(treatmentId) : null;
    const treatmentLabel = pack?.meta?.label ?? (instance.treatmentType === 'endo' ? 'Endo' : instance.treatmentType === 'fuellung' ? 'Füllung' : String(treatmentId));
    const treatmentColor = instance.treatmentType === 'endo' ? '#e74c3c' : '#3498db';

    return (
        <div className="v10-instance-chips" data-testid={`v10-chips-instance-${instance.treatmentType}`}>
            <div className="v10-chips-instance-header" style={{ borderLeftColor: treatmentColor }}>
                <span className="v10-chips-badge" style={{ backgroundColor: treatmentColor }}>
                    {treatmentLabel}
                </span>
                {instance.tooth && <span className="v10-chips-tooth">Zahn {instance.tooth}</span>}
            </div>

            <div className="v10-chips-list">
                {instance.chips.map(chip => (
                    <ChipItem
                        key={chip.id}
                        chip={chip}
                        onToggle={(enabled) => onChipToggle(chip.id, enabled)}
                    />
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// CHIP ITEM
// ═══════════════════════════════════════════════════════════════

interface ChipItemProps {
    chip: ChipWithSource;
    onToggle: (enabled: boolean) => void;
}

function ChipItem({ chip, onToggle }: ChipItemProps) {
    const sourceLabel = {
        dictation: 'Diktat',
        settings: 'Praxis',
        user: 'Benutzer',
        inferred: 'Abgeleitet',
    }[chip.source];

    const sourceColor = {
        dictation: '#27ae60',
        settings: '#3498db',
        user: '#9b59b6',
        inferred: '#95a5a6',
    }[chip.source];

    return (
        <div className="v10-chip-item" data-testid={`v10-chip-${chip.id}`}>
            <span className="v10-chip-label">{chip.label}</span>
            <span className="v10-chip-source" style={{ color: sourceColor }}>
                {sourceLabel}
            </span>
            {chip.editable && (
                <button
                    className="v10-chip-toggle"
                    onClick={() => onToggle(false)}
                    title="Entfernen"
                >
                    ×
                </button>
            )}
        </div>
    );
}
