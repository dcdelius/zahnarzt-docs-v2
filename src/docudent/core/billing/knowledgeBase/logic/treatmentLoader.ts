/**
 * Treatment Loader
 * 
 * Layer 2: Lädt alle Treatment-Kataloge dynamisch.
 * Neue Behandlungen können einfach als JSON hinzugefügt werden.
 */

import type { TreatmentCatalog } from './billingDatabase';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface TreatmentRegistry {
    [treatmentId: string]: TreatmentCatalog[];
}

// ═══════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════

const _treatmentCache: TreatmentRegistry = {};

// ═══════════════════════════════════════════════════════════════
// TREATMENT PATHS
// ═══════════════════════════════════════════════════════════════

/**
 * Registrierte Behandlungstypen und ihre JSON-Pfade
 * Neue Behandlungen hier hinzufügen!
 */
const TREATMENT_PATHS: Record<string, string> = {
    'fuellung': '../behandlungen/fuellung.json',
    // Zahnersatz (Phase 2)
    'krone': '../behandlungen/zahnersatz/krone.json',
    'bruecke': '../behandlungen/zahnersatz/bruecke.json',
    'prothese': '../behandlungen/zahnersatz/prothese.json',
    // Später hinzufügen:
    // 'endo': '../behandlungen/endo.json',
    // 'extraktion': '../behandlungen/extraktion.json',
    // 'paro': '../behandlungen/parodontologie/paro.json',
    // 'pzr': '../behandlungen/prophylaxe/pzr.json',
};

// ═══════════════════════════════════════════════════════════════
// LOADER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Lädt einen spezifischen Treatment-Katalog
 */
export function loadTreatmentCatalog(treatmentId: string): TreatmentCatalog[] | null {
    // Check cache first
    if (_treatmentCache[treatmentId]) {
        return _treatmentCache[treatmentId];
    }

    const path = TREATMENT_PATHS[treatmentId];
    if (!path) {
        console.warn(`[TreatmentLoader] Unknown treatment: ${treatmentId}`);
        return null;
    }

    try {
        // Dynamic import
        const catalog = require(path) as TreatmentCatalog[];
        _treatmentCache[treatmentId] = catalog;
        console.log(`[TreatmentLoader] Loaded: ${treatmentId}`);
        return catalog;
    } catch (error) {
        console.error(`[TreatmentLoader] Failed to load ${treatmentId}:`, error);
        return null;
    }
}

/**
 * Lädt ALLE registrierten Treatment-Kataloge
 */
export function loadAllTreatments(): TreatmentRegistry {
    for (const treatmentId of Object.keys(TREATMENT_PATHS)) {
        loadTreatmentCatalog(treatmentId);
    }
    return _treatmentCache;
}

/**
 * Gibt alle verfügbaren Treatment-IDs zurück
 */
export function getAvailableTreatments(): string[] {
    return Object.keys(TREATMENT_PATHS);
}

/**
 * Prüft ob ein Treatment verfügbar ist
 */
export function isTreatmentAvailable(treatmentId: string): boolean {
    return treatmentId in TREATMENT_PATHS;
}

/**
 * Registriert einen neuen Treatment-Katalog zur Laufzeit
 * (Für dynamisches Laden, z.B. aus Firebase)
 */
export function registerTreatment(treatmentId: string, catalog: TreatmentCatalog[]): void {
    _treatmentCache[treatmentId] = catalog;
    console.log(`[TreatmentLoader] Registered: ${treatmentId}`);
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

export const TreatmentLoader = {
    loadTreatmentCatalog,
    loadAllTreatments,
    getAvailableTreatments,
    isTreatmentAvailable,
    registerTreatment
};

export default TreatmentLoader;
