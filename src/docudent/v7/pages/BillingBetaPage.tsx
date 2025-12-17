/**
 * Case Review Page (Beta) — Quality Check Experience
 *
 * ═══════════════════════════════════════════════════════════════
 * Analyze cases for quality and compliance.
 * No billing logic in v7.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { colors, gradients, space, radii, typography, glass, shadows, motion as motionTokens } from '../app/designTokens';
import { useAuth } from '../app/AuthContext.mock';
import { useCases } from '../hooks/useCases';
import { reviewCase, type Finding, type FindingSeverity, type ReviewResult } from '../../core/review/caseReviewEngine';

// ═══════════════════════════════════════════════════════════════
// SEVERITY CONFIG
// ═══════════════════════════════════════════════════════════════

const SEVERITY_CONFIG: Record<FindingSeverity, { icon: string; color: string; bg: string; label: string }> = {
    ok: { icon: '✓', color: colors.success, bg: colors.successLight, label: 'OK' },
    hinweis: { icon: '!', color: colors.warning, bg: colors.warningLight, label: 'Hinweis' },
    risiko: { icon: '⚠', color: colors.error, bg: colors.errorLight, label: 'Risiko' },
};

// ═══════════════════════════════════════════════════════════════
// FINDING ROW
// ═══════════════════════════════════════════════════════════════

interface FindingRowProps {
    finding: Finding;
    onCtaClick?: (route: string) => void;
}

function FindingRow({ finding, onCtaClick }: FindingRowProps) {
    const config = SEVERITY_CONFIG[finding.severity];

    return (
        <motion.div
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: space['4'],
                padding: `${space['4']} 0`,
                borderBottom: `1px solid ${colors.hairlineSubtle}`,
            }}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: motionTokens.fast }}
        >
            {/* Severity Icon */}
            <div style={{
                width: '28px',
                height: '28px',
                borderRadius: radii.md,
                background: config.bg,
                color: config.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: typography.bold,
                flexShrink: 0,
            }}>
                {config.icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: space['2'],
                    marginBottom: space['1'],
                }}>
                    <span style={{
                        fontSize: typography.body,
                        fontWeight: typography.semibold,
                        color: colors.textPrimary,
                    }}>
                        {finding.title}
                    </span>
                    <span style={{
                        padding: `2px ${space['2']}`,
                        borderRadius: radii.pill,
                        background: config.bg,
                        color: config.color,
                        fontSize: typography.label,
                        fontWeight: typography.semibold,
                    }}>
                        {config.label}
                    </span>
                </div>
                <div style={{
                    fontSize: typography.small,
                    color: colors.textSecondary,
                    lineHeight: typography.snug,
                }}>
                    {finding.detail}
                </div>

                {/* CTA */}
                {finding.ctaRoute && (
                    <motion.button
                        onClick={() => onCtaClick?.(finding.ctaRoute!)}
                        style={{
                            marginTop: space['2'],
                            padding: `${space['1']} ${space['3']}`,
                            borderRadius: radii.pill,
                            border: `1px solid ${colors.accent}`,
                            background: 'transparent',
                            color: colors.accent,
                            fontSize: typography.label,
                            fontWeight: typography.medium,
                            cursor: 'pointer',
                        }}
                        whileHover={{ background: colors.accentLight }}
                        whileTap={{ scale: 0.97 }}
                    >
                        {finding.ctaLabel ?? 'Öffnen'}
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function BillingBetaPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const orgId = user?.orgId ?? 'demo-org';
    const practiceId = user?.practiceId ?? 'demo-practice';

    const { state, loadCase } = useCases(orgId, practiceId);

    const [selectedCaseId, setSelectedCaseId] = useState<string>('');
    const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
    const [isReviewing, setIsReviewing] = useState(false);

    const handleStartReview = async () => {
        if (!selectedCaseId) return;

        setIsReviewing(true);
        setReviewResult(null);

        // Simulate slight delay for premium feel
        await new Promise(r => setTimeout(r, 600));

        const caseDoc = await loadCase(selectedCaseId);
        if (caseDoc) {
            const result = reviewCase(caseDoc);
            setReviewResult(result);
        }

        setIsReviewing(false);
    };

    const handleCtaClick = (route: string) => {
        navigate(route);
    };

    return (
        <div style={{ maxWidth: '700px' }}>
            {/* Header */}
            <motion.div
                style={{ marginBottom: space['8'] }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, ease: motionTokens.ease }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: space['3'], marginBottom: space['2'] }}>
                    <h1 style={{
                        fontSize: typography.h1,
                        fontWeight: typography.bold,
                        color: colors.textPrimary,
                        letterSpacing: typography.tightTracking,
                    }}>
                        Case Review
                    </h1>
                    <span style={{
                        padding: `${space['1']} ${space['3']}`,
                        borderRadius: radii.pill,
                        background: gradients.peachRose,
                        fontSize: typography.label,
                        fontWeight: typography.semibold,
                        color: colors.textPrimary,
                    }}>
                        Beta
                    </span>
                </div>
                <p style={{
                    fontSize: typography.body,
                    color: colors.textSecondary,
                }}>
                    Automatische Prüfung auf Konsistenz, Vollständigkeit und Abrechnungsrisiken.
                </p>
            </motion.div>

            {/* Case Selector */}
            <motion.div
                style={{
                    ...glass.panel,
                    borderRadius: radii.xl,
                    padding: space['6'],
                    marginBottom: space['6'],
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, delay: 0.1 }}
            >
                <div style={{
                    fontSize: typography.body,
                    fontWeight: typography.semibold,
                    color: colors.textPrimary,
                    marginBottom: space['4'],
                }}>
                    Fall auswählen
                </div>

                <select
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                    disabled={state.isLoading}
                    style={{
                        width: '100%',
                        padding: `${space['3']} ${space['4']}`,
                        borderRadius: radii.md,
                        border: `1px solid ${colors.hairline}`,
                        background: colors.surface,
                        color: colors.textPrimary,
                        fontSize: typography.body,
                        marginBottom: space['4'],
                        cursor: 'pointer',
                    }}
                >
                    <option value="">Letzten Fall auswählen …</option>
                    {state.cases.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.patientRef} • {c.treatmentId} • {c.createdAt.toLocaleDateString('de-DE')}
                        </option>
                    ))}
                </select>

                <motion.button
                    onClick={handleStartReview}
                    disabled={!selectedCaseId || isReviewing}
                    style={{
                        padding: `${space['3']} ${space['6']}`,
                        borderRadius: radii.pill,
                        border: 'none',
                        background: selectedCaseId ? gradients.primary : colors.hairline,
                        color: selectedCaseId ? colors.textOnAccent : colors.textMuted,
                        fontSize: typography.body,
                        fontWeight: typography.semibold,
                        cursor: !selectedCaseId || isReviewing ? 'not-allowed' : 'pointer',
                        opacity: isReviewing ? 0.7 : 1,
                    }}
                    whileHover={selectedCaseId && !isReviewing ? { scale: 1.02 } : {}}
                    whileTap={selectedCaseId && !isReviewing ? { scale: 0.98 } : {}}
                >
                    {isReviewing ? 'Prüfe Falldaten …' : 'Check starten'}
                </motion.button>
            </motion.div>

            {/* Results */}
            <AnimatePresence mode="wait">
                {reviewResult && (
                    <motion.div
                        style={{
                            ...glass.panel,
                            borderRadius: radii.xl,
                            padding: space['6'],
                        }}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: motionTokens.normal }}
                    >
                        {/* Result Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: space['4'],
                        }}>
                            <span style={{
                                fontSize: typography.h2,
                                fontWeight: typography.semibold,
                                color: colors.textPrimary,
                            }}>
                                Ergebnisse
                            </span>
                            <span style={{
                                padding: `${space['1']} ${space['3']}`,
                                borderRadius: radii.pill,
                                background: SEVERITY_CONFIG[reviewResult.overallStatus].bg,
                                color: SEVERITY_CONFIG[reviewResult.overallStatus].color,
                                fontSize: typography.small,
                                fontWeight: typography.semibold,
                            }}>
                                {reviewResult.findings.length} Findings
                            </span>
                        </div>

                        {/* Findings List */}
                        <div>
                            {reviewResult.findings.map((f, idx) => (
                                <FindingRow
                                    key={f.id}
                                    finding={f}
                                    onCtaClick={handleCtaClick}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Empty State */}
            {!reviewResult && !isReviewing && (
                <motion.div
                    style={{
                        ...glass.panel,
                        borderRadius: radii.xl,
                        padding: space['8'],
                        textAlign: 'center' as const,
                    }}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: motionTokens.normal, delay: 0.2 }}
                >
                    <div style={{
                        fontSize: '32px',
                        marginBottom: space['4'],
                    }}>
                        🔍
                    </div>
                    <div style={{
                        fontSize: typography.body,
                        fontWeight: typography.semibold,
                        color: colors.textPrimary,
                        marginBottom: space['2'],
                    }}>
                        Noch kein Check durchgeführt.
                    </div>
                    <div style={{
                        fontSize: typography.small,
                        color: colors.textSecondary,
                    }}>
                        Wähle einen Fall und starte die Prüfung.
                    </div>
                </motion.div>
            )}
        </div>
    );
}

export default BillingBetaPage;
