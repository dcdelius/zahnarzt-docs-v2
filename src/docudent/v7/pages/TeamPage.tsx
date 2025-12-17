/**
 * Team Page MVP — Mock Lists + Action Buttons
 *
 * ═══════════════════════════════════════════════════════════════
 * Premium pill-style lists for providers and rooms.
 * Action buttons show "Coming Soon" toast.
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import { motion } from 'framer-motion';
import { colors, gradients, space, radii, typography, glass, shadows, motion as motionTokens } from '../app/designTokens';
import { JetonToast, useToast } from '../components/JetonToast';

// ═══════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════

const MOCK_PROVIDERS = [
    { id: '1', name: 'Dr. Anna Müller', role: 'Zahnärztin', initials: 'AM' },
    { id: '2', name: 'Dr. Thomas Weber', role: 'Zahnarzt', initials: 'TW' },
    { id: '3', name: 'Maria Schmidt', role: 'ZFA', initials: 'MS' },
];

const MOCK_ROOMS = [
    { id: '1', name: 'Behandlungsraum 1', status: 'active' },
    { id: '2', name: 'Behandlungsraum 2', status: 'active' },
];

// ═══════════════════════════════════════════════════════════════
// LIST ITEM
// ═══════════════════════════════════════════════════════════════

function ListItem({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: `${space['3']} ${space['4']}`,
                borderBottom: `1px solid ${colors.hairlineSubtle}`,
            }}
            whileHover={{ background: gradients.hoverTint }}
            transition={{ duration: motionTokens.fast }}
        >
            {children}
        </motion.div>
    );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <motion.button
            onClick={onClick}
            style={{
                padding: `${space['2']} ${space['4']}`,
                borderRadius: radii.pill,
                border: `1px solid ${colors.hairline}`,
                background: 'transparent',
                color: colors.textSecondary,
                fontSize: typography.small,
                fontWeight: typography.medium,
                cursor: 'pointer',
            }}
            whileHover={{
                background: colors.accentLight,
                color: colors.accent,
                borderColor: colors.accentLight,
            }}
            whileTap={{ scale: 0.97 }}
        >
            {label}
        </motion.button>
    );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function TeamPage() {
    const { toast, showToast, hideToast } = useToast();

    const handleComingSoon = (action: string) => {
        showToast('info', 'Demnächst verfügbar', `${action} wird bald freigeschaltet.`);
    };

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
                    Team
                </h1>
                <p style={{
                    fontSize: typography.body,
                    color: colors.textSecondary,
                }}>
                    Teammitglieder und Behandlungsräume verwalten
                </p>
            </motion.div>

            {/* Providers Section */}
            <motion.div
                style={{
                    ...glass.panel,
                    borderRadius: radii.xl,
                    padding: 0,
                    marginBottom: space['6'],
                    overflow: 'hidden',
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, delay: 0.1, ease: motionTokens.ease }}
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
                        Behandler
                    </span>
                    <ActionButton label="+ Hinzufügen" onClick={() => handleComingSoon('Behandler hinzufügen')} />
                </div>

                {MOCK_PROVIDERS.map((provider) => (
                    <ListItem key={provider.id}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: radii.pill,
                            background: gradients.cyanLilac,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: typography.label,
                            fontWeight: typography.semibold,
                            color: colors.textPrimary,
                            marginRight: space['3'],
                        }}>
                            {provider.initials}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: typography.body,
                                fontWeight: typography.medium,
                                color: colors.textPrimary,
                            }}>
                                {provider.name}
                            </div>
                            <div style={{
                                fontSize: typography.label,
                                color: colors.textMuted,
                            }}>
                                {provider.role}
                            </div>
                        </div>
                    </ListItem>
                ))}
            </motion.div>

            {/* Rooms Section */}
            <motion.div
                style={{
                    ...glass.panel,
                    borderRadius: radii.xl,
                    padding: 0,
                    marginBottom: space['6'],
                    overflow: 'hidden',
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, delay: 0.15, ease: motionTokens.ease }}
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
                        Behandlungsräume
                    </span>
                    <ActionButton label="+ Hinzufügen" onClick={() => handleComingSoon('Raum hinzufügen')} />
                </div>

                {MOCK_ROOMS.map((room) => (
                    <ListItem key={room.id}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: radii.lg,
                            background: gradients.mintSky,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            marginRight: space['3'],
                        }}>
                            🏥
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: typography.body,
                                fontWeight: typography.medium,
                                color: colors.textPrimary,
                            }}>
                                {room.name}
                            </div>
                        </div>
                        <span style={{
                            padding: `${space['1']} ${space['3']}`,
                            borderRadius: radii.pill,
                            background: colors.successLight,
                            color: colors.success,
                            fontSize: typography.label,
                            fontWeight: typography.medium,
                        }}>
                            Aktiv
                        </span>
                    </ListItem>
                ))}
            </motion.div>

            {/* Invite button */}
            <motion.button
                onClick={() => handleComingSoon('Team einladen')}
                style={{
                    padding: `${space['3']} ${space['6']}`,
                    borderRadius: radii.pill,
                    border: 'none',
                    background: gradients.primary,
                    color: colors.textOnAccent,
                    fontSize: typography.body,
                    fontWeight: typography.semibold,
                    cursor: 'pointer',
                    boxShadow: shadows.glow,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, delay: 0.2 }}
            >
                📧 Team einladen
            </motion.button>

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

export default TeamPage;
