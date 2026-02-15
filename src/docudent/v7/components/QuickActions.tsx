/**
 * Quick Actions — Minimal Action Pills for V7 Hero
 *
 * ═══════════════════════════════════════════════════════════════
 * Text-first, pill buttons, V7 styling.
 * Only visible when no dictation active.
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FileText, Shield, Settings, Users, Command } from 'lucide-react';
import {
    colors,
    typography,
    radii,
    spacing,
    motion as motionTokens,
} from '../styles/tokens';

// ═══════════════════════════════════════════════════════════════
// ACTIONS DATA
// ═══════════════════════════════════════════════════════════════

const ACTIONS = [
    { id: 'cases', label: 'Fälle', icon: FileText, path: '/docudent/v7/cases' },
    { id: 'review', label: 'Prüfen', icon: Shield, path: '/docudent/v7/review' },
    { id: 'settings', label: 'Einstellungen', icon: Settings, path: '/docudent/v7/settings' },
    { id: 'team', label: 'Team', icon: Users, path: '/docudent/v7/team' },
];

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: spacing.md,
        marginTop: spacing.xxxl,
    },
    label: {
        fontSize: typography.caption,
        fontWeight: typography.medium,
        color: colors.textMuted,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
    },
    actions: {
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: spacing.sm,
    },
    pill: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.sm,
        padding: `${spacing.sm} ${spacing.lg}`,
        borderRadius: radii.pill,
        border: 'none',
        background: colors.surfaceGlass,
        color: colors.textSecondary,
        fontSize: typography.label,
        fontWeight: typography.medium,
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'all 0.2s ease',
    },
    kbd: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        padding: `2px ${spacing.xs}`,
        borderRadius: '4px',
        background: 'rgba(255,255,255,0.1)',
        fontSize: '10px',
        color: colors.textMuted,
        fontFamily: 'monospace',
        marginLeft: spacing.xs,
    },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

interface QuickActionsProps {
    showKbdHint?: boolean;
}

export function QuickActions({ showKbdHint = true }: QuickActionsProps) {
    const navigate = useNavigate();

    return (
        <motion.div
            style={styles.container}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: motionTokens.durationLarge,
                delay: 0.3,
                ease: motionTokens.easing,
            }}
        >
            <span style={styles.label}>
                Schnellzugriff
                {showKbdHint && (
                    <span style={{ ...styles.kbd, marginLeft: spacing.sm }}>
                        <Command size={10} />K
                    </span>
                )}
            </span>

            <div style={styles.actions}>
                {ACTIONS.map((action) => (
                    <motion.button
                        key={action.id}
                        style={styles.pill}
                        onClick={() => navigate(action.path)}
                        whileHover={{
                            background: colors.surfaceGlassHover,
                            color: colors.textPrimary,
                            scale: 1.02,
                        }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <action.icon size={16} />
                        {action.label}
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
}

export default QuickActions;
