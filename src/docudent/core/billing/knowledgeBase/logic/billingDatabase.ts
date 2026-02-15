/**
 * Billing Database Service
 * 
 * Layer 1: Single Source of Truth für alle BEMA/GOZ-Codes
 * Lädt und cached die Referenz-Datenbanken.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface BillingCodeEntry {
    code: string;           // "BEMA_40" oder "GOZ_0090"
    bezeichnung: string;
    punkte?: number;        // BEMA-Punkte
    betrag_23?: number;     // GOZ-Betrag bei 2.3x
    wann?: string;          // Wann wird dieser Code angewendet
    dokumentation?: string; // Was muss dokumentiert werden
    tipp?: string;          // Optimierungs-Tipp
    maxProSitzung?: number; // Häufigkeitslimit
    ausschluesse?: string[]; // Nicht kombinierbar mit
}

export interface TreatmentPhase {
    phase: string;
    bedingung?: string;
    positionen: BillingCodeEntry[];
}

export interface TreatmentCatalog {
    id: string;
    titel: string;
    kategorie: string;
    versicherung: 'GKV' | 'PKV' | 'beide';
    beschreibung?: string;
    phasen: TreatmentPhase[];
    ausschluesse?: string[];
    haeufige_fehler?: string[];
}

export type InsuranceType = 'GKV' | 'PKV';

// ═══════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════

let _fuellungCatalog: TreatmentCatalog[] | null = null;
let _endoCatalog: TreatmentCatalog[] | null = null;
let _extraktionCatalog: TreatmentCatalog[] | null = null;

// ═══════════════════════════════════════════════════════════════
// LOADERS
// ═══════════════════════════════════════════════════════════════

/**
 * Lädt Füllung-Behandlungskatalog
 */
export function getFuellungCatalog(): TreatmentCatalog[] {
    if (!_fuellungCatalog) {
        // Dynamic import der JSON-Datei
        _fuellungCatalog = require('../behandlungen/fuellung.json') as TreatmentCatalog[];
    }
    return _fuellungCatalog;
}

/**
 * Holt alle Codes für eine bestimmte Phase
 */
export function getCodesForPhase(
    catalog: TreatmentCatalog[],
    phase: string,
    insuranceType: InsuranceType
): BillingCodeEntry[] {
    // Filter nach Versicherungstyp
    const relevantCatalogs = catalog.filter(c =>
        c.versicherung === 'beide' || c.versicherung === insuranceType
    );

    const codes: BillingCodeEntry[] = [];

    for (const cat of relevantCatalogs) {
        for (const p of cat.phasen) {
            if (p.phase.toLowerCase().includes(phase.toLowerCase())) {
                codes.push(...p.positionen);
            }
        }
    }

    return codes;
}

/**
 * Holt Code für Flächenzahl (Füllung)
 */
export function getFuellungCodeForSurfaces(
    surfaces: number,
    insuranceType: InsuranceType
): BillingCodeEntry | null {
    const catalog = getFuellungCatalog();

    // Finde die richtige Phase
    for (const cat of catalog) {
        if (cat.versicherung !== 'beide' && cat.versicherung !== insuranceType) continue;

        for (const phase of cat.phasen) {
            if (!phase.phase.toLowerCase().includes('füllung')) continue;

            for (const pos of phase.positionen) {
                // Match basierend auf Flächenzahl
                if (surfaces === 1 && (pos.code.includes('2060') || pos.code.includes('13a') || pos.code === 'BEMA_13')) {
                    return pos;
                }
                if (surfaces === 2 && (pos.code.includes('2080') || pos.code.includes('13b'))) {
                    return pos;
                }
                if (surfaces === 3 && (pos.code.includes('2100') || pos.code.includes('13c'))) {
                    return pos;
                }
                if (surfaces >= 4 && (pos.code.includes('2120') || pos.code.includes('13d'))) {
                    return pos;
                }
            }
        }
    }

    return null;
}

/**
 * Holt alle Anästhesie-Codes
 */
export function getAnesthesiaCodes(insuranceType: InsuranceType): BillingCodeEntry[] {
    const catalog = getFuellungCatalog();
    return getCodesForPhase(catalog, 'Anästhesie', insuranceType);
}

/**
 * Holt alle Kofferdam-Codes
 */
export function getKofferdamCodes(insuranceType: InsuranceType): BillingCodeEntry[] {
    const catalog = getFuellungCatalog();
    const codes = getCodesForPhase(catalog, 'Vorbereitung', insuranceType);
    return codes.filter(c => c.bezeichnung.toLowerCase().includes('kofferdam'));
}

/**
 * Holt Überkappungs-Codes (Cp/P)
 */
export function getCappingCodes(insuranceType: InsuranceType): BillingCodeEntry[] {
    const catalog = getFuellungCatalog();
    return getCodesForPhase(catalog, 'Überkappung', insuranceType);
}

// ═══════════════════════════════════════════════════════════════
// LOOKUP BY CODE
// ═══════════════════════════════════════════════════════════════

/**
 * Findet einen spezifischen Code in der Datenbank
 */
export function lookupCode(code: string): BillingCodeEntry | null {
    const catalog = getFuellungCatalog();

    for (const cat of catalog) {
        for (const phase of cat.phasen) {
            for (const pos of phase.positionen) {
                if (pos.code === code) {
                    return pos;
                }
            }
        }
    }

    return null;
}

/**
 * Holt Betrag für einen Code
 */
export function getCodeAmount(code: string, insuranceType: InsuranceType): number {
    const entry = lookupCode(code);
    if (!entry) return 0;

    if (insuranceType === 'GKV' && entry.punkte) {
        // BEMA-Punkte → Betrag (ca. 1.04€ pro Punkt, 2024)
        return entry.punkte * 1.04;
    }

    if (insuranceType === 'PKV' && entry.betrag_23) {
        return entry.betrag_23;
    }

    return 0;
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

export const BillingDatabase = {
    getFuellungCatalog,
    getFuellungCodeForSurfaces,
    getAnesthesiaCodes,
    getKofferdamCodes,
    getCappingCodes,
    getCodesForPhase,
    lookupCode,
    getCodeAmount
};

export default BillingDatabase;
