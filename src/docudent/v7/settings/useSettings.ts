/**
 * useSettings — Reactive Settings Hook
 * 
 * Provides reactive access to settingsStore with automatic re-render
 * when settings change (via custom event).
 * 
 * Usage:
 *   const { fuellungDefaults, setFuellungDefaults } = useSettings();
 */

import { useState, useEffect, useCallback } from 'react';
import {
    getFuellungDefaults,
    setFuellungDefaults as persistFuellungDefaults,
    type FuellungDefaults,
} from './settingsStore';

// Custom event name for settings changes
const SETTINGS_CHANGED_EVENT = 'docudent:settings-changed';

/**
 * Dispatch settings changed event to trigger re-renders
 */
function dispatchSettingsChanged() {
    window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT));
}

/**
 * Hook for reactive access to Füllung settings
 */
export function useSettings() {
    // Local state mirrors settingsStore
    const [fuellungDefaults, setLocalDefaults] = useState<FuellungDefaults>(
        getFuellungDefaults()
    );

    // Listen for settings changes and update local state
    useEffect(() => {
        const handleSettingsChanged = () => {
            setLocalDefaults(getFuellungDefaults());
        };

        window.addEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChanged);
        return () => {
            window.removeEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChanged);
        };
    }, []);

    // Setter that persists AND dispatches event
    const setFuellungDefaults = useCallback(
        (updates: Partial<FuellungDefaults>) => {
            persistFuellungDefaults(updates);
            // Update local state immediately
            setLocalDefaults(getFuellungDefaults());
            // Dispatch event for other components
            dispatchSettingsChanged();
        },
        []
    );

    return {
        fuellungDefaults,
        setFuellungDefaults,
    };
}

export default useSettings;
