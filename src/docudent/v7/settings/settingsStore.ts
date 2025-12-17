/**
 * Settings Store — localStorage-based Practice Settings (MVP)
 * 
 * Provides per-treatment defaults for techniques (e.g., Mehrschicht, Adhäsiv).
 * These defaults apply when hasMKV=true and user hasn't explicitly set values.
 * 
 * Storage: localStorage key "docudent_settings_v7"
 * Browser-only (no Node APIs).
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface FuellungMkvDefaults {
    mehrschicht: boolean;
    adhasiv: boolean;
}

export type TrockenlegungDefault = 'kofferdam' | 'relativ' | 'fragen';
export type UeberkappungMaterialDefault = 'caoh' | 'mta' | 'biodentine' | 'fragen';

// Anesthesia defaults by region
export type UkPosteriorAnesthesiaMode = 'leitung' | 'intraligamentaer' | 'infiltration' | 'fragen';
export type OkPosteriorAnesthesiaMode = 'infiltration' | 'fragen';
export type FrontAnesthesiaMode = 'infiltration' | 'fragen';

export interface AnesthesiaDefaults {
    enabled: boolean;
    ukPosteriorMode: UkPosteriorAnesthesiaMode;
    okPosteriorMode: OkPosteriorAnesthesiaMode;
    frontMode: FrontAnesthesiaMode;
}

// Matrix defaults for approximal restorations
export type MatrixApproximalMode = 'sektional' | 'tofflemire' | 'fragen';
export type MatrixWedge = 'holz' | 'kunststoff' | 'fragen';
export type MatrixRing = 'ja' | 'nein' | 'fragen';

export interface MatrixDefaults {
    approximalMode: MatrixApproximalMode;
    wedge: MatrixWedge;
    ring: MatrixRing;
}

export interface FuellungDefaults {
    trockenlegung: TrockenlegungDefault;
    ueberkappungMaterial: UeberkappungMaterialDefault;
    anesthesia: AnesthesiaDefaults;
    matrix: MatrixDefaults;
}

export interface TreatmentSettings {
    mkvDefaults?: FuellungMkvDefaults;
    defaults?: FuellungDefaults;
}

export interface Settings {
    fuellung?: TreatmentSettings;
    // Future: endo, extraction, etc.
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'docudent_settings_v7';

const DEFAULT_FUELLUNG_MKV: FuellungMkvDefaults = {
    mehrschicht: true,
    adhasiv: true,
};

const DEFAULT_ANESTHESIA: AnesthesiaDefaults = {
    enabled: true,
    ukPosteriorMode: 'leitung',
    okPosteriorMode: 'infiltration',
    frontMode: 'infiltration',
};

const DEFAULT_MATRIX: MatrixDefaults = {
    approximalMode: 'sektional',
    wedge: 'holz',
    ring: 'ja',
};

const DEFAULT_FUELLUNG_DEFAULTS: FuellungDefaults = {
    trockenlegung: 'kofferdam',
    ueberkappungMaterial: 'caoh',
    anesthesia: DEFAULT_ANESTHESIA,
    matrix: DEFAULT_MATRIX,
};

export const DEFAULT_SETTINGS: Settings = {
    fuellung: {
        mkvDefaults: DEFAULT_FUELLUNG_MKV,
        defaults: DEFAULT_FUELLUNG_DEFAULTS,
    },
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function safeParseJSON<T>(json: string | null, fallback: T): T {
    if (!json) return fallback;
    try {
        return JSON.parse(json) as T;
    } catch {
        console.warn('[SettingsStore] Failed to parse settings, using defaults');
        return fallback;
    }
}

// Validation arrays
const VALID_TROCKENLEGUNG: TrockenlegungDefault[] = ['kofferdam', 'relativ', 'fragen'];
const VALID_MATERIAL: UeberkappungMaterialDefault[] = ['caoh', 'mta', 'biodentine', 'fragen'];
const VALID_UK_POSTERIOR: UkPosteriorAnesthesiaMode[] = ['leitung', 'intraligamentaer', 'infiltration', 'fragen'];
const VALID_OK_POSTERIOR: OkPosteriorAnesthesiaMode[] = ['infiltration', 'fragen'];
const VALID_FRONT: FrontAnesthesiaMode[] = ['infiltration', 'fragen'];
const VALID_APPROX: MatrixApproximalMode[] = ['sektional', 'tofflemire', 'fragen'];
const VALID_WEDGE: MatrixWedge[] = ['holz', 'kunststoff', 'fragen'];
const VALID_RING: MatrixRing[] = ['ja', 'nein', 'fragen'];

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Get all settings from localStorage.
 * Returns DEFAULT_SETTINGS if not in browser or parse fails.
 */
export function getSettings(): Settings {
    if (!isBrowser()) {
        return DEFAULT_SETTINGS;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    return safeParseJSON(stored, DEFAULT_SETTINGS);
}

/**
 * Update settings (shallow merge at top level).
 * Only works in browser environment.
 */
export function setSettings(partial: Partial<Settings>): void {
    if (!isBrowser()) {
        console.warn('[SettingsStore] Cannot save settings outside browser');
        return;
    }

    const current = getSettings();
    const merged = { ...current, ...partial };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

/**
 * Get fuellung MKV defaults specifically.
 * Returns safe defaults if settings missing or malformed.
 */
export function getFuellungMkvDefaults(): FuellungMkvDefaults {
    const settings = getSettings();
    const mkvDefaults = settings.fuellung?.mkvDefaults;

    // Ensure both fields are booleans
    return {
        mehrschicht: typeof mkvDefaults?.mehrschicht === 'boolean'
            ? mkvDefaults.mehrschicht
            : DEFAULT_FUELLUNG_MKV.mehrschicht,
        adhasiv: typeof mkvDefaults?.adhasiv === 'boolean'
            ? mkvDefaults.adhasiv
            : DEFAULT_FUELLUNG_MKV.adhasiv,
    };
}

/**
 * Update fuellung MKV defaults.
 */
export function setFuellungMkvDefaults(defaults: Partial<FuellungMkvDefaults>): void {
    const settings = getSettings();
    const currentFuellung = settings.fuellung || {};
    const currentDefaults = currentFuellung.mkvDefaults || DEFAULT_FUELLUNG_MKV;

    setSettings({
        fuellung: {
            ...currentFuellung,
            mkvDefaults: {
                ...currentDefaults,
                ...defaults,
            },
        },
    });
}

/**
 * Get fuellung general defaults (trockenlegung, ueberkappungMaterial, anesthesia, matrix).
 * Returns safe defaults if settings missing or malformed.
 */
export function getFuellungDefaults(): FuellungDefaults {
    const settings = getSettings();
    const defaults = settings.fuellung?.defaults;

    // Validate trockenlegung
    const trockenlegung = VALID_TROCKENLEGUNG.includes(defaults?.trockenlegung as TrockenlegungDefault)
        ? defaults!.trockenlegung
        : DEFAULT_FUELLUNG_DEFAULTS.trockenlegung;

    // Validate ueberkappungMaterial
    const ueberkappungMaterial = VALID_MATERIAL.includes(defaults?.ueberkappungMaterial as UeberkappungMaterialDefault)
        ? defaults!.ueberkappungMaterial
        : DEFAULT_FUELLUNG_DEFAULTS.ueberkappungMaterial;

    // Validate anesthesia
    const rawAnesthesia = defaults?.anesthesia;
    const anesthesia: AnesthesiaDefaults = {
        enabled: typeof rawAnesthesia?.enabled === 'boolean' ? rawAnesthesia.enabled : DEFAULT_ANESTHESIA.enabled,
        ukPosteriorMode: VALID_UK_POSTERIOR.includes(rawAnesthesia?.ukPosteriorMode as UkPosteriorAnesthesiaMode)
            ? rawAnesthesia!.ukPosteriorMode
            : DEFAULT_ANESTHESIA.ukPosteriorMode,
        okPosteriorMode: VALID_OK_POSTERIOR.includes(rawAnesthesia?.okPosteriorMode as OkPosteriorAnesthesiaMode)
            ? rawAnesthesia!.okPosteriorMode
            : DEFAULT_ANESTHESIA.okPosteriorMode,
        frontMode: VALID_FRONT.includes(rawAnesthesia?.frontMode as FrontAnesthesiaMode)
            ? rawAnesthesia!.frontMode
            : DEFAULT_ANESTHESIA.frontMode,
    };

    // Validate matrix
    const rawMatrix = defaults?.matrix;
    const matrix: MatrixDefaults = {
        approximalMode: VALID_APPROX.includes(rawMatrix?.approximalMode as MatrixApproximalMode)
            ? rawMatrix!.approximalMode
            : DEFAULT_MATRIX.approximalMode,
        wedge: VALID_WEDGE.includes(rawMatrix?.wedge as MatrixWedge)
            ? rawMatrix!.wedge
            : DEFAULT_MATRIX.wedge,
        ring: VALID_RING.includes(rawMatrix?.ring as MatrixRing)
            ? rawMatrix!.ring
            : DEFAULT_MATRIX.ring,
    };

    return { trockenlegung, ueberkappungMaterial, anesthesia, matrix };
}

/**
 * Update fuellung general defaults (partial update supported).
 */
export function setFuellungDefaults(defaults: Partial<FuellungDefaults>): void {
    const settings = getSettings();
    const currentFuellung = settings.fuellung || {};
    const currentDefaults = currentFuellung.defaults || DEFAULT_FUELLUNG_DEFAULTS;

    // Deep merge anesthesia if provided
    const mergedAnesthesia = defaults.anesthesia
        ? { ...currentDefaults.anesthesia, ...defaults.anesthesia }
        : currentDefaults.anesthesia;

    // Deep merge matrix if provided
    const mergedMatrix = defaults.matrix
        ? { ...currentDefaults.matrix, ...defaults.matrix }
        : currentDefaults.matrix;

    setSettings({
        fuellung: {
            ...currentFuellung,
            defaults: {
                ...currentDefaults,
                ...defaults,
                anesthesia: mergedAnesthesia,
                matrix: mergedMatrix,
            },
        },
    });
}

/**
 * Reset all settings to defaults.
 */
export function resetSettings(): void {
    if (!isBrowser()) return;
    localStorage.removeItem(STORAGE_KEY);
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
    getSettings,
    setSettings,
    getFuellungMkvDefaults,
    setFuellungMkvDefaults,
    getFuellungDefaults,
    setFuellungDefaults,
    resetSettings,
    DEFAULT_SETTINGS,
    DEFAULT_ANESTHESIA,
    DEFAULT_MATRIX,
};
