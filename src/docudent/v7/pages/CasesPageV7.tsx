/**
 * Cases Page V7 — Glass-styled Case List
 *
 * ═══════════════════════════════════════════════════════════════
 * V7 Design: Warm gradient, big type, pill filters, glass rows.
 * Uses caseRepository (mock mode for dev).
 * NO Firestore imports — goes through core services.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, CheckCircle, Edit3 } from 'lucide-react';
import {
    colors,
    gradients,
    typography,
    radii,
    shadows,
    spacing,
    motion as motionTokens,
} from '../styles/tokens';
import { createCaseRepository, type CaseSummary } from '../../core/case/caseRepository';

// ═══════════════════════════════════════════════════════════════
// FILTER TYPES
// ═══════════════════════════════════════════════════════════════

type FilterType = 'all' | 'draft' | 'finalized';

const FILTERS: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Alle' },
    { id: 'draft', label: 'Entwürfe' },
    { id: 'finalized', label: 'Abgeschlossen' },
];

// ═══════════════════════════════════════════════════════════════
// TREATMENT LABELS
// ═══════════════════════════════════════════════════════════════

const TREATMENT_LABELS: Record<string, string> = {
    fuellung: 'Füllung',
    endo: 'Endo',
    extraktion: 'Extraktion',
    pzr: 'PZR',
    kontrolle: 'Kontrolle',
    par: 'PAR',
    ze: 'ZE',
};

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
    filters: {
        display: 'flex',
        gap: spacing.sm,
        marginTop: spacing.xl,
    },
    filterPill: (active: boolean) => ({
        padding: `${spacing.sm} ${spacing.lg}`,
        borderRadius: radii.pill,
        border: 'none',
        background: active ? colors.segmentActive : colors.surfaceGlass,
        color: active ? colors.segmentActiveText : colors.textSecondary,
        fontSize: typography.label,
        fontWeight: active ? typography.semibold : typography.medium,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    }),
    list: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: spacing.md,
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        borderRadius: radii.cardSmall,
        background: colors.surfaceGlass,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    rowInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
    },
    icon: {
        width: '40px',
        height: '40px',
        borderRadius: radii.cardSmall,
        background: colors.surfaceGlassHover,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowText: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '2px',
    },
    patientRef: {
        fontSize: typography.body,
        fontWeight: typography.medium,
        color: colors.textPrimary,
    },
    meta: {
        display: 'flex',
        gap: spacing.md,
        fontSize: typography.caption,
        color: colors.textMuted,
    },
    statusBadge: (status: string) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: `4px ${spacing.sm}`,
        borderRadius: radii.pill,
        fontSize: typography.caption,
        fontWeight: typography.medium,
        background: status === 'finalized' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 193, 7, 0.2)',
        color: status === 'finalized' ? '#81C784' : '#FFD54F',
    }),
    empty: {
        textAlign: 'center' as const,
        padding: spacing.xxxl,
        color: colors.textMuted,
        fontSize: typography.body,
    },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function CasesPageV7() {
    const navigate = useNavigate();
    const [filter, setFilter] = useState<FilterType>('all');
    const [cases, setCases] = useState<CaseSummary[]>([]);
    const [loading, setLoading] = useState(true);

    // Load cases on mount
    useEffect(() => {
        const loadCases = async () => {
            const repo = createCaseRepository(null, true); // Mock mode
            const result = await repo.listCases({
                orgId: 'org_demo',
                practiceId: 'practice_demo',
                status: filter === 'all' ? undefined : filter,
                maxResults: 50,
            });
            setCases(result);
            setLoading(false);
        };
        loadCases();
    }, [filter]);

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

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

                <h1 style={styles.title}>Fälle</h1>

                {/* Filters */}
                <div style={styles.filters}>
                    {FILTERS.map((f) => (
                        <motion.button
                            key={f.id}
                            style={styles.filterPill(filter === f.id)}
                            onClick={() => setFilter(f.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {f.label}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Cases List */}
            <div style={styles.list}>
                {loading ? (
                    <motion.div
                        style={styles.empty}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        Lädt Fälle...
                    </motion.div>
                ) : cases.length === 0 ? (
                    <div style={styles.empty}>
                        Keine Fälle gefunden.
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {cases.map((c, i) => (
                            <motion.div
                                key={c.id}
                                style={styles.row}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                whileHover={{
                                    background: colors.surfaceGlassHover,
                                    transform: 'translateY(-2px)',
                                }}
                                onClick={() => navigate(`/docudent/v7/cases/${c.id}`)}
                            >
                                <div style={styles.rowInfo}>
                                    <div style={styles.icon}>
                                        <FileText size={20} color={colors.textMuted} />
                                    </div>
                                    <div style={styles.rowText}>
                                        <span style={styles.patientRef}>{c.patientRef}</span>
                                        <div style={styles.meta}>
                                            <span>{TREATMENT_LABELS[c.treatmentId] || c.treatmentId}</span>
                                            <span>·</span>
                                            <span>{formatDate(c.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>

                                <span style={styles.statusBadge(c.status)}>
                                    {c.status === 'finalized' ? (
                                        <><CheckCircle size={12} /> Abgeschlossen</>
                                    ) : c.status === 'amended' ? (
                                        <><Edit3 size={12} /> Geändert</>
                                    ) : (
                                        <><Clock size={12} /> Entwurf</>
                                    )}
                                </span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </motion.div>
    );
}

export default CasesPageV7;
