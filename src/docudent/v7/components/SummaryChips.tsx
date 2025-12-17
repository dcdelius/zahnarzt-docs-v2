/**
 * SummaryChips — V6-style Extracted Data Pills with Inline Editing
 *
 * Displays extracted pipeline data as small glass pills:
 * - Tooth number (static)
 * - Surfaces (static)
 * - Insurance type (static)
 * - Trockenlegung (EDITABLE)
 * - Anästhesie (EDITABLE - region-dependent)
 * - Matrix (EDITABLE - only for approximal fillings)
 * - Überkappungsmaterial (static for now)
 *
 * Shows source labels:
 * - "Praxis-Standard" for settings defaults
 * - "Geändert" for user-changed values
 *
 * Uses settingsRegistry for SSOT-safe option loading.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
    colors,
    radii,
    typography,
    motion as motionTokens,
} from '../styles/tokens';
import { useSettings } from '../settings/useSettings';
import { EditableSummaryChip } from './EditableSummaryChip';
import {
    FUELLUNG_UI_OPTIONS,
    getSettingLabel,
} from '../settings/settingOptions';
import {
    getToothRegion,
    getAnesthesiaGroupKey,
    getAnesthesiaSettingsPath,
    hasApproximalSurfaces,
} from '../utils/toothRegion';

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
    const { fuellungDefaults, setFuellungDefaults } = useSettings();

    // Build static chips array from available data
    const staticChips: ChipData[] = [];

    // Tooth (extracted)
    if (extracted?.tooth) {
        staticChips.push({ label: 'Zahn', value: extracted.tooth, source: 'extracted' });
    }

    // Surfaces (extracted)
    if (extracted?.surfaces && extracted.surfaces.length > 0) {
        staticChips.push({ label: 'Flächen', value: extracted.surfaces.join(' '), source: 'extracted' });
    }

    // Insurance (static)
    const insuranceLabel = hasMKV ? 'GKV + MKV' : insuranceType;
    staticChips.push({ label: 'Versicherung', value: insuranceLabel, source: 'static' });

    // Diagnosis (extracted)
    if (extracted?.diagnosis) {
        staticChips.push({ label: 'Diagnose', value: extracted.diagnosis, source: 'extracted' });
    }

    // ═══════════════════════════════════════════════════════════════
    // EDITABLE CHIPS (Füllung only)
    // ═══════════════════════════════════════════════════════════════
    const isFuellung = !treatmentId || treatmentId === 'fuellung';

    // Track which editable chips should render
    const showTrockenlegung = isFuellung && fuellungDefaults.trockenlegung !== 'fragen';
    const isolationAnswer = answers.get('isolation') as string | undefined;
    const trockenlegungValue = isolationAnswer || fuellungDefaults.trockenlegung;
    const trockenlegungSource: 'default' | 'manual' = isolationAnswer ? 'manual' : 'default';

    // Anesthesia - only show if enabled and tooth is known
    const showAnesthesia = isFuellung &&
        fuellungDefaults.anesthesia.enabled &&
        extracted?.tooth;
    const anesthesiaGroupKey = getAnesthesiaGroupKey(extracted?.tooth);
    const anesthesiaSettingsPath = getAnesthesiaSettingsPath(anesthesiaGroupKey);
    const anesthesiaValue = fuellungDefaults.anesthesia[anesthesiaSettingsPath];
    const anesthesiaSource: 'default' | 'manual' = 'default'; // TODO: track manual changes

    // Matrix - only show for approximal surfaces
    const showMatrix = isFuellung && hasApproximalSurfaces(extracted?.surfaces);
    const matrixValue = fuellungDefaults.matrix.approximalMode;
    const matrixSource: 'default' | 'manual' = 'default'; // TODO: track manual changes

    // ═══════════════════════════════════════════════════════════════
    // HANDLERS
    // ═══════════════════════════════════════════════════════════════

    const handleTrockenlegungChange = (optionId: string) => {
        setFuellungDefaults({ trockenlegung: optionId as 'kofferdam' | 'relativ' | 'fragen' });
    };

    const handleAnesthesiaChange = (optionId: string) => {
        const path = anesthesiaSettingsPath;
        setFuellungDefaults({
            anesthesia: {
                [path]: optionId,
            } as any,
        });
    };

    const handleMatrixChange = (optionId: string) => {
        setFuellungDefaults({
            matrix: {
                approximalMode: optionId as 'sektional' | 'tofflemire' | 'fragen',
            },
        });
    };

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
            {/* Static chips */}
            {staticChips.map((chip, index) => (
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
                </motion.div>
            ))}

            {/* Editable: Trockenlegung */}
            {showTrockenlegung && trockenlegungValue !== 'fragen' && (
                <EditableSummaryChip
                    label="Trockenlegung"
                    groupKey="trockenlegung"
                    currentOptionId={trockenlegungValue}
                    options={FUELLUNG_UI_OPTIONS['trockenlegung'].options}
                    onSelect={handleTrockenlegungChange}
                    source={trockenlegungSource}
                    testId="chip-trockenlegung"
                />
            )}

            {/* Editable: Anesthesia */}
            {showAnesthesia && anesthesiaValue !== 'fragen' && (
                <EditableSummaryChip
                    label="Anästhesie"
                    groupKey={anesthesiaGroupKey}
                    currentOptionId={anesthesiaValue}
                    options={FUELLUNG_UI_OPTIONS[anesthesiaGroupKey]?.options || []}
                    onSelect={handleAnesthesiaChange}
                    source={anesthesiaSource}
                    testId="chip-anesthesia"
                />
            )}

            {/* Editable: Matrix */}
            {showMatrix && matrixValue !== 'fragen' && (
                <EditableSummaryChip
                    label="Matrize"
                    groupKey="matrix.approximalMode"
                    currentOptionId={matrixValue}
                    options={FUELLUNG_UI_OPTIONS['matrix.approximalMode'].options}
                    onSelect={handleMatrixChange}
                    source={matrixSource}
                    testId="chip-matrix"
                />
            )}
        </motion.div>
    );
}

export default SummaryChips;
