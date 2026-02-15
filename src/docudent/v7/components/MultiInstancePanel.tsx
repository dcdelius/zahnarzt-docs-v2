/**
 * MultiInstancePanel — P14.X3
 * 
 * Shows detected teeth as chips and allows user to create instances
 * for same-treatment-multiple-teeth scenarios (e.g., 2 fillings).
 * 
 * Props:
 * - candidateTeeth: string[] — teeth detected from extraction
 * - treatmentId: string — current treatment type
 * - onApply: (instances: TreatmentInstance[]) => void — callback when user applies multi-instance
 * - onCancel: () => void — callback to dismiss panel
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { colors, radii, spacing, typography, motion as motionTokens } from '../styles/tokens';
import type { TreatmentInstance } from '../multitreatment/types';

interface MultiInstancePanelProps {
    candidateTeeth: string[];
    treatmentId: string;
    dictation: string;
    onApply: (instances: TreatmentInstance[]) => void;
    onCancel: () => void;
}

const styles = {
    panel: {
        padding: spacing.lg,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: radii.cardSmall,
        border: '1px solid rgba(255,255,255,0.1)',
        marginBottom: spacing.lg,
    },
    header: {
        fontSize: '14px',
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.md,
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headerIcon: {
        fontSize: '18px',
    },
    description: {
        fontSize: '13px',
        color: 'rgba(255,255,255,0.6)',
        marginBottom: spacing.md,
        lineHeight: 1.5,
    },
    chipList: {
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: '8px',
        marginBottom: spacing.lg,
    },
    chip: {
        padding: '8px 16px',
        background: 'rgba(100,200,100,0.1)',
        border: '1px solid rgba(100,200,100,0.3)',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: typography.medium,
        color: 'rgba(100,200,100,0.9)',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    chipSelected: {
        background: 'rgba(100,200,100,0.25)',
        border: '1px solid rgba(100,200,100,0.6)',
    },
    buttonRow: {
        display: 'flex',
        gap: spacing.md,
    },
    applyBtn: {
        padding: '10px 24px',
        background: colors.coralAccent,
        border: 'none',
        borderRadius: radii.input,
        color: '#fff',
        fontSize: '14px',
        fontWeight: typography.semibold,
        cursor: 'pointer',
    },
    cancelBtn: {
        padding: '10px 24px',
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: radii.input,
        color: 'rgba(255,255,255,0.7)',
        fontSize: '14px',
        cursor: 'pointer',
    },
};

/**
 * Parse dictation to extract per-tooth slices.
 * Simple heuristic: split by "Zahn XX" patterns.
 */
function extractToothSlices(dictation: string, teeth: string[]): Map<string, string> {
    const slices = new Map<string, string>();

    for (const tooth of teeth) {
        // Find content around "Zahn {tooth}"
        const regex = new RegExp(`Zahn\\s*${tooth}\\s*([^,]*(?:,|$))`, 'i');
        const match = dictation.match(regex);
        if (match) {
            slices.set(tooth, `Zahn ${tooth} ${match[1].replace(/,$/, '').trim()}`);
        } else {
            // Fallback: just tooth reference
            slices.set(tooth, `Zahn ${tooth}`);
        }
    }

    return slices;
}

export const MultiInstancePanel: React.FC<MultiInstancePanelProps> = ({
    candidateTeeth,
    treatmentId,
    dictation,
    onApply,
    onCancel,
}) => {
    // All teeth selected by default
    const [selectedTeeth, setSelectedTeeth] = useState<Set<string>>(new Set(candidateTeeth));
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const toggleTooth = (tooth: string) => {
        const newSelected = new Set(selectedTeeth);
        if (newSelected.has(tooth)) {
            newSelected.delete(tooth);
        } else {
            newSelected.add(tooth);
        }
        setSelectedTeeth(newSelected);
    };

    // P14.X7: Handle "Don't show again" toggle
    const handleDontShowAgainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setDontShowAgain(checked);
        if (checked) {
            localStorage.setItem('v7_multiinstance_panel_hidden', 'true');
        } else {
            localStorage.removeItem('v7_multiinstance_panel_hidden');
        }
    };

    const handleApply = () => {
        const toothSlices = extractToothSlices(dictation, Array.from(selectedTeeth));

        const instances: TreatmentInstance[] = Array.from(selectedTeeth).map(tooth => {
            const slice = toothSlices.get(tooth) || `Zahn ${tooth}`;

            // Parse surfaces from dictation slice
            const surfacePatterns = [
                /\b(mod)\b/i,      // mesial-occlusal-distal
                /\b(mo)\b/i,       // mesial-occlusal
                /\b(od)\b/i,       // occlusal-distal
                /\b(m)\b/i,        // mesial
                /\b(o)\b/i,        // occlusal
                /\b(d)\b/i,        // distal
                /\b(mesial)\b/i,
                /\b(okklusal)\b/i,
                /\b(distal)\b/i,
            ];

            const surfaces: string[] = [];
            for (const pattern of surfacePatterns) {
                const match = slice.match(pattern);
                if (match) {
                    const surfaceStr = match[1].toLowerCase();
                    // Expand abbreviations
                    if (surfaceStr === 'mod') {
                        surfaces.push('m', 'o', 'd');
                    } else if (surfaceStr === 'mo') {
                        surfaces.push('m', 'o');
                    } else if (surfaceStr === 'od') {
                        surfaces.push('o', 'd');
                    } else if (surfaceStr === 'mesial') {
                        surfaces.push('m');
                    } else if (surfaceStr === 'okklusal') {
                        surfaces.push('o');
                    } else if (surfaceStr === 'distal') {
                        surfaces.push('d');
                    } else if (surfaceStr.length === 1) {
                        surfaces.push(surfaceStr);
                    }
                    break; // Use first match
                }
            }

            // Parse diagnosis from dictation slice
            const diagnosisPatterns = [
                { pattern: /karies/i, value: 'karies' },
                { pattern: /defekt/i, value: 'defekt' },
                { pattern: /insuffizien/i, value: 'insuffiziente_restauration' },
            ];

            let diagnosis: string | null = null;
            for (const { pattern, value } of diagnosisPatterns) {
                if (pattern.test(slice)) {
                    diagnosis = value;
                    break;
                }
            }

            // Parse mentioned attributes
            const mentioned: Record<string, string | boolean> = {};
            if (/komposit/i.test(slice)) mentioned['material'] = 'komposit';
            if (/amalgam/i.test(slice)) mentioned['material'] = 'amalgam';
            if (/kofferdam/i.test(slice)) mentioned['kofferdam'] = true;

            return {
                instanceId: `${treatmentId}-${tooth}`,
                tooth,
                dictationSlice: slice,
                extracted: {
                    tooth,
                    surfaces: [...new Set(surfaces)], // Dedupe
                    diagnosis,
                    mentioned,
                },
                answers: new Map(),
            };
        });

        onApply(instances);
    };

    const canApply = selectedTeeth.size >= 2;

    return (
        <motion.div
            style={styles.panel}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionTokens.durationMedium }}
            data-testid="multiinstance-panel"
        >
            <div style={styles.header}>
                <span style={styles.headerIcon}>🦷</span>
                Mehrere Zähne erkannt
            </div>
            <div style={styles.description}>
                Das Diktat enthält mehrere Zähne. Möchten Sie für jeden Zahn eine
                separate Dokumentation erstellen?
            </div>

            <div style={styles.chipList}>
                {candidateTeeth.map(tooth => (
                    <motion.button
                        key={tooth}
                        style={{
                            ...styles.chip,
                            ...(selectedTeeth.has(tooth) ? styles.chipSelected : {}),
                        }}
                        onClick={() => toggleTooth(tooth)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        data-testid={`instance-chip-candidate-${tooth}`}
                    >
                        Zahn {tooth}
                    </motion.button>
                ))}
            </div>

            <div style={styles.buttonRow}>
                <button
                    style={styles.applyBtn}
                    onClick={handleApply}
                    disabled={!canApply}
                    data-testid="apply-multiinstance"
                >
                    Als {selectedTeeth.size} Instanzen anwenden
                </button>
                <button
                    style={styles.cancelBtn}
                    onClick={onCancel}
                    data-testid="cancel-multiinstance"
                >
                    Abbrechen
                </button>
            </div>

            {/* P14.X7: Don't show again toggle */}
            <label
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: spacing.md,
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                }}
                data-testid="multiinstance-dont-show-again"
            >
                <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={handleDontShowAgainChange}
                    style={{ cursor: 'pointer' }}
                />
                Nicht mehr anzeigen
            </label>
        </motion.div>
    );
};

export default MultiInstancePanel;
