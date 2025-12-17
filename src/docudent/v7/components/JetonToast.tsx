/**
 * JetonToast — Premium Animated Toast
 *
 * ═══════════════════════════════════════════════════════════════
 * Jeton-style toast with glass effect, auto-dismiss, and motion.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, gradients, space, radii, typography, shadows, glass, motion as motionTokens } from '../app/designTokens';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ToastVariant = 'success' | 'error' | 'info';

export interface JetonToastProps {
    variant: ToastVariant;
    title: string;
    message?: string;
    isOpen: boolean;
    onClose: () => void;
    autoDismissMs?: number;
}

// ═══════════════════════════════════════════════════════════════
// VARIANT CONFIG
// ═══════════════════════════════════════════════════════════════

const VARIANT_CONFIG: Record<ToastVariant, { icon: string; gradient: string; accentColor: string }> = {
    success: {
        icon: '✓',
        gradient: gradients.mintSky,
        accentColor: colors.success,
    },
    error: {
        icon: '✕',
        gradient: gradients.peachRose,
        accentColor: colors.error,
    },
    info: {
        icon: 'ℹ',
        gradient: gradients.cyanLilac,
        accentColor: colors.accent,
    },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function JetonToast({
    variant,
    title,
    message,
    isOpen,
    onClose,
    autoDismissMs = 3000,
}: JetonToastProps) {
    const config = VARIANT_CONFIG[variant];

    // Auto-dismiss
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(onClose, autoDismissMs);
        return () => clearTimeout(timer);
    }, [isOpen, autoDismissMs, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    style={{
                        position: 'fixed',
                        bottom: space['8'],
                        right: space['8'],
                        zIndex: 2000,
                        ...glass.panel,
                        borderRadius: radii.lg,
                        padding: `${space['4']} ${space['5']}`,
                        minWidth: '280px',
                        maxWidth: '400px',
                        boxShadow: shadows.medium,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: space['3'],
                        borderLeft: `3px solid ${config.accentColor}`,
                    }}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{
                        duration: motionTokens.fast,
                        ease: motionTokens.ease,
                    }}
                >
                    {/* Icon */}
                    <div
                        style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: radii.md,
                            background: config.gradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: typography.bold,
                            color: colors.textPrimary,
                            flexShrink: 0,
                        }}
                    >
                        {config.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                        <div
                            style={{
                                fontSize: typography.body,
                                fontWeight: typography.semibold,
                                color: colors.textPrimary,
                                marginBottom: message ? space['1'] : 0,
                            }}
                        >
                            {title}
                        </div>
                        {message && (
                            <div
                                style={{
                                    fontSize: typography.small,
                                    color: colors.textSecondary,
                                    lineHeight: typography.snug,
                                }}
                            >
                                {message}
                            </div>
                        )}
                    </div>

                    {/* Close button */}
                    <motion.button
                        onClick={onClose}
                        style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: radii.sm,
                            border: 'none',
                            background: 'transparent',
                            color: colors.textMuted,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            flexShrink: 0,
                        }}
                        whileHover={{ background: colors.hairlineSubtle, color: colors.textSecondary }}
                        whileTap={{ scale: 0.9 }}
                    >
                        ✕
                    </motion.button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ═══════════════════════════════════════════════════════════════
// HOOK FOR TOAST STATE
// ═══════════════════════════════════════════════════════════════

export interface ToastState {
    isOpen: boolean;
    variant: ToastVariant;
    title: string;
    message?: string;
}

export function useToast() {
    const [toast, setToast] = React.useState<ToastState>({
        isOpen: false,
        variant: 'info',
        title: '',
    });

    const showToast = React.useCallback(
        (variant: ToastVariant, title: string, message?: string) => {
            setToast({ isOpen: true, variant, title, message });
        },
        []
    );

    const hideToast = React.useCallback(() => {
        setToast(prev => ({ ...prev, isOpen: false }));
    }, []);

    return { toast, showToast, hideToast };
}

export default JetonToast;
