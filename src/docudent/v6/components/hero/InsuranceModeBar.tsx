/**
 * InsuranceModeBar — Jeton-Style Segmented Bar (v2)
 * 
 * Refinements:
 * - Label directly above bar
 * - Entry animation on load
 * - Hover lift on whole bar
 * - Segment glow animation with layoutId
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocudentV6 } from '../../hooks/useDocudentV6';

// ═══════════════════════════════════════════════════════════════
// MODES DATA
// ═══════════════════════════════════════════════════════════════

const MODES = [
    { id: 'gkv' as const, label: 'GKV', description: 'ohne Mehrkosten' },
    { id: 'gkv-mkv' as const, label: 'GKV + MKV', description: 'Mehrkostenvereinbarung' },
    { id: 'pkv' as const, label: 'PKV', description: 'privat' },
];

type ModeId = 'gkv' | 'gkv-mkv' | 'pkv';

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function InsuranceModeBar() {
    const { insuranceType, hasMKV, setInsuranceType, setMKV } = useDocudentV6();
    const [isBarHovered, setIsBarHovered] = useState(false);

    // Derive current mode from state
    const currentMode: ModeId = insuranceType === 'PKV'
        ? 'pkv'
        : hasMKV
            ? 'gkv-mkv'
            : 'gkv';

    // ─── Handler ───
    const handleModeClick = (id: ModeId) => {
        if (id === 'gkv') {
            setInsuranceType('GKV');
            setMKV(false);
        } else if (id === 'gkv-mkv') {
            setInsuranceType('GKV');
            setMKV(true);
        } else {
            setInsuranceType('PKV');
            setMKV(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                maxWidth: 460,
            }}
        >
            {/* Label - directly above bar */}
            <span style={{
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase' as const,
                color: 'rgba(255,255,255,0.65)',
            }}>
                Versicherung
            </span>

            {/* Segmented Bar */}
            <motion.div
                onMouseEnter={() => setIsBarHovered(true)}
                onMouseLeave={() => setIsBarHovered(false)}
                animate={{
                    y: isBarHovered ? -2 : 0,
                    boxShadow: isBarHovered
                        ? '0 24px 48px rgba(0,0,0,0.36), 0 8px 20px rgba(0,0,0,0.26)'
                        : '0 18px 36px rgba(0,0,0,0.30), 0 4px 12px rgba(0,0,0,0.22)',
                }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{
                    display: 'inline-flex',
                    alignItems: 'stretch',
                    borderRadius: 999,
                    padding: '6px 6px',
                    background: 'linear-gradient(135deg, #FF6B4A, #FFB199)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    alignSelf: 'flex-start',
                }}
            >
                {MODES.map((mode) => {
                    const isActive = currentMode === mode.id;

                    return (
                        <ModeSegment
                            key={mode.id}
                            label={mode.label}
                            description={mode.description}
                            isActive={isActive}
                            onClick={() => handleModeClick(mode.id)}
                        />
                    );
                })}
            </motion.div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MODE SEGMENT
// ═══════════════════════════════════════════════════════════════

interface ModeSegmentProps {
    label: string;
    description: string;
    isActive: boolean;
    onClick: () => void;
}

function ModeSegment({ label, description, isActive, onClick }: ModeSegmentProps) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            animate={{
                scale: isActive ? 1.03 : 1,
                background: isActive ? '#FFFFFF' : 'transparent',
            }}
            whileHover={!isActive ? { background: 'rgba(255,255,255,0.18)' } : {}}
            transition={{
                type: 'spring',
                stiffness: 280,
                damping: 20,
                mass: 0.4,
            }}
            style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'center',
                borderRadius: 999,
                padding: '8px 16px',
                textAlign: 'left' as const,
                border: 'none',
                cursor: 'pointer',
                color: isActive ? '#E25B3D' : '#FFE8DD',
                background: isActive ? '#FFFFFF' : 'transparent',
            }}
        >
            {/* Glow effect - animates between segments */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        layoutId="insurance-segment-glow"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.4)',
                            filter: 'blur(16px)',
                            zIndex: -1,
                            pointerEvents: 'none',
                        }}
                    />
                )}
            </AnimatePresence>

            <span style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                opacity: isActive ? 1 : 0.95,
            }}>
                {label}
            </span>
            <span style={{
                fontSize: 10,
                lineHeight: 1.3,
                opacity: isActive ? 0.85 : 0.75,
                marginTop: 1,
            }}>
                {description}
            </span>
        </motion.button>
    );
}

export default InsuranceModeBar;
