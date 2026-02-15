/**
 * V7 App Shell V2 — JETON_UI_DIREKTIV_V1
 *
 * ═══════════════════════════════════════════════════════════════
 * Premium, friendly, bold — like design software.
 * Glass effects, subtle background, buttery motion.
 * 
 * Auth: Uses real Firebase auth by default.
 * Set USE_MOCK_AUTH=true for dev mode.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MockAuthProvider, useAuth as useMockAuth, RoleSwitcher } from './AuthContext.mock';
import { AuthProvider as RealAuthProvider, useAuth as useRealAuth } from '../../core/auth/AuthContext';
import { Navigation } from './Navigation';
import { AppRouter } from './AppRouter';
import { CommandPaletteStub, CommandPaletteHint } from './CommandPaletteStub';
import { colors, gradients, space, radii, typography, glass, shadows, motion as motionTokens } from './designTokens';

// DEV mode: use mock auth if env var is set
const USE_MOCK_AUTH = import.meta.env?.VITE_USE_MOCK_AUTH === 'true' || true; // Default to mock for now

// Export appropriate hook based on mode
export const useAuth = USE_MOCK_AUTH ? useMockAuth : useRealAuth;

// ═══════════════════════════════════════════════════════════════
// INNER LAYOUT
// ═══════════════════════════════════════════════════════════════

function AppShellInner() {
    const { user, role, practiceId } = useAuth();
    const initials = user?.displayName?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? '?';
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

    // ⌘K keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setCommandPaletteOpen(true);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            background: gradients.background,
            fontFamily: typography.fontFamily,
            overflow: 'hidden',
        }}>
            {/* Sidebar */}
            <motion.aside
                style={{
                    width: '260px',
                    ...glass.sidebar,
                    WebkitBackdropFilter: glass.sidebar.backdropFilter,
                    display: 'flex',
                    flexDirection: 'column',
                }}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: motionTokens.normal, ease: motionTokens.ease }}
            >
                {/* Logo */}
                <div style={{
                    padding: `${space['6']} ${space['4']}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: space['3'],
                    borderBottom: `1px solid ${colors.hairlineSubtle}`,
                }}>
                    <motion.div
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: radii.lg,
                            background: gradients.primary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            boxShadow: shadows.glow,
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        🦷
                    </motion.div>
                    <span style={{
                        fontSize: typography.h2,
                        fontWeight: typography.bold,
                        color: colors.textPrimary,
                        letterSpacing: typography.tightTracking,
                    }}>
                        Docudent
                    </span>
                </div>

                {/* Navigation */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: `${space['4']} 0`,
                }}>
                    <Navigation />
                </div>

                {/* Footer */}
                <div style={{
                    padding: `${space['3']} ${space['4']}`,
                    borderTop: `1px solid ${colors.hairlineSubtle}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: space['2'],
                }}>
                    <span style={{
                        background: colors.accentLight,
                        color: colors.accent,
                        padding: `2px ${space['2']}`,
                        borderRadius: radii.pill,
                        fontSize: '10px',
                        fontWeight: typography.bold,
                    }}>
                        v7
                    </span>
                    <span style={{
                        fontSize: typography.label,
                        color: colors.textMuted,
                    }}>
                        {role}
                    </span>
                </div>
            </motion.aside>

            {/* Main Area */}
            <main style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <motion.header
                    style={{
                        height: '64px',
                        ...glass.header,
                        WebkitBackdropFilter: glass.header.backdropFilter,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: `0 ${space['8']}`,
                    }}
                    initial={{ y: -12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: motionTokens.normal, delay: 0.08, ease: motionTokens.ease }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: space['4'] }}>
                        <span style={{
                            background: colors.hairlineSubtle,
                            padding: `${space['1']} ${space['4']}`,
                            borderRadius: radii.pill,
                            fontSize: typography.small,
                            fontWeight: typography.medium,
                            color: colors.textSecondary,
                        }}>
                            {practiceId ?? 'Keine Praxis'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: space['4'] }}>
                        <CommandPaletteHint onClick={() => setCommandPaletteOpen(true)} />
                        <span style={{
                            background: gradients.peachRose,
                            color: colors.textPrimary,
                            fontSize: '10px',
                            fontWeight: typography.bold,
                            padding: `3px ${space['2']}`,
                            borderRadius: radii.pill,
                            textTransform: 'uppercase',
                            letterSpacing: typography.wideTracking,
                        }}>
                            DEV
                        </span>
                        <RoleSwitcher />
                        <div style={{ display: 'flex', alignItems: 'center', gap: space['2'] }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: radii.pill,
                                background: gradients.cyanLilac,
                                color: colors.textPrimary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: typography.label,
                                fontWeight: typography.semibold,
                            }}>
                                {initials}
                            </div>
                            <span style={{
                                fontSize: typography.small,
                                fontWeight: typography.medium,
                                color: colors.textPrimary,
                            }}>
                                {user?.displayName ?? 'Gast'}
                            </span>
                        </div>
                    </div>
                </motion.header>

                {/* Content */}
                <motion.div
                    style={{
                        flex: 1,
                        overflow: 'auto',
                        padding: space['8'],
                    }}
                    initial={motionTokens.pageEnter}
                    animate={motionTokens.pageAnimate}
                    transition={{ duration: motionTokens.normal, delay: 0.12, ease: motionTokens.ease }}
                >
                    <AppRouter />
                </motion.div>
            </main>

            {/* Command Palette Modal */}
            <CommandPaletteStub
                isOpen={commandPaletteOpen}
                onClose={() => setCommandPaletteOpen(false)}
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// EXPORTED SHELL
// ═══════════════════════════════════════════════════════════════

export function AppShell() {
    return (
        <BrowserRouter>
            <MockAuthProvider>
                <AppShellInner />
            </MockAuthProvider>
        </BrowserRouter>
    );
}

export default AppShell;
