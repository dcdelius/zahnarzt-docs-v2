/**
 * Coming Soon: Billing Page — Premium Placeholder
 *
 * ═══════════════════════════════════════════════════════════════
 * Placeholder for future billing/case review features.
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import { motion } from 'framer-motion';
import { colors, gradients, space, radii, typography } from '../app/designTokens';

export function ComingSoonBillingPage() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center' as const,
            padding: space['2xl'],
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                {/* Icon */}
                <motion.div
                    style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: radii.xl,
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '48px',
                        margin: '0 auto',
                        marginBottom: space.xl,
                    }}
                    animate={{
                        y: [0, -8, 0],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    💳
                </motion.div>

                {/* Title */}
                <h1 style={{
                    fontSize: typography['3xl'],
                    fontWeight: typography.bold,
                    color: colors.textPrimary,
                    marginBottom: space.md,
                    letterSpacing: '-0.02em',
                }}>
                    Abrechnung
                </h1>

                {/* Subtitle */}
                <p style={{
                    fontSize: typography.lg,
                    color: colors.textSecondary,
                    marginBottom: space['2xl'],
                    maxWidth: '400px',
                }}>
                    Intelligente Fallprüfung und Datenbank-Abgleich kommen bald.
                </p>

                {/* Feature Preview */}
                <div style={{
                    display: 'flex',
                    gap: space.md,
                    justifyContent: 'center',
                    flexWrap: 'wrap' as const,
                }}>
                    {['Case Review', 'Datenbank-Check', 'Export'].map((feature, i) => (
                        <motion.span
                            key={feature}
                            style={{
                                padding: `${space.sm} ${space.md}`,
                                background: 'rgba(99, 102, 241, 0.08)',
                                color: colors.primary600,
                                fontSize: typography.sm,
                                fontWeight: typography.medium,
                                borderRadius: radii.full,
                            }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
                        >
                            {feature}
                        </motion.span>
                    ))}
                </div>

                {/* Coming Soon Badge */}
                <motion.div
                    style={{
                        marginTop: space['2xl'],
                        padding: `${space.sm} ${space.lg}`,
                        background: gradients.activePill,
                        color: colors.white,
                        fontSize: typography.sm,
                        fontWeight: typography.semibold,
                        borderRadius: radii.full,
                        display: 'inline-block',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.6 }}
                >
                    Coming Q1 2025
                </motion.div>
            </motion.div>
        </div>
    );
}

export default ComingSoonBillingPage;
