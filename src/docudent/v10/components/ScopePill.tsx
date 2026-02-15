/**
 * ScopePill — Jeton/Apple-style segmented control
 * =================================================
 * 
 * - Solid opaque surface (coral sheet tone)
 * - Sliding thumb with Framer Motion layout animation
 * - 280ms ease, no spring bounce
 * - Hover: +5% brightness, -1px lift
 * - Press: scale 0.99
 */

import React from 'react';
import { motion } from 'framer-motion';
import './ScopePill.css';

interface Props {
    value: 'practice' | 'user';
    onChange: (next: 'practice' | 'user') => void;
}

const ITEMS: Array<{ key: 'practice' | 'user'; label: string }> = [
    { key: 'practice', label: 'Praxis' },
    { key: 'user', label: 'Benutzer' },
];

export function ScopePill({ value, onChange }: Props) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            onChange('practice');
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            onChange('user');
        }
    };

    return (
        <div
            className="scope-pill"
            role="tablist"
            aria-label="Scope Auswahl"
            onKeyDown={handleKeyDown}
        >
            {/* Sliding thumb */}
            <motion.div
                className="scope-pill-thumb"
                layoutId="scope-pill-thumb"
                initial={false}
                animate={{
                    x: value === 'practice' ? 0 : '100%',
                }}
                transition={{
                    duration: 0.28,
                    ease: [0.22, 1, 0.36, 1],
                }}
            />

            {/* Items */}
            {ITEMS.map((item) => (
                <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={value === item.key}
                    tabIndex={value === item.key ? 0 : -1}
                    className={`scope-pill-item ${value === item.key ? 'is-active' : ''}`}
                    onClick={() => onChange(item.key)}
                >
                    <motion.span
                        initial={false}
                        animate={{
                            opacity: value === item.key ? 0.92 : 0.70,
                        }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {item.label}
                    </motion.span>
                </button>
            ))}
        </div>
    );
}
