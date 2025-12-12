/**
 * Stepper — 3-Step Minimal Progress Indicator
 * 
 * Dots + lines, coral accent for active step.
 */

import React from 'react';
import { motion } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface StepperProps {
    currentStep: 1 | 2 | 3;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function Stepper({ currentStep }: StepperProps) {
    const colors = {
        active: '#FF6B4A',
        inactive: 'rgba(255,255,255,0.25)',
        line: 'rgba(255,255,255,0.12)',
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="flex items-center"
        >
            {/* Step 1 */}
            <div
                className="w-2 h-2 rounded-full"
                style={{ background: currentStep >= 1 ? colors.active : colors.inactive }}
            />
            <div
                style={{
                    width: '28px',
                    height: '2px',
                    background: currentStep >= 2 ? colors.active : colors.line
                }}
            />

            {/* Step 2 */}
            <div
                className="w-2 h-2 rounded-full"
                style={{ background: currentStep >= 2 ? colors.active : colors.inactive }}
            />
            <div
                style={{
                    width: '28px',
                    height: '2px',
                    background: currentStep >= 3 ? colors.active : colors.line
                }}
            />

            {/* Step 3 */}
            <div
                className="w-2 h-2 rounded-full"
                style={{ background: currentStep >= 3 ? colors.active : colors.inactive }}
            />
        </motion.div>
    );
}

export default Stepper;
