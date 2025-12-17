/**
 * Settings Contracts — Type definitions for Settings Resolver
 *
 * Defines TypeScript contracts for the hierarchical settings resolution system.
 * These types enable:
 * - Explicit 'system' source for SSOT defaults
 * - ResolvedOption metadata for UI badges and debugging
 * - Firestore-ready override schemas
 * - Case snapshot for legal reproducibility
 *
 * ═══════════════════════════════════════════════════════════════
 * DECISION: SYSTEM_DEFAULTS as sole source of defaults (no org.defaultSettings)
 * Firestore stores ONLY overrides (sparse patches), never full defaults.
 * ═══════════════════════════════════════════════════════════════
 */

import type {
    FuellungDefaults,
    EndoDefaults,
    FuellungMkvDefaults,
} from './settingsTypes';

// ═══════════════════════════════════════════════════════════════
// SETTINGS SOURCE HIERARCHY
// ═══════════════════════════════════════════════════════════════

/**
 * Settings source in priority order (lowest to highest).
 * 'system' = code defaults (SYSTEM_DEFAULTS)
 * 'session' = ephemeral, never persisted
 */
export type SettingsSource =
    | 'system'
    | 'org'
    | 'practice'
    | 'location'
    | 'provider'
    | 'session';

/**
 * Source order constant — use for iteration and priority checks.
 * Lower index = lower priority (gets overridden)
 */
export const SOURCE_ORDER: readonly SettingsSource[] = [
    'system',
    'org',
    'practice',
    'location',
    'provider',
    'session',
] as const;

// ═══════════════════════════════════════════════════════════════
// RESOLVED OPTION — Value with full metadata
// ═══════════════════════════════════════════════════════════════

/**
 * A resolved setting value with source metadata.
 * Enables UI badges ("Praxisstandard", "Behandler-Override") and debugging.
 */
export interface ResolvedOption<T> {
    /** The resolved value */
    value: T;
    /** Which scope provided this value */
    source: SettingsSource;
    /** Reference ID at that scope (null for 'system') */
    refId: string | null;
    /** When the override was applied (null for 'system') */
    appliedAt: string | null;
    /** True if source === 'system' (no override applied) */
    isDefault: boolean;
    /** True if value differs from system default */
    wasOverridden: boolean;
}

/**
 * Create a ResolvedOption for a system default value.
 */
export function createSystemDefault<T>(value: T): ResolvedOption<T> {
    return {
        value,
        source: 'system',
        refId: null,
        appliedAt: null,
        isDefault: true,
        wasOverridden: false,
    };
}

/**
 * Create a ResolvedOption for an override value.
 */
export function createOverride<T>(
    value: T,
    source: Exclude<SettingsSource, 'system'>,
    refId: string,
    appliedAt: string | null = null
): ResolvedOption<T> {
    return {
        value,
        source,
        refId,
        appliedAt,
        isDefault: false,
        wasOverridden: true,
    };
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS OVERRIDES — Sparse patches (Firestore schema)
// ═══════════════════════════════════════════════════════════════

/**
 * Sparse override patch for Fuellung settings.
 * Only includes fields that deviate from SYSTEM_DEFAULTS.
 */
export interface FuellungSettingsOverrides {
    mkvDefaults?: Partial<FuellungMkvDefaults>;
    defaults?: Partial<FuellungDefaults>;
}

/**
 * Sparse override patch for Endo settings.
 */
export interface EndoSettingsOverrides {
    defaults?: Partial<EndoDefaults>;
}

/**
 * Combined settings overrides document.
 * Used at org/practice/location/provider scope.
 */
export interface SettingsOverrides {
    fuellung?: FuellungSettingsOverrides;
    endo?: EndoSettingsOverrides;
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS HIERARCHY INPUT — Resolution input
// ═══════════════════════════════════════════════════════════════

/**
 * Hierarchy of override patches for resolution.
 */
export interface SettingsHierarchy {
    org?: { refId: string; overrides: SettingsOverrides; appliedAt?: string };
    practice?: { refId: string; overrides: SettingsOverrides; appliedAt?: string };
    location?: { refId: string; overrides: SettingsOverrides; appliedAt?: string };
    provider?: { refId: string; overrides: SettingsOverrides; appliedAt?: string };
    session?: { overrides: SettingsOverrides };  // No refId, never persisted
}

// ═══════════════════════════════════════════════════════════════
// CASE SNAPSHOT — Reproducibility
// ═══════════════════════════════════════════════════════════════

/**
 * Settings snapshot for case reproducibility.
 * Allows exact reconstruction of resolved settings at case creation time.
 */
export interface CaseSettingsSnapshot {
    /** Playbook version ID, e.g. "fuellung_v2.1.0" */
    playbookVersionId: string;
    /** SHA256 hash of the resolved settings JSON */
    resolvedSettingsHash: string;
    /**
     * Optional: Full resolved settings snapshot for audited/legal cases.
     * Only store when legally required — can grow large.
     */
    _resolvedSettingsSnapshot?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// DIFF TYPES — For UI diff views
// ═══════════════════════════════════════════════════════════════

/**
 * A single setting difference between baseline and current.
 */
export interface SettingDiff {
    /** Setting path, e.g. "fuellung.defaults.trockenlegung" */
    path: string;
    /** Value in baseline ResolvedSettings */
    baseValue: unknown;
    /** Source in baseline */
    baseSource: SettingsSource;
    /** Value in current ResolvedSettings */
    currentValue: unknown;
    /** Source in current */
    currentSource: SettingsSource;
    /** True if values differ (independent of source) */
    valueChanged: boolean;
    /** True if source differs (even if value same) */
    sourceChanged: boolean;
}

/**
 * Result of comparing two ResolvedSettings.
 */
export interface SettingsDiffResult {
    /** List of changed settings */
    diffs: SettingDiff[];
    /** Count of value changes */
    valueChanges: number;
    /** Count of source-only changes */
    sourceOnlyChanges: number;
}
