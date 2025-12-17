/**
 * CasesPage V1 — Case List with Filters + Detail Drawer
 *
 * ═══════════════════════════════════════════════════════════════
 * Premium list view, no cards or grids.
 * Uses useCases hook for data.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { colors, gradients, space, radii, typography, glass, shadows, motion as motionTokens } from '../app/designTokens';
import { useAuth } from '../app/AppShell';
import { useCases, type CaseFilters } from '../hooks/useCases';
import { JetonToast, useToast } from '../components/JetonToast';
import type { CaseSummary } from '../../core/case/caseRepository';
import type { CaseDoc, CaseStatus } from '../../core/case/caseService';

// ═══════════════════════════════════════════════════════════════
// STATUS CONFIG
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<CaseStatus, { label: string; color: string; bg: string }> = {
    draft: { label: 'Entwurf', color: colors.warning, bg: colors.warningLight },
    finalized: { label: 'Fertig', color: colors.success, bg: colors.successLight },
    amended: { label: 'Geändert', color: colors.accent, bg: colors.accentLight },
};

const TREATMENT_LABELS: Record<string, string> = {
    fuellung: 'Füllung',
    endo: 'Endodontie',
    kontrolle: 'Kontrolle',
    pzr: 'Prophylaxe',
};

// ═══════════════════════════════════════════════════════════════
// FILTER PILLS
// ═══════════════════════════════════════════════════════════════

interface FilterPillProps {
    label: string;
    active: boolean;
    onClick: () => void;
}

function FilterPill({ label, active, onClick }: FilterPillProps) {
    return (
        <motion.button
            onClick={onClick}
            style={{
                padding: `${space['1']} ${space['3']}`,
                borderRadius: radii.pill,
                border: `1px solid ${active ? colors.accent : colors.hairline}`,
                background: active ? colors.accentLight : 'transparent',
                color: active ? colors.accent : colors.textSecondary,
                fontSize: typography.label,
                fontWeight: active ? typography.semibold : typography.medium,
                cursor: 'pointer',
            }}
            whileHover={{ background: active ? colors.accentLight : colors.hairlineSubtle }}
            whileTap={{ scale: 0.97 }}
        >
            {label}
        </motion.button>
    );
}

// ═══════════════════════════════════════════════════════════════
// CASE ROW
// ═══════════════════════════════════════════════════════════════

interface CaseRowProps {
    caseItem: CaseSummary;
    onClick: () => void;
}

function CaseRow({ caseItem, onClick }: CaseRowProps) {
    const config = STATUS_CONFIG[caseItem.status];
    const treatmentLabel = TREATMENT_LABELS[caseItem.treatmentId] ?? caseItem.treatmentId;

    return (
        <motion.div
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: `${space['4']} ${space['5']}`,
                borderBottom: `1px solid ${colors.hairlineSubtle}`,
                cursor: 'pointer',
            }}
            whileHover={{ background: gradients.hoverTint }}
            transition={{ duration: motionTokens.fast }}
        >
            {/* Left: Treatment + Patient */}
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: space['2'] }}>
                    <span style={{
                        padding: `${space['1']} ${space['2']}`,
                        borderRadius: radii.sm,
                        background: gradients.cyanLilac,
                        fontSize: typography.label,
                        fontWeight: typography.semibold,
                        color: colors.textPrimary,
                    }}>
                        {treatmentLabel}
                    </span>
                    <span style={{
                        fontSize: typography.body,
                        fontWeight: typography.medium,
                        color: colors.textPrimary,
                    }}>
                        {caseItem.patientRef}
                    </span>
                </div>
            </div>

            {/* Right: Status + Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: space['3'] }}>
                <span style={{
                    padding: `${space['1']} ${space['3']}`,
                    borderRadius: radii.pill,
                    background: config.bg,
                    color: config.color,
                    fontSize: typography.label,
                    fontWeight: typography.semibold,
                }}>
                    {config.label}
                </span>
                <span style={{
                    fontSize: typography.label,
                    color: colors.textMuted,
                    minWidth: '100px',
                    textAlign: 'right' as const,
                }}>
                    {caseItem.createdAt.toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </span>
            </div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════
// CASE DETAIL DRAWER
// ═══════════════════════════════════════════════════════════════

interface CaseDrawerProps {
    caseDoc: CaseDoc | null;
    isOpen: boolean;
    onClose: () => void;
    onCopyId: (id: string) => void;
    onStartReview: (caseId: string) => void;
}

function CaseDrawer({ caseDoc, isOpen, onClose, onCopyId, onStartReview }: CaseDrawerProps) {
    if (!caseDoc) return null;

    const config = STATUS_CONFIG[caseDoc.status];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.2)',
                            zIndex: 1000,
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.div
                        style={{
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: '400px',
                            maxWidth: '90vw',
                            background: colors.white,
                            boxShadow: shadows.medium,
                            zIndex: 1001,
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: motionTokens.normal, ease: motionTokens.ease }}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: space['5'],
                            borderBottom: `1px solid ${colors.hairline}`,
                        }}>
                            <span style={{
                                fontSize: typography.h2,
                                fontWeight: typography.bold,
                                color: colors.textPrimary,
                            }}>
                                Falldetails
                            </span>
                            <motion.button
                                onClick={onClose}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: radii.md,
                                    border: 'none',
                                    background: colors.hairlineSubtle,
                                    color: colors.textSecondary,
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                }}
                                whileHover={{ background: colors.hairline }}
                            >
                                ✕
                            </motion.button>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, overflow: 'auto', padding: space['5'] }}>
                            {/* Status */}
                            <div style={{ marginBottom: space['5'] }}>
                                <div style={{
                                    fontSize: typography.label,
                                    color: colors.textMuted,
                                    marginBottom: space['1'],
                                }}>
                                    Status
                                </div>
                                <span style={{
                                    padding: `${space['1']} ${space['3']}`,
                                    borderRadius: radii.pill,
                                    background: config.bg,
                                    color: config.color,
                                    fontSize: typography.small,
                                    fontWeight: typography.semibold,
                                }}>
                                    {config.label}
                                </span>
                            </div>

                            {/* Fields */}
                            {[
                                { label: 'Behandlung', value: TREATMENT_LABELS[caseDoc.treatmentId] ?? caseDoc.treatmentId },
                                { label: 'Behandler', value: caseDoc.providerId },
                                { label: 'Patient', value: caseDoc.patientRef },
                                { label: 'Erstellt', value: caseDoc.createdAt.toDate().toLocaleString('de-DE') },
                                { label: 'Reproduzierbarkeit', value: caseDoc.reproducibility ? `Reproduzierbar · Hash OK` : '–' },
                            ].map((field) => (
                                <div key={field.label} style={{ marginBottom: space['4'] }}>
                                    <div style={{
                                        fontSize: typography.label,
                                        color: colors.textMuted,
                                        marginBottom: space['1'],
                                    }}>
                                        {field.label}
                                    </div>
                                    <div style={{
                                        fontSize: typography.body,
                                        color: colors.textPrimary,
                                        fontWeight: typography.medium,
                                    }}>
                                        {field.value}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: space['5'],
                            borderTop: `1px solid ${colors.hairline}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: space['3'],
                        }}>
                            {/* Start Review CTA */}
                            <motion.button
                                onClick={() => onStartReview(caseDoc.id)}
                                style={{
                                    width: '100%',
                                    padding: `${space['3']} ${space['5']}`,
                                    borderRadius: radii.pill,
                                    border: 'none',
                                    background: gradients.primary,
                                    color: colors.textOnAccent,
                                    fontSize: typography.body,
                                    fontWeight: typography.semibold,
                                    cursor: 'pointer',
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Check starten
                            </motion.button>

                            {/* Copy ID */}
                            <motion.button
                                onClick={() => onCopyId(caseDoc.id)}
                                style={{
                                    width: '100%',
                                    padding: `${space['3']} ${space['4']}`,
                                    borderRadius: radii.md,
                                    border: `1px solid ${colors.hairline}`,
                                    background: 'transparent',
                                    color: colors.textSecondary,
                                    fontSize: typography.small,
                                    fontWeight: typography.medium,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: space['2'],
                                }}
                                whileHover={{ background: colors.hairlineSubtle }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Fall-ID kopieren
                            </motion.button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function CasesPage() {
    const { role, orgId, practiceId } = useAuth();
    const navigate = useNavigate();

    const { state, filters, setFilters, loadCase } = useCases(orgId ?? 'demo-org', practiceId ?? 'demo-practice');
    const { toast, showToast, hideToast } = useToast();

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedCase, setSelectedCase] = useState<CaseDoc | null>(null);

    const handleCaseClick = async (caseItem: CaseSummary) => {
        const caseDoc = await loadCase(caseItem.id);
        if (caseDoc) {
            setSelectedCase(caseDoc);
            setDrawerOpen(true);
        }
    };

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
        showToast('success', 'Fall-ID kopiert');
    };

    const handleStartReview = (caseId: string) => {
        setDrawerOpen(false);
        navigate(`/billing?caseId=${caseId}`);
    };

    const showProviderFilter = role === 'practice_admin' || role === 'org_admin';

    return (
        <div style={{ maxWidth: '900px' }}>
            {/* Header */}
            <motion.div
                style={{ marginBottom: space['6'] }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, ease: motionTokens.ease }}
            >
                <h1 style={{
                    fontSize: typography.h1,
                    fontWeight: typography.bold,
                    color: colors.textPrimary,
                    letterSpacing: typography.tightTracking,
                    marginBottom: space['2'],
                }}>
                    Fälle
                </h1>
                <p style={{
                    fontSize: typography.body,
                    color: colors.textSecondary,
                }}>
                    Dokumentationen, sauber strukturiert und reproduzierbar gespeichert.
                </p>
            </motion.div>

            {/* Filter Pills */}
            <motion.div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: space['2'],
                    marginBottom: space['5'],
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.fast, delay: 0.1 }}
            >
                {/* Status filters */}
                <div style={{ display: 'flex', gap: space['2'], marginRight: space['4'] }}>
                    <FilterPill
                        label="Alle"
                        active={filters.status === null}
                        onClick={() => setFilters({ status: null })}
                    />
                    <FilterPill
                        label="Entwurf"
                        active={filters.status === 'draft'}
                        onClick={() => setFilters({ status: 'draft' })}
                    />
                    <FilterPill
                        label="Fertig"
                        active={filters.status === 'finalized'}
                        onClick={() => setFilters({ status: 'finalized' })}
                    />
                    <FilterPill
                        label="Geändert"
                        active={filters.status === 'amended'}
                        onClick={() => setFilters({ status: 'amended' })}
                    />
                </div>

                {/* Time filters */}
                <div style={{ display: 'flex', gap: space['2'] }}>
                    <FilterPill
                        label="7 Tage"
                        active={filters.days === 7}
                        onClick={() => setFilters({ days: 7 })}
                    />
                    <FilterPill
                        label="30 Tage"
                        active={filters.days === 30}
                        onClick={() => setFilters({ days: 30 })}
                    />
                    <FilterPill
                        label="90 Tage"
                        active={filters.days === 90}
                        onClick={() => setFilters({ days: 90 })}
                    />
                </div>
            </motion.div>

            {/* Case List */}
            <motion.div
                style={{
                    ...glass.panel,
                    borderRadius: radii.xl,
                    overflow: 'hidden',
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, delay: 0.15 }}
            >
                {state.isLoading ? (
                    <div style={{ padding: space['8'], textAlign: 'center' }}>
                        <motion.div
                            style={{ fontSize: '24px', marginBottom: space['3'] }}
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            📄
                        </motion.div>
                        <div style={{ color: colors.textMuted, fontSize: typography.small }}>
                            Laden...
                        </div>
                    </div>
                ) : state.error ? (
                    <div style={{ padding: space['8'], textAlign: 'center', color: colors.error }}>
                        {state.error}
                    </div>
                ) : state.cases.length === 0 ? (
                    <div style={{ padding: space['8'], textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: space['4'] }}>📋</div>
                        <div style={{
                            fontSize: typography.body,
                            fontWeight: typography.semibold,
                            color: colors.textPrimary,
                            marginBottom: space['2'],
                        }}>
                            Noch keine Fälle.
                        </div>
                        <div style={{
                            fontSize: typography.small,
                            color: colors.textSecondary,
                            marginBottom: space['5'],
                        }}>
                            Starte mit einem Diktat – der Rest passiert automatisch.
                        </div>
                        <motion.button
                            onClick={() => window.location.href = '/dictation'}
                            style={{
                                padding: `${space['3']} ${space['5']}`,
                                borderRadius: radii.pill,
                                border: 'none',
                                background: gradients.primary,
                                color: colors.textOnAccent,
                                fontSize: typography.small,
                                fontWeight: typography.semibold,
                                cursor: 'pointer',
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Neues Diktat starten
                        </motion.button>
                    </div>
                ) : (
                    state.cases.map((c) => (
                        <CaseRow key={c.id} caseItem={c} onClick={() => handleCaseClick(c)} />
                    ))
                )}
            </motion.div>

            {/* Case count */}
            {!state.isLoading && state.cases.length > 0 && (
                <div style={{
                    marginTop: space['3'],
                    fontSize: typography.label,
                    color: colors.textMuted,
                }}>
                    {state.cases.length} Fälle
                </div>
            )}

            {/* Drawer */}
            <CaseDrawer
                caseDoc={selectedCase}
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onCopyId={handleCopyId}
                onStartReview={handleStartReview}
            />

            {/* Toast */}
            <JetonToast
                variant={toast.variant}
                title={toast.title}
                message={toast.message}
                isOpen={toast.isOpen}
                onClose={hideToast}
            />
        </div>
    );
}

export default CasesPage;
