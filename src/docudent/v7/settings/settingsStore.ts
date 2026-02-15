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
// TYPES — Re-exported from contracts/settingsTypes (SSOT)
// ═══════════════════════════════════════════════════════════════

// Re-export types from contracts for backwards compatibility
export type {
    FuellungMkvDefaults,
    TrockenlegungDefault,
    UeberkappungMaterialDefault,
    UkPosteriorAnesthesiaMode,
    OkPosteriorAnesthesiaMode,
    FrontAnesthesiaMode,
    AnesthesiaDefaults,
    MatrixApproximalMode,
    MatrixWedge,
    MatrixRing,
    MatrixDefaults,
    FuellungDefaults,
    EndoEalMode,
    EndoSpuelprotokoll,
    EndoAktivierung,
    EndoObturation,
    EndoDefaults,
    EndoTreatmentSettings,
    TreatmentSettings,
    Settings,
} from '../../contracts/settingsTypes';

// Import types for local use
import type {
    FuellungMkvDefaults,
    TrockenlegungDefault,
    UeberkappungMaterialDefault,
    UkPosteriorAnesthesiaMode,
    OkPosteriorAnesthesiaMode,
    FrontAnesthesiaMode,
    AnesthesiaDefaults,
    MatrixApproximalMode,
    MatrixWedge,
    MatrixRing,
    MatrixDefaults,
    FuellungDefaults,
    EndoEalMode,
    EndoSpuelprotokoll,
    EndoAktivierung,
    EndoObturation,
    EndoDefaults,
    Settings,
} from '../../contracts/settingsTypes';

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
    aufklaerungEnabled: true,
};

// ─── ENDO DEFAULTS ─────────────────────────────────────────────

const DEFAULT_ENDO_DEFAULTS: EndoDefaults = {
    mikroskop: false,
    eal: 'immer',
    spuelprotokoll: 'naocl_edta',
    aktivierung: 'ultraschall',
    obturation: 'thermoplastisch',
    kofferdam: true,
    aufklaerungEnabled: true,
};

export const DEFAULT_SETTINGS: Settings = {
    fuellung: {
        mkvDefaults: DEFAULT_FUELLUNG_MKV,
        defaults: DEFAULT_FUELLUNG_DEFAULTS,
    },
    endo: {
        defaults: DEFAULT_ENDO_DEFAULTS,
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

    // Aufklärung enabled (default true)
    const aufklaerungEnabled = defaults?.aufklaerungEnabled ?? DEFAULT_FUELLUNG_DEFAULTS.aufklaerungEnabled;

    return { trockenlegung, ueberkappungMaterial, anesthesia, matrix, aufklaerungEnabled };
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

// ═══════════════════════════════════════════════════════════════
// ENDO GETTERS/SETTERS
// ═══════════════════════════════════════════════════════════════

const VALID_EAL: EndoEalMode[] = ['immer', 'bei_aufbereitung', 'fragen'];
const VALID_SPUELPROTOKOLL: EndoSpuelprotokoll[] = ['naocl_edta', 'naocl', 'fragen'];
const VALID_AKTIVIERUNG: EndoAktivierung[] = ['ultraschall', 'sonic', 'keine', 'fragen'];
const VALID_OBTURATION: EndoObturation[] = ['thermoplastisch', 'lateral', 'fragen'];

/**
 * Get endo defaults with validation.
 * Returns safe defaults if settings missing or malformed.
 */
export function getEndoDefaults(): EndoDefaults {
    const settings = getSettings();
    const defaults = settings.endo?.defaults;

    // Validate each field with whitelist
    const mikroskop = typeof defaults?.mikroskop === 'boolean'
        ? defaults.mikroskop
        : DEFAULT_ENDO_DEFAULTS.mikroskop;

    const eal = VALID_EAL.includes(defaults?.eal as EndoEalMode)
        ? defaults!.eal
        : DEFAULT_ENDO_DEFAULTS.eal;

    const spuelprotokoll = VALID_SPUELPROTOKOLL.includes(defaults?.spuelprotokoll as EndoSpuelprotokoll)
        ? defaults!.spuelprotokoll
        : DEFAULT_ENDO_DEFAULTS.spuelprotokoll;

    const aktivierung = VALID_AKTIVIERUNG.includes(defaults?.aktivierung as EndoAktivierung)
        ? defaults!.aktivierung
        : DEFAULT_ENDO_DEFAULTS.aktivierung;

    const obturation = VALID_OBTURATION.includes(defaults?.obturation as EndoObturation)
        ? defaults!.obturation
        : DEFAULT_ENDO_DEFAULTS.obturation;

    const kofferdam = typeof defaults?.kofferdam === 'boolean'
        ? defaults.kofferdam
        : DEFAULT_ENDO_DEFAULTS.kofferdam;

    const aufklaerungEnabled = defaults?.aufklaerungEnabled ?? DEFAULT_ENDO_DEFAULTS.aufklaerungEnabled;

    return { mikroskop, eal, spuelprotokoll, aktivierung, obturation, kofferdam, aufklaerungEnabled };
}

/**
 * Update endo defaults (partial update supported).
 */
export function setEndoDefaults(defaults: Partial<EndoDefaults>): void {
    const settings = getSettings();
    const currentEndo = settings.endo || {};
    const currentDefaults = currentEndo.defaults || DEFAULT_ENDO_DEFAULTS;

    setSettings({
        endo: {
            ...currentEndo,
            defaults: {
                ...currentDefaults,
                ...defaults,
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
    getEndoDefaults,
    setEndoDefaults,
    resetSettings,
    DEFAULT_SETTINGS,
    DEFAULT_ANESTHESIA,
    DEFAULT_MATRIX,
    DEFAULT_ENDO_DEFAULTS,
};
