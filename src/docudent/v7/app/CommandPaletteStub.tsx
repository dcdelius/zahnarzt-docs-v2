/**
 * Command Palette Stub — ⌘K Coming Soon
 *
 * ═══════════════════════════════════════════════════════════════
 * UI-only stub for command palette. Opens modal with "Coming Soon".
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, gradients, space, radii, typography, shadows, glass, motion as motionTokens } from './designTokens';

interface CommandPaletteStubProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CommandPaletteStub({ isOpen, onClose }: CommandPaletteStubProps) {
    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(11, 18, 32, 0.4)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 1000,
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        style={{
                            position: 'fixed',
                            top: '20%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '100%',
                            maxWidth: '480px',
                            ...glass.panel,
                            borderRadius: radii.xl,
                            padding: space['8'],
                            zIndex: 1001,
                            textAlign: 'center',
                        }}
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: motionTokens.fast, ease: motionTokens.ease }}
                    >
                        {/* Icon */}
                        <motion.div
                            style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: radii.lg,
                                background: gradients.cyanLilac,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '28px',
                                margin: '0 auto',
                                marginBottom: space['6'],
                            }}
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            ⌘
                        </motion.div>

                        {/* Title */}
                        <h2 style={{
                            fontSize: typography.h2,
                            fontWeight: typography.bold,
                            color: colors.textPrimary,
                            marginBottom: space['2'],
                        }}>
                            Command Palette
                        </h2>

                        {/* Badge */}
                        <span style={{
                            display: 'inline-block',
                            background: gradients.primary,
                            color: colors.textOnAccent,
                            fontSize: typography.label,
                            fontWeight: typography.bold,
                            padding: `${space['1']} ${space['4']}`,
                            borderRadius: radii.pill,
                            marginBottom: space['4'],
                            textTransform: 'uppercase',
                            letterSpacing: typography.wideTracking,
                        }}>
                            Coming Soon
                        </span>

                        {/* Description */}
                        <p style={{
                            fontSize: typography.body,
                            color: colors.textSecondary,
                            lineHeight: typography.relaxed,
                            marginBottom: space['6'],
                        }}>
                            Schnellzugriff auf alle Aktionen mit ⌘K.
                        </p>

                        {/* Close button */}
                        <motion.button
                            onClick={onClose}
                            style={{
                                padding: `${space['2']} ${space['6']}`,
                                background: colors.hairlineSubtle,
                                border: 'none',
                                borderRadius: radii.pill,
                                color: colors.textSecondary,
                                fontSize: typography.small,
                                fontWeight: typography.medium,
                                cursor: 'pointer',
                            }}
                            whileHover={{ background: colors.hairline }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Schließen
                        </motion.button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

/**
 * Keyboard shortcut badge for header.
 */
export function CommandPaletteHint({ onClick }: { onClick: () => void }) {
    return (
        <motion.button
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: space['2'],
                padding: `${space['1']} ${space['3']}`,
                background: colors.hairlineSubtle,
                border: `1px solid ${colors.hairlineSubtle}`,
                borderRadius: radii.md,
                color: colors.textMuted,
                fontSize: typography.label,
                fontWeight: typography.medium,
                cursor: 'pointer',
            }}
            whileHover={{
                background: colors.accentLight,
                color: colors.accent,
                borderColor: colors.accentLight,
            }}
            whileTap={{ scale: 0.97 }}
        >
            <span>⌘K</span>
        </motion.button>
    );
}

export default CommandPaletteStub;
