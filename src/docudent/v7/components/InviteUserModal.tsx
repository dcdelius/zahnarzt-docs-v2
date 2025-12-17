/**
 * Invite User Modal — Create practice invites
 *
 * ═══════════════════════════════════════════════════════════════
 * Premium modal for creating and copying invite links.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, gradients, space, radii, typography, glass, shadows, motion as motionTokens } from '../app/designTokens';
import { createInvite } from '../../core/onboarding/onboardingService';
import type { PracticeRole } from '../../core/auth/authTypes';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface InviteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    orgId: string;
    practiceId: string;
    onSuccess?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// ROLE OPTIONS
// ═══════════════════════════════════════════════════════════════

const ROLE_OPTIONS: { value: PracticeRole; label: string; description: string }[] = [
    { value: 'provider', label: 'Behandler', description: 'Kann dokumentieren und Fälle bearbeiten' },
    { value: 'assistant', label: 'Assistenz', description: 'Kann Dokumentation unterstützen' },
    { value: 'practice_admin', label: 'Praxis-Admin', description: 'Voller Zugriff, kann Team verwalten' },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function InviteUserModal({ isOpen, onClose, orgId, practiceId, onSuccess }: InviteUserModalProps) {
    const [selectedRole, setSelectedRole] = useState<PracticeRole>('provider');
    const [email, setEmail] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        setIsCreating(true);
        setError(null);

        try {
            const result = await createInvite({
                orgId,
                practiceId,
                role: selectedRole,
                email: email.trim() || undefined,
            });

            setInviteLink(result.link);
            onSuccess?.();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Fehler beim Erstellen';
            setError(message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopy = async () => {
        if (!inviteLink) return;
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        // Reset state
        setSelectedRole('provider');
        setEmail('');
        setInviteLink(null);
        setCopied(false);
        setError(null);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        onClick={handleClose}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.4)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 9998,
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: motionTokens.fast }}
                    />

                    {/* Modal */}
                    <motion.div
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            ...glass.panel,
                            borderRadius: radii.xl,
                            padding: space['6'],
                            width: '100%',
                            maxWidth: '420px',
                            boxShadow: shadows.medium,
                            zIndex: 9999,
                        }}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: motionTokens.normal, ease: motionTokens.ease }}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: space['5'],
                        }}>
                            <h2 style={{
                                fontSize: typography.h2,
                                fontWeight: typography.bold,
                                color: colors.textPrimary,
                            }}>
                                Teammitglied einladen
                            </h2>
                            <motion.button
                                onClick={handleClose}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: radii.md,
                                    border: 'none',
                                    background: colors.hairlineSubtle,
                                    color: colors.textMuted,
                                    fontSize: '18px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                whileHover={{ background: colors.hairline }}
                            >
                                ×
                            </motion.button>
                        </div>

                        {!inviteLink ? (
                            <>
                                {/* Role Selection */}
                                <div style={{ marginBottom: space['5'] }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: typography.label,
                                        fontWeight: typography.semibold,
                                        color: colors.textPrimary,
                                        marginBottom: space['3'],
                                    }}>
                                        Rolle
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: space['2'] }}>
                                        {ROLE_OPTIONS.map((option) => (
                                            <motion.button
                                                key={option.value}
                                                onClick={() => setSelectedRole(option.value)}
                                                style={{
                                                    padding: `${space['3']} ${space['4']}`,
                                                    borderRadius: radii.lg,
                                                    border: `1.5px solid ${selectedRole === option.value ? colors.accent : colors.hairline}`,
                                                    background: selectedRole === option.value ? colors.accentLight : 'transparent',
                                                    textAlign: 'left',
                                                    cursor: 'pointer',
                                                }}
                                                whileHover={{ borderColor: colors.accent }}
                                                transition={{ duration: motionTokens.fast }}
                                            >
                                                <div style={{
                                                    fontSize: typography.body,
                                                    fontWeight: typography.semibold,
                                                    color: selectedRole === option.value ? colors.accent : colors.textPrimary,
                                                    marginBottom: space['1'],
                                                }}>
                                                    {option.label}
                                                </div>
                                                <div style={{
                                                    fontSize: typography.small,
                                                    color: colors.textSecondary,
                                                }}>
                                                    {option.description}
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                {/* Optional Email */}
                                <div style={{ marginBottom: space['5'] }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: typography.label,
                                        fontWeight: typography.semibold,
                                        color: colors.textPrimary,
                                        marginBottom: space['2'],
                                    }}>
                                        E-Mail (optional)
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@praxis.de"
                                        style={{
                                            width: '100%',
                                            padding: `${space['3']} ${space['4']}`,
                                            borderRadius: radii.md,
                                            border: `1px solid ${colors.hairline}`,
                                            background: colors.surface,
                                            color: colors.textPrimary,
                                            fontSize: typography.body,
                                        }}
                                    />
                                    <p style={{
                                        fontSize: typography.label,
                                        color: colors.textMuted,
                                        marginTop: space['1'],
                                    }}>
                                        Wenn angegeben, kann nur diese E-Mail die Einladung nutzen.
                                    </p>
                                </div>

                                {/* Error */}
                                {error && (
                                    <div style={{
                                        padding: `${space['3']} ${space['4']}`,
                                        borderRadius: radii.md,
                                        background: colors.errorLight,
                                        color: colors.error,
                                        fontSize: typography.small,
                                        marginBottom: space['4'],
                                    }}>
                                        {error}
                                    </div>
                                )}

                                {/* Submit */}
                                <motion.button
                                    onClick={handleCreate}
                                    disabled={isCreating}
                                    style={{
                                        width: '100%',
                                        padding: `${space['4']} ${space['6']}`,
                                        borderRadius: radii.pill,
                                        border: 'none',
                                        background: gradients.primary,
                                        color: colors.textOnAccent,
                                        fontSize: typography.body,
                                        fontWeight: typography.semibold,
                                        cursor: isCreating ? 'not-allowed' : 'pointer',
                                        opacity: isCreating ? 0.7 : 1,
                                    }}
                                    whileHover={!isCreating ? { scale: 1.02 } : {}}
                                    whileTap={!isCreating ? { scale: 0.98 } : {}}
                                >
                                    {isCreating ? 'Erstelle Einladung …' : 'Einladung erstellen'}
                                </motion.button>
                            </>
                        ) : (
                            <>
                                {/* Success State */}
                                <div style={{
                                    textAlign: 'center',
                                    marginBottom: space['5'],
                                }}>
                                    <div style={{
                                        width: '56px',
                                        height: '56px',
                                        borderRadius: radii.lg,
                                        background: colors.successLight,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '28px',
                                        marginBottom: space['4'],
                                    }}>
                                        ✓
                                    </div>
                                    <h3 style={{
                                        fontSize: typography.h2,
                                        fontWeight: typography.semibold,
                                        color: colors.textPrimary,
                                        marginBottom: space['2'],
                                    }}>
                                        Einladung erstellt
                                    </h3>
                                    <p style={{
                                        fontSize: typography.body,
                                        color: colors.textSecondary,
                                    }}>
                                        Teile diesen Link mit dem neuen Teammitglied.
                                    </p>
                                </div>

                                {/* Link Box */}
                                <div style={{
                                    padding: `${space['3']} ${space['4']}`,
                                    borderRadius: radii.md,
                                    background: colors.surface,
                                    border: `1px solid ${colors.hairline}`,
                                    marginBottom: space['4'],
                                    wordBreak: 'break-all',
                                    fontSize: typography.small,
                                    color: colors.textSecondary,
                                    fontFamily: 'monospace',
                                }}>
                                    {inviteLink}
                                </div>

                                {/* Copy Button */}
                                <motion.button
                                    onClick={handleCopy}
                                    style={{
                                        width: '100%',
                                        padding: `${space['4']} ${space['6']}`,
                                        borderRadius: radii.pill,
                                        border: 'none',
                                        background: copied ? colors.success : gradients.primary,
                                        color: colors.textOnAccent,
                                        fontSize: typography.body,
                                        fontWeight: typography.semibold,
                                        cursor: 'pointer',
                                    }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {copied ? '✓ Kopiert' : 'Link kopieren'}
                                </motion.button>

                                {/* Done Button */}
                                <motion.button
                                    onClick={handleClose}
                                    style={{
                                        width: '100%',
                                        marginTop: space['3'],
                                        padding: `${space['3']} ${space['6']}`,
                                        borderRadius: radii.pill,
                                        border: `1px solid ${colors.hairline}`,
                                        background: 'transparent',
                                        color: colors.textSecondary,
                                        fontSize: typography.body,
                                        fontWeight: typography.medium,
                                        cursor: 'pointer',
                                    }}
                                    whileHover={{ background: colors.hairlineSubtle }}
                                >
                                    Fertig
                                </motion.button>
                            </>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default InviteUserModal;
