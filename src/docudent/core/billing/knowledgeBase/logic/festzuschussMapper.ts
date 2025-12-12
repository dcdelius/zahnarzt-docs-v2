/**
 * Festzuschuss-Mapper
 * 
 * Berechnet konkrete Festzuschuss-Beträge basierend auf Befunden
 * und Bonusstatus des Patienten.
 */

import { getBefundeFuerZahn, getBefundeFuerBruecke, getBefundeFuerProthese, ZahnSituation, LueckenSituation } from './befundLogic';

// ═══════════════════════════════════════════════════════════════
// FESTZUSCHUSS-TABELLE 2025 (Stand: Januar 2025)
// Quelle: AOK, KZBV, Spitta-Verlag
// ═══════════════════════════════════════════════════════════════

interface FZBetrag {
    ohneBonus: number;      // 60%
    mit5jBonus: number;     // 70%
    mit10jBonus: number;    // 75%
    haertefall: number;     // 100%
}

const FESTZUSCHUSS_BETRAEGE: Record<string, FZBetrag> = {
    // Befundklasse 1: Kronen (2025)
    'FZ_1.1': { ohneBonus: 229.25, mit5jBonus: 267.46, mit10jBonus: 286.57, haertefall: 382.09 },
    'FZ_1.2': { ohneBonus: 203.91, mit5jBonus: 237.90, mit10jBonus: 254.89, haertefall: 339.85 },
    'FZ_1.3': { ohneBonus: 58.41, mit5jBonus: 68.14, mit10jBonus: 73.01, haertefall: 97.35 },
    'FZ_1.4': { ohneBonus: 55.31, mit5jBonus: 64.53, mit10jBonus: 69.14, haertefall: 92.18 },
    'FZ_1.5': { ohneBonus: 130.21, mit5jBonus: 151.91, mit10jBonus: 162.76, haertefall: 217.02 },

    // Befundklasse 2: Brücken (2025)
    'FZ_2.1': { ohneBonus: 513.90, mit5jBonus: 599.55, mit10jBonus: 642.38, haertefall: 856.50 },
    'FZ_2.2': { ohneBonus: 594.63, mit5jBonus: 693.73, mit10jBonus: 743.29, haertefall: 991.05 },
    'FZ_2.3': { ohneBonus: 675.35, mit5jBonus: 787.91, mit10jBonus: 844.19, haertefall: 1125.58 },
    'FZ_2.4': { ohneBonus: 756.08, mit5jBonus: 882.09, mit10jBonus: 945.10, haertefall: 1260.13 },
    'FZ_2.5': { ohneBonus: 80.88, mit5jBonus: 94.36, mit10jBonus: 101.10, haertefall: 134.80 },
    'FZ_2.6': { ohneBonus: 100.63, mit5jBonus: 117.40, mit10jBonus: 125.79, haertefall: 167.72 },
    'FZ_2.7': { ohneBonus: 58.41, mit5jBonus: 68.14, mit10jBonus: 73.01, haertefall: 97.35 },

    // Befundklasse 3: Prothesen (2025)
    'FZ_3.1': { ohneBonus: 634.49, mit5jBonus: 740.24, mit10jBonus: 793.11, haertefall: 1057.48 },
    'FZ_3.2a': { ohneBonus: 482.46, mit5jBonus: 562.87, mit10jBonus: 603.08, haertefall: 804.10 },
    'FZ_3.2b': { ohneBonus: 482.46, mit5jBonus: 562.87, mit10jBonus: 603.08, haertefall: 804.10 },
    'FZ_3.2c': { ohneBonus: 482.46, mit5jBonus: 562.87, mit10jBonus: 603.08, haertefall: 804.10 },

    // Befundklasse 4: Total / Restzahnbestand (2025)
    'FZ_4.1': { ohneBonus: 705.00, mit5jBonus: 822.50, mit10jBonus: 881.25, haertefall: 1175.00 },
    'FZ_4.2': { ohneBonus: 561.55, mit5jBonus: 655.14, mit10jBonus: 701.94, haertefall: 935.92 },
    'FZ_4.3': { ohneBonus: 705.00, mit5jBonus: 822.50, mit10jBonus: 881.25, haertefall: 1175.00 },
    'FZ_4.4': { ohneBonus: 561.55, mit5jBonus: 655.14, mit10jBonus: 701.94, haertefall: 935.92 },
    'FZ_4.5': { ohneBonus: 77.90, mit5jBonus: 90.89, mit10jBonus: 97.38, haertefall: 129.83 },
    'FZ_4.6': { ohneBonus: 482.46, mit5jBonus: 562.87, mit10jBonus: 603.08, haertefall: 804.10 },
    'FZ_4.7': { ohneBonus: 77.90, mit5jBonus: 90.89, mit10jBonus: 97.38, haertefall: 129.83 },
};


// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type BonusStatus = 'ohne' | '5_jahre' | '10_jahre' | 'haertefall';

export interface FestzuschussResult {
    befunde: string[];
    einzelbetraege: { befund: string; betrag: number }[];
    gesamtbetrag: number;
    bonusStatus: BonusStatus;
    regelversorgung: string;
}

// ═══════════════════════════════════════════════════════════════
// BERECHNUNG
// ═══════════════════════════════════════════════════════════════

/**
 * Berechnet den Festzuschuss für einen Liste von Befunden
 */
export function berechneFestzuschuss(
    befunde: string[],
    bonusStatus: BonusStatus = 'ohne'
): FestzuschussResult {
    const einzelbetraege: { befund: string; betrag: number }[] = [];
    let gesamtbetrag = 0;

    for (const befund of befunde) {
        const fzDaten = FESTZUSCHUSS_BETRAEGE[befund];
        if (!fzDaten) {
            console.warn(`Unbekannter Festzuschuss-Befund: ${befund}`);
            continue;
        }

        let betrag: number;
        switch (bonusStatus) {
            case '5_jahre':
                betrag = fzDaten.mit5jBonus;
                break;
            case '10_jahre':
                betrag = fzDaten.mit10jBonus;
                break;
            case 'haertefall':
                betrag = fzDaten.haertefall;
                break;
            default:
                betrag = fzDaten.ohneBonus;
        }

        einzelbetraege.push({ befund, betrag });
        gesamtbetrag += betrag;
    }

    return {
        befunde,
        einzelbetraege,
        gesamtbetrag: Math.round(gesamtbetrag * 100) / 100,
        bonusStatus,
        regelversorgung: ermittleRegelversorgung(befunde)
    };
}

/**
 * Ermittelt die Regelversorgung basierend auf den Befunden
 */
function ermittleRegelversorgung(befunde: string[]): string {
    if (befunde.includes('FZ_4.1') || befunde.includes('FZ_4.2')) {
        return 'Totalprothese Oberkiefer';
    }
    if (befunde.includes('FZ_4.3') || befunde.includes('FZ_4.4')) {
        return 'Totalprothese Unterkiefer';
    }
    if (befunde.includes('FZ_3.1')) {
        return 'Modellgussprothese';
    }
    if (befunde.includes('FZ_3.2a') || befunde.includes('FZ_3.2b') || befunde.includes('FZ_3.2c')) {
        return 'Teleskopprothese';
    }
    if (befunde.some(b => b.startsWith('FZ_2.'))) {
        return 'Brücke';
    }
    if (befunde.includes('FZ_1.1')) {
        return 'Metallkrone';
    }
    if (befunde.includes('FZ_1.2')) {
        return 'Teilkrone';
    }
    return 'Unbekannt';
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Berechnet Festzuschuss für einen einzelnen Zahn
 */
export function berechneFZFuerZahn(
    situation: ZahnSituation,
    bonusStatus: BonusStatus = 'ohne'
): FestzuschussResult {
    const befundResult = getBefundeFuerZahn(situation);
    return berechneFestzuschuss(befundResult.befunde, bonusStatus);
}

/**
 * Berechnet Festzuschuss für eine Brücke
 */
export function berechneFZFuerBruecke(
    lueckeSituation: LueckenSituation,
    pfeilerZaehne: number[],
    bonusStatus: BonusStatus = 'ohne'
): FestzuschussResult {
    const befunde = getBefundeFuerBruecke(lueckeSituation, pfeilerZaehne);
    return berechneFestzuschuss(befunde, bonusStatus);
}

/**
 * Berechnet Festzuschuss für eine Prothese
 */
export function berechneFZFuerProthese(
    lueckeSituation: LueckenSituation,
    teleskopAnker: number[] = [],
    bonusStatus: BonusStatus = 'ohne'
): FestzuschussResult {
    const befunde = getBefundeFuerProthese(lueckeSituation, teleskopAnker);
    return berechneFestzuschuss(befunde, bonusStatus);
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

export default {
    berechneFestzuschuss,
    berechneFZFuerZahn,
    berechneFZFuerBruecke,
    berechneFZFuerProthese,
    FESTZUSCHUSS_BETRAEGE
};
