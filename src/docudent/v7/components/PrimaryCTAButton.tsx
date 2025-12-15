/**
 * PrimaryCTAButton — V6-Style Button with Depth + Activation
 *
 * Visual system:
 * - Coral gradient background
 * - Inner highlight (top edge glow)
 * - Multi-layer shadow
 * - Activation pulse when enabled
 *
 * States:
 * - Disabled: flat, muted
 * - Default: resting, depth visible
 * - Hover: lift up, stronger shadow
 * - Active: press down, softer shadow
 *
 * ❌ NO logic — only visual states
 */

import React, { useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { colors, gradients, shadows, radii, motion as motionTokens } from '../styles/tokens';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface PrimaryCTAButtonProps {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    icon?: React.ReactNode;
    style?: React.CSSProperties;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function PrimaryCTAButton({
    children,
    onClick,
    disabled = false,
    icon,
    style,
}: PrimaryCTAButtonProps) {
    const controls = useAnimation();
    const wasDisabled = useRef(disabled);

    // Activation pulse when transitioning from disabled → enabled
    useEffect(() => {
        if (wasDisabled.current && !disabled) {
            // Trigger activation animation
            controls.start({
                scale: [1, 1.03, 1],
                boxShadow: [
                    shadows.buttonDefault,
                    shadows.buttonGlow,
                    shadows.buttonDefault,
                ],
                transition: { duration: 0.35, ease: motionTokens.easing },
            });
        }
        wasDisabled.current = disabled;
    }, [disabled, controls]);

    return (
        <motion.button
            type="button"
            onClick={onClick}
            disabled={disabled}
            animate={controls}
            // Hover: lift + stronger shadow
            whileHover={!disabled ? {
                scale: 1.02,
                y: -2,
                boxShadow: shadows.buttonHover,
            } : undefined}
            // Active: press down + softer shadow
            whileTap={!disabled ? {
                scale: 0.98,
                y: 1,
                boxShadow: shadows.buttonActive,
            } : undefined}
            transition={{
                duration: motionTokens.durationSmall,
                ease: motionTokens.easing,
            }}
            style={{
                // Layout
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '18px 36px',
                borderRadius: radii.button,
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                overflow: 'hidden',

                // Background
                background: disabled
                    ? 'rgba(255,255,255,0.12)'
                    : gradients.button,

                // Typography
                color: colors.textPrimary,
                fontSize: '16px',
                fontWeight: 600,
                letterSpacing: '0.02em',

                // Shadow — multi-layer
                boxShadow: disabled ? shadows.buttonDisabled : shadows.buttonDefault,

                // Disabled state
                opacity: disabled ? 0.5 : 1,

                // Overrides
                ...style,
            }}
        >
            {/* Inner highlight — top edge glow */}
            {!disabled && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '50%',
                        background: gradients.innerHighlight,
                        borderRadius: `${radii.button} ${radii.button} 0 0`,
                        pointerEvents: 'none',
                    }}
                />
            )}

            {/* Top edge highlight line */}
            {!disabled && (
                <div
                    style={{
                        position: 'absolute',
                        top: '1px',
                        left: '20%',
                        right: '20%',
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                        borderRadius: '1px',
                        pointerEvents: 'none',
                    }}
                />
            )}

            {/* Content */}
            <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>

            {/* Icon */}
            {icon && (
                <span style={{ position: 'relative', zIndex: 1 }}>{icon}</span>
            )}
        </motion.button>
    );
}

export default PrimaryCTAButton;
