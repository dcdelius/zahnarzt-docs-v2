/**
 * Admin Page — Software Admin Only
 *
 * ═══════════════════════════════════════════════════════════════
 * Impersonate roles + Org list stub.
 * Premium design, no admin-table vibe.
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import { motion } from 'framer-motion';
import { colors, gradients, space, radii, typography, glass, motion as motionTokens } from '../app/designTokens';
import { JetonToast, useToast } from '../components/JetonToast';

// ═══════════════════════════════════════════════════════════════
// MOCK ORGS
// ═══════════════════════════════════════════════════════════════

const MOCK_ORGS = [
    { id: 'org-1', name: 'Zahnarztpraxis Müller GmbH', practices: 2 },
    { id: 'org-2', name: 'MVZ Zahngesundheit', practices: 5 },
    { id: 'org-3', name: 'Dr. Weber Einzelpraxis', practices: 1 },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function AdminPage() {
    const { toast, showToast, hideToast } = useToast();

    return (
        <div style={{ maxWidth: '800px' }}>
            {/* Header */}
            <motion.div
                style={{ marginBottom: space['8'] }}
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
                    Admin
                </h1>
                <p style={{
                    fontSize: typography.body,
                    color: colors.textSecondary,
                }}>
                    Systemadministration und Debugging
                </p>
            </motion.div>

            {/* Warning */}
            <motion.div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: space['3'],
                    padding: `${space['3']} ${space['4']}`,
                    background: gradients.peachRose,
                    borderRadius: radii.lg,
                    marginBottom: space['6'],
                }}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: motionTokens.fast, delay: 0.1 }}
            >
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <span style={{
                    fontSize: typography.small,
                    fontWeight: typography.medium,
                    color: colors.textPrimary,
                }}>
                    Diese Seite ist nur für Software-Administratoren sichtbar.
                </span>
            </motion.div>

            {/* Impersonate Section */}
            <motion.div
                style={{
                    ...glass.panel,
                    borderRadius: radii.xl,
                    padding: space['6'],
                    marginBottom: space['6'],
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, delay: 0.15, ease: motionTokens.ease }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: space['3'],
                    marginBottom: space['4'],
                }}>
                    <span style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: radii.lg,
                        background: gradients.cyanLilac,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                    }}>
                        🎭
                    </span>
                    <div>
                        <div style={{
                            fontSize: typography.body,
                            fontWeight: typography.semibold,
                            color: colors.textPrimary,
                        }}>
                            Rolle wechseln
                        </div>
                        <div style={{
                            fontSize: typography.small,
                            color: colors.textMuted,
                        }}>
                            Nutze den Role Switcher im Header
                        </div>
                    </div>
                </div>
                <p style={{
                    fontSize: typography.small,
                    color: colors.textSecondary,
                    lineHeight: typography.relaxed,
                }}>
                    Der <strong>Role Switcher</strong> im Header ermöglicht das Testen verschiedener Rollen
                    (software_admin, org_admin, practice_admin, provider, assistant). Die Navigation
                    und sichtbaren Seiten passen sich automatisch an.
                </p>
            </motion.div>

            {/* Org List Section */}
            <motion.div
                style={{
                    ...glass.panel,
                    borderRadius: radii.xl,
                    padding: 0,
                    overflow: 'hidden',
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, delay: 0.2, ease: motionTokens.ease }}
            >
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: `${space['4']} ${space['5']}`,
                    borderBottom: `1px solid ${colors.hairline}`,
                }}>
                    <span style={{
                        fontSize: typography.body,
                        fontWeight: typography.semibold,
                        color: colors.textPrimary,
                    }}>
                        Organisationen (Stub)
                    </span>
                    <span style={{
                        padding: `${space['1']} ${space['3']}`,
                        borderRadius: radii.pill,
                        background: colors.accentLight,
                        color: colors.accent,
                        fontSize: typography.label,
                        fontWeight: typography.semibold,
                    }}>
                        {MOCK_ORGS.length}
                    </span>
                </div>

                {MOCK_ORGS.map((org, idx) => (
                    <motion.div
                        key={org.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: `${space['4']} ${space['5']}`,
                            borderBottom: idx < MOCK_ORGS.length - 1 ? `1px solid ${colors.hairlineSubtle}` : 'none',
                        }}
                        whileHover={{ background: gradients.hoverTint }}
                    >
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: radii.lg,
                            background: gradients.mintSky,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            marginRight: space['4'],
                        }}>
                            🏢
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: typography.body,
                                fontWeight: typography.medium,
                                color: colors.textPrimary,
                            }}>
                                {org.name}
                            </div>
                            <div style={{
                                fontSize: typography.label,
                                color: colors.textMuted,
                            }}>
                                {org.practices} {org.practices === 1 ? 'Praxis' : 'Praxen'}
                            </div>
                        </div>
                        <motion.button
                            onClick={() => showToast('info', 'Demnächst', 'Org-Details werden bald verfügbar sein.')}
                            style={{
                                padding: `${space['1']} ${space['3']}`,
                                borderRadius: radii.pill,
                                border: `1px solid ${colors.hairline}`,
                                background: 'transparent',
                                color: colors.textMuted,
                                fontSize: typography.label,
                                cursor: 'pointer',
                            }}
                            whileHover={{ borderColor: colors.accent, color: colors.accent }}
                        >
                            Details
                        </motion.button>
                    </motion.div>
                ))}
            </motion.div>

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

export default AdminPage;
