/**
 * Dictation Page — Wraps Legacy DocudentV7Page
 *
 * ═══════════════════════════════════════════════════════════════
 * Legacy exemption: DocudentV7Page predates Jeton design tokens.
 * DO NOT REFACTOR DocudentV7Page here — integration only.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { colors, gradients, space, radii, typography, motion as motionTokens } from '../app/designTokens';

// Lazy-load legacy component
const DocudentV7Page = lazy(() => import('./DocudentV7Page'));

// ═══════════════════════════════════════════════════════════════
// JETON LOADER
// ═══════════════════════════════════════════════════════════════

function JetonLoader() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            color: colors.textMuted,
        }}>
            <motion.div
                style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: radii.lg,
                    background: gradients.cyanLilac,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    marginBottom: space['4'],
                }}
                animate={{ scale: [1, 1.05, 1], opacity: [1, 0.8, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
                🎤
            </motion.div>
            <motion.div
                style={{
                    fontSize: typography.body,
                    fontWeight: typography.medium,
                    color: colors.textSecondary,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                Diktat wird geladen...
            </motion.div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function DictationPage() {
    return (
        <div style={{
            minHeight: '100%',
            margin: `-${space['8']}`,  // Negate shell padding for full-bleed
        }}>
            {/*
             * Legacy exemption: DocudentV7Page predates Jeton design tokens.
             * DO NOT REFACTOR its internals here — wrap only.
             * Gate exclusion exists for this file.
             */}
            <Suspense fallback={<JetonLoader />}>
                <DocudentV7Page />
            </Suspense>
        </div>
    );
}

export default DictationPage;
