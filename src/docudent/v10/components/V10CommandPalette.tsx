/**
 * M40: V10CommandPalette — Add Chip Search
 * 
 * Search and add chips from treatment pack.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import './V10CommandPalette.css';
import type { ChipOverride } from '../settings/useChipOverrides';
import { PARAMETRIZED_CHIPS } from '../settings/useChipOverrides';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AvailableChip {
    id: string;
    label: string;
    category?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    availableChips: AvailableChip[];
    onAddChip: (chipId: string, override: ChipOverride) => void;
    instanceId?: string;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function V10CommandPalette({ isOpen, onClose, availableChips, onAddChip, instanceId }: Props) {
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredChips = useMemo(() => {
        if (!search.trim()) return availableChips;
        const lower = search.toLowerCase();
        return availableChips.filter(c =>
            c.label.toLowerCase().includes(lower) ||
            c.id.toLowerCase().includes(lower)
        );
    }, [availableChips, search]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
        setSearch('');
        setSelectedIndex(0);
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, filteredChips.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && filteredChips[selectedIndex]) {
            e.preventDefault();
            onAddChip(filteredChips[selectedIndex].id, { mode: 'on' });
            onClose();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="v10-cmd-overlay" onClick={onClose}>
            <div className="v10-cmd-palette" onClick={e => e.stopPropagation()} data-testid="v10-command-palette">
                <input
                    ref={inputRef}
                    type="text"
                    className="v10-cmd-input"
                    placeholder="Chip hinzufügen..."
                    value={search}
                    onChange={e => {
                        setSearch(e.target.value);
                        setSelectedIndex(0);
                    }}
                    onKeyDown={handleKeyDown}
                    data-testid="v10-cmd-input"
                />

                <div className="v10-cmd-list">
                    {filteredChips.map((chip, i) => (
                        <button
                            key={chip.id}
                            className={`v10-cmd-item ${i === selectedIndex ? 'selected' : ''}`}
                            onClick={() => {
                                onAddChip(chip.id, { mode: 'on' });
                                onClose();
                            }}
                            data-testid={`v10-cmd-item-${chip.id}`}
                        >
                            <span className="v10-cmd-label">{chip.label}</span>
                            {chip.category && (
                                <span className="v10-cmd-category">{chip.category}</span>
                            )}
                        </button>
                    ))}
                    {filteredChips.length === 0 && (
                        <div className="v10-cmd-empty">Keine Chips gefunden</div>
                    )}
                </div>

                <div className="v10-cmd-footer">
                    <span>↑↓ navigieren</span>
                    <span>↵ hinzufügen</span>
                    <span>esc schließen</span>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Get available chips from pack contract (M45: contract-driven)
// ═══════════════════════════════════════════════════════════════

import { getPack } from '../packs';

/**
 * Get available chips for a treatment from its pack contract.
 * NOTE: This is contract-driven - no treatment-specific branching.
 */
export function getAvailableChipsForTreatment(treatmentId: string): AvailableChip[] {
    const pack = getPack(treatmentId);
    if (!pack) return [];

    try {
        const contract = pack.getUiContract();
        return contract.chipControls.map(ctrl => ({
            id: ctrl.chipId,
            label: ctrl.label,
            category: ctrl.group === 'relevant' ? 'Wichtig'
                : ctrl.group === 'optional' ? 'Optional'
                    : ctrl.group === 'advanced' ? 'Erweitert'
                        : undefined,
        }));
    } catch {
        return [];
    }
}

