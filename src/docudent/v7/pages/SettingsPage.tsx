/**
 * Settings Page MVP — Practice Scope Only
 *
 * ═══════════════════════════════════════════════════════════════
 * Curated settings editor with real Firestore writes.
 * Scope: Practice only (no selector).
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import { motion } from 'framer-motion';
import { colors, gradients, space, radii, typography, glass, motion as motionTokens } from '../app/designTokens';
import { useAuth } from '../app/AppShell';
import { useSettingsService } from '../hooks/useSettingsService';
import { SettingsForm } from '../components/SettingsForm';
import { JetonToast, useToast } from '../components/JetonToast';

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function SettingsPage() {
    const { user, orgId, practiceId } = useAuth();
    const { savePracticeOverrides, state } = useSettingsService();
    const { toast, showToast, hideToast } = useToast();

    const realOrgId = orgId ?? 'demo-org';
    const realPracticeId = practiceId ?? 'demo-practice';
    const userId = user?.uid ?? 'dev-user';

    const handleSave = async (overrides: Record<string, unknown>) => {
        const success = await savePracticeOverrides(realOrgId, realPracticeId, overrides, userId);

        if (success) {
            showToast('success', 'Einstellungen gespeichert', 'Änderungen wurden übernommen.');
        } else if (state.error) {
            showToast('error', 'Fehler', state.error);
        }
    };

    return (
        <div style={{ maxWidth: '700px' }}>
            {/* Header */}
            <motion.div
                style={{ marginBottom: space['8'] }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, ease: motionTokens.ease }}
            >
                <h1 style={{
                    fontSize: typography.h1,
                    fontWeight: typography.bold,
                    color: colors.textPrimary,
                    letterSpacing: typography.tightTracking,
                    marginBottom: space['2'],
                }}>
                    Einstellungen
                </h1>
                <p style={{
                    fontSize: typography.body,
                    color: colors.textSecondary,
                }}>
                    Behandlungsstandards konfigurieren
                </p>
            </motion.div>

            {/* Scope label (read-only) */}
            <motion.div
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: space['2'],
                    padding: `${space['2']} ${space['4']}`,
                    background: colors.accentLight,
                    borderRadius: radii.pill,
                    marginBottom: space['6'],
                }}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: motionTokens.fast, delay: 0.1 }}
            >
                <span style={{
                    fontSize: typography.label,
                    fontWeight: typography.medium,
                    color: colors.textMuted,
                }}>
                    Scope:
                </span>
                <span style={{
                    fontSize: typography.label,
                    fontWeight: typography.semibold,
                    color: colors.accent,
                }}>
                    Praxis
                </span>
            </motion.div>

            {/* Form */}
            <motion.div
                style={{
                    ...glass.panel,
                    borderRadius: radii.xl,
                    padding: space['6'],
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionTokens.normal, delay: 0.15, ease: motionTokens.ease }}
            >
                <SettingsForm onSave={handleSave} isSaving={state.isSaving} />
            </motion.div>

            {/* Toast */}
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

export default SettingsPage;
