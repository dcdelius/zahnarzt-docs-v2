/**
 * Befund-Logik für G-BA Festzuschuss-Ermittlung
 * 
 * Automatisiert die Ermittlung von Befundklassen und Festzuschüssen
 * basierend auf der zahnärztlichen Situation.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ZahnSituation {
    zahnNummer: number;
    // Befund 1.1 Auslöser (ww, kw, ur)
    weitgehendZerstoert?: boolean;      // ww - weitgehende Zerstörung
    erneuerungsbeduerftig?: boolean;    // kw - erneuerungsbedürftige Krone
    unzureichendeRetention?: boolean;   // ur - unzureichende Retentionsmöglichkeit
    // Befund 1.2
    partiellerDefekt?: boolean;         // pw - Teilkrone
    // Stiftaufbau
    nachEndo?: boolean;                 // Stiftaufbau nötig?
    stiftart?: 'konfektioniert' | 'gegossen' | 'keine';
    // Lücken
    fehlend?: boolean;
    freiendsituation?: boolean;
    // Brücken-Pfeiler Flag
    istBrueckenPfeiler?: boolean;       // WICHTIG: Keine FZ 1.1-1.3!
}

export interface LueckenSituation {
    kiefer: 'OK' | 'UK';
    fehlendeMenge: number;
    zahnbegrenzt: boolean;              // True = Brücke möglich
    freiendsituation: boolean;
    restzaehne?: number;                // Für Befundklasse 4
    // Erweitert für mehrspannige Brücken (FZ 2.5)
    angrenzendeWeitersLuecken?: number; // Anzahl angrenzender 1-Zahn-Lücken
    // FZ 2.6
    disparallelePfeiler?: boolean;      // Brücke mit Geschiebe nötig?
}

export type Befundklasse = 1 | 2 | 3 | 4;

export interface BefundResult {
    befunde: string[];                  // z.B. ["FZ_1.1", "FZ_1.4"]
    befundklasse: Befundklasse;
    imVerblendbereich: boolean;
    warnungen?: string[];               // Hinweise/Warnungen
}


// ═══════════════════════════════════════════════════════════════
// VERBLENDBEREICH
// ═══════════════════════════════════════════════════════════════

/**
 * Prüft ob Zahn im Verblendbereich liegt
 * OK: 15-25 (Zähne 1-5 in Quadrant 1/2)
 * UK: 34-44 (Zähne 1-4 in Quadrant 3/4)
 */
export function istImVerblendbereich(zahnNummer: number): boolean {
    const quadrant = Math.floor(zahnNummer / 10);
    const position = zahnNummer % 10;

    if (quadrant === 1 || quadrant === 2) {
        // Oberkiefer: 1-5 sind im Verblendbereich
        return position >= 1 && position <= 5;
    } else if (quadrant === 3 || quadrant === 4) {
        // Unterkiefer: 1-4 sind im Verblendbereich
        return position >= 1 && position <= 4;
    }

    return false;
}

/**
 * Gibt alle Zähne im Verblendbereich zurück
 */
export function getVerblendbereichZaehne(): number[] {
    // OK: 15, 14, 13, 12, 11, 21, 22, 23, 24, 25
    // UK: 34, 33, 32, 31, 41, 42, 43, 44
    return [
        15, 14, 13, 12, 11, 21, 22, 23, 24, 25,
        34, 33, 32, 31, 41, 42, 43, 44
    ];
}

// ═══════════════════════════════════════════════════════════════
// BEFUNDKLASSEN
// ═══════════════════════════════════════════════════════════════

/**
 * Ermittelt Befundklasse basierend auf Gesamtsituation
 */
export function ermittleBefundklasse(
    zahnSituationen: ZahnSituation[],
    lueckeSituation?: LueckenSituation
): Befundklasse {
    // Klasse 4: Zahnlos oder ≤3 Restzähne
    if (lueckeSituation?.restzaehne !== undefined && lueckeSituation.restzaehne <= 3) {
        return 4;
    }

    // Klasse 3: Freiendsituation oder >4 fehlende Zähne
    if (lueckeSituation?.freiendsituation) {
        return 3;
    }
    if (lueckeSituation && lueckeSituation.fehlendeMenge > 4) {
        return 3;
    }

    // Klasse 2: Zahnbegrenzte Lücke mit 1-4 fehlenden Zähnen
    if (lueckeSituation?.zahnbegrenzt && lueckeSituation.fehlendeMenge >= 1 && lueckeSituation.fehlendeMenge <= 4) {
        return 2;
    }

    // Klasse 1: Einzelkronen / Stiftaufbauten (Default)
    return 1;
}

// ═══════════════════════════════════════════════════════════════
// BEFUND-ERMITTLUNG PRO ZAHN
// ═══════════════════════════════════════════════════════════════

/**
 * Ermittelt alle zutreffenden Festzuschuss-Befunde für einen Zahn
 * 
 * WICHTIG: Bei Brücken-Pfeilern (istBrueckenPfeiler=true) dürfen
 * FZ 1.1-1.3 NICHT angesetzt werden! (G-BA Regel)
 */
export function getBefundeFuerZahn(situation: ZahnSituation): BefundResult {
    const befunde: string[] = [];
    const warnungen: string[] = [];
    const imVB = istImVerblendbereich(situation.zahnNummer);

    // Brücken-Pfeiler Prüfung: Bei Brücken keine Einzelkronen-FZ!
    if (situation.istBrueckenPfeiler) {
        warnungen.push('Brücken-Pfeiler: FZ 1.1-1.3 nicht ansetzbar (G-BA Regel). Brücken-FZ verwenden!');
        return {
            befunde: [], // Keine Einzelkronen-FZ für Brücken-Pfeiler
            befundklasse: 2, // Ist Teil einer Brücke = Befundklasse 2
            imVerblendbereich: imVB,
            warnungen
        };
    }

    // Befund 1.1: Auslöser sind ww, kw, oder ur
    const brauchtKrone = situation.weitgehendZerstoert ||
        situation.erneuerungsbeduerftig ||
        situation.unzureichendeRetention;

    if (brauchtKrone) {
        befunde.push('FZ_1.1');

        // Befund 1.3: Verblendung NUR im Verblendbereich
        if (imVB) {
            befunde.push('FZ_1.3');
        }
    }

    // Befund 1.2: Partieller Defekt → Teilkrone (nur wenn keine Vollkrone nötig)
    if (situation.partiellerDefekt && !brauchtKrone) {
        befunde.push('FZ_1.2');
        // KEIN 1.3 bei Teilkrone! (keine Verblendung möglich)
    }

    // Befund 1.4/1.5: Stiftaufbau nach Endo
    if (situation.nachEndo && situation.stiftart) {
        if (situation.stiftart === 'konfektioniert') {
            befunde.push('FZ_1.4');
        } else if (situation.stiftart === 'gegossen') {
            befunde.push('FZ_1.5');
        }
    }

    return {
        befunde,
        befundklasse: 1, // Einzelzahn = immer Klasse 1
        imVerblendbereich: imVB,
        warnungen: warnungen.length > 0 ? warnungen : undefined
    };
}


/**
 * Ermittelt Festzuschüsse für Brückensituation (Befundklasse 2)
 * 
 * @param lueckeSituation - Beschreibung der Lückensituation
 * @param pfeilerZaehne - Zahnnummern der Pfeilerzähne (Anker)
 * @param fehlendeZaehne - Zahnnummern der fehlenden Zähne (Zwischenglieder)
 */
export function getBefundeFuerBruecke(
    lueckeSituation: LueckenSituation,
    pfeilerZaehne: number[],
    fehlendeZaehne: number[] = []
): string[] {
    const befunde: string[] = [];

    if (!lueckeSituation.zahnbegrenzt) {
        throw new Error('Brücke nur bei zahnbegrenzter Lücke möglich');
    }

    // Validierung: fehlendeZaehne sollte mit fehlendeMenge übereinstimmen
    if (fehlendeZaehne.length > 0 && fehlendeZaehne.length !== lueckeSituation.fehlendeMenge) {
        console.warn(`Warnung: fehlendeZaehne.length (${fehlendeZaehne.length}) != fehlendeMenge (${lueckeSituation.fehlendeMenge})`);
    }

    // Basis-Befund je nach Anzahl fehlender Zähne
    switch (lueckeSituation.fehlendeMenge) {
        case 1:
            befunde.push('FZ_2.1'); // 3-gliedrige Brücke
            break;
        case 2:
            befunde.push('FZ_2.2'); // 4-gliedrige Brücke
            break;
        case 3:
            befunde.push('FZ_2.3'); // 5-gliedrige Brücke
            break;
        case 4:
            // FZ 2.4 ist NUR für Frontzahnbereich!
            const alleFrontzaehne = fehlendeZaehne.every(z => {
                const pos = z % 10;
                return pos >= 1 && pos <= 3; // Nur 1er, 2er, 3er
            });
            if (!alleFrontzaehne && fehlendeZaehne.length > 0) {
                throw new Error('FZ 2.4 nur für Frontzahnbereich (4 nebeneinander fehlende Frontzähne)');
            }
            befunde.push('FZ_2.4');
            break;
        default:
            throw new Error(`Brücke nur für 1-4 fehlende Zähne, nicht ${lueckeSituation.fehlendeMenge}`);
    }

    // Verblendung FZ 2.7: Je Anker UND Zwischenglied im Verblendbereich
    // KORREKTUR: Nur Zähne die TATSÄCHLICH im VB liegen!

    // Pfeiler im VB
    const pfeilerImVB = pfeilerZaehne.filter(z => istImVerblendbereich(z)).length;

    // Zwischenglieder im VB (wenn fehlendeZaehne angegeben)
    let zwischengliederImVB = 0;
    if (fehlendeZaehne.length > 0) {
        zwischengliederImVB = fehlendeZaehne.filter(z => istImVerblendbereich(z)).length;
    } else {
        // Fallback: Wenn keine Positionen angegeben, können wir nicht korrekt berechnen
        // Hier gehen wir konservativ vor und nehmen 0 an
        console.warn('Warnung: fehlendeZaehne nicht angegeben - VB-Verblendung für Zwischenglieder kann nicht berechnet werden');
    }

    const verblendungenAnzahl = pfeilerImVB + zwischengliederImVB;
    for (let i = 0; i < verblendungenAnzahl; i++) {
        befunde.push('FZ_2.7');
    }

    // FZ 2.5: Angrenzende zahnbegrenzte Lücke mit einem fehlenden Zahn
    // Ergibt mehrspannige Brücke
    if (lueckeSituation.angrenzendeWeitersLuecken && lueckeSituation.angrenzendeWeitersLuecken > 0) {
        for (let i = 0; i < lueckeSituation.angrenzendeWeitersLuecken; i++) {
            befunde.push('FZ_2.5');
        }
    }

    // FZ 2.6: Disparallele (nicht kompensierbare divergente) Pfeilerzähne
    // Brücke mit Geschiebe (geteilte Brücke) nötig
    if (lueckeSituation.disparallelePfeiler) {
        befunde.push('FZ_2.6');
    }

    return befunde;
}



// ═══════════════════════════════════════════════════════════════
// BEFUND-ERMITTLUNG FÜR PROTHESEN
// ═══════════════════════════════════════════════════════════════

/**
 * Ermittelt Festzuschüsse für Prothesen (Befundklasse 3/4)
 */
export function getBefundeFuerProthese(
    lueckeSituation: LueckenSituation,
    teleskopAnker?: number[]
): string[] {
    const befunde: string[] = [];

    // Befund 3.1: Modellgussprothese (Basis bei Freiendsituation)
    if (lueckeSituation.freiendsituation || lueckeSituation.fehlendeMenge > 4) {
        befunde.push('FZ_3.1');
    }

    // Befund 3.2a: Teleskopkrone (max 2x je Kiefer!)
    // NUR für Eckzahn (3er) oder 1. Prämolar (4er)
    if (teleskopAnker && teleskopAnker.length > 0) {
        const teleskopFaehig = teleskopAnker.filter(z => {
            const position = z % 10;
            return position === 3 || position === 4; // 3er oder 4er
        });

        // Max 2 pro Kiefer!
        const anzahl3_2a = Math.min(teleskopFaehig.length, 2);
        for (let i = 0; i < anzahl3_2a; i++) {
            befunde.push('FZ_3.2a');
        }

        // FZ 4.7: Verblendung der Teleskop-Anker (nicht alle Kronen!)
        const teleskopImVB = teleskopFaehig.filter(z => istImVerblendbereich(z)).length;
        for (let i = 0; i < Math.min(teleskopImVB, 2); i++) {
            befunde.push('FZ_4.7');
        }
    }

    // Befundklasse 4: Restzahnbestand ≤3
    if (lueckeSituation.restzaehne !== undefined && lueckeSituation.restzaehne <= 3) {
        if (lueckeSituation.kiefer === 'OK') {
            befunde.push('FZ_4.1');
        } else {
            befunde.push('FZ_4.3');
        }
    }

    return befunde;
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

export default {
    istImVerblendbereich,
    getVerblendbereichZaehne,
    ermittleBefundklasse,
    getBefundeFuerZahn,
    getBefundeFuerBruecke,
    getBefundeFuerProthese
};
