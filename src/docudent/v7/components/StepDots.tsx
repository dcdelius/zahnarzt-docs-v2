/**
 * StepDots — V6-style Bottom Progress Indicator
 *
 * Shows 3 dots for pipeline states:
 * - Step 1: idle/processing
 * - Step 2: questions
 * - Step 3: output
 *
 * ❌ NO logic — pure presentation
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
    colors,
    radii,
    motion as motionTokens,
} from '../styles/tokens';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface StepDotsProps {
    currentState: 'idle' | 'processing' | 'questions' | 'output' | 'error';
}

// ═══════════════════════════════════════════════════════════════
// STATE TO STEP MAPPING
// ═══════════════════════════════════════════════════════════════

const STATE_TO_STEP: Record<string, number> = {
    idle: 1,
    processing: 1,
    questions: 2,
    output: 3,
    error: 1,
};

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = {
    container: {
        position: 'fixed' as const,
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 100,
    },
    dot: {
        width: '8px',
        height: '8px',
        borderRadius: radii.pill,
        background: 'rgba(255, 255, 255, 0.25)',
        transition: 'background 0.2s, transform 0.2s',
    },
    dotActive: {
        background: colors.textPrimary,
        boxShadow: '0 0 12px rgba(255, 255, 255, 0.5)',
    },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function StepDots({ currentState }: StepDotsProps) {
    const activeStep = STATE_TO_STEP[currentState] || 1;

    return (
        <div style={styles.container}>
            {[1, 2, 3].map((step) => (
                <motion.div
                    key={step}
                    animate={{
                        scale: step === activeStep ? 1.25 : 1,
                        opacity: step === activeStep ? 1 : 0.5,
                    }}
                    transition={{
                        duration: motionTokens.durationMedium,
                        ease: motionTokens.easing,
                    }}
                    style={{
                        ...styles.dot,
                        ...(step === activeStep ? styles.dotActive : {}),
                    }}
                />
            ))}
        </div>
    );
}

export default StepDots;
