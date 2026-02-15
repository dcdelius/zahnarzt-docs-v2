/**
 * PillButton — Matches exact .v7-cta / .v7-pill styles
 * No logic logic, just class mapping.
 */
import React from 'react';

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'cta' | 'pill';
    className?: string;
    children: React.ReactNode;
}

export function PillButton({ variant = 'cta', className = '', children, ...props }: PillButtonProps) {
    const baseClass = variant === 'cta' ? 'v7-cta' : 'v7-pill';

    return (
        <button
            className={`${baseClass} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
