/**
 * Team Page — Real Memberships + Invite Modal
 *
 * ═══════════════════════════════════════════════════════════════
 * Premium pill-based list for team members.
 * Real membership data via core services.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { colors, gradients, space, radii, typography, glass, motion as motionTokens } from '../app/designTokens';
import { useAuth } from '../app/AppShell';
import { InviteUserModal } from '../components/InviteUserModal';
import { JetonToast, useToast } from '../components/JetonToast';
import type { PracticeRole } from '../../core/auth/authTypes';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface TeamMember {
    id: string;
    displayName: string;
    email?: string;
    roles: PracticeRole[];
}

// ═══════════════════════════════════════════════════════════════
// MOCK DATA (until functions deployed)
// ═══════════════════════════════════════════════════════════════

const MOCK_MEMBERS: TeamMember[] = [
    { id: '1', displayName: 'Dr. Anna Müller', email: 'mueller@praxis.de', roles: ['practice_admin', 'provider'] },
    { id: '2', displayName: 'Dr. Thomas Weber', email: 'weber@praxis.de', roles: ['provider'] },
    { id: '3', displayName: 'Maria Schmidt', email: 'schmidt@praxis.de', roles: ['assistant'] },
];

// ═══════════════════════════════════════════════════════════════
// ROLE CONFIG
// ═══════════════════════════════════════════════════════════════

const ROLE_CONFIG: Record<PracticeRole, { label: string; color: string; bg: string }> = {
    practice_admin: { label: 'Admin', color: colors.accent, bg: colors.accentLight },
    provider: { label: 'Behandler', color: colors.success, bg: colors.successLight },
    assistant: { label: 'Assistenz', color: colors.warning, bg: colors.warningLight },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function TeamPage() {
    const { orgId, practiceId, role } = useAuth();
    const { toast, showToast, hideToast } = useToast();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [inviteModalOpen, setInviteModalOpen] = useState(false);

    const canInvite = role === 'practice_admin' || role === 'org_admin' || role === 'software_admin';

    // Load members (mock for now)
    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => {
            setMembers(MOCK_MEMBERS);
            setIsLoading(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [practiceId]);

    const handleInviteSuccess = () => {
        showToast('success', 'Einladung erstellt');
    };

    return (
        <div style={{ maxWidth: '800px' }}>
            {/* Header */}
            <motion.div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: space['8'],
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, ease: motionTokens.ease }}
            >
                <div>
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
                        {members.length} Mitglieder in dieser Praxis
                    </p>
                </div>

                {canInvite && (
                    <motion.button
                        onClick={() => setInviteModalOpen(true)}
                        style={{
                            padding: `${space['3']} ${space['5']}`,
                            borderRadius: radii.pill,
                            border: 'none',
                            background: gradients.primary,
                            color: colors.textOnAccent,
                            fontSize: typography.body,
                            fontWeight: typography.semibold,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: space['2'],
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <span>+</span>
                        <span>Einladen</span>
                    </motion.button>
                )}
            </motion.div>

            {/* Members List */}
            <motion.div
                style={{
                    ...glass.panel,
                    borderRadius: radii.xl,
                    padding: 0,
                    overflow: 'hidden',
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, delay: 0.1, ease: motionTokens.ease }}
            >
                {isLoading ? (
                    <div style={{
                        padding: space['8'],
                        textAlign: 'center',
                        color: colors.textMuted,
                    }}>
                        <motion.div
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            Lade Team …
                        </motion.div>
                    </div>
                ) : members.length === 0 ? (
                    <div style={{
                        padding: space['8'],
                        textAlign: 'center',
                    }}>
                        <div style={{
                            fontSize: '32px',
                            marginBottom: space['4'],
                        }}>
                            👋
                        </div>
                        <div style={{
                            fontSize: typography.body,
                            color: colors.textPrimary,
                            fontWeight: typography.semibold,
                            marginBottom: space['2'],
                        }}>
                            Noch keine Teammitglieder
                        </div>
                        <div style={{
                            fontSize: typography.small,
                            color: colors.textSecondary,
                            marginBottom: space['5'],
                        }}>
                            Lade Kollegen ein, um gemeinsam zu dokumentieren.
                        </div>
                        {canInvite && (
                            <motion.button
                                onClick={() => setInviteModalOpen(true)}
                                style={{
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
                                Erstes Mitglied einladen
                            </motion.button>
                        )}
                    </div>
                ) : (
                    members.map((member, index) => (
                        <motion.div
                            key={member.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: `${space['4']} ${space['5']}`,
                                borderBottom: index < members.length - 1 ? `1px solid ${colors.hairlineSubtle}` : 'none',
                            }}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: motionTokens.fast, delay: index * 0.05 }}
                            whileHover={{ background: 'rgba(0,0,0,0.02)' }}
                        >
                            {/* Left: Avatar + Info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: space['4'] }}>
                                {/* Avatar */}
                                <div style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: radii.pill,
                                    background: gradients.cyanLilac,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: typography.body,
                                    fontWeight: typography.bold,
                                    color: colors.textPrimary,
                                }}>
                                    {member.displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>

                                {/* Name + Email */}
                                <div>
                                    <div style={{
                                        fontSize: typography.body,
                                        fontWeight: typography.semibold,
                                        color: colors.textPrimary,
                                        marginBottom: space['1'],
                                    }}>
                                        {member.displayName}
                                    </div>
                                    {member.email && (
                                        <div style={{
                                            fontSize: typography.small,
                                            color: colors.textMuted,
                                        }}>
                                            {member.email}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Role Pills */}
                            <div style={{ display: 'flex', gap: space['2'] }}>
                                {member.roles.map(r => {
                                    const config = ROLE_CONFIG[r];
                                    return (
                                        <span
                                            key={r}
                                            style={{
                                                padding: `${space['1']} ${space['3']}`,
                                                borderRadius: radii.pill,
                                                background: config.bg,
                                                color: config.color,
                                                fontSize: typography.label,
                                                fontWeight: typography.semibold,
                                            }}
                                        >
                                            {config.label}
                                        </span>
                                    );
                                })}
                            </div>
                        </motion.div>
                    ))
                )}
            </motion.div>

            {/* Invite Modal */}
            <InviteUserModal
                isOpen={inviteModalOpen}
                onClose={() => setInviteModalOpen(false)}
                orgId={orgId ?? ''}
                practiceId={practiceId ?? ''}
                onSuccess={handleInviteSuccess}
            />

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
