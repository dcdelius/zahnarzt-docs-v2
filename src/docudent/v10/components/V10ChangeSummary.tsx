/**
 * M40: V10ChangeSummary — Diff of Changes vs Auto/Settings
 * 
 * Shows only what changed from defaults.
 */

import React from 'react';
import './V10ChangeSummary.css';
import type { EffectiveChip } from '../settings/useChipOverrides';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ChangeItem {
    chipId: string;
    label: string;
    fromValue: string;
    fromSource: string;
    toValue: string;
    toSource: string;
    instanceId?: string;
}

interface Props {
    changes: ChangeItem[];
    instanceFilter?: 'all' | 'endo' | 'fuellung';
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function V10ChangeSummary({ changes, instanceFilter = 'all' }: Props) {
    const filtered = instanceFilter === 'all'
        ? changes
        : changes.filter(c => c.instanceId === instanceFilter || !c.instanceId);

    if (filtered.length === 0) {
        return (
            <div className="v10-change-summary empty" data-testid="v10-change-summary">
                <span className="v10-change-empty">Keine Änderungen</span>
            </div>
        );
    }

    return (
        <div className="v10-change-summary" data-testid="v10-change-summary">
            <div className="v10-change-header">
                <span className="v10-change-title">Änderungen</span>
                <span className="v10-change-count">{filtered.length}</span>
            </div>

            <div className="v10-change-list">
                {filtered.map(change => (
                    <ChangeRow key={`${change.instanceId || 'g'}-${change.chipId}`} change={change} />
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// CHANGE ROW
// ═══════════════════════════════════════════════════════════════

interface ChangeRowProps {
    change: ChangeItem;
}

function ChangeRow({ change }: ChangeRowProps) {
    return (
        <div className="v10-change-row" data-testid={`v10-change-${change.chipId}`}>
            <span className="v10-change-label">{change.label}</span>
            <span className="v10-change-diff">
                <span className="v10-change-from">
                    {change.fromSource}: {change.fromValue}
                </span>
                <span className="v10-change-arrow">→</span>
                <span className="v10-change-to">
                    {change.toSource}: {change.toValue}
                </span>
            </span>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Extract changes from chips
// ═══════════════════════════════════════════════════════════════

export function extractChanges(
    effectiveChips: EffectiveChip[],
    settingsChips: Array<{ id: string; enabled: boolean; value?: unknown }>,
    instanceId?: string
): ChangeItem[] {
    const changes: ChangeItem[] = [];
    const settingsMap = new Map(settingsChips.map(c => [c.id, c]));

    for (const chip of effectiveChips) {
        if (chip.source === 'override') {
            const settingsChip = settingsMap.get(chip.id);
            const fromValue = settingsChip?.enabled ? String(settingsChip.value || 'An') : 'Aus';
            const fromSource = settingsChip ? 'Settings' : 'Default';
            const toValue = chip.enabled ? String(chip.value || 'An') : 'Aus';

            changes.push({
                chipId: chip.id,
                label: formatLabel(chip.id),
                fromValue,
                fromSource,
                toValue,
                toSource: 'Manuell',
                instanceId,
            });
        }
    }

    return changes;
}

function formatLabel(chipId: string): string {
    const labels: Record<string, string> = {
        'la_type': 'Anästhesie',
        'isolation': 'Isolation',
        'wl_method': 'Arbeitslänge',
        'wf_technique': 'Wurzelfüllung',
        'kofferdam': 'Kofferdam',
    };
    return labels[chipId] || chipId;
}
