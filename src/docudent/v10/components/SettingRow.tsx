import React from 'react';

export interface SettingRowProps {
    label: string;
    helper?: string;
    children: React.ReactNode;
}

/**
 * Unified setting row: 2-column grid with label/helper left, control right.
 */
export function SettingRow({ label, helper, children }: SettingRowProps) {
    return (
        <div className="v10-setting-row">
            <div className="v10-setting-row-label">
                <div className="v10-setting-row-title">{label}</div>
                {helper ? <div className="v10-setting-row-helper">{helper}</div> : null}
            </div>
            <div className="v10-setting-row-control">
                {children}
            </div>
        </div>
    );
}
