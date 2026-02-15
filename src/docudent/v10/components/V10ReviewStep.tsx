/**
 * M42: V10ReviewStep — Integrated Review Step Component
 * 
 * Combines all Review UX components:
 * - V10ChipsGroupedPanel (Relevant/Optional grouping)
 * - V10ChangeSummary (Diff vs defaults)
 * - V10CommandPalette (Add chip search)
 * - Chip controls with Auto/On/Off
 */

import React, { useState, useMemo } from 'react';

import { V10ChipsGroupedPanel, type GroupedChipsInstance } from './V10ChipsGroupedPanel';
import { V10ChangeSummary, type ChangeItem, extractChanges } from './V10ChangeSummary';
import { V10CommandPalette, getAvailableChipsForTreatment } from './V10CommandPalette';
import { V10StageHeader } from './V10StageHeader';
import {
    useChipOverrides,
    resolveEffectiveChips,
    type ChipOverride,
    type OverridesByInstance,
} from '../settings/useChipOverrides';
import { getPack } from '../packs';
import { colors, gradients, radii, shadows, spacing, typography } from '../styles/tokens';

// M46: Get pack label from contract
function getPackLabel(treatmentId: string): string {
    const pack = getPack(treatmentId);
    return pack?.meta?.label || treatmentId;
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface TreatmentInstance {
    instanceId: string;
    treatmentId: string; // M46: no longer union type
    tooth?: string;
}

interface ChipsInputEntry {
    id: string;
    enabled: boolean;
    value?: unknown;
}

type ChipsInput = ChipsInputEntry[] | Record<string, ChipsInputEntry[]>;

interface Props {
    instances: TreatmentInstance[];
    dictationChips: ChipsInput;
    settingsChips: ChipsInput;
    onProceed: () => void;
    onBack: () => void;
    onOpenSettings?: () => void;
    overridesByInstance?: OverridesByInstance;
    onOverride?: (instanceId: string, chipId: string, override: ChipOverride) => void;
    onResetOverride?: (instanceId: string, chipId: string) => void;
    onResetAllOverrides?: () => void;
    backTestId?: string;
    proceedTestId?: string;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function V10ReviewStep({
    instances,
    dictationChips,
    settingsChips,
    onProceed,
    onBack,
    onOpenSettings,
    overridesByInstance,
    onOverride,
    onResetOverride,
    onResetAllOverrides,
    backTestId,
    proceedTestId,
}: Props) {
    const [showPalette, setShowPalette] = useState(false);
    const [showManualOverrides, setShowManualOverrides] = useState(false);
    const [activeInstance, setActiveInstance] = useState<string | null>(
        instances.length > 0 ? instances[0].instanceId : null
    );

    // Chip overrides hook
    const fallbackOverrides = useChipOverrides();
    const effectiveOverrides = overridesByInstance ?? fallbackOverrides.overridesByInstance;
    const setOverride = onOverride ?? fallbackOverrides.setOverride;
    const resetOverride = onResetOverride ?? fallbackOverrides.resetOverride;
    const resetAllOverrides = onResetAllOverrides ?? fallbackOverrides.resetAllOverrides;

    const resolveChipsForInstance = (input: ChipsInput, instanceId: string): ChipsInputEntry[] => {
        return Array.isArray(input) ? input : (input[instanceId] ?? []);
    };

    // Resolve effective chips per instance
    const instancesWithChips = useMemo(() => {
        return instances.map(inst => {
            const instOverrides = effectiveOverrides[inst.instanceId] || {};
            const instDictationChips = resolveChipsForInstance(dictationChips, inst.instanceId);
            const instSettingsChips = resolveChipsForInstance(settingsChips, inst.instanceId);
            const effectiveChips = resolveEffectiveChips({
                dictationChips: instDictationChips,
                settingsChips: instSettingsChips,
                overrides: instOverrides,
            });

            return {
                instanceId: inst.instanceId,
                treatmentId: inst.treatmentId,
                tooth: inst.tooth,
                chips: effectiveChips,
            } as GroupedChipsInstance;
        });
    }, [instances, dictationChips, settingsChips, effectiveOverrides]);

    // Extract changes for summary
    const allChanges = useMemo(() => {
        const changes: ChangeItem[] = [];
        for (const inst of instancesWithChips) {
            const instChanges = extractChanges(
                inst.chips,
                resolveChipsForInstance(settingsChips, inst.instanceId),
                inst.instanceId
            );
            changes.push(...instChanges);
        }
        return changes;
    }, [instancesWithChips, settingsChips]);
    const overrideCount = allChanges.length;

    // Available chips for command palette
    const availableChips = useMemo(() => {
        if (!activeInstance) return [];
        const inst = instances.find(i => i.instanceId === activeInstance);
        if (!inst) return [];
        return getAvailableChipsForTreatment(inst.treatmentId);
    }, [activeInstance, instances]);

    // Handlers
    const handleOverride = (instanceId: string, chipId: string, override: ChipOverride) => {
        setOverride(instanceId, chipId, override);
    };

    const handleResetOverride = (instanceId: string, chipId: string) => {
        resetOverride(instanceId, chipId);
    };

    const handleAddChip = (chipId: string, override: ChipOverride) => {
        if (activeInstance) {
            setOverride(activeInstance, chipId, override);
        }
    };

    const primaryButtonStyle: React.CSSProperties = {
        padding: '12px 22px',
        borderRadius: radii.pill,
        border: 'none',
        background: gradients.button,
        color: colors.textPrimary,
        fontWeight: typography.semibold,
        cursor: 'pointer',
        boxShadow: shadows.buttonDefault,
    };

    const ghostButtonStyle: React.CSSProperties = {
        padding: '12px 20px',
        borderRadius: radii.pill,
        border: `1px solid ${colors.lineDivider}`,
        background: 'transparent',
        color: colors.textSecondary,
        fontWeight: typography.semibold,
        cursor: 'pointer',
    };

    return (
        <div className="v7" data-testid="v10-review-step">
            <div className="v7-container" style={{ maxWidth: 980, paddingTop: spacing.xxxl }}>
                <V10StageHeader
                    kicker="Overrides"
                    title="Chips & Standards prüfen"
                    subtitle={`${instances.length} Behandlung${instances.length > 1 ? 'en' : ''}`}
                    right={(
                        <>
                            <button
                                type="button"
                                onClick={() => setShowManualOverrides(prev => !prev)}
                                style={ghostButtonStyle}
                                data-testid="v10-manual-overrides-toggle"
                            >
                                {showManualOverrides
                                    ? 'Manuelle Overrides ausblenden'
                                    : `Manuelle Overrides anzeigen${overrideCount > 0 ? ` (${overrideCount})` : ''}`}
                            </button>

                            {onOpenSettings ? (
                                <button
                                    type="button"
                                    onClick={onOpenSettings}
                                    style={ghostButtonStyle}
                                    data-testid="v10-open-settings-btn"
                                >
                                    Einstellungen
                                </button>
                            ) : null}
                        </>
                    )}
                />

                {instances.length > 1 ? (
                    <div
                        data-testid="v10-review-tabs"
                        style={{
                            display: 'flex',
                            gap: spacing.sm,
                            flexWrap: 'wrap',
                            marginBottom: spacing.xxl,
                        }}
                    >
                        {instances.map(inst => {
                            const isActive = activeInstance === inst.instanceId;
                            return (
                                <button
                                    key={inst.instanceId}
                                    type="button"
                                    onClick={() => setActiveInstance(inst.instanceId)}
                                    style={{
                                        padding: '10px 16px',
                                        borderRadius: radii.pill,
                                        border: isActive ? 'none' : `1px solid ${colors.lineSoft}`,
                                        background: isActive ? gradients.button : colors.surfaceGlass,
                                        color: isActive ? colors.textPrimary : colors.textSecondary,
                                        fontWeight: typography.semibold,
                                        cursor: 'pointer',
                                        boxShadow: isActive ? shadows.buttonActive : 'none',
                                        backdropFilter: 'blur(16px)',
                                    }}
                                    data-testid={`v10-review-tab-${inst.instanceId}`}
                                >
                                    {getPackLabel(inst.treatmentId)}
                                    {inst.tooth ? ` · ${inst.tooth}` : ''}
                                </button>
                            );
                        })}
                    </div>
                ) : null}

                <div
                    style={{
                        padding: spacing.xxl,
                        borderRadius: radii.card,
                        background: colors.surfaceGlass,
                        boxShadow: shadows.barDefault,
                        backdropFilter: 'blur(16px)',
                    }}
                >
                    <div style={{ color: colors.textSecondary, fontSize: typography.bodySmall, marginBottom: spacing.lg }}>
                        Chips sind SSOT‑abgeleitet. Manuelle Overrides sind Ausnahmen und werden als Quelle <code>manualOverride</code> getraced.
                    </div>

                    <V10ChipsGroupedPanel
                        instances={instancesWithChips}
                        onOverride={showManualOverrides ? handleOverride : () => {}}
                        onResetOverride={showManualOverrides ? handleResetOverride : () => {}}
                        interactionMode={showManualOverrides ? 'override' : 'readonly'}
                    />

                    {showManualOverrides ? (
                        <>
                            {allChanges.length > 0 ? (
                                <div style={{ marginTop: spacing.xl }}>
                                    <V10ChangeSummary changes={allChanges} />
                                </div>
                            ) : null}

                            <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xl }}>
                                <button
                                    type="button"
                                    onClick={() => setShowPalette(true)}
                                    style={ghostButtonStyle}
                                    data-testid="v10-add-chip-btn"
                                >
                                    + Chip hinzufügen
                                </button>

                                {allChanges.length > 0 ? (
                                    <button
                                        type="button"
                                        onClick={resetAllOverrides}
                                        style={ghostButtonStyle}
                                        data-testid="v10-reset-all-btn"
                                    >
                                        Overrides zurücksetzen
                                    </button>
                                ) : null}
                            </div>
                        </>
                    ) : null}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.xxl }}>
                    <button
                        type="button"
                        onClick={onBack}
                        style={ghostButtonStyle}
                        data-testid={backTestId ?? 'v10-review-back'}
                    >
                        Zurück
                    </button>
                    <button
                        type="button"
                        onClick={onProceed}
                        style={primaryButtonStyle}
                        data-testid={proceedTestId ?? 'v10-review-proceed'}
                    >
                        Weiter zum Output
                    </button>
                </div>

                <V10CommandPalette
                    isOpen={showPalette}
                    onClose={() => setShowPalette(false)}
                    availableChips={availableChips}
                    onAddChip={handleAddChip}
                    instanceId={activeInstance || undefined}
                />
            </div>
        </div>
    );
}
