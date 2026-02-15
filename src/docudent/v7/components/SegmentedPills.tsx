/**
 * SegmentedPills — For Question Answers
 * 
 * 2–4 options, pill segments.
 * Active state uses subtle fill + hairline.
 */

import React from 'react';

interface Option {
    id: string;
    label: string;
}

interface SegmentedPillsProps {
    options: Option[];
    value: string | undefined;
    onChange: (val: string) => void;
}

export function SegmentedPills({ options, value, onChange }: SegmentedPillsProps) {
    return (
        <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap' }}>
            {options.map((opt) => {
                const isActive = value === opt.id;

                return (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChange(opt.id)}
                        className="v7-pill"
                        style={{
                            padding: '10px 16px',
                            minWidth: '60px',
                            justifyContent: 'center',
                            background: isActive
                                ? 'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.08))'
                                : 'rgba(255,255,255,0.04)',
                            borderColor: isActive
                                ? 'rgba(255,255,255,0.3)'
                                : 'rgba(255,255,255,0.14)',
                            color: isActive ? 'var(--ink)' : 'var(--ink-dim)',
                            boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                            fontWeight: isActive ? 600 : 500,
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
