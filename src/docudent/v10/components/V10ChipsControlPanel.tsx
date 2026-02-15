/**
 * V10ChipsControlPanel — Interactive Chips with Popovers
 * 
 * M38: Chips as primary control surface. Each chip is clickable with
 * Auto/On/Off states and source badges.
 */

import React, { useState } from 'react';
import './V10ChipsControlPanel.css';
import type { ChipMode, ChipOverride, EffectiveChip } from '../settings/useChipOverrides';
import { PARAMETRIZED_CHIPS, isParametrizedChip } from '../settings/useChipOverrides';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ChipsControlInstance {
    instanceId: string;
    treatmentType: 'endo' | 'fuellung';
    tooth?: string;
    chips: EffectiveChip[];
}

interface Props {
    instances: ChipsControlInstance[];
    onOverride: (instanceId: string, chipId: string, override: ChipOverride) => void;
    onResetOverride: (instanceId: string, chipId: string) => void;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function V10ChipsControlPanel({ instances, onOverride, onResetOverride }: Props) {
    if (instances.length === 0) {
        return (
            <div className="v10-chips-control empty" data-testid="v10-chips-control">
                <p className="v10-chips-empty">Starte Diktat für Chips</p>
            </div>
        );
    }

    return (
        <div className="v10-chips-control" data-testid="v10-chips-control">
            <div className="v10-chips-control-header">
                <h4>Chips & Einstellungen</h4>
            </div>

            {instances.map(instance => (
                <InstanceChipsControl
                    key={instance.instanceId}
                    instance={instance}
                    onOverride={(chipId, override) => onOverride(instance.instanceId, chipId, override)}
                    onResetOverride={(chipId) => onResetOverride(instance.instanceId, chipId)}
                />
            ))}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// INSTANCE CHIPS CONTROL
// ═══════════════════════════════════════════════════════════════

interface InstanceChipsControlProps {
    instance: ChipsControlInstance;
    onOverride: (chipId: string, override: ChipOverride) => void;
    onResetOverride: (chipId: string) => void;
}

function InstanceChipsControl({ instance, onOverride, onResetOverride }: InstanceChipsControlProps) {
    const treatmentLabel = instance.treatmentType === 'endo' ? 'Endo' : 'Füllung';
    const treatmentColor = instance.treatmentType === 'endo' ? '#e74c3c' : '#3498db';

    return (
        <div className="v10-instance-control" data-testid={`v10-chips-control-${instance.treatmentType}`}>
            <div className="v10-instance-control-header" style={{ borderLeftColor: treatmentColor }}>
                <span className="v10-instance-badge" style={{ backgroundColor: treatmentColor }}>
                    {treatmentLabel}
                </span>
                {instance.tooth && <span className="v10-instance-tooth">Zahn {instance.tooth}</span>}
            </div>

            <div className="v10-chips-grid">
                {instance.chips.map(chip => (
                    <ChipControl
                        key={chip.id}
                        chip={chip}
                        onOverride={(override) => onOverride(chip.id, override)}
                        onReset={() => onResetOverride(chip.id)}
                    />
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// CHIP CONTROL (with popover)
// ═══════════════════════════════════════════════════════════════

interface ChipControlProps {
    chip: EffectiveChip;
    onOverride: (override: ChipOverride) => void;
    onReset: () => void;
}

function ChipControl({ chip, onOverride, onReset }: ChipControlProps) {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const isParametrized = isParametrizedChip(chip.id);

    const sourceLabel = {
        dictation: 'Diktat',
        settings: 'Praxis',
        override: 'Manuell',
        default: 'Standard',
    }[chip.source];

    const sourceColor = {
        dictation: '#27ae60',
        settings: '#3498db',
        override: '#9b59b6',
        default: '#7f8c8d',
    }[chip.source];

    const chipStyle = chip.enabled ? 'enabled' : 'disabled';
    const overrideStyle = chip.overridden ? 'overridden' : '';

    return (
        <div className="v10-chip-control-wrapper">
            <button
                className={`v10-chip-control ${chipStyle} ${overrideStyle}`}
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                data-testid={`v10-chip-control-${chip.id}`}
            >
                <span className="v10-chip-control-label">{formatChipLabel(chip.id)}</span>
                {chip.value && <span className="v10-chip-control-value">{String(chip.value)}</span>}
                <span className="v10-chip-source-badge" style={{ backgroundColor: sourceColor }}>
                    {sourceLabel}
                </span>
            </button>

            {isPopoverOpen && (
                <div className="v10-chip-popover" data-testid={`v10-chip-popover-${chip.id}`}>
                    <div className="v10-popover-header">
                        <span>{formatChipLabel(chip.id)}</span>
                        <button className="v10-popover-close" onClick={() => setIsPopoverOpen(false)}>×</button>
                    </div>

                    <div className="v10-popover-content">
                        {!isParametrized ? (
                            <SimpleChipOptions
                                currentMode={chip.source === 'override' ? (chip.enabled ? 'on' : 'off') : 'auto'}
                                currentEnabled={chip.enabled}
                                source={chip.source}
                                onSelect={(mode) => {
                                    onOverride({ mode });
                                    setIsPopoverOpen(false);
                                }}
                                onReset={() => {
                                    onReset();
                                    setIsPopoverOpen(false);
                                }}
                            />
                        ) : (
                            <ParametrizedChipOptions
                                chipId={chip.id}
                                currentValue={chip.value as string}
                                source={chip.source}
                                onSelect={(value) => {
                                    onOverride({ mode: 'on', value });
                                    setIsPopoverOpen(false);
                                }}
                                onReset={() => {
                                    onReset();
                                    setIsPopoverOpen(false);
                                }}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// SIMPLE CHIP OPTIONS (Auto/On/Off)
// ═══════════════════════════════════════════════════════════════

interface SimpleChipOptionsProps {
    currentMode: ChipMode;
    currentEnabled: boolean;
    source: string;
    onSelect: (mode: ChipMode) => void;
    onReset: () => void;
}

function SimpleChipOptions({ currentMode, currentEnabled, source, onSelect, onReset }: SimpleChipOptionsProps) {
    return (
        <div className="v10-simple-options">
            <button
                className={`v10-mode-btn ${currentMode === 'auto' ? 'active' : ''}`}
                onClick={onReset}
            >
                <span className="v10-mode-label">Auto</span>
                <span className="v10-mode-sub">{source !== 'override' ? (currentEnabled ? 'An' : 'Aus') : ''}</span>
            </button>
            <button
                className={`v10-mode-btn ${currentMode === 'on' ? 'active' : ''}`}
                onClick={() => onSelect('on')}
            >
                <span className="v10-mode-label">An</span>
            </button>
            <button
                className={`v10-mode-btn ${currentMode === 'off' ? 'active' : ''}`}
                onClick={() => onSelect('off')}
            >
                <span className="v10-mode-label">Aus</span>
            </button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// PARAMETRIZED CHIP OPTIONS
// ═══════════════════════════════════════════════════════════════

interface ParametrizedChipOptionsProps {
    chipId: string;
    currentValue?: string;
    source: string;
    onSelect: (value: string) => void;
    onReset: () => void;
}

function ParametrizedChipOptions({ chipId, currentValue, source, onSelect, onReset }: ParametrizedChipOptionsProps) {
    const config = PARAMETRIZED_CHIPS[chipId];
    if (!config) return null;

    return (
        <div className="v10-param-options">
            <button
                className={`v10-param-btn auto ${source !== 'override' ? 'active' : ''}`}
                onClick={onReset}
            >
                <span>Auto</span>
                {source !== 'override' && currentValue && (
                    <span className="v10-param-current">({currentValue})</span>
                )}
            </button>
            {config.options.map(opt => (
                <button
                    key={opt.value}
                    className={`v10-param-btn ${source === 'override' && currentValue === opt.value ? 'active' : ''}`}
                    onClick={() => onSelect(opt.value)}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function formatChipLabel(chipId: string): string {
    const labels: Record<string, string> = {
        'la_type': 'Anästhesie',
        'isolation': 'Isolation',
        'wl_method': 'Arbeitslänge',
        'wf_technique': 'Wurzelfüllung',
        'kofferdam': 'Kofferdam',
        'la_infiltr': 'Infiltration',
        'la_leitung': 'Leitung',
        'spuelung_naocl': 'NaOCl',
        'spuelung_edta': 'EDTA',
        'mehrschicht': 'Mehrschicht',
        'ueberkappung_direkt': 'Direkte Überkappung',
    };
    return labels[chipId] || chipId;
}
