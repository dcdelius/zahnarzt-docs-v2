/**
 * V10 Treatment Selector — Pill Dropdown (Pack Registry)
 * 
 * M55: Converted from toggle-pills to dropdown for scalability.
 * Uses listPacks() from v10/packs/registry for dynamic treatment list.
 * V8/V10 Jeton aesthetic (pill container, gradient, blur).
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { listPacks } from '../packs';

interface V10TreatmentSelectorProps {
    value: string;
    onChange: (value: string) => void;
    'data-testid'?: string;
}

export function V10TreatmentSelector({ value, onChange, 'data-testid': testId }: V10TreatmentSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Get packs from registry
    const packs = useMemo(() => listPacks(), []);
    const selectedPack = packs.find(p => p.id === value) || packs[0];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') setIsOpen(false);
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
        }
        if (e.key === 'ArrowDown' && isOpen) {
            e.preventDefault();
            const currentIndex = packs.findIndex(p => p.id === value);
            const nextIndex = (currentIndex + 1) % packs.length;
            onChange(packs[nextIndex].id);
        }
        if (e.key === 'ArrowUp' && isOpen) {
            e.preventDefault();
            const currentIndex = packs.findIndex(p => p.id === value);
            const prevIndex = currentIndex === 0 ? packs.length - 1 : currentIndex - 1;
            onChange(packs[prevIndex].id);
        }
    };

    return (
        <div
            ref={containerRef}
            data-testid={testId}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                position: 'relative',
            }}
        >
            <span style={{
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.6)',
                fontWeight: 600
            }}>
                Behandlung
            </span>

            {/* Pill Dropdown Trigger */}
            <motion.button
                data-testid="v10-treatment-dropdown"
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                animate={{ scale: isOpen ? 0.98 : 1 }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '999px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    color: 'white',
                    background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
                    boxShadow: '0 4px 12px rgba(255, 107, 107, 0.25)',
                }}
            >
                <span style={{ textTransform: 'capitalize' }}>
                    {selectedPack?.meta?.label || selectedPack?.id || value}
                </span>
                <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    style={{ fontSize: '10px' }}
                >
                    ▼
                </motion.span>
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            left: 0,
                            minWidth: '180px',
                            background: 'rgba(30, 30, 40, 0.95)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            overflow: 'hidden',
                            zIndex: 100,
                        }}
                    >
                        {packs.map(pack => {
                            const isSelected = value === pack.id;
                            return (
                                <motion.button
                                    key={pack.id}
                                    data-testid={`v10-treatment-option-${pack.id}`}
                                    type="button"
                                    onClick={() => {
                                        onChange(pack.id);
                                        setIsOpen(false);
                                    }}
                                    // Avoid animating the `background` shorthand (causes non-animatable warnings).
                                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        padding: '12px 16px',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        backgroundImage: isSelected
                                            ? 'linear-gradient(135deg, rgba(255, 107, 107, 0.2), rgba(255, 142, 83, 0.2))'
                                            : 'none',
                                        color: isSelected ? '#FF8E53' : 'white',
                                        fontSize: '14px',
                                        fontWeight: isSelected ? 700 : 500,
                                        fontFamily: 'inherit',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        textTransform: 'capitalize',
                                    }}
                                >
                                    <div>{pack.meta?.label || pack.id}</div>
                                    {pack.meta?.description && (
                                        <div style={{
                                            fontSize: '11px',
                                            color: 'rgba(255,255,255,0.5)',
                                            marginTop: '2px',
                                        }}>
                                            {pack.meta.description}
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
