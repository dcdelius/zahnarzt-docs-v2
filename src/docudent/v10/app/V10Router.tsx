/**
 * V10 Router — Routes for /docudent/v10
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
// Using existing V7 styles + Jeton extensions
import '../../v7/app/v7.design.css';

// ═══════════════════════════════════════════════════════════════
// LAZY PAGES
// ═══════════════════════════════════════════════════════════════

const DocudentV10Page = lazy(() => import('../pages/DocudentV10Page'));
const SettingsPageV10 = lazy(() => import('../pages/SettingsPageV10'));

// ═══════════════════════════════════════════════════════════════
// LOADING FALLBACK
// ═══════════════════════════════════════════════════════════════

function V10LoadingFallback() {
    return (
        <div className="v7" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="v7-bg" />
            <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="v7-jeton-h1"
                style={{ fontSize: '24px' }}
            >
                Loading...
            </motion.div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════

export function V10Router() {
    return (
        <Suspense fallback={<V10LoadingFallback />}>
            <Routes>
                <Route index element={<DocudentV10Page />} />
                <Route path="settings" element={<SettingsPageV10 />} />
                <Route path="*" element={<Navigate to="/docudent/v10" replace />} />
            </Routes>
        </Suspense>
    );
}

export default V10Router;
