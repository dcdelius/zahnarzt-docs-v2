/**
 * AcceptInvitePage — Accept Invite and Join Practice
 *
 * ═══════════════════════════════════════════════════════════════
 * Reads invite params from URL, calls acceptInvite, refreshes claims.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { colors, gradients, space, radii, typography, glass, motion as motionTokens } from '../app/designTokens';
import { acceptInvite } from '../../core/onboarding/onboardingService';
import { useAuth } from '../app/AppShell';
import { JetonToast, useToast } from '../components/JetonToast';

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function AcceptInvitePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAuthenticated, isLoading: authLoading, forceRefreshClaims } = useAuth();
    const { toast, showToast, hideToast } = useToast();

    const [isAccepting, setIsAccepting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Parse invite params
    const orgId = searchParams.get('orgId');
    const practiceId = searchParams.get('practiceId');
    const inviteId = searchParams.get('inviteId');
    const token = searchParams.get('token');

    const hasValidParams = orgId && practiceId && inviteId && token;

    // Handle accept
    const handleAccept = async () => {
        if (!hasValidParams) return;

        setIsAccepting(true);
        setError(null);

        try {
            const result = await acceptInvite({
                orgId,
                practiceId,
                inviteId,
                token,
            });

            if (result.ok) {
                // Refresh claims
                await forceRefreshClaims();
                setSuccess(true);
                showToast('success', `Erfolgreich beigetreten als ${result.role}`);

                // Navigate after delay
                setTimeout(() => {
                    navigate('/dashboard');
                }, 1200);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Fehler beim Beitreten';
            setError(message);
            showToast('error', message);
            setIsAccepting(false);
        }
    };

    // Auto-accept if authenticated and valid params
    useEffect(() => {
        if (isAuthenticated && hasValidParams && !isAccepting && !success && !error) {
            handleAccept();
        }
    }, [isAuthenticated, hasValidParams]);

    // Show loading while checking auth
    if (authLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: gradients.background,
            }}>
                <motion.div
                    style={{ fontSize: '32px' }}
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    🔐
                </motion.div>
            </div>
        );
    }

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
                    textAlign: 'center',
                }}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, ease: motionTokens.ease }}
            >
                {/* Icon */}
                <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: radii.lg,
                    background: success ? colors.successLight : error ? colors.errorLight : gradients.cyanLilac,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    marginBottom: space['4'],
                }}>
                    {success ? '✓' : error ? '✕' : '📬'}
                </div>

                {/* Title */}
                <h1 style={{
                    fontSize: typography.h1,
                    fontWeight: typography.bold,
                    color: colors.textPrimary,
                    marginBottom: space['2'],
                }}>
                    {success ? 'Willkommen!' : error ? 'Fehler' : 'Einladung'}
                </h1>

                {/* Subtitle */}
                <p style={{
                    fontSize: typography.body,
                    color: colors.textSecondary,
                    marginBottom: space['5'],
                }}>
                    {success
                        ? 'Du wurdest erfolgreich zur Praxis hinzugefügt.'
                        : error
                            ? error
                            : !hasValidParams
                                ? 'Ungültiger Einladungslink.'
                                : !isAuthenticated
                                    ? 'Bitte melde dich an, um die Einladung anzunehmen.'
                                    : 'Einladung wird verarbeitet …'}
                </p>

                {/* Action */}
                {!isAuthenticated && hasValidParams && (
                    <motion.button
                        onClick={() => {
                            // Store invite URL and redirect to login
                            sessionStorage.setItem('pendingInvite', window.location.href);
                            navigate('/login');
                        }}
                        style={{
                            padding: `${space['3']} ${space['6']}`,
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
                        Anmelden
                    </motion.button>
                )}

                {error && (
                    <motion.button
                        onClick={() => navigate('/')}
                        style={{
                            marginTop: space['4'],
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
                        Zurück zur Startseite
                    </motion.button>
                )}

                {isAccepting && !success && (
                    <motion.div
                        style={{
                            marginTop: space['4'],
                            fontSize: typography.small,
                            color: colors.textMuted,
                        }}
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        Verarbeite Einladung …
                    </motion.div>
                )}
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

export default AcceptInvitePage;
