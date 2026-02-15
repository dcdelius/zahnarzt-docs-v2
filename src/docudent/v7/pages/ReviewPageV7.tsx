/**
 * Review Page V7 — Case Quality Check
 *
 * ═══════════════════════════════════════════════════════════════
 * V7 Design: Select case, run review engine, show findings.
 * Calm language, grouped by category, no alarms.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle, Info, Clock, Shield } from 'lucide-react';
import {
    colors,
    gradients,
    typography,
    radii,
    spacing,
    motion as motionTokens,
} from '../styles/tokens';
import { createCaseRepository, type CaseSummary } from '../../core/case/caseRepository';
import { reviewCase, groupFindingsByCategory, type ReviewResult, type Finding } from '../../core/review/caseReviewEngine';

// ═══════════════════════════════════════════════════════════════
// PILOT MODE
// ═══════════════════════════════════════════════════════════════

const PILOT_MODE = true;

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = {
    page: {
        minHeight: '100vh',
        background: gradients.heroDeep,
        fontFamily: typography.fontFamily,
        padding: `${spacing.heroTop} ${spacing.heroPadding}`,
    },
    header: {
        marginBottom: spacing.xxxl,
    },
    backButton: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.sm,
        background: 'transparent',
        border: 'none',
        color: colors.textMuted,
        fontSize: typography.label,
        fontWeight: typography.medium,
        cursor: 'pointer',
        marginBottom: spacing.lg,
        padding: 0,
    },
    title: {
        fontSize: typography.headline,
        fontWeight: typography.light,
        color: colors.textPrimary,
        letterSpacing: '-0.02em',
        lineHeight: typography.lineHeightTight,
    },
    subtitle: {
        fontSize: typography.body,
        color: colors.textMuted,
        marginTop: spacing.sm,
    },
    selector: {
        marginTop: spacing.xl,
        marginBottom: spacing.xxxl,
    },
    selectorLabel: {
        fontSize: typography.caption,
        fontWeight: typography.medium,
        color: colors.textMuted,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
        marginBottom: spacing.sm,
    },
    select: {
        width: '100%',
        maxWidth: '400px',
        padding: `${spacing.md} ${spacing.lg}`,
        borderRadius: radii.cardSmall,
        border: `1px solid ${colors.lineSoft}`,
        background: colors.surfaceGlass,
        color: colors.textPrimary,
        fontSize: typography.body,
        fontFamily: typography.fontFamily,
        cursor: 'pointer',
        outline: 'none',
    },
    resultsSection: {
        marginTop: spacing.xl,
    },
    freshnessHint: {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        fontSize: typography.caption,
        color: colors.textMuted,
        marginBottom: spacing.lg,
    },
    settingsHint: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: `${spacing.xs} ${spacing.md}`,
        borderRadius: radii.pill,
        background: colors.surfaceGlass,
        fontSize: typography.caption,
        color: colors.textMuted,
        marginBottom: spacing.xl,
    },
    categoryGroup: {
        marginBottom: spacing.xl,
    },
    categoryTitle: {
        fontSize: typography.label,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
        marginBottom: spacing.md,
    },
    findingCard: (severity: string) => ({
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radii.cardSmall,
        background: colors.surfaceGlass,
        marginBottom: spacing.sm,
        borderLeft: `3px solid ${severity === 'attention' ? '#FFD54F' :
                severity === 'note' ? '#81C784' :
                    '#64B5F6'
            }`,
    }),
    findingIcon: (severity: string) => ({
        color: severity === 'attention' ? '#FFD54F' :
            severity === 'note' ? '#81C784' :
                '#64B5F6',
        flexShrink: 0,
    }),
    findingContent: {
        flex: 1,
    },
    findingTitle: {
        fontSize: typography.body,
        fontWeight: typography.medium,
        color: colors.textPrimary,
        marginBottom: '4px',
    },
    findingDescription: {
        fontSize: typography.bodySmall,
        color: colors.textMuted,
        lineHeight: typography.lineHeightRelaxed,
    },
    allClear: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.xxxl,
        textAlign: 'center' as const,
    },
    allClearIcon: {
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'rgba(76, 175, 80, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    allClearText: {
        fontSize: typography.title,
        fontWeight: typography.medium,
        color: colors.textPrimary,
    },
    allClearSubtext: {
        fontSize: typography.body,
        color: colors.textMuted,
    },
    empty: {
        textAlign: 'center' as const,
        padding: spacing.xxxl,
        color: colors.textMuted,
        fontSize: typography.body,
    },
};

// ═══════════════════════════════════════════════════════════════
// CATEGORY LABELS
// ═══════════════════════════════════════════════════════════════

const CATEGORY_LABELS: Record<string, string> = {
    completeness: 'Vollständigkeit',
    compliance: 'Compliance',
    billing: 'Abrechnung',
    clinical: 'Klinisch',
    documentation: 'Dokumentation',
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function ReviewPageV7() {
    const navigate = useNavigate();
    const [cases, setCases] = useState<CaseSummary[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string>('');
    const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [reviewing, setReviewing] = useState(false);
    const [lastReviewTime, setLastReviewTime] = useState<Date | null>(null);

    // Load cases on mount
    useEffect(() => {
        const loadCases = async () => {
            const repo = createCaseRepository(null, true);
            const result = await repo.listCases({
                orgId: 'org_demo',
                practiceId: 'practice_demo',
                status: 'finalized',
                maxResults: 20,
            });
            setCases(result);
            setLoading(false);
        };
        loadCases();
    }, []);

    // Run review when case selected
    const handleCaseSelect = async (caseId: string) => {
        if (!caseId) {
            setSelectedCaseId('');
            setReviewResult(null);
            return;
        }

        setSelectedCaseId(caseId);
        setReviewing(true);

        // Get full case doc and review
        const repo = createCaseRepository(null, true);
        const caseDoc = await repo.getCase('org_demo', 'practice_demo', caseId);

        if (caseDoc) {
            const result = reviewCase(caseDoc);
            setReviewResult(result);
            setLastReviewTime(new Date());
        }

        setReviewing(false);
    };

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const getFindingIcon = (severity: string) => {
        switch (severity) {
            case 'attention': return <AlertCircle size={20} />;
            case 'note': return <Info size={20} />;
            default: return <CheckCircle size={20} />;
        }
    };

    const groupedFindings = reviewResult
        ? groupFindingsByCategory(reviewResult.findings)
        : new Map();

    return (
        <motion.div
            style={styles.page}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: motionTokens.durationLarge }}
        >
            {/* Header */}
            <div style={styles.header}>
                <motion.button
                    style={styles.backButton}
                    onClick={() => navigate('/docudent/v7')}
                    whileHover={{ color: colors.textSecondary }}
                >
                    <ArrowLeft size={16} />
                    Zurück
                </motion.button>

                <h1 style={styles.title}>Prüfen</h1>
                <p style={styles.subtitle}>
                    Qualitäts- und Compliance-Check für dokumentierte Behandlungen
                </p>
            </div>

            {/* Case Selector */}
            <div style={styles.selector}>
                <div style={styles.selectorLabel}>Fall auswählen</div>
                <select
                    style={styles.select}
                    value={selectedCaseId}
                    onChange={(e) => handleCaseSelect(e.target.value)}
                    disabled={loading}
                >
                    <option value="">
                        {loading ? 'Lädt...' : 'Bitte wählen...'}
                    </option>
                    {cases.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.patientRef} — {c.treatmentId}
                        </option>
                    ))}
                </select>
            </div>

            {/* Review Results */}
            {reviewing ? (
                <motion.div
                    style={styles.empty}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    Prüfe Fall...
                </motion.div>
            ) : reviewResult ? (
                <div style={styles.resultsSection}>
                    {/* Freshness hint */}
                    {lastReviewTime && (
                        <div style={styles.freshnessHint}>
                            <Clock size={14} />
                            Zuletzt geprüft um {formatTime(lastReviewTime)}
                        </div>
                    )}

                    {/* Settings hint */}
                    <div style={styles.settingsHint}>
                        <Shield size={14} />
                        Basierend auf Ihren Praxis-Einstellungen
                    </div>

                    {/* All Clear */}
                    {reviewResult.findings.length === 0 ? (
                        <motion.div
                            style={styles.allClear}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <div style={styles.allClearIcon}>
                                <CheckCircle size={32} color="#81C784" />
                            </div>
                            <div style={styles.allClearText}>Alles in Ordnung</div>
                            <div style={styles.allClearSubtext}>
                                Keine Auffälligkeiten gefunden
                            </div>
                        </motion.div>
                    ) : (
                        /* Grouped Findings */
                        <AnimatePresence mode="popLayout">
                            {Array.from(groupedFindings.entries()).map(([category, findings]) => (
                                <motion.div
                                    key={category}
                                    style={styles.categoryGroup}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div style={styles.categoryTitle}>
                                        {CATEGORY_LABELS[category] || category}
                                    </div>
                                    {findings.map((finding: Finding, i: number) => (
                                        <motion.div
                                            key={`${finding.id}-${i}`}
                                            style={styles.findingCard(finding.severity)}
                                            initial={{ opacity: 0, x: -12 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                        >
                                            <div style={styles.findingIcon(finding.severity)}>
                                                {getFindingIcon(finding.severity)}
                                            </div>
                                            <div style={styles.findingContent}>
                                                <div style={styles.findingTitle}>
                                                    {finding.message}
                                                </div>
                                                {finding.hint && (
                                                    <div style={styles.findingDescription}>
                                                        {finding.hint}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            ) : !selectedCaseId ? (
                <div style={styles.empty}>
                    Wählen Sie einen Fall aus, um die Prüfung zu starten.
                </div>
            ) : null}
        </motion.div>
    );
}

export default ReviewPageV7;
