/**
 * M38: Chip Overrides Hook
 * 
 * Per-instance chip overrides (Auto/On/Off) with localStorage persistence.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ChipMode = 'auto' | 'on' | 'off';

export interface ChipOverride {
    mode: ChipMode;
    value?: unknown;
}

export type ChipOverridesMap = Record<string, ChipOverride>;
export type OverridesByInstance = Record<string, ChipOverridesMap>;

export interface EffectiveChip {
    id: string;
    enabled: boolean;
    value?: unknown;
    source: 'dictation' | 'settings' | 'override' | 'default';
    overridden?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════

const OVERRIDES_STORAGE_KEY = 'docudent_v10_chip_overrides';

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export interface UseChipOverridesResult {
    overridesByInstance: OverridesByInstance;
    setOverride: (instanceId: string, chipId: string, override: ChipOverride) => void;
    getOverride: (instanceId: string, chipId: string) => ChipOverride | undefined;
    resetOverride: (instanceId: string, chipId: string) => void;
    resetAllOverrides: () => void;
    hasOverrides: boolean;
}

export function useChipOverrides(): UseChipOverridesResult {
    const [overridesByInstance, setOverridesByInstance] = useState<OverridesByInstance>({});

    // Load from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(OVERRIDES_STORAGE_KEY);
            if (stored) {
                setOverridesByInstance(JSON.parse(stored));
            }
        } catch (e) {
            console.warn('[useChipOverrides] Failed to load:', e);
        }
    }, []);

    // Save to localStorage
    const persist = useCallback((data: OverridesByInstance) => {
        try {
            localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('[useChipOverrides] Failed to save:', e);
        }
    }, []);

    const setOverride = useCallback((instanceId: string, chipId: string, override: ChipOverride) => {
        setOverridesByInstance(prev => {
            const next = {
                ...prev,
                [instanceId]: {
                    ...(prev[instanceId] || {}),
                    [chipId]: override,
                },
            };
            persist(next);
            return next;
        });
    }, [persist]);

    const getOverride = useCallback((instanceId: string, chipId: string): ChipOverride | undefined => {
        return overridesByInstance[instanceId]?.[chipId];
    }, [overridesByInstance]);

    const resetOverride = useCallback((instanceId: string, chipId: string) => {
        setOverridesByInstance(prev => {
            const instanceOverrides = { ...(prev[instanceId] || {}) };
            delete instanceOverrides[chipId];
            const next = { ...prev, [instanceId]: instanceOverrides };
            persist(next);
            return next;
        });
    }, [persist]);

    const resetAllOverrides = useCallback(() => {
        setOverridesByInstance({});
        try {
            localStorage.removeItem(OVERRIDES_STORAGE_KEY);
        } catch (e) {
            console.warn('[useChipOverrides] Failed to clear:', e);
        }
    }, []);

    const hasOverrides = useMemo(() => {
        return Object.values(overridesByInstance).some(
            inst => Object.keys(inst).length > 0
        );
    }, [overridesByInstance]);

    return {
        overridesByInstance,
        setOverride,
        getOverride,
        resetOverride,
        resetAllOverrides,
        hasOverrides,
    };
}

// ═══════════════════════════════════════════════════════════════
// RESOLVE EFFECTIVE CHIPS
// ═══════════════════════════════════════════════════════════════

export interface ResolveChipsInput {
    dictationChips: Array<{ id: string; enabled: boolean; value?: unknown }>;
    settingsChips: Array<{ id: string; enabled: boolean; value?: unknown }>;
    overrides: ChipOverridesMap;
}

/**
 * Resolve effective chips with precedence:
 * dictation > override > settings > default
 *
 * Rationale: Dictation is the primary source of truth. Overrides may refine
 * when dictation is absent, but should not overwrite explicit dictation.
 */
export function resolveEffectiveChips(input: ResolveChipsInput): EffectiveChip[] {
    const { dictationChips, settingsChips, overrides } = input;
    const result: EffectiveChip[] = [];
    const seen = new Set<string>();

    // Build lookup maps
    const dictLookup = new Map(dictationChips.map(c => [c.id, c]));
    const settingsLookup = new Map(settingsChips.map(c => [c.id, c]));

    // Process all known chip IDs
    const allChipIds = new Set([
        ...dictationChips.map(c => c.id),
        ...settingsChips.map(c => c.id),
        ...Object.keys(overrides),
    ]);

    for (const chipId of allChipIds) {
        if (seen.has(chipId)) continue;
        seen.add(chipId);

        const dict = dictLookup.get(chipId);
        const settings = settingsLookup.get(chipId);
        const override = overrides[chipId];

        let effective: EffectiveChip;

        // Priority 1: Dictation (explicit or negation)
        if (dict !== undefined) {
            effective = {
                id: chipId,
                enabled: dict.enabled,
                value: dict.value,
                source: 'dictation',
                overridden: false,
            };
        }
        // Priority 2: Override (on/off from UI)
        else if (override && override.mode !== 'auto') {
            effective = {
                id: chipId,
                enabled: override.mode === 'on',
                value: override.value ?? settings?.value,
                source: 'override',
                overridden: settings !== undefined,
            };
        }
        // Priority 3: Settings
        else if (settings !== undefined) {
            effective = {
                id: chipId,
                enabled: settings.enabled,
                value: settings.value,
                source: 'settings',
                overridden: false,
            };
        }
        // Priority 4: Default (off)
        else {
            effective = {
                id: chipId,
                enabled: false,
                source: 'default',
            };
        }

        result.push(effective);
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// PARAMETRIZED CHIP OPTIONS
// ═══════════════════════════════════════════════════════════════

export const PARAMETRIZED_CHIPS: Record<string, { options: Array<{ value: string; label: string }> }> = {
    'la_type': {
        options: [
            { value: 'none', label: 'Keine LA' },
            { value: 'infiltr', label: 'Infiltration' },
            { value: 'leitung', label: 'Leitungsanästhesie' },
        ],
    },
    'isolation': {
        options: [
            { value: 'none', label: 'Ohne Isolation' },
            { value: 'relative', label: 'Relative Trockenlegung' },
            { value: 'kofferdam', label: 'Kofferdam' },
        ],
    },
    'wl_method': {
        options: [
            { value: 'elektrisch', label: 'Elektrisch' },
            { value: 'roentgen', label: 'Röntgenologisch' },
            { value: 'both', label: 'Beide' },
        ],
    },
    'wf_technique': {
        options: [
            { value: 'kalt', label: 'Kalt (lateral)' },
            { value: 'warm', label: 'Warm' },
            { value: 'einzel', label: 'Einzelstift' },
        ],
    },
};

export function isParametrizedChip(chipId: string): boolean {
    return chipId in PARAMETRIZED_CHIPS;
}
