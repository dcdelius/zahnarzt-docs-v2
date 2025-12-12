/**
 * HKP-Generator (Heil- und Kostenplan)
 * 
 * Generiert strukturierte Heil- und Kostenpläne
 * für Zahnersatz-Versorgungen bei GKV-Patienten.
 */

import {
    getBefundeFuerZahn,
    getBefundeFuerBruecke,
    getBefundeFuerProthese,
    ermittleBefundklasse,
    ZahnSituation,
    LueckenSituation
} from './befundLogic';
import { berechneFestzuschuss, BonusStatus } from './festzuschussMapper';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type Therapieart = 'E' | 'K' | 'B' | 'PK' | 'TK' | 'R' | 'A' | 'SW';
// E=Einzelkrone, K=Klammerprothese, B=Brücke, PK=Prothese mit Kronen, 
// TK=Teleskopprothese, R=Reparatur, A=Andersartig, SW=Stiftaufbau/Widerendaufbau

export interface HKPZahn {
    zahnNummer: number;
    befund: string;          // Befundkürzel: ww, f, e, kw, pw, etc.
    regelversorgung: string; // R-Spalte
    therapie: string;        // TP-Spalte
}

export interface HKPPosition {
    code: string;            // BEMA/GOZ Code
    bezeichnung: string;
    anzahl: number;
    zahn?: number;
    betrag?: number;
}

export interface LaborPosition {
    bezeichnung: string;
    belNr?: string;          // BEL-II Nummer
    betrag: number;
    privatAnteil?: number;   // Mehrkosten über BEL-II
}

export interface HKPResult {
    // Kopfdaten
    therapieart: Therapieart;
    versorgungsart: 'regelversorgung' | 'gleichartig' | 'andersartig';

    // Befund/Therapie-Zeile (Zeile 1 im HKP)
    zahnSchema: HKPZahn[];

    // Kosten
    befunde: string[];
    festzuschuss: {
        ohneBonus: number;
        mit5jBonus: number;
        mit10jBonus: number;
    };

    bemaPositionen: HKPPosition[];
    bemaSumme: number;

    gozPositionen: HKPPosition[];
    gozSumme: number;

    laborPositionen: LaborPosition[];
    laborBELSumme: number;
    laborPrivatSumme: number;

    // Gesamtberechnung
    gesamtkosten: number;
    eigenanteilPatient: {
        ohneBonus: number;
        mit5jBonus: number;
        mit10jBonus: number;
    };

    // Meta
    gueltigMonate: number;
    hinweise: string[];
}

// ═══════════════════════════════════════════════════════════════
// BEFUND-KÜRZEL
// ═══════════════════════════════════════════════════════════════

const BEFUND_KUERZEL: Record<string, string> = {
    'f': 'fehlend',
    'e': 'ersetzt (funktionstüchtiger ZE)',
    'ww': 'weitgehend zerstört (Kronenbefund)',
    'kw': 'erneuerungsbedürftige Krone',
    'pw': 'partieller Defekt (Teilkrone)',
    'ur': 'unzureichende Retention',
    'x': 'nicht erhaltungswürdig (extrakt)',
    'b': 'Brückenglied',
    'k': 'intakte Krone',
    'sw': 'Stiftaufbau erforderlich',
    't': 'Teleskopkrone'
};

// ═══════════════════════════════════════════════════════════════
// HAUPTFUNKTIONEN
// ═══════════════════════════════════════════════════════════════

/**
 * Generiert HKP für Einzelkrone(n)
 */
export function generiereHKPKrone(
    zahnSituationen: ZahnSituation[],
    versorgungsart: 'regelversorgung' | 'gleichartig' = 'gleichartig',
    bonusStatus: BonusStatus = 'ohne'
): HKPResult {
    const befunde: string[] = [];
    const zahnSchema: HKPZahn[] = [];
    const bemaPositionen: HKPPosition[] = [];
    const gozPositionen: HKPPosition[] = [];
    const laborPositionen: LaborPosition[] = [];
    const hinweise: string[] = [];

    // Verarbeite jeden Zahn
    for (const situation of zahnSituationen) {
        const befundResult = getBefundeFuerZahn(situation);
        befunde.push(...befundResult.befunde);

        // Bestimme Befundkürzel
        let befundCode = 'ww';
        if (situation.erneuerungsbeduerftig) befundCode = 'kw';
        if (situation.partiellerDefekt) befundCode = 'pw';

        // Regelversorgung und Therapie
        const regelversorgung = befundResult.imVerblendbereich ? 'KV' : 'K';
        const therapie = versorgungsart === 'gleichartig' ? 'KV(g)' : regelversorgung;

        zahnSchema.push({
            zahnNummer: situation.zahnNummer,
            befund: befundCode + (situation.nachEndo ? ' sw' : ''),
            regelversorgung,
            therapie
        });

        // BEMA-Positionen
        bemaPositionen.push({
            code: 'BEMA_20a',
            bezeichnung: 'Krone',
            anzahl: 1,
            zahn: situation.zahnNummer,
            betrag: 146.89
        });
        bemaPositionen.push({
            code: 'BEMA_19',
            bezeichnung: 'Provisorium',
            anzahl: 1,
            zahn: situation.zahnNummer,
            betrag: 19.93
        });

        if (situation.nachEndo && situation.stiftart === 'konfektioniert') {
            bemaPositionen.push({
                code: 'BEMA_18a',
                bezeichnung: 'Stiftaufbau konfektioniert',
                anzahl: 1,
                zahn: situation.zahnNummer,
                betrag: 52.46
            });
        }

        // GOZ-Mehrkosten bei gleichartig
        if (versorgungsart === 'gleichartig') {
            gozPositionen.push({
                code: 'GOZ_2197',
                bezeichnung: 'Adhäsive Befestigung',
                anzahl: 1,
                zahn: situation.zahnNummer,
                betrag: 61.55
            });

            if (situation.nachEndo) {
                gozPositionen.push({
                    code: 'GOZ_2195',
                    bezeichnung: 'Stiftpräparation',
                    anzahl: 1,
                    zahn: situation.zahnNummer,
                    betrag: 48.37
                });
                gozPositionen.push({
                    code: 'GOZ_2180',
                    bezeichnung: 'Aufbaufüllung',
                    anzahl: 1,
                    zahn: situation.zahnNummer,
                    betrag: 73.85
                });
            }
        }

        // Labor
        laborPositionen.push({
            bezeichnung: `Krone Zahn ${situation.zahnNummer}`,
            belNr: '001',
            betrag: 180, // BEL-II Anteil
            privatAnteil: versorgungsart === 'gleichartig' ? 250 : 0
        });

        // Warnungen bei Brücken-Pfeiler
        if (befundResult.warnungen) {
            hinweise.push(...befundResult.warnungen);
        }
    }

    // Berechne Summen
    const bemaSumme = bemaPositionen.reduce((sum, p) => sum + (p.betrag || 0), 0);
    const gozSumme = gozPositionen.reduce((sum, p) => sum + (p.betrag || 0), 0);
    const laborBELSumme = laborPositionen.reduce((sum, p) => sum + p.betrag, 0);
    const laborPrivatSumme = laborPositionen.reduce((sum, p) => sum + (p.privatAnteil || 0), 0);

    // Festzuschüsse berechnen
    const fzOhneBonus = berechneFestzuschuss(befunde, 'ohne');
    const fzMit5j = berechneFestzuschuss(befunde, '5_jahre');
    const fzMit10j = berechneFestzuschuss(befunde, '10_jahre');

    // Gesamtkosten
    const gesamtkosten = bemaSumme + gozSumme + laborBELSumme + laborPrivatSumme;

    // Eigenanteil = Gesamt - BEMA - Labor(BEL) - FZ
    const eigenanteilOhne = gesamtkosten - bemaSumme - laborBELSumme - fzOhneBonus.gesamtbetrag;
    const eigenanteilMit5j = gesamtkosten - bemaSumme - laborBELSumme - fzMit5j.gesamtbetrag;
    const eigenanteilMit10j = gesamtkosten - bemaSumme - laborBELSumme - fzMit10j.gesamtbetrag;

    return {
        therapieart: 'E',
        versorgungsart,
        zahnSchema,
        befunde: [...new Set(befunde)], // Unique
        festzuschuss: {
            ohneBonus: fzOhneBonus.gesamtbetrag,
            mit5jBonus: fzMit5j.gesamtbetrag,
            mit10jBonus: fzMit10j.gesamtbetrag
        },
        bemaPositionen,
        bemaSumme: Math.round(bemaSumme * 100) / 100,
        gozPositionen,
        gozSumme: Math.round(gozSumme * 100) / 100,
        laborPositionen,
        laborBELSumme: Math.round(laborBELSumme * 100) / 100,
        laborPrivatSumme: Math.round(laborPrivatSumme * 100) / 100,
        gesamtkosten: Math.round(gesamtkosten * 100) / 100,
        eigenanteilPatient: {
            ohneBonus: Math.round(eigenanteilOhne * 100) / 100,
            mit5jBonus: Math.round(eigenanteilMit5j * 100) / 100,
            mit10jBonus: Math.round(eigenanteilMit10j * 100) / 100
        },
        gueltigMonate: 6,
        hinweise
    };
}

/**
 * Generiert HKP für Brücke
 */
export function generiereHKPBruecke(
    lueckeSituation: LueckenSituation,
    pfeilerSituationen: ZahnSituation[],
    fehlendeZaehne: number[],
    versorgungsart: 'regelversorgung' | 'gleichartig' = 'gleichartig'
): HKPResult {
    const befunde = getBefundeFuerBruecke(lueckeSituation,
        pfeilerSituationen.map(p => p.zahnNummer),
        fehlendeZaehne
    );

    const zahnSchema: HKPZahn[] = [];
    const bemaPositionen: HKPPosition[] = [];
    const gozPositionen: HKPPosition[] = [];
    const laborPositionen: LaborPosition[] = [];

    // Pfeiler
    for (const pfeiler of pfeilerSituationen) {
        zahnSchema.push({
            zahnNummer: pfeiler.zahnNummer,
            befund: 'ww',
            regelversorgung: 'KB',
            therapie: versorgungsart === 'gleichartig' ? 'KB(g)' : 'KB'
        });

        bemaPositionen.push({
            code: 'BEMA_91a',
            bezeichnung: 'Brückenanker',
            anzahl: 1,
            zahn: pfeiler.zahnNummer,
            betrag: 167.87
        });
    }

    // Zwischenglieder
    for (const zahn of fehlendeZaehne) {
        zahnSchema.push({
            zahnNummer: zahn,
            befund: 'f',
            regelversorgung: 'B',
            therapie: 'B'
        });

        bemaPositionen.push({
            code: 'BEMA_91b',
            bezeichnung: 'Brückenglied',
            anzahl: 1,
            zahn,
            betrag: 104.92
        });
    }

    // Festzuschuss
    const fzOhneBonus = berechneFestzuschuss(befunde, 'ohne');
    const fzMit5j = berechneFestzuschuss(befunde, '5_jahre');
    const fzMit10j = berechneFestzuschuss(befunde, '10_jahre');

    // Summen
    const bemaSumme = bemaPositionen.reduce((sum, p) => sum + (p.betrag || 0), 0);
    const gozSumme = 0; // Vereinfacht
    const laborBELSumme = (pfeilerSituationen.length + fehlendeZaehne.length) * 200;
    const laborPrivatSumme = versorgungsart === 'gleichartig' ?
        (pfeilerSituationen.length + fehlendeZaehne.length) * 150 : 0;

    const gesamtkosten = bemaSumme + gozSumme + laborBELSumme + laborPrivatSumme;

    return {
        therapieart: 'B',
        versorgungsart,
        zahnSchema,
        befunde: [...new Set(befunde)],
        festzuschuss: {
            ohneBonus: fzOhneBonus.gesamtbetrag,
            mit5jBonus: fzMit5j.gesamtbetrag,
            mit10jBonus: fzMit10j.gesamtbetrag
        },
        bemaPositionen,
        bemaSumme: Math.round(bemaSumme * 100) / 100,
        gozPositionen,
        gozSumme: 0,
        laborPositionen: [{
            bezeichnung: `Brücke ${pfeilerSituationen.length + fehlendeZaehne.length}-gliedrig`,
            betrag: laborBELSumme,
            privatAnteil: laborPrivatSumme
        }],
        laborBELSumme,
        laborPrivatSumme,
        gesamtkosten: Math.round(gesamtkosten * 100) / 100,
        eigenanteilPatient: {
            ohneBonus: Math.round((gesamtkosten - bemaSumme - laborBELSumme - fzOhneBonus.gesamtbetrag) * 100) / 100,
            mit5jBonus: Math.round((gesamtkosten - bemaSumme - laborBELSumme - fzMit5j.gesamtbetrag) * 100) / 100,
            mit10jBonus: Math.round((gesamtkosten - bemaSumme - laborBELSumme - fzMit10j.gesamtbetrag) * 100) / 100
        },
        gueltigMonate: 6,
        hinweise: []
    };
}

/**
 * Formatiert HKP als Text-Zusammenfassung
 */
export function formatHKPSummary(hkp: HKPResult): string {
    let text = `
═══════════════════════════════════════════════════════════════
HEIL- UND KOSTENPLAN - ZUSAMMENFASSUNG
═══════════════════════════════════════════════════════════════

Therapieart: ${hkp.therapieart}
Versorgungsart: ${hkp.versorgungsart}

ZAHNSCHEMA:
───────────────────────────────────────────────────────────────
Zahn    Befund    Regelversorgung    Therapie
───────────────────────────────────────────────────────────────
`;

    for (const z of hkp.zahnSchema) {
        text += `${String(z.zahnNummer).padEnd(8)}${z.befund.padEnd(10)}${z.regelversorgung.padEnd(19)}${z.therapie}\n`;
    }

    text += `
───────────────────────────────────────────────────────────────

FESTZUSCHUSS-BEFUNDE: ${hkp.befunde.join(', ')}

KOSTEN:
  BEMA-Leistungen:           ${hkp.bemaSumme.toFixed(2)} €
  GOZ-Mehrkosten:            ${hkp.gozSumme.toFixed(2)} €
  Labor (BEL-II):            ${hkp.laborBELSumme.toFixed(2)} €
  Labor (Mehrkosten):        ${hkp.laborPrivatSumme.toFixed(2)} €
  ───────────────────────────────────────
  GESAMT:                    ${hkp.gesamtkosten.toFixed(2)} €

FESTZUSCHUSS IHRER KASSE:
  Ohne Bonus (60%):          ${hkp.festzuschuss.ohneBonus.toFixed(2)} €
  Mit 5J Bonus (70%):        ${hkp.festzuschuss.mit5jBonus.toFixed(2)} €
  Mit 10J Bonus (75%):       ${hkp.festzuschuss.mit10jBonus.toFixed(2)} €

IHR EIGENANTEIL:
  Ohne Bonus:                ${hkp.eigenanteilPatient.ohneBonus.toFixed(2)} €
  Mit 5J Bonus:              ${hkp.eigenanteilPatient.mit5jBonus.toFixed(2)} €
  Mit 10J Bonus:             ${hkp.eigenanteilPatient.mit10jBonus.toFixed(2)} €

Gültigkeit: ${hkp.gueltigMonate} Monate
═══════════════════════════════════════════════════════════════
`;

    if (hkp.hinweise.length > 0) {
        text += `\nHINWEISE:\n`;
        for (const h of hkp.hinweise) {
            text += `⚠ ${h}\n`;
        }
    }

    return text;
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

export default {
    generiereHKPKrone,
    generiereHKPBruecke,
    formatHKPSummary,
    BEFUND_KUERZEL
};
