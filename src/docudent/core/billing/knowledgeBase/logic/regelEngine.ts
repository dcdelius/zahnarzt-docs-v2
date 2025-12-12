/**
 * RegressGuard - Zentrale Regel-Engine
 * 
 * Prüft ALLE Abrechnungsregeln aus der Knowledge Base
 * und verhindert Regress-Risiken behandlungsunabhängig.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type RegelTyp = 'ausschluss' | 'bedingung' | 'haeufigkeit' | 'dokumentation';
export type Schweregrad = 'regress' | 'warnung' | 'info';
export type PruefungSeverity = 'blocker' | 'warnung' | 'info';

export interface Regel {
    id: string;
    typ: RegelTyp;
    titel: string;
    beschreibung: string;
    betrifft: string[];
    regel: {
        operator: 'nur_wenn' | 'darf_nicht' | 'max_anzahl' | 'muss';
        bedingung?: string;
        wert?: number;
        zeitraum?: string;
        bezug?: string;
    };
    schweregrad: Schweregrad;
    quelle?: {
        dokument?: string;
        url?: string;
        paragraph?: string;
    };
}

export interface RegelPruefung {
    regelId: string;
    titel: string;
    severity: PruefungSeverity;
    message: string;
    betroffeneCodes: string[];
    dokumentationBenötigt?: string[];
    autoFix?: {
        action: 'remove' | 'add' | 'replace';
        codes?: string[];
        text?: string;
    };
}

export interface PruefungsKontext {
    codes: string[];
    dokumentation: string;
    zahnNummer?: number;
    insuranceType?: 'GKV' | 'PKV';
    existierendeCodes?: string[];  // Für Häufigkeitsprüfung
}

// ═══════════════════════════════════════════════════════════════
// REGEL-LADEN
// ═══════════════════════════════════════════════════════════════

// Import all rule files
import kombinationen from '../regeln/kombinationen.json';

// Cache für geladene Regeln
let alleRegeln: Regel[] | null = null;

/**
 * Lädt alle Regeln aus der Knowledge Base
 */
export function loadAllRules(): Regel[] {
    if (alleRegeln) return alleRegeln;

    alleRegeln = [
        ...(kombinationen as unknown as Regel[]),
        // Weitere Regel-Dateien können hier hinzugefügt werden:
        // ...bemaFrequenzregeln,
        // ...prothetikRegeln,
    ];

    console.log(`[RegressGuard] ${alleRegeln.length} Regeln geladen`);
    return alleRegeln;
}

/**
 * Findet alle Regeln die auf gegebene Codes zutreffen
 */
export function findApplicableRules(codes: string[]): Regel[] {
    const regeln = loadAllRules();
    return regeln.filter(regel =>
        regel.betrifft.some(code => codes.includes(code))
    );
}

// ═══════════════════════════════════════════════════════════════
// HAUPT-PRÜFFUNKTION
// ═══════════════════════════════════════════════════════════════

/**
 * Zentrale Prüffunktion - prüft ALLE Regeln
 */
export function pruefeRegeln(kontext: PruefungsKontext): RegelPruefung[] {
    const ergebnisse: RegelPruefung[] = [];
    const applicableRules = findApplicableRules(kontext.codes);

    for (const regel of applicableRules) {
        const pruefung = pruefeEinzelregel(regel, kontext);
        if (pruefung) {
            ergebnisse.push(pruefung);
        }
    }

    return ergebnisse;
}

/**
 * Prüft eine einzelne Regel
 */
function pruefeEinzelregel(regel: Regel, kontext: PruefungsKontext): RegelPruefung | null {
    switch (regel.regel.operator) {
        case 'darf_nicht':
            return pruefeAusschluss(regel, kontext);
        case 'nur_wenn':
            return pruefeBedingung(regel, kontext);
        case 'max_anzahl':
            return pruefeHaeufigkeit(regel, kontext);
        case 'muss':
            return pruefeDokumentation(regel, kontext);
        default:
            return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// AUSSCHLUSS-PRÜFUNG (darf_nicht)
// ═══════════════════════════════════════════════════════════════

/**
 * Prüft Ausschlussregeln (z.B. GOZ 2197 nicht mit GOZ 2060)
 */
function pruefeAusschluss(regel: Regel, kontext: PruefungsKontext): RegelPruefung | null {
    const betroffeneImInput = regel.betrifft.filter(code => kontext.codes.includes(code));

    // Ausschluss greift nur wenn MEHR als ein betroffener Code vorhanden ist
    if (betroffeneImInput.length > 1) {
        return {
            regelId: regel.id,
            titel: regel.titel,
            severity: regelSeverityToPruefung(regel.schweregrad),
            message: regel.beschreibung,
            betroffeneCodes: betroffeneImInput,
            autoFix: {
                action: 'remove',
                codes: [betroffeneImInput[0]], // Ersten entfernen als Vorschlag
                text: `${betroffeneImInput[0]} entfernen, da nicht mit ${betroffeneImInput.slice(1).join(', ')} kombinierbar`
            }
        };
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════
// BEDINGUNGS-PRÜFUNG (nur_wenn)
// ═══════════════════════════════════════════════════════════════

/**
 * Prüft Bedingungsregeln (z.B. BEMA 12 nur mit Kofferdam)
 */
function pruefeBedingung(regel: Regel, kontext: PruefungsKontext): RegelPruefung | null {
    const bedingung = regel.regel.bedingung?.toLowerCase() || '';
    const doku = kontext.dokumentation.toLowerCase();

    // Extrahiere benötigte Keywords aus der Bedingung
    const keywords = extractKeywordsFromBedingung(bedingung);
    const missingKeywords = keywords.filter(kw => !doku.includes(kw));

    // Prüfe ob mindestens ein erforderliches Keyword vorhanden ist
    // Bei ODER-Bedingungen: mindestens eins muss erfüllt sein
    if (bedingung.includes(' oder ')) {
        const hasAny = keywords.some(kw => doku.includes(kw));
        if (!hasAny && keywords.length > 0) {
            return {
                regelId: regel.id,
                titel: regel.titel,
                severity: regelSeverityToPruefung(regel.schweregrad),
                message: `${regel.beschreibung}\n\n⚠️ Dokumentation fehlt: ${keywords.join(' ODER ')}`,
                betroffeneCodes: regel.betrifft.filter(c => kontext.codes.includes(c)),
                dokumentationBenötigt: keywords
            };
        }
    } else if (bedingung.includes(' und ')) {
        // Bei UND-Bedingungen: alle müssen erfüllt sein
        if (missingKeywords.length > 0) {
            return {
                regelId: regel.id,
                titel: regel.titel,
                severity: regelSeverityToPruefung(regel.schweregrad),
                message: `${regel.beschreibung}\n\n⚠️ Fehlende Dokumentation: ${missingKeywords.join(', ')}`,
                betroffeneCodes: regel.betrifft.filter(c => kontext.codes.includes(c)),
                dokumentationBenötigt: missingKeywords
            };
        }
    }

    return null;
}

/**
 * Extrahiert Keywords aus einer Bedingungsstring
 */
function extractKeywordsFromBedingung(bedingung: string): string[] {
    const keywords: string[] = [];

    // Bekannte Schlüsselwörter
    const knownKeywords = [
        'kofferdam', 'blutstillung', 'zahnfleisch',
        'profunda', 'pulpanah', 'pulpaeröffnung',
        'ca(oh)2', 'calciumhydroxid', 'mta',
        'matrize', 'keil', 'schriftlich'
    ];

    for (const kw of knownKeywords) {
        if (bedingung.includes(kw)) {
            keywords.push(kw);
        }
    }

    return keywords;
}

// ═══════════════════════════════════════════════════════════════
// HÄUFIGKEITS-PRÜFUNG (max_anzahl)
// ═══════════════════════════════════════════════════════════════

/**
 * Prüft Häufigkeitsregeln (z.B. max 1x pro Kieferhälfte)
 */
function pruefeHaeufigkeit(regel: Regel, kontext: PruefungsKontext): RegelPruefung | null {
    const maxAnzahl = regel.regel.wert || 1;
    const bezug = regel.regel.bezug || 'pro_sitzung';

    // Zähle betroffene Codes
    const count = kontext.codes.filter(c => regel.betrifft.includes(c)).length;

    // Bei pro_kieferhaelfte: Prüfung vereinfacht (annahme: wir prüfen nur aktuelle Sitzung)
    if (bezug === 'pro_kieferhaelfte' || bezug === 'pro_sitzung') {
        if (count > maxAnzahl) {
            return {
                regelId: regel.id,
                titel: regel.titel,
                severity: regelSeverityToPruefung(regel.schweregrad),
                message: `${regel.beschreibung}\n\n⚠️ ${count}x abgerechnet, aber max. ${maxAnzahl}x erlaubt ${bezug}`,
                betroffeneCodes: regel.betrifft.filter(c => kontext.codes.includes(c)),
                autoFix: {
                    action: 'remove',
                    text: `Überzählige Codes entfernen`
                }
            };
        }
    }

    // Info-Regeln für je_kanal etc. - kein Fehler, nur Hinweis
    if (regel.schweregrad === 'info') {
        return null; // Keine Warnung für Info-Regeln
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════
// DOKUMENTATIONS-PRÜFUNG (muss)
// ═══════════════════════════════════════════════════════════════

/**
 * Prüft Dokumentationspflichten (z.B. MKV schriftlich)
 */
function pruefeDokumentation(regel: Regel, kontext: PruefungsKontext): RegelPruefung | null {
    const bedingung = regel.regel.bedingung?.toLowerCase() || '';
    const doku = kontext.dokumentation.toLowerCase();

    const requiredKeywords = extractKeywordsFromBedingung(bedingung);
    const missing = requiredKeywords.filter(kw => !doku.includes(kw));

    if (missing.length > 0) {
        return {
            regelId: regel.id,
            titel: regel.titel,
            severity: regelSeverityToPruefung(regel.schweregrad),
            message: `${regel.beschreibung}\n\n⚠️ Dokumentation erforderlich: ${missing.join(', ')}`,
            betroffeneCodes: regel.betrifft.filter(c => kontext.codes.includes(c)),
            dokumentationBenötigt: missing
        };
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Mappt Regel-Schweregrad auf Prüfungs-Severity
 */
function regelSeverityToPruefung(schweregrad: Schweregrad): PruefungSeverity {
    switch (schweregrad) {
        case 'regress': return 'blocker';
        case 'warnung': return 'warnung';
        case 'info': return 'info';
        default: return 'warnung';
    }
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * Quick-Check: Gibt es Blocker?
 */
export function hasBlockers(kontext: PruefungsKontext): boolean {
    const pruefungen = pruefeRegeln(kontext);
    return pruefungen.some(p => p.severity === 'blocker');
}

/**
 * Quick-Get: Nur Blocker/Warnungen
 */
export function getBlockersAndWarnings(kontext: PruefungsKontext): RegelPruefung[] {
    const pruefungen = pruefeRegeln(kontext);
    return pruefungen.filter(p => p.severity === 'blocker' || p.severity === 'warnung');
}

export default {
    pruefeRegeln,
    hasBlockers,
    getBlockersAndWarnings,
    loadAllRules,
    findApplicableRules
};
