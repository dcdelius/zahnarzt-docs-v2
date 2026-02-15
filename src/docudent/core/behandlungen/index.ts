/**
 * BEHANDLUNGEN REGISTRY
 * 
 * Zentrales Register für alle Behandlungsdefinitionen.
 * 
 * Struktur:
 * - behandlungen/_shared/types.ts      - Gemeinsame Interfaces
 * - behandlungen/_shared/engine.ts     - Generische Engine
 * - behandlungen/_shared/feeCatalog.ts - BEMA/GOZ Codes
 * - behandlungen/konservierend/fuellung/definition.ts - Füllung
 * - behandlungen/chirurgie/extraktion/definition.ts   - (geplant)
 * - behandlungen/endodontie/wkb/definition.ts         - (geplant)
 */

import { TreatmentDefinition } from './_shared/types';
import { FILLING_TREATMENT } from './konservierend/fuellung/definition';

// Alle Behandlungen in einem Map
export const BEHANDLUNGEN: Record<string, TreatmentDefinition> = {
    'fuellung': FILLING_TREATMENT,
    'filling': FILLING_TREATMENT,  // Alias für Frontend-Kompatibilität
    // TODO: Weitere Behandlungen hinzufügen
    // 'extraktion': EXTRACTION_TREATMENT,
    // 'wkb': ENDO_TREATMENT,
};

// Alias für Rückwärtskompatibilität
export const TREATMENTS = BEHANDLUNGEN;

export function getBehandlung(id: string): TreatmentDefinition | undefined {
    return BEHANDLUNGEN[id];
}

// Alias für Rückwärtskompatibilität
export function getTreatment(id: string): TreatmentDefinition | undefined {
    return getBehandlung(id);
}

export function getBehandlungOrThrow(id: string): TreatmentDefinition {
    const t = BEHANDLUNGEN[id];
    if (!t) throw new Error(`Behandlung nicht gefunden: ${id}`);
    return t;
}

// Alias
export function getTreatmentOrThrow(id: string): TreatmentDefinition {
    return getBehandlungOrThrow(id);
}

export function getAlleBehandlungen(): TreatmentDefinition[] {
    return Object.values(BEHANDLUNGEN);
}

// Alias
export function getAllTreatments(): TreatmentDefinition[] {
    return getAlleBehandlungen();
}

// Re-export types and engine
export * from './_shared/types';
export * from './_shared/engine';
