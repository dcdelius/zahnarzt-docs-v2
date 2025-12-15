/**
 * SummaryChips — V6-style Extracted Data Pills
 *
 * Displays extracted pipeline data as small glass pills:
 * - Tooth number
 * - Surfaces
 * - Insurance type
 * - Material (if available)
 *
 * ❌ NO logic — pure presentation
 * ✅ Omits chips for missing data (no "—" placeholders)
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
    colors,
    radii,
    typography,
    motion as motionTokens,
} from '../styles/tokens';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface SummaryChipsProps {
    extracted?: {
        tooth: string | null;
        surfaces: string[];
        diagnosis: string | null;
    };
    insuranceType: 'GKV' | 'PKV';
    hasMKV: boolean;
    answers: Map<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// STYLES — V6 Glass Pills
// ═══════════════════════════════════════════════════════════════

const styles = {
    container: {
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: '8px',
        marginTop: '24px',
    },
    chip: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderRadius: radii.pill,
        background: 'rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        fontSize: '13px',
        fontWeight: typography.medium,
        color: colors.textPrimary,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    },
    chipLabel: {
        color: colors.textSecondary,
        fontWeight: typography.regular,
    },
    chipValue: {
        fontWeight: typography.semibold,
    },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function SummaryChips({
    extracted,
    insuranceType,
    hasMKV,
    answers,
}: SummaryChipsProps) {
    // Build chips array from available data
    const chips: Array<{ label: string; value: string }> = [];

    // Tooth
    if (extracted?.tooth) {
        chips.push({ label: 'Zahn', value: extracted.tooth });
    }

    // Surfaces
    if (extracted?.surfaces && extracted.surfaces.length > 0) {
        chips.push({ label: 'Flächen', value: extracted.surfaces.join(' ') });
    }

    // Insurance
    const insuranceLabel = hasMKV ? 'GKV + MKV' : insuranceType;
    chips.push({ label: 'Versicherung', value: insuranceLabel });

    // Material from answers (if answered)
    const materialAnswer = answers.get('forensic_material');
    if (materialAnswer) {
        const materialLabels: Record<string, string> = {
            'komposit': 'Komposit',
            'glasionomer': 'Glasionomer',
            'amalgam': 'Amalgam',
        };
        chips.push({
            label: 'Material',
            value: materialLabels[materialAnswer as string] || String(materialAnswer),
        });
    }

    // Diagnosis (if available)
    if (extracted?.diagnosis) {
        chips.push({ label: 'Diagnose', value: extracted.diagnosis });
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: motionTokens.durationMedium,
                ease: motionTokens.easing,
                delay: 0.1,
            }}
            style={styles.container}
        >
            {chips.map((chip, index) => (
                <motion.div
                    key={chip.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                        duration: motionTokens.durationSmall,
                        delay: index * 0.03,
                    }}
                    style={styles.chip}
                >
                    <span style={styles.chipLabel}>{chip.label}</span>
                    <span style={styles.chipValue}>{chip.value}</span>
                </motion.div>
            ))}
        </motion.div>
    );
}

export default SummaryChips;
