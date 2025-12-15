/**
 * TextLengthSelector — Output-Only Control
 *
 * Visibility rules:
 * - Hidden during dictation
 * - Hidden during questions
 * - Visible ONLY in output state
 *
 * Visual weight: Secondary (smaller, muted)
 *
 * ❌ NO logic — only UI state from props
 */

import React from 'react';
import { motion } from 'framer-motion';
import { colors, radii, motion as motionTokens } from '../styles/tokens';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type TextLength = 'kurz' | 'mittel' | 'lang';

interface TextLengthSelectorProps {
    value: TextLength;
    onChange: (value: TextLength) => void;
}

const OPTIONS: { value: TextLength; label: string }[] = [
    { value: 'kurz', label: 'Kurz' },
    { value: 'mittel', label: 'Mittel' },
    { value: 'lang', label: 'Lang' },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function TextLengthSelector({ value, onChange }: TextLengthSelectorProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionTokens.durationMedium, ease: motionTokens.easing }}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
            }}
        >
            {/* Label */}
            <span style={{
                fontSize: '10px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: colors.textMuted,
            }}>
                Länge
            </span>

            {/* Segmented Pills */}
            <div style={{
                display: 'flex',
                gap: '4px',
                padding: '4px',
                borderRadius: radii.pill,
                background: 'rgba(255,255,255,0.08)',
            }}>
                {OPTIONS.map(option => (
                    <motion.button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        animate={{
                            background: value === option.value
                                ? 'rgba(255,255,255,0.25)'
                                : 'transparent',
                        }}
                        whileHover={{
                            background: value === option.value
                                ? 'rgba(255,255,255,0.25)'
                                : 'rgba(255,255,255,0.12)',
                        }}
                        transition={{ duration: motionTokens.durationSmall, ease: motionTokens.easing }}
                        style={{
                            padding: '6px 12px',
                            borderRadius: radii.pill,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: value === option.value
                                ? colors.textPrimary
                                : colors.textSecondary,
                            background: value === option.value
                                ? 'rgba(255,255,255,0.25)'
                                : 'transparent',
                        }}
                    >
                        {option.label}
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
}

export default TextLengthSelector;
