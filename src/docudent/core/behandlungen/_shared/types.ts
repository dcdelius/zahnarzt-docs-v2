/**
 * TREATMENT DEFINITION TYPES
 * 
 * Central type definitions for treatment configurations.
 * Each treatment has ONE definition file with all rules.
 */

// ========================================
// CORE TYPES
// ========================================

export type InsuranceType = 'GKV' | 'PKV';

// ========================================
// CONFIDENCE MODEL (V1)
// ========================================

/**
 * Quelle eines extrahierten Wertes
 * Priorität: user > dictation > default > inferred
 */
export type Source = 'dictation' | 'user' | 'default' | 'inferred' | 'settings';

/**
 * Feldklasse für Threshold-Bestimmung
 * - befund: Klinische Befunde (ViPr, Perk, Diagnose) - höchster Threshold
 * - meta: Metadaten (Zahn, Flächen, Material) - mittlerer Threshold
 * - prozess: Prozessschritte (Politur, Okklusion) - niedriger Threshold
 */
export type FieldClass = 'befund' | 'meta' | 'prozess';

/**
 * Thresholds pro Feldklasse
 * Unter diesen Werten wird needsConfirmation = true gesetzt
 */
export const FIELD_THRESHOLDS: Record<FieldClass, number> = {
    befund: 0.85,   // Klinische Befunde/Diagnosen
    meta: 0.70,     // Zahn, Flächen, Material
    prozess: 0.60   // Prozessschritte
};

/**
 * Mapping: Welches Feld gehört zu welcher Klasse
 */
export const FIELD_CLASSES: Record<string, FieldClass> = {
    // Befund (höchster Threshold)
    vitality: 'befund',
    percussion: 'befund',
    spontaneous_pain: 'befund',
    diagnosis: 'befund',

    // Meta (mittlerer Threshold)
    tooth: 'meta',
    surfaces: 'meta',
    material: 'meta',
    shade: 'meta',

    // Prozess (niedriger Threshold)
    anesthesia: 'prozess',
    isolation: 'prozess',
    excavation: 'prozess',
    adhesive: 'prozess',
    layering: 'prozess',
    fluoridation: 'prozess'
};

/**
 * Extrahiertes Feld mit Confidence-Metadaten
 */
export interface FieldValue<T> {
    value: T | null;
    source: Source;
    confidence: number;          // 0-1, deterministisch berechnet
    evidence?: string[];         // Kurze Textsnippets aus Diktat
    needsConfirmation: boolean;  // true wenn unter Threshold
}

/**
 * Chip-Zustand mit Source-Tracking
 */
export interface ChipState {
    id: string;
    active: boolean;
    source: Source;
    confidence: number;
    needsConfirmation: boolean;
}

// ========================================
// TEXT LENGTH (3 Stufen)
// ========================================

export type TextLength = 'kurz' | 'mittel' | 'lang';

export interface TextSnippets {
    lang: string;     // Ausführlich - Maximum forensische Details
    mittel: string;   // Standard - Balanciert
    kurz: string;     // Kompakt - Minimum
}

/**
 * Billing Reference - codes for each insurance scenario
 * 
 * GKV = Kassenleistung (BEMA)
 * PKV = Privatpatient (GOZ)
 * MKV = Mehrkostenvereinbarung bei GKV (GOZ für Zuzahlung)
 * 
 * Bei MKV werden BEIDE abgerechnet: GKV (Kasse) + MKV (Privatrechnung)
 */
export interface BillingRef {
    GKV?: string;  // BEMA code key (Kassenleistung)
    PKV?: string;  // GOZ code key (Privatpatient)
    MKV?: string;  // GOZ code key (Mehrkosten bei GKV+Zuzahlung)
}

export interface DataPatch {
    field: string;
    value: any;
}

// ========================================
// REQUIRED OUTPUT (always in text)
// ========================================

export interface RequiredOutput {
    id: string;
    textLine: string;           // Line in summary list (e.g. "• Exkavation bis sondenhart")
    textSnippet?: string;       // Legacy: Full sentence for procedure section
    textSnippets?: TextSnippets; // NEW: 3 length variants
    billingRefs?: BillingRef;   // Optional billing codes
    dataPatches?: DataPatch[];  // Optional data patches
}

// ========================================
// CHIP (user-toggleable)
// ========================================

export interface ChipDefinition {
    id: string;
    label: string;                      // UI label
    description?: string;               // Tooltip
    textLine: string;                   // Line in summary (can be empty)
    textSnippet?: string;               // Legacy: single snippet (backwards compat)
    textSnippets?: TextSnippets;        // NEW: 3 length variants
    billingRefs: BillingRef;            // Billing codes per insurance
    dataPatches?: DataPatch[];          // Data patches when active
    mutuallyExclusiveWith?: string[];   // Can't be active together with these
    defaultActive?: boolean;            // Active by default?
    conditionHint?: string;             // Hint when this chip should be used
    category?: 'befund' | 'leistung';   // Where to display: befund line or leistung list
    showInQuickView?: boolean;          // Show in compact chip bar (max 5)
}

// ========================================
// LOGIC RULE (incompatibility checks)
// ========================================

export interface LogicRule {
    id: string;
    incompatible?: string[];    // These chips can't be active together with...
    with?: string[];            // ...these chips
    requires?: string;          // Condition that must be true
    for?: string[];             // ...for these chips to be valid
    reason: string;             // Explanation
}

// ========================================
// BILLING RULE (automatic code generation)
// ========================================

export interface BillingRule {
    id: string;
    description: string;
    trigger: string;                    // Field to check (e.g. 'surfaces.length')
    logic: Record<string | number, BillingRef>;  // Mapping value → codes
}

// ========================================
// UPSELL (suggestion after extraction)
// ========================================

export interface UpsellDefinition {
    id: string;
    label: string;
    description?: string;
    reasoning: string;                  // Why suggest this?
    relatedChipId?: string;             // Chip this upsell relates to (for filtering)
    showWhen: {
        missing?: string;               // Show if field is missing
        fieldContains?: {               // Show if field contains value
            field: string;
            value: string;
        };
        fieldContainsAny?: {            // Show if field contains any of the values
            field: string;
            values: string[];
        };
    };
    textLine: string;
    textSnippet: string;
    billingRefs: BillingRef;
    dataPatches?: DataPatch[];
}

// ========================================
// CONDITIONAL RULE (context-dependent requirements)
// ========================================

export interface ConditionalRule {
    id: string;
    trigger: {
        field?: string;
        equals?: any;
        greaterThan?: number;
        fieldContains?: {
            field: string;
            value: string;
        };
    };
    requiredFields: string[];          // Fields that MUST be documented
    warningIfMissing: string;          // Warning message
}

// ========================================
// TREATMENT DEFINITION (main structure)
// ========================================

export interface TreatmentDefinition {
    id: string;
    label: string;
    category: 'conservative' | 'prosthetics' | 'surgery' | 'prophylaxis' | 'admin';
    icon?: string;

    // Required outputs (ALWAYS in text)
    requiredOutputs: RequiredOutput[];

    // Chips (user-toggleable)
    chips: ChipDefinition[];

    // Billing rules (automatic)
    billingRules: BillingRule[];

    // Upsells (suggestions)
    upsells: UpsellDefinition[];

    // Conditional rules (context-dependent documentation)
    conditionalRules?: ConditionalRule[];

    // Logic rules (incompatibility checks)
    logicRules?: LogicRule[];

    // Prose text for documentation (single string - backwards compat)
    consentText?: string;       // Aufklärungstext (beginning of prose)
    dismissalText?: string;     // Entlassungstext (end of prose)

    // NEW: 3-tier text lengths
    consentTexts?: TextSnippets;    // Aufklärungstext in 3 Längen
    dismissalTexts?: TextSnippets;  // Entlassungstext in 3 Längen

    // Blueprint reference
    blueprintId: string;

    // Default values for fields
    defaults?: Record<string, any>;
}

// ========================================
// TREATMENT ENGINE CONTEXT
// ========================================

export interface TreatmentContext {
    treatment: TreatmentDefinition;
    insuranceType: InsuranceType;
    activeChips: string[];          // IDs of active chips
    extractedData: Record<string, any>;
    acceptedUpsells: string[];      // IDs of accepted upsells
    textLength?: TextLength;        // NEW: Text output length (kurz/mittel/lang), default: mittel
}

export interface TreatmentOutput {
    textLines: string[];            // Summary list items
    procedureSnippets: string[];    // Procedure section items
    billingCodes: string[];         // Resolved billing codes
    dataPatches: Record<string, any>; // All data patches applied
}

// ========================================
// EXTENDED EXTRACTION (für Zusatzinfos)
// ========================================

/**
 * Extrahierte Daten aus Diktat inkl. Freitext-Zusatzinfos
 * Diese werden vom LLM extrahiert und gehen nicht verloren!
 */
export interface ExtractedDataWithExtras {
    // Standard-Felder (strukturiert)
    tooth?: string;
    surfaces?: string[];
    diagnosis?: string;
    material?: string;
    shade?: string;
    costs?: string;             // Kosten für Patient (Kostenaufklärung)
    kosten?: string;            // Alias für costs

    // NEU: Zusatzinfos die nicht in Chips passen
    anamnese?: string[];        // Relevante Anamnese (Medikamente, Vorerkrankungen)
    komplikationen?: string[];  // Aufgetretene Komplikationen
    zusatzinfos?: string[];     // Beratungen, Besonderheiten
    hinweise?: string[];        // Nachsorge-Hinweise, Kontraindikationen
}

/**
 * Finaler Output mit allen Sektionen
 */
export interface FinalDocumentation {
    uebersicht: {
        header: string;
        befund: string;
        leistungen: string[];
        codes: string[];
        kosten?: string | null;  // Kosten für Kostenaufklärung
    };
    fliesstext: string;
    zusatzinfos: string[];      // Alle gesammelten Zusatzinfos
}

