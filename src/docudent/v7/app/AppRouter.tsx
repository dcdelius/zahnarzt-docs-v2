/**
 * V7 App Router V2 — With Route Transitions
 *
 * ═══════════════════════════════════════════════════════════════
 * Uses Framer Motion AnimatePresence for smooth page transitions.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ROUTES, PUBLIC_ROUTES, getDefaultRoute } from './routes';
import { useAuth } from './AppShell';
import { colors, typography, motion as motionTokens } from './designTokens';

// ═══════════════════════════════════════════════════════════════
// LOADING FALLBACK
// ═══════════════════════════════════════════════════════════════

function PageLoader() {
    return (
        <motion.div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: colors.textMuted,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div style={{ textAlign: 'center' }}>
                <motion.div
                    style={{ fontSize: '32px', marginBottom: '12px' }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                    ⏳
                </motion.div>
                <div style={{
                    fontSize: typography.small,
                    fontWeight: typography.medium,
                }}>
                    Laden...
                </div>
            </div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════
// PAGE WRAPPER (for transitions)
// ═══════════════════════════════════════════════════════════════

function PageWrapper({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: motionTokens.fast, ease: motionTokens.easeOut }}
            style={{ height: '100%' }}
        >
            {children}
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════

export function AppRouter() {
    const { role } = useAuth();
    const location = useLocation();
    const defaultRoute = getDefaultRoute(role);

    return (
        <Suspense fallback={<PageLoader />}>
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    {/* Root redirect */}
                    <Route path="/" element={<Navigate to={defaultRoute} replace />} />

                    {/* Public routes (onboarding, accept-invite) */}
                    {PUBLIC_ROUTES.map((route) => (
                        <Route
                            key={route.path}
                            path={route.path}
                            element={
                                <PageWrapper>
                                    <route.component />
                                </PageWrapper>
                            }
                        />
                    ))}

                    {/* All routes from config */}
                    {ROUTES.map((route) => (
                        <Route
                            key={route.path}
                            path={route.path}
                            element={
                                <PageWrapper>
                                    <route.component />
                                </PageWrapper>
                            }
                        />
                    ))}

                    {/* Catch-all redirect */}
                    <Route path="*" element={<Navigate to={defaultRoute} replace />} />
                </Routes>
            </AnimatePresence>
        </Suspense>
    );
}

export default AppRouter;

