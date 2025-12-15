/**
 * TreatmentSelector — Glass floating menu for treatment type
 *
 * Design principles:
 * - Minimal trigger: "Füllung ▾"
 * - Glass blur floating menu on click
 * - Big type, no clutter
 *
 * ❌ NO business logic — UI-only state
 * ✅ Changes placeholder text and optional sculpture mood
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    colors,
    gradients,
    radii,
    motion as motionTokens,
    typography,
} from '../styles/tokens';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type TreatmentType =
    | 'fuellung'
    | 'kontrolle'
    | 'pzr'
    | 'endo'
    | 'extraktion'
    | 'par'
    | 'ze';

interface TreatmentOption {
    id: TreatmentType;
    label: string;
    placeholder: string;
}

interface TreatmentSelectorProps {
    value: TreatmentType;
    onChange: (treatment: TreatmentType) => void;
}

// ═══════════════════════════════════════════════════════════════
// OPTIONS DATA
// ═══════════════════════════════════════════════════════════════

const TREATMENTS: TreatmentOption[] = [
    { id: 'fuellung', label: 'Füllung', placeholder: 'Zahn 36 mod, Komposit, 80€...' },
    { id: 'kontrolle', label: 'Kontrolle', placeholder: '01, Befund unauffällig...' },
    { id: 'pzr', label: 'PZR', placeholder: 'PZR durchgeführt, Polierpaste...' },
    { id: 'endo', label: 'Endo', placeholder: 'Zahn 46, WKB, 3 Kanäle...' },
    { id: 'extraktion', label: 'Extraktion', placeholder: 'Zahn 48, Extraktion, L1...' },
    { id: 'par', label: 'PAR', placeholder: 'PAR-Status, Sondierungstiefen...' },
    { id: 'ze', label: 'ZE/Prothetik', placeholder: 'Zahn 25, Krone, VMK...' },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function TreatmentSelector({ value, onChange }: TreatmentSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentTreatment = TREATMENTS.find(t => t.id === value) || TREATMENTS[0];

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleSelect = (id: TreatmentType) => {
        onChange(id);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
            {/* Trigger button */}
            <motion.button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ opacity: 0.9 }}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0',
                    border: 'none',
                    background: 'transparent',
                    color: colors.textPrimary,
                    fontSize: '13px',
                    fontWeight: typography.medium,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    opacity: 0.75,
                    transition: 'opacity 0.15s',
                }}
            >
                {currentTreatment.label}
                <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ fontSize: '10px', opacity: 0.6 }}
                >
                    ▼
                </motion.span>
            </motion.button>

            {/* Floating menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{
                            duration: motionTokens.durationMedium,
                            ease: motionTokens.easing,
                        }}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            left: 0,
                            minWidth: '180px',
                            padding: '8px',
                            borderRadius: radii.card,
                            background: 'rgba(30, 20, 25, 0.85)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4)',
                            zIndex: 100,
                        }}
                    >
                        {TREATMENTS.map((treatment) => (
                            <motion.button
                                key={treatment.id}
                                type="button"
                                onClick={() => handleSelect(treatment.id)}
                                whileHover={{ background: 'rgba(255, 255, 255, 0.08)' }}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '10px 14px',
                                    border: 'none',
                                    borderRadius: radii.button,
                                    background: value === treatment.id
                                        ? 'rgba(255, 255, 255, 0.1)'
                                        : 'transparent',
                                    color: colors.textPrimary,
                                    fontSize: '14px',
                                    fontWeight: value === treatment.id ? typography.medium : typography.regular,
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'background 0.15s',
                                }}
                            >
                                {treatment.label}
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Helper to get placeholder for current treatment
export function getTreatmentPlaceholder(treatment: TreatmentType): string {
    return TREATMENTS.find(t => t.id === treatment)?.placeholder || TREATMENTS[0].placeholder;
}

export default TreatmentSelector;
