import React from 'react';

export interface PillToggleItem {
    id: string;
    label: string;
    on: boolean;
}

export interface PillToggleGroupProps {
    items: PillToggleItem[];
    onToggle: (id: string) => void;
    disabled?: boolean;
}

/**
 * Pill toggle group for chip-style multi-select.
 * ON state uses subtle glass difference, not coral gradient.
 */
export function PillToggleGroup({ items, onToggle, disabled = false }: PillToggleGroupProps) {
    return (
        <div className="v10-pill-group">
            {items.map((item) => (
                <button
                    key={item.id}
                    type="button"
                    className={`v10-pill-toggle ${item.on ? 'is-on' : ''}`}
                    onClick={() => onToggle(item.id)}
                    disabled={disabled}
                    aria-pressed={item.on}
                >
                    {item.label}
                </button>
            ))}
        </div>
    );
}
