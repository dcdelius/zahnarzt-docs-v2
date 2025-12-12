/**
 * InsuranceMorphPill — Jeton-style morphing pill
 * 
 * A single element that expands/contracts in place.
 * - Closed: compact pill with current selection
 * - Open (hover/click): expands to show 3 options
 * - No separate modal, no overlay
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { InsuranceType } from '../../hooks/useDocudentV6';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface InsuranceMorphPillProps {
    insuranceType: InsuranceType;
    hasMKV: boolean;
    onInsuranceChange: (type: InsuranceType) => void;
    onMKVChange: (hasMKV: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Get current selection info
// ═══════════════════════════════════════════════════════════════

function getSelectionInfo(insuranceType: InsuranceType, hasMKV: boolean) {
    if (insuranceType === 'PKV') {
        return {
            label: 'PKV',
            subline: 'Private Krankenversicherung',
        };
    }
    if (hasMKV) {
        return {
            label: 'GKV + Mehrkosten (MKV)',
            subline: 'GKV plus Mehrkostenvereinbarung',
        };
    }
    return {
        label: 'GKV ohne Mehrkosten',
        subline: 'Reguläre gesetzliche Leistungen',
    };
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function InsuranceMorphPill({
    insuranceType,
    hasMKV,
    onInsuranceChange,
    onMKVChange,
}: InsuranceMorphPillProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectionInfo = getSelectionInfo(insuranceType, hasMKV);

    // Determine which option is active
    const activeOption = insuranceType === 'PKV' ? 'pkv' : (hasMKV ? 'gkv-mkv' : 'gkv');

    // ─── Handlers ───
    const handleOptionClick = (option: 'gkv' | 'gkv-mkv' | 'pkv') => {
        if (option === 'gkv') {
            onInsuranceChange('GKV');
            onMKVChange(false);
        } else if (option === 'gkv-mkv') {
            onInsuranceChange('GKV');
            onMKVChange(true);
        } else {
            onInsuranceChange('PKV');
            onMKVChange(false);
        }
        setIsOpen(false);
    };

    // Detect touch device
    const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;

    return (
        <motion.div
            layout
            animate={isOpen ? 'open' : 'closed'}
            variants={{
                closed: {
                    height: 52,
                    borderRadius: 999,
                    paddingTop: 10,
                    paddingBottom: 10,
                },
                open: {
                    height: 180,
                    borderRadius: 24,
                    paddingTop: 14,
                    paddingBottom: 14,
                },
            }}
            transition={{
                duration: 0.26,
                ease: [0.16, 1, 0.3, 1],
            }}
            onMouseEnter={!isTouchDevice ? () => setIsOpen(true) : undefined}
            onMouseLeave={!isTouchDevice ? () => setIsOpen(false) : undefined}
            onClick={isTouchDevice ? () => setIsOpen(!isOpen) : undefined}
            style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                paddingLeft: 20,
                paddingRight: 20,
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, #FF6B4A, #FFB199)',
                boxShadow: '0 22px 44px rgba(0,0,0,0.34), 0 6px 16px rgba(0,0,0,0.24)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                cursor: 'pointer',
                overflow: 'hidden',
                maxWidth: 280,
            }}
        >
            {/* ═══ HEADER (always visible) ═══ */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{
                        fontSize: 11,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase' as const,
                        opacity: 0.8,
                    }}>
                        Versicherung
                    </span>
                    <span style={{
                        fontSize: 14,
                        fontWeight: 500,
                    }}>
                        {selectionInfo.label}
                    </span>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 11,
                    opacity: 0.85,
                }}>
                    {/* Status dot */}
                    <span style={{
                        display: 'inline-flex',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: hasMKV && insuranceType === 'GKV'
                            ? '#FF6B4A'
                            : 'rgba(255,255,255,0.85)',
                        boxShadow: hasMKV && insuranceType === 'GKV'
                            ? '0 0 10px rgba(255,107,74,0.9)'
                            : '0 0 8px rgba(255,255,255,0.8)',
                    }} />
                    {/* Chevron */}
                    <motion.span
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown size={16} />
                    </motion.span>
                </div>
            </div>

            {/* Mini subline */}
            <span style={{
                marginTop: 4,
                fontSize: 11,
                opacity: 0.85,
            }}>
                {selectionInfo.subline}
            </span>

            {/* ═══ OPTIONS (visible in open state) ═══ */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        style={{
                            marginTop: 16,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                        }}
                    >
                        <OptionRow
                            label="GKV ohne Mehrkosten"
                            subline="Reguläre gesetzliche Leistungen"
                            isActive={activeOption === 'gkv'}
                            dotType="neutral"
                            onClick={() => handleOptionClick('gkv')}
                        />
                        <OptionRow
                            label="GKV + Mehrkosten (MKV)"
                            subline="GKV + privat vereinbarte Mehrkosten"
                            isActive={activeOption === 'gkv-mkv'}
                            dotType="coral"
                            onClick={() => handleOptionClick('gkv-mkv')}
                        />
                        <OptionRow
                            label="PKV"
                            subline="Private Krankenversicherung"
                            isActive={activeOption === 'pkv'}
                            dotType="neutral"
                            onClick={() => handleOptionClick('pkv')}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════
// OPTION ROW
// ═══════════════════════════════════════════════════════════════

interface OptionRowProps {
    label: string;
    subline: string;
    isActive: boolean;
    dotType: 'neutral' | 'coral';
    onClick: () => void;
}

function OptionRow({ label, subline, isActive, dotType, onClick }: OptionRowProps) {
    const [isHovered, setIsHovered] = useState(false);

    const getBackground = () => {
        if (isActive) {
            return dotType === 'coral'
                ? 'rgba(255,255,255,0.30)'
                : 'rgba(255,255,255,0.24)';
        }
        if (isHovered) return 'rgba(255,255,255,0.16)';
        return 'transparent';
    };

    return (
        <motion.button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            whileHover={{ y: -1 }}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 999,
                background: getBackground(),
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                textAlign: 'left' as const,
                transition: 'all 0.14s ease-out',
                boxShadow: isActive && dotType === 'coral'
                    ? '0 0 12px rgba(255,255,255,0.45)'
                    : 'none',
            }}
        >
            {/* Indicator */}
            <span style={{
                display: 'inline-flex',
                width: 16,
                height: 16,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.7)',
                flexShrink: 0,
            }}>
                {isActive && (
                    <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: dotType === 'coral' ? '#FF6B4A' : '#FFFFFF',
                        boxShadow: dotType === 'coral'
                            ? '0 0 8px rgba(255,107,74,0.9)'
                            : 'none',
                    }} />
                )}
            </span>

            {/* Text */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 400 }}>
                    {label}
                </span>
                <span style={{ fontSize: 11, opacity: 0.85 }}>
                    {subline}
                </span>
            </div>
        </motion.button>
    );
}

export default InsuranceMorphPill;
