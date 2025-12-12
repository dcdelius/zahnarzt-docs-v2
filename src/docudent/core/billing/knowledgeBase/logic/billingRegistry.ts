/**
 * Billing Registry
 * 
 * Dispatcher für behandlungsspezifische Billing-Module.
 * Leitet Anfragen an das richtige Modul weiter.
 */

import type { BonusStatus } from './festzuschussMapper';

// ═══════════════════════════════════════════════════════════════
// SHARED TYPES
// ═══════════════════════════════════════════════════════════════

export type InsuranceType = 'GKV' | 'PKV';

export interface ExtractedData {
    tooth?: string;
    teeth?: string[];
    surfaces?: string[];
    diagnosis?: string;
    anesthesia?: string;
    material?: string;
    costs?: string;
    matrix?: boolean;
    stift?: boolean;
    stiftart?: 'konfektioniert' | 'gegossen';
    nachEndo?: boolean;
    // Behandlungsspezifisch
    kanaele?: number;         // Endo: Anzahl Kanäle
    wurzeln?: number;         // WSR: Anzahl Wurzeln
    pfeiler?: string[];       // Brücke
    fehlend?: string[];       // Brücke/Prothese
    versorgungsart?: 'krone' | 'bruecke' | 'prothese' | 'fuellung' | 'endo' | 'extraktion' | 'wsr';
}

export interface TreatmentDefaults {
    dokumentation?: {
        aufklaerungImmer?: boolean;
        alternativenBesprochen?: boolean;
        risikenErklaert?: boolean;
    };
    anaesthesie?: {
        ukSeitenzahn?: 'leitung' | 'infiltration' | 'ila' | 'fragen';
        oberflaecheImmer?: boolean;
    };
    methodik?: {
        kofferdamStandard?: boolean;
        kariesdetektorBeiZweifel?: boolean;
    };
    tiefKaries?: {
        unterfuellungStandard?: boolean;
    };
    finishing?: {
        fluoridImmer?: boolean;
        politurImmer?: boolean;
    };
}

export interface BillingSuggestion {
    id: string;
    type: 'festzuschuss' | 'bema' | 'goz' | 'warnung' | 'optimierung';
    code?: string;
    label: string;
    description?: string;  // Optional - not always needed
    betrag?: number;
    priority: 'hoch' | 'mittel' | 'niedrig';
    autoAccept?: boolean;
    textSnippet?: string;
}

export interface BillingInferenceResult {
    suggestions: BillingSuggestion[];
    billingCodes: string[];
    verblendbereich: boolean;
    befundklasse: number;
    insuranceType: InsuranceType;
    // Optional je Behandlung
    zahnSituation?: Record<string, any>;
    lueckeSituation?: Record<string, any>;
    befundResult?: Record<string, any>;
    festzuschuss?: Record<string, any>;
    gleichartResult?: Record<string, any>;
    konflikte?: Record<string, any>;
    gozBegruendungen?: any[];
}

export interface BillingContext {
    extracted: ExtractedData;
    insuranceType: InsuranceType;
    bonusStatus: BonusStatus;
    defaults?: TreatmentDefaults;
    rawDictation?: string;
    /** GKV mit Zuzahlung (Mehrkostenvereinbarung) → Mixed BEMA + GOZ */
    hasZuzahlung?: boolean;
    /** Vereinbarter Zuzahlungsbetrag in Euro */
    zuzahlungBetrag?: number;
}

// ═══════════════════════════════════════════════════════════════
// MODULE INTERFACE
// ═══════════════════════════════════════════════════════════════

/**
 * Jedes Behandlungsmodul implementiert dieses Interface
 */
export interface TreatmentBillingModule {
    /** Eindeutige ID (z.B. 'fuellung', 'endo', 'extraktion') */
    id: string;

    /** Behandlungsname für UI */
    label: string;

    /** Prüft ob dieses Modul für die extrahierten Daten zuständig ist */
    canHandle(extracted: ExtractedData): boolean;

    /** Führt die Billing-Inference durch */
    infer(context: BillingContext): BillingInferenceResult;
}

// ═══════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════

const moduleRegistry: Map<string, TreatmentBillingModule> = new Map();

/**
 * Registriert ein Billing-Modul
 */
export function registerBillingModule(module: TreatmentBillingModule): void {
    moduleRegistry.set(module.id, module);
    console.log(`[BillingRegistry] Modul registriert: ${module.id}`);
}

/**
 * Holt ein Modul nach ID
 */
export function getBillingModule(id: string): TreatmentBillingModule | undefined {
    return moduleRegistry.get(id);
}

/**
 * Findet das passende Modul für die extrahierten Daten
 */
export function findModuleForData(extracted: ExtractedData): TreatmentBillingModule | undefined {
    // 1. Explizite versorgungsart?
    if (extracted.versorgungsart) {
        const exactMatch = moduleRegistry.get(extracted.versorgungsart);
        if (exactMatch) return exactMatch;
    }

    // 2. Heuristik
    for (const module of moduleRegistry.values()) {
        if (module.canHandle(extracted)) {
            return module;
        }
    }

    return undefined;
}

/**
 * Hauptfunktion: Dispatched zur richtigen Modul-Inference + RegressGuard
 */
export function inferBillingV2(context: BillingContext): BillingInferenceResult {
    const module = findModuleForData(context.extracted);

    if (!module) {
        console.warn('[BillingRegistry] Kein passendes Modul gefunden');
        return {
            suggestions: [{
                id: 'no_module',
                type: 'warnung',
                label: 'Behandlungstyp nicht erkannt',
                description: 'Bitte Behandlungsart manuell auswählen',
                priority: 'hoch'
            }],
            billingCodes: [],
            verblendbereich: false,
            befundklasse: 0,
            insuranceType: context.insuranceType
        };
    }

    console.log(`[BillingRegistry] Verwende Modul: ${module.id}`);
    const result = module.infer(context);

    // ═══════════════════════════════════════════════════════════
    // REGRESSGUARD: Prüfe alle Regeln (optional, falls verfügbar)
    // ═══════════════════════════════════════════════════════════
    // Note: regelEngine wird hier NICHT geladen um require() zu vermeiden.
    // Die Regress-Prüfungen werden bereits in checkCombinationConflicts()
    // in treatmentEngine.ts durchgeführt, das kombinationen.json nutzt.
    // Falls zusätzliche Regeln benötigt werden, sollten diese
    // ebenfalls über statische ESM-Imports geladen werden.

    return result;
}

/**
 * Alle registrierten Module
 */
export function getAllModules(): TreatmentBillingModule[] {
    return Array.from(moduleRegistry.values());
}
