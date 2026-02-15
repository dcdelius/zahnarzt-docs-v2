/**
 * SoftPillLink Redirect Wrapper
 * 
 * Since I put SoftPillLink in PillButton.tsx file for convenience in the plan,
 * but to be safe with imports I'll make a dedicated re-export or just use PillButton.tsx
 * for both.
 * 
 * Actually, to be strictly following the file list in prompt, I should create SoftPillLink.tsx separately
 * if requested. The prompt listed "v7/components/SoftPillLink.tsx (new)" separately.
 * So I will split them.
 */

import { SoftPillLink as SPL } from './PillButton';

// Re-exporting if someone imports from here, or I can just define it here.
// I'll define it fully here to be safe and clean.

import React from 'react';
import { Link } from 'react-router-dom';

interface SoftPillLinkProps {
    to: string;
    children: React.ReactNode;
    active?: boolean;
}

export function SoftPillLink({ to, children, active }: SoftPillLinkProps) {
    return (
        <Link
            to={to}
            className="v7-pill"
            style={{
                fontSize: '13px',
                padding: '8px 16px',
                background: active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                borderColor: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.14)',
                color: active ? 'var(--ink)' : 'var(--ink-dim)',
            }}
        >
            {children}
        </Link>
    );
}
