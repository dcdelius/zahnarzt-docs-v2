/**
 * Settings Resolver — Hierarchical Settings Merge Logic
 *
 * Resolves settings by merging override layers in order:
 * system → org → practice → location → provider → session
 *
 * Key features:
 * - SYSTEM_DEFAULTS as the sole source of defaults (no org.defaultSettings)
 * - Nearest-wins deep merge across scopes
 * - ResolvedOption tracking for every value
 * - Diff API for UI views
 *
 * ═══════════════════════════════════════════════════════════════
 * USAGE:
 *   const resolved = resolveSettings(hierarchy);
 *   const diff = computeSettingsDiffBetween(baseline, resolved);
 * ═══════════════════════════════════════════════════════════════
 */

import {
    DEFAULT_SETTINGS,
    type Settings,
    type FuellungDefaults,
    type EndoDefaults,
    type FuellungMkvDefaults,
} from '../../v7/settings/settingsStore';

import {
    type SettingsSource,
    type ResolvedOption,
    type SettingsOverrides,
    type SettingsHierarchy,
    type SettingDiff,
    type SettingsDiffResult,
    SOURCE_ORDER,
    createSystemDefault,
    createOverride,
} from '../../contracts/settingsContracts';

// ═══════════════════════════════════════════════════════════════
// RESOLVED SETTINGS TYPE — All values wrapped with metadata
// ═══════════════════════════════════════════════════════════════

export interface ResolvedFuellungSettings {
    mkvDefaults: {
        mehrschicht: ResolvedOption<boolean>;
        adhasiv: ResolvedOption<boolean>;
    };
    defaults: {
        trockenlegung: ResolvedOption<FuellungDefaults['trockenlegung']>;
        ueberkappungMaterial: ResolvedOption<FuellungDefaults['ueberkappungMaterial']>;
        anesthesia: {
            enabled: ResolvedOption<boolean>;
            ukPosteriorMode: ResolvedOption<FuellungDefaults['anesthesia']['ukPosteriorMode']>;
            okPosteriorMode: ResolvedOption<FuellungDefaults['anesthesia']['okPosteriorMode']>;
            frontMode: ResolvedOption<FuellungDefaults['anesthesia']['frontMode']>;
        };
        matrix: {
            approximalMode: ResolvedOption<FuellungDefaults['matrix']['approximalMode']>;
            wedge: ResolvedOption<FuellungDefaults['matrix']['wedge']>;
            ring: ResolvedOption<FuellungDefaults['matrix']['ring']>;
        };
        aufklaerungEnabled: ResolvedOption<boolean>;
    };
}

export interface ResolvedEndoSettings {
    defaults: {
        mikroskop: ResolvedOption<boolean>;
        eal: ResolvedOption<EndoDefaults['eal']>;
        spuelprotokoll: ResolvedOption<EndoDefaults['spuelprotokoll']>;
        aktivierung: ResolvedOption<EndoDefaults['aktivierung']>;
        obturation: ResolvedOption<EndoDefaults['obturation']>;
        kofferdam: ResolvedOption<boolean>;
        aufklaerungEnabled: ResolvedOption<boolean>;
    };
}

export interface ResolvedSettings {
    fuellung: ResolvedFuellungSettings;
    endo: ResolvedEndoSettings;
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM DEFAULTS INITIALIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize resolved settings from SYSTEM_DEFAULTS.
 * All values are wrapped with source='system'.
 */
export function initializeSystemDefaults(): ResolvedSettings {
    const fuellungMkv = DEFAULT_SETTINGS.fuellung?.mkvDefaults ?? { mehrschicht: true, adhasiv: true };
    const fuellungDef = DEFAULT_SETTINGS.fuellung?.defaults ?? {
        trockenlegung: 'kofferdam' as const,
        ueberkappungMaterial: 'caoh' as const,
        anesthesia: { enabled: true, ukPosteriorMode: 'leitung' as const, okPosteriorMode: 'infiltration' as const, frontMode: 'infiltration' as const },
        matrix: { approximalMode: 'sektional' as const, wedge: 'holz' as const, ring: 'ja' as const },
        aufklaerungEnabled: true,
    };
    const endoDef = DEFAULT_SETTINGS.endo?.defaults ?? {
        mikroskop: false,
        eal: 'immer' as const,
        spuelprotokoll: 'naocl_edta' as const,
        aktivierung: 'ultraschall' as const,
        obturation: 'thermoplastisch' as const,
        kofferdam: true,
        aufklaerungEnabled: true,
    };

    return {
        fuellung: {
            mkvDefaults: {
                mehrschicht: createSystemDefault(fuellungMkv.mehrschicht),
                adhasiv: createSystemDefault(fuellungMkv.adhasiv),
            },
            defaults: {
                trockenlegung: createSystemDefault(fuellungDef.trockenlegung),
                ueberkappungMaterial: createSystemDefault(fuellungDef.ueberkappungMaterial),
                anesthesia: {
                    enabled: createSystemDefault(fuellungDef.anesthesia.enabled),
                    ukPosteriorMode: createSystemDefault(fuellungDef.anesthesia.ukPosteriorMode),
                    okPosteriorMode: createSystemDefault(fuellungDef.anesthesia.okPosteriorMode),
                    frontMode: createSystemDefault(fuellungDef.anesthesia.frontMode),
                },
                matrix: {
                    approximalMode: createSystemDefault(fuellungDef.matrix.approximalMode),
                    wedge: createSystemDefault(fuellungDef.matrix.wedge),
                    ring: createSystemDefault(fuellungDef.matrix.ring),
                },
                aufklaerungEnabled: createSystemDefault(fuellungDef.aufklaerungEnabled),
            },
        },
        endo: {
            defaults: {
                mikroskop: createSystemDefault(endoDef.mikroskop),
                eal: createSystemDefault(endoDef.eal),
                spuelprotokoll: createSystemDefault(endoDef.spuelprotokoll),
                aktivierung: createSystemDefault(endoDef.aktivierung),
                obturation: createSystemDefault(endoDef.obturation),
                kofferdam: createSystemDefault(endoDef.kofferdam),
                aufklaerungEnabled: createSystemDefault(endoDef.aufklaerungEnabled),
            },
        },
    };
}

// ═══════════════════════════════════════════════════════════════
// APPLY OVERRIDE LAYER
// ═══════════════════════════════════════════════════════════════

/**
 * Apply an override layer to resolved settings.
 * Only patches provided values; others remain unchanged.
 */
export function applyOverrideLayer(
    base: ResolvedSettings,
    patch: SettingsOverrides,
    source: Exclude<SettingsSource, 'system'>,
    refId: string,
    appliedAt: string | null = null
): ResolvedSettings {
    const result = structuredClone(base);

    // Fuellung MKV overrides
    if (patch.fuellung?.mkvDefaults) {
        const mkv = patch.fuellung.mkvDefaults;
        if (mkv.mehrschicht !== undefined) {
            result.fuellung.mkvDefaults.mehrschicht = createOverride(mkv.mehrschicht, source, refId, appliedAt);
        }
        if (mkv.adhasiv !== undefined) {
            result.fuellung.mkvDefaults.adhasiv = createOverride(mkv.adhasiv, source, refId, appliedAt);
        }
    }

    // Fuellung defaults overrides
    if (patch.fuellung?.defaults) {
        const def = patch.fuellung.defaults;
        if (def.trockenlegung !== undefined) {
            result.fuellung.defaults.trockenlegung = createOverride(def.trockenlegung, source, refId, appliedAt);
        }
        if (def.ueberkappungMaterial !== undefined) {
            result.fuellung.defaults.ueberkappungMaterial = createOverride(def.ueberkappungMaterial, source, refId, appliedAt);
        }
        if (def.aufklaerungEnabled !== undefined) {
            result.fuellung.defaults.aufklaerungEnabled = createOverride(def.aufklaerungEnabled, source, refId, appliedAt);
        }
        // Anesthesia sub-object
        if (def.anesthesia) {
            const anest = def.anesthesia;
            if (anest.enabled !== undefined) {
                result.fuellung.defaults.anesthesia.enabled = createOverride(anest.enabled, source, refId, appliedAt);
            }
            if (anest.ukPosteriorMode !== undefined) {
                result.fuellung.defaults.anesthesia.ukPosteriorMode = createOverride(anest.ukPosteriorMode, source, refId, appliedAt);
            }
            if (anest.okPosteriorMode !== undefined) {
                result.fuellung.defaults.anesthesia.okPosteriorMode = createOverride(anest.okPosteriorMode, source, refId, appliedAt);
            }
            if (anest.frontMode !== undefined) {
                result.fuellung.defaults.anesthesia.frontMode = createOverride(anest.frontMode, source, refId, appliedAt);
            }
        }
        // Matrix sub-object
        if (def.matrix) {
            const mat = def.matrix;
            if (mat.approximalMode !== undefined) {
                result.fuellung.defaults.matrix.approximalMode = createOverride(mat.approximalMode, source, refId, appliedAt);
            }
            if (mat.wedge !== undefined) {
                result.fuellung.defaults.matrix.wedge = createOverride(mat.wedge, source, refId, appliedAt);
            }
            if (mat.ring !== undefined) {
                result.fuellung.defaults.matrix.ring = createOverride(mat.ring, source, refId, appliedAt);
            }
        }
    }

    // Endo overrides
    if (patch.endo?.defaults) {
        const endo = patch.endo.defaults;
        if (endo.mikroskop !== undefined) {
            result.endo.defaults.mikroskop = createOverride(endo.mikroskop, source, refId, appliedAt);
        }
        if (endo.eal !== undefined) {
            result.endo.defaults.eal = createOverride(endo.eal, source, refId, appliedAt);
        }
        if (endo.spuelprotokoll !== undefined) {
            result.endo.defaults.spuelprotokoll = createOverride(endo.spuelprotokoll, source, refId, appliedAt);
        }
        if (endo.aktivierung !== undefined) {
            result.endo.defaults.aktivierung = createOverride(endo.aktivierung, source, refId, appliedAt);
        }
        if (endo.obturation !== undefined) {
            result.endo.defaults.obturation = createOverride(endo.obturation, source, refId, appliedAt);
        }
        if (endo.kofferdam !== undefined) {
            result.endo.defaults.kofferdam = createOverride(endo.kofferdam, source, refId, appliedAt);
        }
        if (endo.aufklaerungEnabled !== undefined) {
            result.endo.defaults.aufklaerungEnabled = createOverride(endo.aufklaerungEnabled, source, refId, appliedAt);
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// RESOLVE SETTINGS — Main entry point
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve settings by merging override layers in order.
 * Returns fully resolved settings with source metadata.
 */
export function resolveSettings(hierarchy: SettingsHierarchy): ResolvedSettings {
    let result = initializeSystemDefaults();

    // Apply layers in order: org → practice → location → provider → session
    if (hierarchy.org) {
        result = applyOverrideLayer(
            result,
            hierarchy.org.overrides,
            'org',
            hierarchy.org.refId,
            hierarchy.org.appliedAt ?? null
        );
    }

    if (hierarchy.practice) {
        result = applyOverrideLayer(
            result,
            hierarchy.practice.overrides,
            'practice',
            hierarchy.practice.refId,
            hierarchy.practice.appliedAt ?? null
        );
    }

    if (hierarchy.location) {
        result = applyOverrideLayer(
            result,
            hierarchy.location.overrides,
            'location',
            hierarchy.location.refId,
            hierarchy.location.appliedAt ?? null
        );
    }

    if (hierarchy.provider) {
        result = applyOverrideLayer(
            result,
            hierarchy.provider.overrides,
            'provider',
            hierarchy.provider.refId,
            hierarchy.provider.appliedAt ?? null
        );
    }

    if (hierarchy.session) {
        result = applyOverrideLayer(
            result,
            hierarchy.session.overrides,
            'session',
            'session'  // session has no persistent refId
        );
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// DIFF API — Compare two resolved settings
// ═══════════════════════════════════════════════════════════════

type PathValue = { path: string; resolved: ResolvedOption<unknown> };

/**
 * Flatten resolved settings to a list of path/value pairs.
 */
function flattenResolvedSettings(settings: ResolvedSettings): PathValue[] {
    const result: PathValue[] = [];

    // Fuellung MKV
    result.push({ path: 'fuellung.mkvDefaults.mehrschicht', resolved: settings.fuellung.mkvDefaults.mehrschicht });
    result.push({ path: 'fuellung.mkvDefaults.adhasiv', resolved: settings.fuellung.mkvDefaults.adhasiv });

    // Fuellung defaults
    result.push({ path: 'fuellung.defaults.trockenlegung', resolved: settings.fuellung.defaults.trockenlegung });
    result.push({ path: 'fuellung.defaults.ueberkappungMaterial', resolved: settings.fuellung.defaults.ueberkappungMaterial });
    result.push({ path: 'fuellung.defaults.aufklaerungEnabled', resolved: settings.fuellung.defaults.aufklaerungEnabled });

    // Fuellung anesthesia
    result.push({ path: 'fuellung.defaults.anesthesia.enabled', resolved: settings.fuellung.defaults.anesthesia.enabled });
    result.push({ path: 'fuellung.defaults.anesthesia.ukPosteriorMode', resolved: settings.fuellung.defaults.anesthesia.ukPosteriorMode });
    result.push({ path: 'fuellung.defaults.anesthesia.okPosteriorMode', resolved: settings.fuellung.defaults.anesthesia.okPosteriorMode });
    result.push({ path: 'fuellung.defaults.anesthesia.frontMode', resolved: settings.fuellung.defaults.anesthesia.frontMode });

    // Fuellung matrix
    result.push({ path: 'fuellung.defaults.matrix.approximalMode', resolved: settings.fuellung.defaults.matrix.approximalMode });
    result.push({ path: 'fuellung.defaults.matrix.wedge', resolved: settings.fuellung.defaults.matrix.wedge });
    result.push({ path: 'fuellung.defaults.matrix.ring', resolved: settings.fuellung.defaults.matrix.ring });

    // Endo defaults
    result.push({ path: 'endo.defaults.mikroskop', resolved: settings.endo.defaults.mikroskop });
    result.push({ path: 'endo.defaults.eal', resolved: settings.endo.defaults.eal });
    result.push({ path: 'endo.defaults.spuelprotokoll', resolved: settings.endo.defaults.spuelprotokoll });
    result.push({ path: 'endo.defaults.aktivierung', resolved: settings.endo.defaults.aktivierung });
    result.push({ path: 'endo.defaults.obturation', resolved: settings.endo.defaults.obturation });
    result.push({ path: 'endo.defaults.kofferdam', resolved: settings.endo.defaults.kofferdam });
    result.push({ path: 'endo.defaults.aufklaerungEnabled', resolved: settings.endo.defaults.aufklaerungEnabled });

    return result;
}

/**
 * Compute diff between two ResolvedSettings.
 * Use for UI diff views (e.g. "Practice differs from Org").
 */
export function computeSettingsDiffBetween(
    baseline: ResolvedSettings,
    current: ResolvedSettings
): SettingsDiffResult {
    const baseFlat = flattenResolvedSettings(baseline);
    const currFlat = flattenResolvedSettings(current);

    const diffs: SettingDiff[] = [];
    let valueChanges = 0;
    let sourceOnlyChanges = 0;

    for (let i = 0; i < baseFlat.length; i++) {
        const base = baseFlat[i];
        const curr = currFlat[i];

        const valueChanged = base.resolved.value !== curr.resolved.value;
        const sourceChanged = base.resolved.source !== curr.resolved.source;

        if (valueChanged || sourceChanged) {
            diffs.push({
                path: base.path,
                baseValue: base.resolved.value,
                baseSource: base.resolved.source,
                currentValue: curr.resolved.value,
                currentSource: curr.resolved.source,
                valueChanged,
                sourceChanged,
            });

            if (valueChanged) {
                valueChanges++;
            } else if (sourceChanged) {
                sourceOnlyChanges++;
            }
        }
    }

    return { diffs, valueChanges, sourceOnlyChanges };
}

// ═══════════════════════════════════════════════════════════════
// HASH GENERATION — For case snapshots
// ═══════════════════════════════════════════════════════════════

/**
 * Extract plain values from resolved settings (strip metadata).
 */
export function extractSettingsValues(settings: ResolvedSettings): Settings {
    return {
        fuellung: {
            mkvDefaults: {
                mehrschicht: settings.fuellung.mkvDefaults.mehrschicht.value,
                adhasiv: settings.fuellung.mkvDefaults.adhasiv.value,
            },
            defaults: {
                trockenlegung: settings.fuellung.defaults.trockenlegung.value,
                ueberkappungMaterial: settings.fuellung.defaults.ueberkappungMaterial.value,
                aufklaerungEnabled: settings.fuellung.defaults.aufklaerungEnabled.value,
                anesthesia: {
                    enabled: settings.fuellung.defaults.anesthesia.enabled.value,
                    ukPosteriorMode: settings.fuellung.defaults.anesthesia.ukPosteriorMode.value,
                    okPosteriorMode: settings.fuellung.defaults.anesthesia.okPosteriorMode.value,
                    frontMode: settings.fuellung.defaults.anesthesia.frontMode.value,
                },
                matrix: {
                    approximalMode: settings.fuellung.defaults.matrix.approximalMode.value,
                    wedge: settings.fuellung.defaults.matrix.wedge.value,
                    ring: settings.fuellung.defaults.matrix.ring.value,
                },
            },
        },
        endo: {
            defaults: {
                mikroskop: settings.endo.defaults.mikroskop.value,
                eal: settings.endo.defaults.eal.value,
                spuelprotokoll: settings.endo.defaults.spuelprotokoll.value,
                aktivierung: settings.endo.defaults.aktivierung.value,
                obturation: settings.endo.defaults.obturation.value,
                kofferdam: settings.endo.defaults.kofferdam.value,
                aufklaerungEnabled: settings.endo.defaults.aufklaerungEnabled.value,
            },
        },
    };
}

/**
 * Generate a deterministic hash of resolved settings for case snapshots.
 * Uses JSON.stringify with sorted keys for consistency.
 */
export async function generateSettingsHash(settings: ResolvedSettings): Promise<string> {
    const values = extractSettingsValues(settings);
    const json = JSON.stringify(values, Object.keys(values).sort());

    // Use SubtleCrypto if available (browser), otherwise return a simple hash
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(json);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback: simple hash for Node.js test environment
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
        const char = json.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}
