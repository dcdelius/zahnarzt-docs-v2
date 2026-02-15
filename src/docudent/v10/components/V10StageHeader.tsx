import React from 'react';
import { motion } from 'framer-motion';

import { colors, spacing, typography, motion as motionTokens } from '../styles/tokens';

interface V10StageHeaderProps {
    kicker: string;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    right?: React.ReactNode;
}

export function V10StageHeader({ kicker, title, subtitle, right }: V10StageHeaderProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionTokens.durationMedium, ease: motionTokens.easing }}
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                gap: spacing.xxl,
                marginBottom: spacing.xxl,
                flexWrap: 'wrap',
            }}
        >
            <div style={{ minWidth: 260 }}>
                <div
                    style={{
                        fontSize: typography.label,
                        color: colors.textSecondary,
                        letterSpacing: '0.25em',
                        textTransform: 'uppercase',
                    }}
                >
                    {kicker}
                </div>
                <h1
                    style={{
                        margin: `${spacing.sm} 0 0`,
                        fontSize: typography.headlineSmall,
                        color: colors.textPrimary,
                        fontWeight: typography.bold,
                        letterSpacing: '-0.03em',
                        lineHeight: typography.lineHeightTight,
                    }}
                >
                    {title}
                </h1>
                {subtitle ? (
                    <div style={{ marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.bodySmall }}>
                        {subtitle}
                    </div>
                ) : null}
            </div>

            {right ? (
                <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                    {right}
                </div>
            ) : null}
        </motion.div>
    );
}

