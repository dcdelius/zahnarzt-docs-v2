/**
 * Multi-Treatment Output Renderer
 * 
 * Renders the merged output from multi-treatment runs.
 * Shows per-run summary cards with segment info and chips.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { colors, spacing, radii, typography, motion as motionTokens, gradients, shadows } from '../styles/tokens';
import type { MultiTreatmentResult } from '../multitreatment/types';

interface MultiOutputRendererProps {
    result: MultiTreatmentResult;
    onReset: () => void;
}

const styles = {
    container: {
        maxWidth: '880px',
        margin: '0 auto',
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: '12px',
        fontWeight: typography.semibold,
        color: colors.textSecondary,
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        marginBottom: spacing.md,
    },
    runCard: {
        padding: spacing.md,
        background: colors.surfaceGlass,
        borderRadius: radii.cardSmall,
        marginBottom: spacing.sm,
        border: `1px solid ${colors.lineSoft}`,
        boxShadow: shadows.cardSoft,
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
        color: colors.textSecondary,
        fontFamily: 'monospace',
    },
    chipList: {
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: '6px',
    },
    chip: {
        padding: '4px 10px',
        background: colors.surfaceGlass,
        borderRadius: '12px',
        fontSize: '11px',
        color: colors.textPrimary,
        border: `1px solid ${colors.lineUltraSoft}`,
    },
    outputText: {
        padding: spacing.lg,
        background: colors.surfaceCard,
        borderRadius: radii.cardSmall,
        fontSize: '15px',
        lineHeight: 1.6,
        color: colors.textPrimary,
        whiteSpace: 'pre-wrap' as const,
        border: `1px solid ${colors.lineDivider}`,
        boxShadow: shadows.cardMedium,
    },
    codeList: {
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: '8px',
    },
    codeTag: {
        padding: '6px 12px',
        background: gradients.innerHighlight,
        border: `1px solid ${colors.lineSoft}`,
        borderRadius: radii.pill,
        fontSize: '13px',
        color: colors.textPrimary,
        fontFamily: 'monospace',
    },
    resetBtn: {
        padding: '12px 32px',
        background: gradients.button,
        border: 'none',
        borderRadius: radii.pill,
        color: colors.textPrimary,
        fontSize: '16px',
        fontWeight: typography.semibold,
        cursor: 'pointer',
        boxShadow: shadows.buttonDefault,
    },
    center: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: spacing.xl,
    },
    copyBtn: {
        padding: '10px 20px',
        background: gradients.button,
        border: 'none',
        borderRadius: radii.pill,
        color: colors.textPrimary,
        fontSize: '14px',
        fontWeight: typography.semibold,
        cursor: 'pointer',
        marginTop: spacing.md,
        transition: 'all 0.2s',
        boxShadow: shadows.buttonDefault,
    },
    outputContainer: {
        position: 'relative' as const,
    },
    copySuccess: {
        color: colors.textSecondary,
        fontSize: '12px',
        marginLeft: spacing.sm,
    },
    alert: {
        padding: spacing.md,
        borderRadius: radii.cardSmall,
        marginBottom: spacing.md,
        border: `1px solid ${colors.lineSoft}`,
        background: colors.surfaceGlass,
    },
    alertTitle: {
        fontSize: '13px',
        fontWeight: typography.semibold,
        marginBottom: spacing.xs,
        color: colors.textPrimary,
    },
    alertText: {
        fontSize: '13px',
        lineHeight: 1.4,
        color: colors.textSecondary,
    },
};

/**
 * P14.X2: Copy button for SSOT aggregatedCopyText.
 */
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard API failed, try fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <button
            style={styles.copyBtn}
            onClick={handleCopy}
            data-testid="multi-copy-button"
        >
            {copied ? 'Kopiert' : 'Text kopieren'}
        </button>
    );
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
            {result.combinability && result.combinability.verdict !== 'PASS' && (
                <div style={styles.section}>
                    <div style={styles.sectionTitle}>Kombi-Prüfung</div>
                    <div style={styles.alert}>
                        <div style={styles.alertTitle}>
                            {result.combinability.verdict === 'BLOCK' ? 'BLOCK' : 'WARN'}
                        </div>
                        <div style={styles.alertText}>
                            {result.combinability.conflicts.length > 0
                                ? result.combinability.conflicts.map(c =>
                                    `${c.codeA} × ${c.codeB}: ${c.reason}`
                                ).join(' ')
                                : (result.combinability.warnings && result.combinability.warnings.length > 0
                                    ? result.combinability.warnings.join(' ')
                                    : 'Bitte prüfen.')}
                        </div>
                    </div>
                </div>
            )}

            {result.upsellHints && result.upsellHints.length > 0 && (
                <div style={styles.section}>
                    <div style={styles.sectionTitle}>Upsell-Hinweise</div>
                    {result.upsellHints.map((hint, idx) => (
                        <div key={`${hint.segmentId}-${hint.tooth || 'session'}-${idx}`} style={styles.alert}>
                            <div style={styles.alertTitle}>
                                {hint.tooth ? `Zahn ${hint.tooth}` : 'Sitzung'}
                            </div>
                            <div style={styles.alertText}>
                                {hint.message} {hint.requiredAskbacks.length > 0 ? `(${hint.requiredAskbacks.join(', ')})` : ''}
                            </div>
                        </div>
                    ))}
                </div>
            )}

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

            {/* SSOT Aggregated Output (P14.X2) */}
            <div style={styles.section}>
                <div style={styles.sectionTitle}>Zusammengeführte Dokumentation</div>
                <div style={styles.outputContainer}>
                    <div
                        style={styles.outputText}
                        data-testid="multi-output-paper"
                    >
                        {result.aggregatedCopyText || '(Kein Text)'}
                    </div>
                    <CopyButton text={result.aggregatedCopyText} />
                </div>
            </div>

            {/* Deduplicated Billing Codes */}
            <div style={styles.section}>
                <div style={styles.sectionTitle}>Abrechnungscodes ({result.billingCodes.length})</div>
                <div style={styles.codeList}>
                    {result.billingCodes.map((bc, i) => {
                        const toothPart = bc.tooth || 'NA';
                        return (
                            <span
                                key={`${bc.code}-${bc.tooth || i}`}
                                style={styles.codeTag}
                                data-testid={`billing-code-${bc.code}-${toothPart}`}
                            >
                                {bc.code}{bc.tooth ? ` (${bc.tooth})` : ''}
                            </span>
                        );
                    })}
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
