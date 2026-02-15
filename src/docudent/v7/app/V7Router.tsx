/**
 * V7 Router — Minimal Route Dispatcher
 *
 * ═══════════════════════════════════════════════════════════════
 * NO shell wrapper, NO sidebar, NO dashboard chrome.
 * Pages render directly with V7 hero styling.
 * Uses v7.css design system.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
// v7.design.css moved to main.jsx to prevent FOUC

// ═══════════════════════════════════════════════════════════════
// LAZY PAGES
// ═══════════════════════════════════════════════════════════════

const DocudentV7Page = lazy(() => import('../pages/DocudentV7Page'));
const CasesPageV7 = lazy(() => import('../pages/CasesPageV7'));
const ReviewPageV7 = lazy(() => import('../pages/ReviewPageV7'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const TeamPage = lazy(() => import('../pages/TeamPage'));
const OnboardingPage = lazy(() => import('../pages/OnboardingPage'));
const AcceptInvitePage = lazy(() => import('../pages/AcceptInvitePage'));

// DEV-only lab pages
const EndoLabPage = lazy(() => import('../pages/lab/EndoLabPage'));

// ═══════════════════════════════════════════════════════════════
// LOADING FALLBACK — V7 styled
// ═══════════════════════════════════════════════════════════════

function V7LoadingFallback() {
    return (
        <>
            <div className="v7-bg" />
            <div className="v7-vignette" />
            <div className="v7-grain" />
            <div className="v7-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 3vw, 36px)', color: 'var(--ink-2)' }}
                >
                    Lädt...
                </motion.div>
            </div>
        </>
    );
}

// ═══════════════════════════════════════════════════════════════
// V7 LAYOUT — Wraps all V7 pages with background layers
// ═══════════════════════════════════════════════════════════════

function V7Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <div className="v7-bg" />
            <div className="v7-vignette" />
            <div className="v7-grain" />
            <div className="v7-shell">
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
                >
                    {children}
                </motion.div>
            </div>
        </>
    );
}

// ═══════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════

export function V7Router() {
    return (
        <Suspense fallback={<V7LoadingFallback />}>
            <V7Layout>
                <Routes>
                    {/* Home — Golden Master */}
                    <Route index element={<DocudentV7Page />} />

                    {/* Core Pages */}
                    <Route path="cases" element={<CasesPageV7 />} />
                    <Route path="review" element={<ReviewPageV7 />} />
                    <Route path="billing" element={<ReviewPageV7 />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="team" element={<TeamPage />} />

                    {/* Onboarding */}
                    <Route path="onboarding" element={<OnboardingPage />} />
                    <Route path="accept-invite" element={<AcceptInvitePage />} />

                    {/* DEV Lab — only in development */}
                    {import.meta.env.DEV && (
                        <Route path="lab/endo" element={<EndoLabPage />} />
                    )}

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/docudent/v7" replace />} />
                </Routes>
            </V7Layout>
        </Suspense>
    );
}

export default V7Router;
