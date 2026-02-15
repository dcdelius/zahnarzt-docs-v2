/**
 * V10InstanceFilter — Debug Drawer Instance Filter
 * 
 * M35: Dropdown to filter debug info by instance (All / Endo / Füllung).
 */

import React from 'react';
import './V10InstanceFilter.css';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type InstanceFilterValue = 'all' | 'endo' | 'fuellung';

interface Props {
    value: InstanceFilterValue;
    onChange: (value: InstanceFilterValue) => void;
    hasEndo?: boolean;
    hasFuellung?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function V10InstanceFilter({ value, onChange, hasEndo = true, hasFuellung = true }: Props) {
    return (
        <div className="v10-instance-filter" data-testid="v10-debug-instance-filter">
            <span className="v10-filter-label">Filter</span>
            <div className="v10-filter-buttons">
                <button
                    className={`v10-filter-btn ${value === 'all' ? 'active' : ''}`}
                    onClick={() => onChange('all')}
                    data-testid="v10-filter-all"
                >
                    Alle
                </button>
                {hasEndo && (
                    <button
                        className={`v10-filter-btn endo ${value === 'endo' ? 'active' : ''}`}
                        onClick={() => onChange('endo')}
                        data-testid="v10-filter-endo"
                    >
                        Endo
                    </button>
                )}
                {hasFuellung && (
                    <button
                        className={`v10-filter-btn fuellung ${value === 'fuellung' ? 'active' : ''}`}
                        onClick={() => onChange('fuellung')}
                        data-testid="v10-filter-fuellung"
                    >
                        Füllung
                    </button>
                )}
            </div>
        </div>
    );
}
