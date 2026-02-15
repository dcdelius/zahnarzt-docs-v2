/**
 * V8 Router — "Jeton V8" Interface
 * Inherits V7 Logic, Applies Premium "Jeton" Design.
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
// Using existing V7 styles + Jeton extensions
import '../../v7/app/v7.design.css';

// ═══════════════════════════════════════════════════════════════
// LAZY PAGES (V8 Versions)
// ═══════════════════════════════════════════════════════════════

const DocudentV8Page = lazy(() => import('../pages/DocudentV8Page'));
// Re-using V7 generic pages for now, or placeholders until V8 versions exist
const CasesPageV7 = lazy(() => import('../../v7/pages/CasesPageV7'));
const SettingsPage = lazy(() => import('../../v7/pages/SettingsPage'));
const TeamPage = lazy(() => import('../../v7/pages/TeamPage'));

// ═══════════════════════════════════════════════════════════════
// LOADING FALLBACK — Jeton Style
// ═══════════════════════════════════════════════════════════════

function V8LoadingFallback() {
    return (
        <div className="v7" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="v7-bg" />
            <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="v7-jeton-h1"
                style={{ fontSize: '24px' }}
            >
                V8 Loading...
            </motion.div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════

export function V8Router() {
    return (
        <Suspense fallback={<V8LoadingFallback />}>
            <Routes>
                {/* Main V8 Input Interface */}
                <Route index element={<DocudentV8Page />} />

                {/* Secondary Pages (Temporarily V7 or Placeholders) */}
                <Route path="cases" element={<CasesPageV7 />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="team" element={<TeamPage />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/docudent/v8" replace />} />
            </Routes>
        </Suspense>
    );
}

export default V8Router;
