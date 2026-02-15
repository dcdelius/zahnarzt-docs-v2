/**
 * Abrechnungs-Wissensdatenbank Schema
 * Supersmart Billing Knowledge Base
 */

// ═══════════════════════════════════════════════════════════════
// ABRECHNUNGSCODE (BEMA/GOZ)
// ═══════════════════════════════════════════════════════════════

export interface BillingCode {
    id: string;                      // z.B. "BEMA_13c"
    system: 'BEMA' | 'GOZ';
    nummer: string;                  // z.B. "13c"
    bezeichnung: string;             // Offizielle Bezeichnung
    kurzform?: string;               // z.B. "F3"

    // Bewertung
    punkte?: number;                 // BEMA Punkte
    honorar?: {                      // GOZ Honorar
        einfach: number;             // 1,0-fach
        standard: number;            // 2,3-fach (Regelfall)
        hoch: number;                // 3,5-fach (Schwellenwert)
    };

    // Kategorisierung
    kategorie: BillingCategory;
    subkategorie?: string;

    // Leistungsinhalt
    beschreibung?: string;
    enthaelt?: string[];             // Was ist inkludiert?

    // Stand
    gueltigAb?: string;              // Datum
    gueltigBis?: string;
}

export type BillingCategory =
    | 'diagnostik'
    | 'roentgen'
    | 'anaesthesie'
    | 'konservierend'
    | 'endodontie'
    | 'parodontologie'
    | 'chirurgie'
    | 'prothetik'
    | 'kfo'
    | 'prophylaxe'
    | 'sonstiges';

// ═══════════════════════════════════════════════════════════════
// ABRECHNUNGSREGEL
// ═══════════════════════════════════════════════════════════════

export interface BillingRule {
    id: string;
    typ: RuleType;
    titel: string;
    beschreibung: string;

    // Betroffene Codes
    betrifft: string[];              // z.B. ["BEMA_12", "BEMA_13c"]

    // Regellogik
    regel: {
        operator: RuleOperator;
        bedingung?: string;          // z.B. "Kofferdam dokumentiert"
        wert?: number;               // z.B. 1 (max 1x)
        zeitraum?: RuleTimeframe;
        bezug?: string;              // z.B. "pro_zahn", "pro_kieferhaelfte"
    };

    // Konsequenz bei Verstoß
    schweregrad: 'info' | 'warnung' | 'fehler' | 'regress';

    // Quellenangabe (wichtig für Glaubwürdigkeit!)
    quelle: {
        dokument: string;
        paragraph?: string;
        seite?: string;
        url?: string;
        stand?: string;
    };
}

export type RuleType =
    | 'kombination'      // Darf zusammen abgerechnet werden
    | 'ausschluss'       // Darf NICHT zusammen
    | 'haeufigkeit'      // Wie oft pro Zeitraum
    | 'dokumentation'    // Was muss dokumentiert sein
    | 'bedingung'        // Nur wenn X erfüllt
    | 'begruendung';     // Muss begründet werden

export type RuleOperator =
    | 'muss'             // Muss vorhanden sein
    | 'darf_nicht'       // Darf nicht kombiniert werden
    | 'nur_wenn'         // Nur erlaubt wenn Bedingung erfüllt
    | 'max_anzahl'       // Maximal X mal
    | 'min_abstand'      // Mindestabstand
    | 'erfordert';       // Erfordert anderen Code

export type RuleTimeframe =
    | 'pro_sitzung'
    | 'pro_tag'
    | 'pro_quartal'
    | 'pro_halbjahr'
    | 'pro_jahr'
    | 'pro_behandlungsfall'
    | 'innerhalb_2_jahre';

// ═══════════════════════════════════════════════════════════════
// OPTIMIERUNGSTIPP
// ═══════════════════════════════════════════════════════════════

export interface BillingTip {
    id: string;
    titel: string;
    beschreibung: string;

    // Anwendungsbereich
    kategorie: BillingCategory;
    behandlung?: string;             // Spezifische Behandlung
    versicherung: 'GKV' | 'PKV' | 'MKV' | 'alle';

    // Der eigentliche Tipp
    strategie: string;

    // Beispiel mit Zahlen
    beispiel?: {
        situation: string;
        vorher: {
            codes: string[];
            betrag?: string;
        };
        nachher: {
            codes: string[];
            betrag?: string;
        };
        differenz?: string;
    };

    // Rechtliche Einordnung
    legalitaet: 'standard' | 'legal_optimiert' | 'grauzone';
    regressrisiko: 'kein' | 'niedrig' | 'mittel' | 'hoch';

    // Voraussetzungen
    voraussetzungen?: string[];

    // Quelle
    quelle?: {
        typ: 'gesetz' | 'kommentar' | 'seminar' | 'praxis';
        referenz: string;
    };

    // Tags für Suche
    tags: string[];
}

// ═══════════════════════════════════════════════════════════════
// FALLBEISPIEL
// ═══════════════════════════════════════════════════════════════

export interface BillingCase {
    id: string;
    titel: string;
    kategorie: BillingCategory;

    // Ausgangssituation
    situation: {
        patient: 'GKV' | 'PKV';
        befund: string;
        behandlung: string;
    };

    // Korrekte Abrechnung
    korrekt: {
        codes: string[];
        begruendung: string;
        gesamtErtrag?: string;
    };

    // Häufiger Fehler (optional)
    fehler?: {
        codes: string[];
        problem: string;
        konsequenz: string;
    };

    // Optimierte Version (optional)
    optimiert?: {
        codes: string[];
        strategie: string;
        mehrertrag?: string;
    };
}

// ═══════════════════════════════════════════════════════════════
// HELPER TYPES
// ═══════════════════════════════════════════════════════════════

export interface KnowledgeBase {
    kataloge: {
        bema: Record<string, BillingCode>;
        goz: Record<string, BillingCode>;
        punktwert: {
            bema: number;  // Aktueller BEMA-Punktwert in €
            stand: string;
        };
    };
    regeln: BillingRule[];
    tipps: BillingTip[];
    faelle: BillingCase[];
}

// Für LLM-Context
export interface BillingContext {
    behandlungsart: string;
    versicherung: 'GKV' | 'PKV';
    relevanteCodes: BillingCode[];
    relevanteRegeln: BillingRule[];
    relevanteTipps: BillingTip[];
    relevanteFaelle: BillingCase[];
}
