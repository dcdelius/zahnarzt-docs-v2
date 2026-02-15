/**
 * V8 TextLengthSelector — Jeton Dock Style
 * 
 * Matches the bottom navigation dock:
 * - Gradient Background Container
 * - White Pill Active State
 * - Pink/Orange Text for Active
 */

import React from 'react';
import { motion } from 'framer-motion';

type TextLength = 'kurz' | 'mittel' | 'lang';

interface V8TextLengthSelectorProps {
    value: TextLength;
    onChange: (value: TextLength) => void;
}

const OPTIONS: { value: TextLength; label: string }[] = [
    { value: 'kurz', label: 'Kurz' },
    { value: 'mittel', label: 'Mittel' },
    { value: 'lang', label: 'Lang' },
];

export function V8TextLengthSelector({ value, onChange }: V8TextLengthSelectorProps) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        }}>
            {/* Label (Optional - keeping it minimal or removing if desired, but user said slider) */}
            <span style={{
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.6)',
                fontWeight: 600
            }}>
                Länge
            </span>

            {/* The "Dock" Container */}
            <div style={{
                display: 'flex',
                gap: '2px',
                padding: '4px',
                borderRadius: '999px',
                // Jeton Gradient
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
