/**
 * InsuranceSelector — V6 EXACT Pill Segmented Control
 *
 * V6 parity:
 * - Coral gradient outer container with depth
 * - White active segment with strong glow
 * - Hover lift on whole bar
 * - layoutId animation between segments
 * - Inner shadow for materiality
 *
 * ❌ NO logic — only UI state from props
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    colors,
    gradients,
    shadows,
    radii,
    motion as motionTokens,
} from '../styles/tokens';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type InsuranceMode = 'gkv' | 'gkv-mkv' | 'pkv';

interface InsuranceSelectorProps {
    insuranceType: 'GKV' | 'PKV';
    hasMKV: boolean;
    onInsuranceChange: (type: 'GKV' | 'PKV') => void;
    onMKVChange: (hasMKV: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════
// MODES DATA
// ═══════════════════════════════════════════════════════════════

const MODES: { id: InsuranceMode; label: string; description: string }[] = [
    { id: 'gkv', label: 'GKV', description: 'ohne Mehrkosten' },
    { id: 'gkv-mkv', label: 'GKV + MKV', description: 'Mehrkostenvereinbarung' },
    { id: 'pkv', label: 'PKV', description: 'privat' },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function InsuranceSelector({
    insuranceType,
    hasMKV,
    onInsuranceChange,
    onMKVChange,
}: InsuranceSelectorProps) {
    const [isBarHovered, setIsBarHovered] = useState(false);

    // Derive current mode from props
    const currentMode: InsuranceMode = insuranceType === 'PKV'
        ? 'pkv'
        : hasMKV
            ? 'gkv-mkv'
            : 'gkv';

    // Handler
    const handleModeClick = (id: InsuranceMode) => {
        if (id === 'gkv') {
            onInsuranceChange('GKV');
            onMKVChange(false);
        } else if (id === 'gkv-mkv') {
            onInsuranceChange('GKV');
            onMKVChange(true);
        } else {
            onInsuranceChange('PKV');
            onMKVChange(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: motionTokens.durationLarge,
                ease: motionTokens.easing,
                delay: 0.1,
            }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
            }}
        >
            {/* Segmented Bar — V6 exact (label is rendered by parent) */}

            {/* Segmented Bar — V6 exact */}
            <motion.div
                onMouseEnter={() => setIsBarHovered(true)}
                onMouseLeave={() => setIsBarHovered(false)}
                animate={{
                    y: isBarHovered ? -3 : 0,
                    boxShadow: isBarHovered ? shadows.barHover : shadows.barDefault,
                }}
                transition={{
                    duration: motionTokens.durationSmall,
                    ease: motionTokens.easing,
                }}
                style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'stretch',
                    borderRadius: radii.pill,
                    padding: '6px',
                    background: gradients.insuranceBar,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    alignSelf: 'flex-start',
                    boxShadow: shadows.barDefault,
                }}
            >
                {/* Inner highlight for materiality */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '50%',
                        background: gradients.innerHighlight,
                        borderRadius: `${radii.pill} ${radii.pill} 0 0`,
                        pointerEvents: 'none',
                    }}
                />

                {MODES.map((mode) => (
                    <ModeSegment
                        key={mode.id}
                        label={mode.label}
                        description={mode.description}
                        isActive={currentMode === mode.id}
                        onClick={() => handleModeClick(mode.id)}
                    />
                ))}
            </motion.div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MODE SEGMENT — V6 exact
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
            }}
            whileHover={!isActive ? { background: 'rgba(255,255,255,0.2)' } : {}}
            transition={{
                duration: motionTokens.durationMedium,
                ease: motionTokens.easing,
            }}
            style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'center',
                borderRadius: radii.pill,
                padding: '10px 18px',
                textAlign: 'left',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? colors.segmentActiveText : colors.segmentInactiveText,
                background: isActive ? colors.segmentActive : 'transparent',
                boxShadow: isActive ? '0 4px 16px rgba(0,0,0,0.15)' : 'none',
            }}
        >
            {/* Glow effect — animates between segments with layoutId */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        layoutId="insurance-segment-glow"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: motionTokens.durationMedium }}
                        style={{
                            position: 'absolute',
                            inset: '-4px',
                            borderRadius: radii.pill,
                            background: 'rgba(255,255,255,0.5)',
                            filter: 'blur(20px)',
                            zIndex: -1,
                            pointerEvents: 'none',
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Active inner highlight */}
            {isActive && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '50%',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
                        borderRadius: `${radii.pill} ${radii.pill} 0 0`,
                        pointerEvents: 'none',
                    }}
                />
            )}

            <span style={{
                position: 'relative',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
            }}>
                {label}
            </span>
            <span style={{
                position: 'relative',
                fontSize: '10px',
                lineHeight: 1.3,
                opacity: isActive ? 0.8 : 0.7,
                marginTop: '2px',
                fontWeight: 400,
            }}>
                {description}
            </span>
        </motion.button>
    );
}

export default InsuranceSelector;
