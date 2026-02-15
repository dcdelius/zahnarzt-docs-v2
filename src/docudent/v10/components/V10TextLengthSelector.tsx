/**
 * V10 TextLengthSelector — Copied from V8 (Jeton Dock Style)
 */

import React from 'react';
import { motion } from 'framer-motion';

type TextLength = 'kurz' | 'mittel' | 'lang';

interface V10TextLengthSelectorProps {
    value: TextLength;
    onChange: (value: TextLength) => void;
    'data-testid'?: string;
}

const OPTIONS: { value: TextLength; label: string }[] = [
    { value: 'kurz', label: 'Kurz' },
    { value: 'mittel', label: 'Mittel' },
    { value: 'lang', label: 'Lang' },
];

export function V10TextLengthSelector({ value, onChange, 'data-testid': testId }: V10TextLengthSelectorProps) {
    return (
        <div data-testid={testId} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        }}>
            <span style={{
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.6)',
                fontWeight: 600
            }}>
                Länge
            </span>

            <div style={{
                display: 'flex',
                gap: '2px',
                padding: '4px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
                boxShadow: '0 4px 12px rgba(255, 107, 107, 0.25)'
            }}>
                {OPTIONS.map(option => {
                    const isActive = value === option.value;
                    return (
                        <motion.button
                            key={option.value}
                            type="button"
                            onClick={() => onChange(option.value)}
                            animate={{
                                background: isActive ? '#FFFFFF' : 'transparent',
                                color: isActive ? '#FF6B6B' : '#FFFFFF',
                            }}
                            transition={{ duration: 0.2 }}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '999px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 700,
                                fontFamily: 'inherit',
                                position: 'relative'
                            }}
                        >
                            {option.label}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
