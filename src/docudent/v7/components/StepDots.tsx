/**
 * StepDots — V6-style Bottom Progress Indicator
 *
 * Shows 3 dots + connecting lines for pipeline states:
 * - Step 1: idle/processing
 * - Step 2: questions
 * - Step 3: output
 *
 * Design: Coral accent (#FF6B4A) for active steps, connecting lines
 *
 * ❌ NO logic — pure presentation
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
    radii,
    motion as motionTokens,
} from '../styles/tokens';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface StepDotsProps {
    currentState: 'idle' | 'processing' | 'running' | 'questions' | 'output' | 'error' | 'multi_output';
}

// ═══════════════════════════════════════════════════════════════
// STATE TO STEP MAPPING
// ═══════════════════════════════════════════════════════════════

const STATE_TO_STEP: Record<string, number> = {
    idle: 1,
    processing: 1,
    running: 1,
    questions: 2,
    output: 3,
    multi_output: 3,
    error: 1,
};

// ═══════════════════════════════════════════════════════════════
// COLORS — V6 Coral accent
// ═══════════════════════════════════════════════════════════════

const colors = {
    active: '#FF6B4A',      // Coral (V6 match)
    inactive: 'rgba(255, 255, 255, 0.25)',
    line: 'rgba(255, 255, 255, 0.12)',
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
        zIndex: 100,
    },
    dot: {
        width: '8px',
        height: '8px',
        borderRadius: radii.pill,
        transition: 'background 0.2s, transform 0.2s, box-shadow 0.2s',
    },
    line: {
        width: '28px',
        height: '2px',
        transition: 'background 0.2s',
    },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function StepDots({ currentState }: StepDotsProps) {
    const activeStep = STATE_TO_STEP[currentState] || 1;

    return (
        <div style={styles.container} data-testid="v7-stepper">
            {/* Step 1 - Idle/Dictation */}
            <motion.div
                animate={{
                    scale: activeStep === 1 ? 1.25 : 1,
                }}
                transition={{
                    duration: motionTokens.durationMedium,
                    ease: motionTokens.easing,
                }}
                style={{
                    ...styles.dot,
                    background: activeStep >= 1 ? colors.active : colors.inactive,
                    boxShadow: activeStep === 1 ? '0 0 12px rgba(255, 107, 74, 0.5)' : 'none',
                }}
                data-testid="v7-step-dot-idle"
            />

            {/* Line 1-2 */}
            <div
                style={{
                    ...styles.line,
                    background: activeStep >= 2 ? colors.active : colors.line,
                }}
            />

            {/* Step 2 - Questions */}
            <motion.div
                animate={{
                    scale: activeStep === 2 ? 1.25 : 1,
                }}
                transition={{
                    duration: motionTokens.durationMedium,
                    ease: motionTokens.easing,
                }}
                style={{
                    ...styles.dot,
                    background: activeStep >= 2 ? colors.active : colors.inactive,
                    boxShadow: activeStep === 2 ? '0 0 12px rgba(255, 107, 74, 0.5)' : 'none',
                }}
                data-testid="v7-step-dot-questions"
            />

            {/* Line 2-3 */}
            <div
                style={{
                    ...styles.line,
                    background: activeStep >= 3 ? colors.active : colors.line,
                }}
            />

            {/* Step 3 - Output */}
            <motion.div
                animate={{
                    scale: activeStep === 3 ? 1.25 : 1,
                }}
                transition={{
                    duration: motionTokens.durationMedium,
                    ease: motionTokens.easing,
                }}
                style={{
                    ...styles.dot,
                    background: activeStep >= 3 ? colors.active : colors.inactive,
                    boxShadow: activeStep === 3 ? '0 0 12px rgba(255, 107, 74, 0.5)' : 'none',
                }}
                data-testid="v7-step-dot-output"
            />
        </div>
    );
}

export default StepDots;
