import React from 'react';
import { motion } from 'framer-motion';

import { colors, gradients, radii, shadows, typography, motion as motionTokens } from '../styles/tokens';

interface V10OptionPillButtonProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
    testId?: string;
    size?: 'sm' | 'md';
}

export function V10OptionPillButton({ label, isActive, onClick, testId, size = 'md' }: V10OptionPillButtonProps) {
    const padding = size === 'sm' ? '7px 14px' : '10px 18px';

    return (
        <motion.button
            type="button"
            onClick={onClick}
            animate={{
                background: isActive ? gradients.button : colors.surfaceGlass,
                color: isActive ? colors.textPrimary : colors.textSecondary,
                boxShadow: isActive ? shadows.buttonActive : 'none',
            }}
            transition={{ duration: motionTokens.durationSmall, ease: motionTokens.easing }}
            style={{
                padding,
                borderRadius: radii.pill,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: typography.semibold,
                backdropFilter: 'blur(14px)',
            }}
            data-testid={testId}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
        >
            {label}
        </motion.button>
    );
}

