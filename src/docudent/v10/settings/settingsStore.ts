/**
 * V10 Settings Store — minimal defaults for KZV composer
 *
 * Keeps behavior aligned with legacy outputComposer without referencing v7.
 */

export interface FuellungDefaults {
    trockenlegung: 'kofferdam' | 'relativ' | 'fragen';
    ueberkappungMaterial: 'caoh' | 'mta' | 'biodentine' | 'fragen';
    aufklaerungEnabled: boolean;
}

const DEFAULT_FUELLUNG_DEFAULTS: FuellungDefaults = {
    trockenlegung: 'kofferdam',
    ueberkappungMaterial: 'caoh',
    aufklaerungEnabled: true,
};

function isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function safeParseJSON<T>(json: string | null, fallback: T): T {
    if (!json) return fallback;
    try {
        return JSON.parse(json) as T;
    } catch {
        return fallback;
    }
}

const STORAGE_KEY = 'docudent_settings_v10';

export function getFuellungDefaults(): FuellungDefaults {
    if (!isBrowser()) return DEFAULT_FUELLUNG_DEFAULTS;
    const stored = localStorage.getItem(STORAGE_KEY);
    const settings = safeParseJSON<{ fuellung?: { defaults?: FuellungDefaults } }>(stored, {});
    return settings.fuellung?.defaults ?? DEFAULT_FUELLUNG_DEFAULTS;
}
