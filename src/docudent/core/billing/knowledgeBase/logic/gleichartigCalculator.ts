/**
 * Gleichartig Calculator
 * 
 * Berechnet BEMA/GOZ-Splitting für gleichartige Versorgungen
 * bei GKV-Patienten.
 * 
 * REFACTORED: Nutzt jetzt lookupBillingCode() aus treatmentEngine
 * statt hardcodierter Punktwerte.
 */

import { berechneFestzuschuss, BonusStatus, FestzuschussResult } from './festzuschussMapper';
import { lookupBillingCode } from './treatmentEngine';
import splittingRegeln from '../regeln/splitting_regeln.json';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type Versorgungsart = 'regelversorgung' | 'gleichartig' | 'andersartig';

export interface BEMAPosition {
    code: string;
    bezeichnung: string;
    punkte: number;
    anzahl: number;
    betrag: number;
}

export interface GOZPosition {
    code: string;
    bezeichnung: string;
    faktor: number;
    betrag: number;
    begruendung?: string;
}

export interface LaborKosten {
    belAnteil: number;        // BEL-II Kassenlabor
    privatMehrkosten: number; // Differenz Privatlabor
    beschreibung: string;
}

export interface GleichartResult {
    versorgungsart: Versorgungsart;
    versorgungId: string;
    versorgungName: string;

    // BEMA-Anteil (Kassenabrechnung)
    bema: BEMAPosition[];
    bemaSumme: number;

    // GOZ-Mehrkosten (Privatrechnung an Patient)
    gozMehrkosten: GOZPosition[];
    gozSumme: number;

    // Festzuschuss
    festzuschuss: FestzuschussResult;

    // Labor
    labor: LaborKosten;

    // Gesamtkosten
    gesamtkosten: number;
    kassenAnteil: number;     // BEMA + FZ
    patientAnteil: number;    // GOZ + Labor-Mehrkosten + FZ-Eigenanteil

    // Nicht berechenbar (Warnung)
    nichtBerechenbar: { code: string; grund: string }[];
}

// ═══════════════════════════════════════════════════════════════
// BEMA PUNKTWERTE - jetzt aus Katalog!
// ═══════════════════════════════════════════════════════════════

const BEMA_PUNKTWERT = 1.0492; // Durchschnitt 2024 (variiert je nach KZV)

/**
 * Holt BEMA-Daten aus dem zentralen Katalog (bema.json)
 * Keine hardcodierten Werte mehr!
 */
function getBEMAData(code: string): { punkte: number; bezeichnung: string } | undefined {
    const data = lookupBillingCode(code);
    if (!data) return undefined;
    return {
        punkte: data.punkte || 0,
        bezeichnung: data.bezeichnung || code
    };
}

/**
 * Holt GOZ-Daten aus dem zentralen Katalog (goz.json)
 * Keine hardcodierten Werte mehr!
 */
function getGOZData(code: string): { einfach: number; bezeichnung: string } | undefined {
    const data = lookupBillingCode(code);
    if (!data) return undefined;
    // GOZ hat betrag_23 = 2.3-fach, einfach = betrag_23 / 2.3
    const einfach = data.betrag_23 ? data.betrag_23 / 2.3 : 0;
    return {
        einfach,
        bezeichnung: data.bezeichnung || code
    };
}

// ═══════════════════════════════════════════════════════════════
// HAUPTFUNKTIONEN
// ═══════════════════════════════════════════════════════════════

/**
 * Findet die Splitting-Regel für eine Versorgung
 */
export function findeSplittingRegel(versorgungId: string): typeof splittingRegeln.versorgungen[0] | undefined {
    return splittingRegeln.versorgungen.find(v => v.id === versorgungId);
}

/**
 * Berechnet BEMA-Positionen basierend auf der Splitting-Regel
 * REFACTORED: Nutzt jetzt lookupBillingCode statt hardcodierter Map
 */
function berechneBEMAPositionen(
    codes: string[],
    anzahlen: Record<string, number> = {}
): BEMAPosition[] {
    const positionen: BEMAPosition[] = [];

    for (const code of codes) {
        // Hole Daten aus zentralem Katalog!
        const bemaData = getBEMAData(code);
        if (!bemaData) {
            console.warn(`BEMA-Code ${code} nicht im Katalog (bema.json) gefunden`);
            continue;
        }

        const anzahl = anzahlen[code] || 1;
        const betrag = bemaData.punkte * BEMA_PUNKTWERT * anzahl;

        positionen.push({
            code,
            bezeichnung: bemaData.bezeichnung,
            punkte: bemaData.punkte,
            anzahl,
            betrag: Math.round(betrag * 100) / 100
        });
    }

    return positionen;
}

/**
 * Berechnet GOZ-Mehrkosten basierend auf der Splitting-Regel
 * REFACTORED: Nutzt jetzt lookupBillingCode statt hardcodierter Map
 */
function berechneGOZMehrkosten(
    berechenbar: { code: string; bezeichnung: string; faktor?: string }[],
    faktor: number = 2.3
): GOZPosition[] {
    const positionen: GOZPosition[] = [];

    for (const item of berechenbar) {
        // Hole Daten aus zentralem Katalog!
        const gozData = getGOZData(item.code);
        if (!gozData) {
            console.warn(`GOZ-Code ${item.code} nicht im Katalog (goz.json) gefunden`);
            continue;
        }

        const betrag = gozData.einfach * faktor;

        positionen.push({
            code: item.code,
            bezeichnung: item.bezeichnung || gozData.bezeichnung,
            faktor,
            betrag: Math.round(betrag * 100) / 100
        });
    }

    return positionen;
}

/**
 * Hauptfunktion: Berechnet gleichartige Versorgung
 */
export function berechneGleichartVersorgung(
    versorgungId: string,
    befunde: string[],
    options: {
        bonusStatus?: BonusStatus;
        gozFaktor?: number;
        anzahlen?: Record<string, number>;
        laborMehrkosten?: number;
    } = {}
): GleichartResult {
    const {
        bonusStatus = 'ohne',
        gozFaktor = 2.3,
        anzahlen = {},
        laborMehrkosten = 0
    } = options;

    // Finde Splitting-Regel
    const regel = findeSplittingRegel(versorgungId);
    if (!regel) {
        throw new Error(`Keine Splitting-Regel für ${versorgungId} gefunden`);
    }

    // Berechne BEMA-Anteil
    const bemaPositionen = berechneBEMAPositionen(regel.bema_anteil.codes, anzahlen);
    const bemaSumme = bemaPositionen.reduce((sum, p) => sum + p.betrag, 0);

    // Berechne GOZ-Mehrkosten
    const gozPositionen = berechneGOZMehrkosten(
        regel.goz_mehrkosten.berechenbar || [],
        gozFaktor
    );
    const gozSumme = gozPositionen.reduce((sum, p) => sum + p.betrag, 0);

    // Berechne Festzuschuss
    const festzuschuss = berechneFestzuschuss(befunde, bonusStatus);

    // Labor-Kosten (vereinfacht)
    const labor: LaborKosten = {
        belAnteil: 150, // Beispielwert BEL-II
        privatMehrkosten: laborMehrkosten,
        beschreibung: `${regel.labor?.bel_anteil || 'BEL-II'} + ${regel.labor?.privat_mehrkosten || 'Mehrkosten'}`
    };

    // Nicht berechenbare Positionen als Warnung
    const nichtBerechenbar = (regel.goz_mehrkosten.nicht_berechenbar || []).map(item => ({
        code: item.code,
        grund: item.grund
    }));

    // Gesamtberechnung
    const gesamtkosten = bemaSumme + gozSumme + labor.belAnteil + labor.privatMehrkosten;
    const kassenAnteil = bemaSumme + festzuschuss.gesamtbetrag + labor.belAnteil;
    const patientAnteil = gozSumme + labor.privatMehrkosten + (gesamtkosten - kassenAnteil);

    return {
        versorgungsart: 'gleichartig',
        versorgungId,
        versorgungName: regel.name,
        bema: bemaPositionen,
        bemaSumme: Math.round(bemaSumme * 100) / 100,
        gozMehrkosten: gozPositionen,
        gozSumme: Math.round(gozSumme * 100) / 100,
        festzuschuss,
        labor,
        gesamtkosten: Math.round(gesamtkosten * 100) / 100,
        kassenAnteil: Math.round(kassenAnteil * 100) / 100,
        patientAnteil: Math.round(patientAnteil * 100) / 100,
        nichtBerechenbar
    };
}

/**
 * Prüft ob ein GOZ-Code neben BEMA berechenbar ist
 */
export function istGOZBerechenbar(
    gozCode: string,
    versorgungId: string
): { berechenbar: boolean; grund?: string } {
    const regel = findeSplittingRegel(versorgungId);
    if (!regel) {
        return { berechenbar: true }; // Ohne Regel erlauben
    }

    // Prüfe nicht_berechenbar Liste
    const nichtBerechenbar = regel.goz_mehrkosten.nicht_berechenbar?.find(
        n => n.code === gozCode
    );
    if (nichtBerechenbar) {
        return { berechenbar: false, grund: nichtBerechenbar.grund };
    }

    // Prüfe allgemeine Liste
    const allgemeineRegel = splittingRegeln.allgemeine_nicht_berechenbar?.find(
        n => n.goz === gozCode
    );
    if (allgemeineRegel) {
        return { berechenbar: false, grund: allgemeineRegel.grund };
    }

    return { berechenbar: true };
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

export default {
    findeSplittingRegel,
    berechneGleichartVersorgung,
    istGOZBerechenbar,
    BEMA_PUNKTWERT
};
