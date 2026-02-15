/**
 * useSettingsService — V7 Hook for Settings Operations
 *
 * ═══════════════════════════════════════════════════════════════
 * Wraps core/settings/settingsOverridesService for V7 consumption.
 * No Firestore imports here — all handled by core service.
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react';
import { sanitizeOverrides } from '../../contracts/settingsValidator';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface SettingsServiceState {
    isSaving: boolean;
    error: string | null;
    lastSuccessAt: number | null;
}

export interface UseSettingsServiceResult {
    state: SettingsServiceState;
    savePracticeOverrides: (
        orgId: string,
        practiceId: string,
        overrides: Record<string, unknown>,
        updatedBy: string
    ) => Promise<boolean>;
    clearError: () => void;
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

/**
 * Hook for saving settings.
 * 
 * In dev mode, simulates save with local storage.
 * In prod, will call settingsOverridesService via a service bridge.
 */
export function useSettingsService(): UseSettingsServiceResult {
    const [state, setState] = useState<SettingsServiceState>({
        isSaving: false,
        error: null,
        lastSuccessAt: null,
    });

    const savePracticeOverrides = useCallback(
        async (
            orgId: string,
            practiceId: string,
            overrides: Record<string, unknown>,
            updatedBy: string
        ): Promise<boolean> => {
            setState(prev => ({ ...prev, isSaving: true, error: null }));

            try {
                // 1. Sanitize overrides (removes invalid entries)
                const { sanitized, issues } = sanitizeOverrides(overrides);

                if (issues.length > 0) {
                    const firstIssue = issues[0];
                    setState(prev => ({
                        ...prev,
                        isSaving: false,
                        error: `Ungültiger Wert: ${firstIssue.message}`,
                    }));
                    return false;
                }

                if (Object.keys(sanitized).length === 0) {
                    setState(prev => ({
                        ...prev,
                        isSaving: false,
                        error: 'Keine gültigen Einstellungen zum Speichern.',
                    }));
                    return false;
                }

                // 2. DEV MODE: Store in localStorage (no Firestore import in v7)
                // TODO: In production, this should call a service bridge
                // that handles Firestore operations from core/
                const key = `settings_override_${orgId}_${practiceId}`;
                localStorage.setItem(key, JSON.stringify({
                    scope: 'practice',
                    scopeId: practiceId,
                    overrides: sanitized,
                    updatedBy,
                    updatedAt: new Date().toISOString(),
                }));

                // Simulate network delay for realistic UX
                await new Promise(r => setTimeout(r, 400));

                setState({
                    isSaving: false,
                    error: null,
                    lastSuccessAt: Date.now(),
                });

                return true;
            } catch (err) {
                let errorMessage = 'Speichern fehlgeschlagen.';

                if (err instanceof Error) {
                    errorMessage = err.message;
                }

                setState(prev => ({
                    ...prev,
                    isSaving: false,
                    error: errorMessage,
                }));

                return false;
            }
        },
        []
    );

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    return {
        state,
        savePracticeOverrides,
        clearError,
    };
}

export default useSettingsService;
