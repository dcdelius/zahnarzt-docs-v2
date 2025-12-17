/**
 * SummaryChips — V6-style Extracted Data Pills
 *
 * Displays extracted pipeline data as small glass pills:
 * - Tooth number
 * - Surfaces
 * - Insurance type
 * - Material (if available)
 * - Trockenlegung (from settings default or manual answer)
 * - Überkappungsmaterial (from settings default or manual answer)
 *
 * Shows source labels:
 * - "Praxis-Standard" for settings defaults
 * - "Manuell" for user-answered values that override defaults
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
import { getFuellungDefaults } from '../settings/settingsStore';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type ChipSource = 'default' | 'manual' | 'extracted' | 'static';

interface ChipData {
    label: string;
    value: string;
    source?: ChipSource;
    testId?: string;
}

interface SummaryChipsProps {
    extracted?: {
        tooth: string | null;
        surfaces: string[];
        diagnosis: string | null;
    };
    insuranceType: 'GKV' | 'PKV';
    hasMKV: boolean;
    answers: Map<string, unknown>;
    treatmentId?: string;
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
    chipSource: {
        fontSize: '10px',
        fontWeight: typography.regular,
        color: colors.textMuted,
        marginLeft: '4px',
        opacity: 0.8,
    },
    chipSourceDefault: {
        color: 'rgba(100, 200, 150, 0.9)',
    },
    chipSourceManual: {
        color: 'rgba(150, 180, 255, 0.9)',
    },
};

// Label mappings
const TROCKENLEGUNG_LABELS: Record<string, string> = {
    kofferdam: 'Kofferdam',
    relativ: 'Relativ',
};

const UEBERKAPPUNG_LABELS: Record<string, string> = {
    caoh: 'Ca(OH)₂',
    mta: 'MTA',
    biodentine: 'Biodentine',
};

const SOURCE_LABELS: Record<ChipSource, string> = {
    default: '(Praxis-Standard)',
    manual: '(Manuell)',
    extracted: '',
    static: '',
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function SummaryChips({
    extracted,
    insuranceType,
    hasMKV,
    answers,
    treatmentId,
}: SummaryChipsProps) {
    // Build chips array from available data
    const chips: ChipData[] = [];

    // Tooth (extracted)
    if (extracted?.tooth) {
        chips.push({ label: 'Zahn', value: extracted.tooth, source: 'extracted' });
    }

    // Surfaces (extracted)
    if (extracted?.surfaces && extracted.surfaces.length > 0) {
        chips.push({ label: 'Flächen', value: extracted.surfaces.join(' '), source: 'extracted' });
    }

    // Insurance (static)
    const insuranceLabel = hasMKV ? 'GKV + MKV' : insuranceType;
    chips.push({ label: 'Versicherung', value: insuranceLabel, source: 'static' });

    // ═══════════════════════════════════════════════════════════════
    // Settings-driven chips with source tracking
    // ═══════════════════════════════════════════════════════════════
    if (!treatmentId || treatmentId === 'fuellung') {
        const fuellungDefaults = getFuellungDefaults();

        // Trockenlegung: Check if user manually answered via 'isolation' question
        const isolationAnswer = answers.get('isolation');
        if (isolationAnswer) {
            // User manually answered - show with "Manuell" label
            const value = isolationAnswer === 'kofferdam' ? 'Kofferdam' : 'Relativ';
            chips.push({
                label: 'Trockenlegung',
                value,
                source: 'manual',
                testId: 'chip-trockenlegung',
            });
        } else if (fuellungDefaults.trockenlegung !== 'fragen') {
            // Settings default active - show with "Praxis-Standard" label
            chips.push({
                label: 'Trockenlegung',
                value: TROCKENLEGUNG_LABELS[fuellungDefaults.trockenlegung] || fuellungDefaults.trockenlegung,
                source: 'default',
                testId: 'chip-trockenlegung',
            });
        }

        // Überkappungsmaterial: Check if user answered ueberkappung=true AND material
        const ueberkappungAnswer = answers.get('ueberkappung');
        const materialAnswer = answers.get('ueberkappung_material');

        if (ueberkappungAnswer === true) {
            if (materialAnswer) {
                // User manually selected material
                chips.push({
                    label: 'Überkappung',
                    value: UEBERKAPPUNG_LABELS[materialAnswer as string] || String(materialAnswer),
                    source: 'manual',
                    testId: 'chip-ueberkappung',
                });
            } else if (fuellungDefaults.ueberkappungMaterial !== 'fragen') {
                // Settings default active
                chips.push({
                    label: 'Überkappung',
                    value: UEBERKAPPUNG_LABELS[fuellungDefaults.ueberkappungMaterial] || fuellungDefaults.ueberkappungMaterial,
                    source: 'default',
                    testId: 'chip-ueberkappung',
                });
            }
        }
    }

    // Material from answers (legacy fallback for older question IDs)
    const legacyMaterialAnswer = answers.get('forensic_material');
    if (legacyMaterialAnswer) {
        const materialLabels: Record<string, string> = {
            'komposit': 'Komposit',
            'glasionomer': 'Glasionomer',
            'amalgam': 'Amalgam',
        };
        chips.push({
            label: 'Material',
            value: materialLabels[legacyMaterialAnswer as string] || String(legacyMaterialAnswer),
            source: 'manual',
        });
    }

    // Diagnosis (extracted)
    if (extracted?.diagnosis) {
        chips.push({ label: 'Diagnose', value: extracted.diagnosis, source: 'extracted' });
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
            data-testid="summary-chips"
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
                    data-testid={chip.testId}
                >
                    <span style={styles.chipLabel}>{chip.label}</span>
                    <span style={styles.chipValue}>{chip.value}</span>
                    {chip.source && SOURCE_LABELS[chip.source] && (
                        <span
                            style={{
                                ...styles.chipSource,
                                ...(chip.source === 'default' ? styles.chipSourceDefault : {}),
                                ...(chip.source === 'manual' ? styles.chipSourceManual : {}),
                            }}
                        >
                            {SOURCE_LABELS[chip.source]}
                        </span>
                    )}
                </motion.div>
            ))}
        </motion.div>
    );
}

export default SummaryChips;

