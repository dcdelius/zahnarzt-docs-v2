/**
 * M40/M46: V10ChipsGroupedPanel — Grouped Chips with Progressive Disclosure
 * 
 * Chips grouped by: Relevant Now (active/ambiguous) vs Optional (collapsed)
 * M46: Now contract-driven - no hardcoded treatment types
 */

import React, { useState } from 'react';
import './V10ChipsGroupedPanel.css';
import type { ChipOverride, EffectiveChip } from '../settings/useChipOverrides';
import { getPack } from '../packs';

// M48: Color palette for treatments (no branching, consistent hashing)
const TREATMENT_COLORS = ['#e74c3c', '#3498db', '#27ae60', '#9b59b6', '#f39c12', '#1abc9c'];
function getTreatmentColor(treatmentId: string): string {
    let hash = 0;
    for (let i = 0; i < treatmentId.length; i++) {
        hash = (hash * 31 + treatmentId.charCodeAt(i)) | 0;
    }
    return TREATMENT_COLORS[Math.abs(hash) % TREATMENT_COLORS.length];
}

// ═══════════════════════════════════════════════════════════════
// TYPES (M46: treatmentId is now string, not union)
// ═══════════════════════════════════════════════════════════════

export interface GroupedChipsInstance {
    instanceId: string;
    treatmentId: string; // M46: no longer union type
    tooth?: string;
    chips: EffectiveChip[];
}

interface Props {
    instances: GroupedChipsInstance[];
    onOverride: (instanceId: string, chipId: string, override: ChipOverride) => void;
    onResetOverride: (instanceId: string, chipId: string) => void;
    interactionMode?: 'readonly' | 'override';
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function V10ChipsGroupedPanel({
    instances,
    onOverride,
    onResetOverride,
    interactionMode = 'override',
}: Props) {
    if (instances.length === 0) return null;

    return (
        <div className="v10-chips-grouped" data-testid="v10-chips-grouped">
            {instances.map(instance => (
                <InstanceGroupedChips
                    key={instance.instanceId}
                    instance={instance}
                    onOverride={(chipId, override) => onOverride(instance.instanceId, chipId, override)}
                    onResetOverride={(chipId) => onResetOverride(instance.instanceId, chipId)}
                    interactionMode={interactionMode}
                />
            ))}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// INSTANCE GROUPED CHIPS
// ═══════════════════════════════════════════════════════════════

interface InstanceGroupedChipsProps {
    instance: GroupedChipsInstance;
    onOverride: (chipId: string, override: ChipOverride) => void;
    onResetOverride: (chipId: string) => void;
    interactionMode: 'readonly' | 'override';
}

function InstanceGroupedChips({ instance, onOverride, onResetOverride, interactionMode }: InstanceGroupedChipsProps) {
    const [showOptional, setShowOptional] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showOther, setShowOther] = useState(false);

    // M46/M48: Get label/color from pack contract (no treatment branching)
    const pack = getPack(instance.treatmentId);
    const treatmentLabel = pack?.meta?.label || instance.treatmentId;
    // M48: Use consistent color based on treatmentId hash (no branching)
    const treatmentColor = getTreatmentColor(instance.treatmentId);

    const contract = (() => {
        if (!pack) return null;
        try {
            return pack.getUiContract();
        } catch {
            return null;
        }
    })();

    const chipMeta = (() => {
        if (!pack) return new Map<string, { label: string; group?: string }>();
        try {
            const meta = new Map<string, { label: string; group?: string }>();
            for (const control of contract?.chipControls ?? []) {
                if (control.chipId) {
                    meta.set(control.chipId, { label: control.label, group: control.group });
                }
                if (control.chipMapping) {
                    for (const [value, mappedId] of Object.entries(control.chipMapping)) {
                        const optionLabel = control.options?.find(opt => opt.value === value)?.label;
                        meta.set(mappedId, {
                            label: optionLabel ? `${control.label}: ${optionLabel}` : control.label,
                            group: control.group,
                        });
                    }
                }
            }
            return meta;
        } catch {
            return new Map<string, { label: string; group?: string }>();
        }
    })();

    const withPinned = (() => {
        const present = new Set(instance.chips.map(chip => chip.id));
        const next = [...instance.chips];

        for (const control of contract?.chipControls ?? []) {
            if (!control.pin) continue;
            const isParam = control.mode === 'param' && control.chipMapping;
            const hasMapped = isParam
                ? Object.values(control.chipMapping ?? {}).some(id => present.has(id))
                : false;
            if (present.has(control.chipId) || hasMapped) continue;

            next.push({
                id: control.chipId,
                enabled: false,
                source: 'default',
            });
            present.add(control.chipId);
        }

        return next;
    })();

    const sortedChips = [...withPinned].sort((a, b) => {
        if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
        const sourceRank = (source: EffectiveChip['source']) => {
            switch (source) {
                case 'dictation': return 0;
                case 'override': return 1;
                case 'settings': return 2;
                default: return 3;
            }
        };
        return sourceRank(a.source) - sourceRank(b.source);
    });

    const grouped = {
        relevant: [] as EffectiveChip[],
        optional: [] as EffectiveChip[],
        advanced: [] as EffectiveChip[],
        other: [] as EffectiveChip[],
    };

    for (const chip of sortedChips) {
        const meta = chipMeta.get(chip.id);
        const group = meta?.group ?? 'other';
        if (group === 'relevant') grouped.relevant.push(chip);
        else if (group === 'optional') grouped.optional.push(chip);
        else if (group === 'advanced') grouped.advanced.push(chip);
        else grouped.other.push(chip);
    }

    return (
        <div className="v10-instance-grouped" data-testid={`v10-grouped-${instance.treatmentId}`}>
            <div className="v10-grouped-header" style={{ borderLeftColor: treatmentColor }}>
                <span className="v10-grouped-badge" style={{ backgroundColor: treatmentColor }}>
                    {treatmentLabel}
                </span>
                {instance.tooth && <span className="v10-grouped-tooth">Zahn {instance.tooth}</span>}
            </div>

            {sortedChips.length === 0 && (
                <div className="v10-chips-empty">Keine Chips</div>
            )}

            {/* Relevant Chips */}
            {grouped.relevant.length > 0 && (
                <div className="v10-chips-section">
                    <div className="v10-section-label">
                        Wichtig <span className="v10-section-count">{grouped.relevant.length}</span>
                    </div>
                    <div className="v10-chips-row">
                        {grouped.relevant.map(chip => (
                            <MiniChip
                                key={chip.id}
                                chip={chip}
                                treatmentId={instance.treatmentId}
                                onOverride={(o) => onOverride(chip.id, o)}
                                onReset={() => onResetOverride(chip.id)}
                                interactionMode={interactionMode}
                            />
                        ))}
                    </div>
                </div>
            )}

            {grouped.optional.length > 0 && (
                <div className="v10-chips-section collapsed">
                    <button
                        className="v10-section-toggle"
                        onClick={() => setShowOptional(!showOptional)}
                    >
                        <span className="v10-section-toggle-icon">{showOptional ? '−' : '+'}</span>
                        <span>Optional</span>
                        <span className="v10-section-count">{grouped.optional.length}</span>
                    </button>
                    {showOptional && (
                        <div className="v10-chips-row">
                            {grouped.optional.map(chip => (
                                <MiniChip
                                    key={chip.id}
                                    chip={chip}
                                    treatmentId={instance.treatmentId}
                                    onOverride={(o) => onOverride(chip.id, o)}
                                    onReset={() => onResetOverride(chip.id)}
                                    interactionMode={interactionMode}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {grouped.advanced.length > 0 && (
                <div className="v10-chips-section collapsed">
                    <button
                        className="v10-section-toggle"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                        <span className="v10-section-toggle-icon">{showAdvanced ? '−' : '+'}</span>
                        <span>Erweitert</span>
                        <span className="v10-section-count">{grouped.advanced.length}</span>
                    </button>
                    {showAdvanced && (
                        <div className="v10-chips-row">
                            {grouped.advanced.map(chip => (
                                <MiniChip
                                    key={chip.id}
                                    chip={chip}
                                    treatmentId={instance.treatmentId}
                                    onOverride={(o) => onOverride(chip.id, o)}
                                    onReset={() => onResetOverride(chip.id)}
                                    interactionMode={interactionMode}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {grouped.other.length > 0 && (
                <div className="v10-chips-section collapsed">
                    <button
                        className="v10-section-toggle"
                        onClick={() => setShowOther(!showOther)}
                    >
                        <span className="v10-section-toggle-icon">{showOther ? '−' : '+'}</span>
                        <span>Weitere</span>
                        <span className="v10-section-count">{grouped.other.length}</span>
                    </button>
                    {showOther && (
                        <div className="v10-chips-row">
                            {grouped.other.map(chip => (
                                <MiniChip
                                    key={chip.id}
                                    chip={chip}
                                    treatmentId={instance.treatmentId}
                                    onOverride={(o) => onOverride(chip.id, o)}
                                    onReset={() => onResetOverride(chip.id)}
                                    interactionMode={interactionMode}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MINI CHIP (Badge + Icon)
// ═══════════════════════════════════════════════════════════════

interface MiniChipProps {
    chip: EffectiveChip;
    treatmentId?: string;
    onOverride: (override: ChipOverride) => void;
    onReset: () => void;
    interactionMode: 'readonly' | 'override';
}

function MiniChip({ chip, treatmentId, onOverride, onReset, interactionMode }: MiniChipProps) {
    const [showMenu, setShowMenu] = useState(false);

    const sourceLabel = {
        dictation: 'DICT',
        settings: 'STD',
        override: 'USER',
        default: 'AUTO',
    }[chip.source];

    const chipClass = chip.enabled ? 'enabled' : 'disabled';
    const overrideClass = chip.source === 'override' ? 'override' : '';

    const isReadonly = interactionMode === 'readonly';
    const title = isReadonly
        ? `${chip.id} (${chip.source}) — Abgeleitet (SSOT). Ändern über Rückfragen/Fakten.`
        : `${chip.id} (${chip.source}) — Klick: An/Aus · Shift-Klick: Menü`;

    return (
        <div className="v10-mini-chip-wrapper">
            <button
                className={`v10-mini-chip ${chipClass} ${overrideClass} ${isReadonly ? 'readonly' : ''}`}
                onClick={(e) => {
                    if (isReadonly) return;
                    // Fast path: click toggles the chip on/off via an override.
                    // Use Shift+Click (or right-click) for the full menu (Auto/On/Off).
                    if (e.shiftKey) {
                        setShowMenu(prev => !prev);
                        return;
                    }
                    onOverride({ mode: chip.enabled ? 'off' : 'on' });
                }}
                onContextMenu={(e) => {
                    if (isReadonly) return;
                    e.preventDefault();
                    setShowMenu(prev => !prev);
                }}
                data-testid={`v10-mini-chip-${chip.id}`}
                data-source={chip.source}
                title={title}
            >
                <span className="v10-mini-source">{sourceLabel}</span>
                <span className="v10-mini-label">{formatChipLabel(chip.id, treatmentId, chip.value)}</span>
            </button>

            {showMenu && !isReadonly && (
                <div className="v10-mini-menu" data-testid={`v10-mini-menu-${chip.id}`}>
                    <button onClick={() => { onReset(); setShowMenu(false); }}>
                        Auto
                    </button>
                    <button onClick={() => { onOverride({ mode: 'on' }); setShowMenu(false); }}>
                        An
                    </button>
                    <button onClick={() => { onOverride({ mode: 'off' }); setShowMenu(false); }}>
                        Aus
                    </button>
                </div>
            )}
        </div>
    );
}

// M46: Get chip label from pack contract
function formatChipLabel(chipId: string, treatmentId?: string, value?: unknown): string {
    // Try to get from pack contract first
    if (treatmentId) {
        const pack = getPack(treatmentId);
        if (pack) {
            try {
                const contract = pack.getUiContract();
                const ctrl = contract.chipControls.find(c => c.chipId === chipId);
                if (ctrl) {
                    if (value !== undefined && ctrl.options?.length) {
                        const optionLabel = ctrl.options.find(opt => opt.value === String(value))?.label;
                        if (optionLabel) return `${ctrl.label}: ${optionLabel}`;
                    }
                    return ctrl.label;
                }

                for (const control of contract.chipControls) {
                    if (!control.chipMapping) continue;
                    const mapping = Object.entries(control.chipMapping)
                        .find(([, mappedId]) => mappedId === chipId);
                    if (!mapping) continue;
                    const [value] = mapping;
                    const optionLabel = control.options?.find(opt => opt.value === value)?.label;
                    return optionLabel ? `${control.label}: ${optionLabel}` : control.label;
                }
            } catch {
                // fallback
            }
        }
    }

    // Fallback: derive from chipId
    return chipId.replace(/_/g, ' ');
}
