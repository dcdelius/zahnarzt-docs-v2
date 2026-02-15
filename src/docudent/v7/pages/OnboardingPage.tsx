/**
 * OnboardingPage — Create Practice for New Users
 *
 * ═══════════════════════════════════════════════════════════════
 * Shown when user has no practices. Creates org + practice.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { colors, gradients, space, radii, typography, glass, motion as motionTokens } from '../app/designTokens';
import { createPracticeSelfServe } from '../../core/onboarding/onboardingService';
import { useAuth } from '../app/AppShell';
import { JetonToast, useToast } from '../components/JetonToast';

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function OnboardingPage() {
    const navigate = useNavigate();
    const { user, forceRefreshClaims } = useAuth();
    const { toast, showToast, hideToast } = useToast();

    const [practiceName, setPracticeName] = useState('');
    const [orgName, setOrgName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!practiceName.trim()) {
            showToast('error', 'Praxisname erforderlich');
            return;
        }

        setIsCreating(true);

        try {
            await createPracticeSelfServe({
                practiceName: practiceName.trim(),
                orgName: orgName.trim() || undefined,
            });

            // Refresh claims to pick up new practice
            await forceRefreshClaims();

            showToast('success', 'Praxis erstellt');

            // Navigate to dashboard after short delay
            setTimeout(() => {
                navigate('/dashboard');
            }, 800);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Fehler beim Erstellen';
            showToast('error', message);
            setIsCreating(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: gradients.background,
            padding: space['6'],
        }}>
            <motion.div
                style={{
                    width: '100%',
                    maxWidth: '400px',
                    ...glass.panel,
                    borderRadius: radii.xl,
                    padding: space['8'],
                }}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, ease: motionTokens.ease }}
            >
                {/* Logo */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: space['6'],
                }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: radii.lg,
                        background: gradients.primary,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        marginBottom: space['4'],
                    }}>
                        🦷
                    </div>
                    <h1 style={{
                        fontSize: typography.h1,
                        fontWeight: typography.bold,
                        color: colors.textPrimary,
                        marginBottom: space['2'],
                    }}>
                        Willkommen
                    </h1>
                    <p style={{
                        fontSize: typography.body,
                        color: colors.textSecondary,
                    }}>
                        {user?.displayName ? `Hallo ${user.displayName.split(' ')[0]}!` : 'Hallo!'} Erstelle deine Praxis.
                    </p>
                </div>

                {/* Form */}
                <div style={{ marginBottom: space['5'] }}>
                    <label style={{
                        display: 'block',
                        fontSize: typography.label,
                        fontWeight: typography.semibold,
                        color: colors.textPrimary,
                        marginBottom: space['2'],
                    }}>
                        Praxisname *
                    </label>
                    <input
                        type="text"
                        value={practiceName}
                        onChange={(e) => setPracticeName(e.target.value)}
                        placeholder="z.B. Zahnarztpraxis Müller"
                        disabled={isCreating}
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
                </div>

                <div style={{ marginBottom: space['6'] }}>
                    <label style={{
                        display: 'block',
                        fontSize: typography.label,
                        fontWeight: typography.semibold,
                        color: colors.textPrimary,
                        marginBottom: space['2'],
                    }}>
                        Organisation (optional)
                    </label>
                    <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="z.B. Praxisgruppe Nord"
                        disabled={isCreating}
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
                        Falls leer, wird der Praxisname verwendet.
                    </p>
                </div>

                {/* Submit */}
                <motion.button
                    onClick={handleCreate}
                    disabled={isCreating || !practiceName.trim()}
                    style={{
                        width: '100%',
                        padding: `${space['4']} ${space['6']}`,
                        borderRadius: radii.pill,
                        border: 'none',
                        background: practiceName.trim() ? gradients.primary : colors.hairline,
                        color: practiceName.trim() ? colors.textOnAccent : colors.textMuted,
                        fontSize: typography.body,
                        fontWeight: typography.semibold,
                        cursor: isCreating || !practiceName.trim() ? 'not-allowed' : 'pointer',
                        opacity: isCreating ? 0.7 : 1,
                    }}
                    whileHover={practiceName.trim() && !isCreating ? { scale: 1.02 } : {}}
                    whileTap={practiceName.trim() && !isCreating ? { scale: 0.98 } : {}}
                >
                    {isCreating ? 'Erstelle Praxis …' : 'Praxis erstellen'}
                </motion.button>
            </motion.div>

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

export default OnboardingPage;
