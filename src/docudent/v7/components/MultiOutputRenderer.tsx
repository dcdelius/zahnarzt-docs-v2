/**
 * Multi-Treatment Output Renderer
 * 
 * Renders the merged output from multi-treatment runs.
 * Shows per-run summary cards with segment info and chips.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { colors, spacing, radii, typography, motion as motionTokens } from '../styles/tokens';
import type { MultiTreatmentResult } from '../multitreatment/types';

interface MultiOutputRendererProps {
    result: MultiTreatmentResult;
    onReset: () => void;
}

const styles = {
    container: {
        maxWidth: '800px',
        margin: '0 auto',
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: '12px',
        fontWeight: typography.semibold,
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        marginBottom: spacing.md,
    },
    runCard: {
        padding: spacing.md,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: radii.cardSmall,
        marginBottom: spacing.sm,
        border: '1px solid rgba(255,255,255,0.08)',
    },
    runHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    runTitle: {
        fontSize: '16px',
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },
    runSegment: {
        fontSize: '12px',
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'monospace',
    },
    chipList: {
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: '6px',
    },
    chip: {
        padding: '4px 10px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '12px',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.8)',
    },
    outputText: {
        padding: spacing.lg,
        background: 'rgba(255,255,255,0.02)',
        borderRadius: radii.cardSmall,
        fontSize: '15px',
        lineHeight: 1.6,
        color: colors.textPrimary,
        whiteSpace: 'pre-wrap' as const,
        border: '1px solid rgba(255,255,255,0.05)',
    },
    codeList: {
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: '8px',
    },
    codeTag: {
        padding: '6px 12px',
        background: 'rgba(100,200,100,0.1)',
        border: '1px solid rgba(100,200,100,0.3)',
        borderRadius: radii.input,
        fontSize: '13px',
        color: 'rgba(100,200,100,0.9)',
        fontFamily: 'monospace',
    },
    resetBtn: {
        padding: '12px 32px',
        background: colors.coralAccent,
        border: 'none',
        borderRadius: radii.cardSmall,
        color: '#fff',
        fontSize: '16px',
        fontWeight: typography.semibold,
        cursor: 'pointer',
    },
    center: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: spacing.xl,
    },
};

export const MultiOutputRenderer: React.FC<MultiOutputRendererProps> = ({ result, onReset }) => {
    return (
        <motion.div
            style={styles.container}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionTokens.durationMedium }}
            data-testid="multi-output-renderer"
        >
            {/* Per-Run Summary Cards */}
            <div style={styles.section}>
                <div style={styles.sectionTitle}>Behandlungen ({result.runs.length})</div>
                {result.runs.map((run, index) => {
                    // Access _debug safely via optional chaining
                    const debugInfo = (run.result as { _debug?: { activeChipIds?: string[] } })._debug;
                    const chips = debugInfo?.activeChipIds || [];
                    return (
                        <motion.div
                            key={run.segmentId}
                            style={styles.runCard}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            data-testid={`run-card-${run.segmentId}`}
                        >
                            <div style={styles.runHeader}>
                                <span style={styles.runTitle}>
                                    {run.treatmentId.toUpperCase()}
                                </span>
                                <span style={styles.runSegment}>{run.segmentId}</span>
                            </div>
                            {chips.length > 0 && (
                                <div style={styles.chipList}>
                                    {chips.map((chipId: string) => (
                                        <span key={chipId} style={styles.chip} data-testid={`chip-${chipId}`}>
                                            {chipId}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Merged Output */}
            <div style={styles.section}>
                <div style={styles.sectionTitle}>Zusammengeführte Dokumentation</div>
                <div style={styles.outputText} data-testid="merged-output-text">
                    {result.mergedOutput.fullText || '(Kein Text)'}
                </div>
            </div>

            {/* Deduplicated Billing Codes */}
            <div style={styles.section}>
                <div style={styles.sectionTitle}>Abrechnungscodes ({result.billingCodes.length})</div>
                <div style={styles.codeList}>
                    {result.billingCodes.map((bc, i) => (
                        <span key={`${bc.code}-${i}`} style={styles.codeTag} data-testid={`code-${bc.code}`}>
                            {bc.code}
                        </span>
                    ))}
                </div>
            </div>

            {/* Reset Button */}
            <div style={styles.center}>
                <button style={styles.resetBtn} onClick={onReset} data-testid="multi-reset-btn">
                    Neue Dokumentation
                </button>
            </div>
        </motion.div>
    );
};

export default MultiOutputRenderer;
