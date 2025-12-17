/**
 * Dashboard Page — JETON_UI_DIREKTIV_V1
 *
 * ═══════════════════════════════════════════════════════════════
 * Hero + Quick Actions + Activity — NO card grids, premium feel.
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../app/AuthContext.mock';
import { UIRole } from '../app/routes';
import { colors, gradients, space, radii, typography, shadows, glass, motion as motionTokens } from '../app/designTokens';

// ═══════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════

const recentActivity = [
    { id: '1', label: 'Füllung 36 MOD', time: 'vor 2 Stunden', status: 'finalized' },
    { id: '2', label: 'Endo 46', time: 'Gestern', status: 'draft' },
    { id: '3', label: 'Einstellung geändert', time: 'vor 3 Tagen', status: 'changed' },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function DashboardPage() {
    const { user, role } = useAuth();
    const navigate = useNavigate();

    return (
        <div style={{ maxWidth: '900px' }}>
            {/* ═══ HERO SECTION ═══ */}
            <motion.div
                style={{ marginBottom: space['16'] }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, ease: motionTokens.ease }}
            >
                <h1 style={{
                    fontSize: typography.hero,
                    fontWeight: typography.bold,
                    color: colors.textPrimary,
                    letterSpacing: typography.tightTracking,
                    lineHeight: typography.tight,
                    marginBottom: space['4'],
                }}>
                    Dokumentation,<br />
                    <span style={{
                        background: gradients.primary,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        die sich leicht anfühlt.
                    </span>
                </h1>
                <p style={{
                    fontSize: typography.body,
                    color: colors.textSecondary,
                    lineHeight: typography.relaxed,
                    maxWidth: '480px',
                }}>
                    Diktat rein. Struktur raus. Settings sauber. Reproduzierbar.
                </p>
            </motion.div>

            {/* ═══ CTAs (per directive: 2 pills) ═══ */}
            <motion.div
                style={{
                    display: 'flex',
                    gap: space['4'],
                    marginBottom: space['16'],
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, delay: 0.08, ease: motionTokens.ease }}
            >
                {/* Primary CTA */}
                <motion.button
                    onClick={() => navigate('/dictation')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: space['2'],
                        padding: `${space['3']} ${space['6']}`,
                        background: gradients.primary,
                        border: 'none',
                        borderRadius: radii.pill,
                        color: colors.textOnAccent,
                        fontSize: typography.body,
                        fontWeight: typography.semibold,
                        cursor: 'pointer',
                        boxShadow: shadows.pillActive,
                    }}
                    whileHover={{ scale: 1.02, y: -2, boxShadow: shadows.glow }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: motionTokens.fast }}
                >
                    <span>🎤</span>
                    <span>Neues Diktat</span>
                </motion.button>

                {/* Secondary Ghost CTA */}
                <motion.button
                    onClick={() => navigate('/cases')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: space['2'],
                        padding: `${space['3']} ${space['6']}`,
                        background: 'transparent',
                        border: `1px solid ${colors.hairline}`,
                        borderRadius: radii.pill,
                        color: colors.textSecondary,
                        fontSize: typography.body,
                        fontWeight: typography.medium,
                        cursor: 'pointer',
                    }}
                    whileHover={{
                        background: colors.hairlineSubtle,
                        color: colors.textPrimary,
                        y: -1,
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: motionTokens.fast }}
                >
                    <span>📋</span>
                    <span>Fälle</span>
                </motion.button>
            </motion.div>

            {/* ═══ QUICK ACTIONS (horizontal pills) ═══ */}
            <motion.div
                style={{ marginBottom: space['12'] }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, delay: 0.12, ease: motionTokens.ease }}
            >
                <h2 style={{
                    fontSize: typography.label,
                    fontWeight: typography.semibold,
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: typography.wideTracking,
                    marginBottom: space['4'],
                }}>
                    Schnellzugriff
                </h2>
                <div style={{
                    display: 'flex',
                    gap: space['2'],
                    flexWrap: 'wrap',
                }}>
                    {getQuickActions(role).map((action, i) => (
                        <motion.button
                            key={action.route}
                            onClick={() => navigate(action.route)}
                            style={{
                                padding: `${space['2']} ${space['4']}`,
                                background: colors.hairlineSubtle,
                                border: 'none',
                                borderRadius: radii.pill,
                                color: colors.textSecondary,
                                fontSize: typography.small,
                                fontWeight: typography.medium,
                                cursor: 'pointer',
                            }}
                            whileHover={{
                                background: colors.accentLight,
                                color: colors.accent,
                            }}
                            whileTap={{ scale: 0.97 }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: motionTokens.fast, delay: 0.15 + i * 0.03 }}
                        >
                            {action.label}
                        </motion.button>
                    ))}
                </div>
            </motion.div>

            {/* ═══ RECENT ACTIVITY (list, no cards) ═══ */}
            <motion.div
                style={{ marginBottom: space['12'] }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, delay: 0.16, ease: motionTokens.ease }}
            >
                <h2 style={{
                    fontSize: typography.label,
                    fontWeight: typography.semibold,
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: typography.wideTracking,
                    marginBottom: space['4'],
                }}>
                    Letzte Aktivitäten
                </h2>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    {recentActivity.map((item, i) => (
                        <motion.div
                            key={item.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: `${space['4']} 0`,
                                borderBottom: i < recentActivity.length - 1 ? `1px solid ${colors.hairlineSubtle}` : 'none',
                            }}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: motionTokens.fast, delay: 0.2 + i * 0.04 }}
                        >
                            <span style={{
                                fontSize: typography.body,
                                fontWeight: typography.medium,
                                color: colors.textPrimary,
                            }}>
                                {item.label}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: space['3'] }}>
                                <StatusChip status={item.status} />
                                <span style={{
                                    fontSize: typography.small,
                                    color: colors.textMuted,
                                }}>
                                    {item.time}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* ═══ ABRECHNUNG COMING SOON ═══ */}
            <motion.div
                style={{
                    padding: space['10'],
                    ...glass.panel,
                    borderRadius: radii.xl,
                    textAlign: 'center',
                    borderStyle: 'dashed',
                    borderColor: colors.accentLight,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: motionTokens.normal, delay: 0.3 }}
            >
                <div style={{
                    fontSize: '28px',
                    marginBottom: space['3'],
                    opacity: 0.5,
                }}>
                    💳
                </div>
                <h3 style={{
                    fontSize: typography.body,
                    fontWeight: typography.semibold,
                    color: colors.accent,
                    marginBottom: space['1'],
                }}>
                    Abrechnung (Beta)
                </h3>
                <p style={{
                    fontSize: typography.small,
                    color: colors.textMuted,
                }}>
                    Case Review • Datenbank-Check • Coming Soon
                </p>
            </motion.div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getQuickActions(role: UIRole) {
    const all = [
        { label: 'Einstellungen', route: '/settings', visibleTo: ['org_admin', 'practice_admin', 'provider'] },
        { label: 'Team', route: '/team', visibleTo: ['org_admin', 'practice_admin'] },
        { label: 'Abrechnung', route: '/billing', visibleTo: ['org_admin', 'practice_admin', 'provider'] },
    ];
    return all.filter(a => a.visibleTo.includes(role));
}

function StatusChip({ status }: { status: string }) {
    const configs: Record<string, { bg: string; color: string; label: string }> = {
        finalized: { bg: 'rgba(16, 185, 129, 0.1)', color: colors.success, label: 'Fertig' },
        draft: { bg: 'rgba(245, 158, 11, 0.1)', color: colors.warning, label: 'Entwurf' },
        changed: { bg: colors.accentLight, color: colors.accent, label: 'Geändert' },
    };
    const config = configs[status] ?? configs.draft;

    return (
        <span style={{
            padding: `2px ${space['2']}`,
            background: config.bg,
            color: config.color,
            fontSize: typography.label,
            fontWeight: typography.semibold,
            borderRadius: radii.pill,
        }}>
            {config.label}
        </span>
    );
}

export default DashboardPage;
