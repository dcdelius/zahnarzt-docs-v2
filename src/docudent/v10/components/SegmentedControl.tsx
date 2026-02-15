import React from 'react';

export interface SegmentedControlOption {
    value: string;
    label: string;
}

export interface SegmentedControlProps {
    options: SegmentedControlOption[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    ariaLabel?: string;
}

/**
 * Apple-like segmented control.
 * Use for ≤4 options (e.g., Aus|Auto|An, Kurz|Mittel|Lang).
 */
export function SegmentedControl({
    options,
    value,
    onChange,
    disabled = false,
    ariaLabel,
}: SegmentedControlProps) {
    return (
        <div className="v10-segmented" role="group" aria-label={ariaLabel}>
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    className={`v10-segmented-option ${value === opt.value ? 'is-active' : ''}`}
                    onClick={() => onChange(opt.value)}
                    disabled={disabled}
                    aria-pressed={value === opt.value}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}
