/**
 * Begründungs-Generator für GOZ-Steigerungsfaktoren
 * 
 * Generiert rechtssichere Begründungen für GOZ-Leistungen 
 * mit erhöhtem Faktor (>2.3) basierend auf medizinischen Indikatoren.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface BegruendungsResult {
    gozCode: string;
    empfohleneFaktor: number;
    begruendungsText: string;          // Rechtssicherer Text für Rechnung
    indikatoren: string[];              // z.B. ["erschwerte Blutstillung"]
    rechtsgrundlage: string;            // Verweis auf GOZ
    kurzbegruendung: string;            // Kurze Variante für Rechnung
}

export type IndikatorKategorie =
    | 'zeitaufwand'         // Erhöhter Zeitaufwand
    | 'schwierigkeit'       // Überdurchschnittlicher Schwierigkeitsgrad
    | 'patient'             // Patientenbedingte Erschwernisse
    | 'anatomie'            // Anatomische Besonderheiten
    | 'umstaende';          // Sonstige besondere Umstände

export interface IndikatorMapping {
    indikator: string;                  // z.B. "erschwerte Blutstillung"
    kategorie: IndikatorKategorie;
    textbaustein: string;               // Für rechtssichere Begründung
    faktorZuschlag: number;             // z.B. 0.5 für +0.5 über 2.3
    gozRelevant: string[];              // Relevante GOZ-Codes
}

// ═══════════════════════════════════════════════════════════════
// INDIKATOREN-MAPPING
// ═══════════════════════════════════════════════════════════════

const INDIKATOREN: IndikatorMapping[] = [
    // === ZEITAUFWAND ===
    {
        indikator: 'erschwerte_blutstillung',
        kategorie: 'zeitaufwand',
        textbaustein: 'erhöhter Zeitaufwand durch erschwerte Blutstillung',
        faktorZuschlag: 0.5,
        gozRelevant: ['GOZ_3000', 'GOZ_3010', 'GOZ_3020', 'GOZ_3040', 'GOZ_3045', 'GOZ_3050']
    },
    {
        indikator: 'starke_verkalkung',
        kategorie: 'zeitaufwand',
        textbaustein: 'erhöhter Zeitaufwand aufgrund starker Kanalverkalkung',
        faktorZuschlag: 0.7,
        gozRelevant: ['GOZ_2360', 'GOZ_2370', 'GOZ_2380', 'GOZ_2390', 'GOZ_2400', 'GOZ_2410']
    },
    {
        indikator: 'mehrfache_kanaele',
        kategorie: 'zeitaufwand',
        textbaustein: 'erhöhter Zeitaufwand bei mehreren Wurzelkanälen',
        faktorZuschlag: 0.5,
        gozRelevant: ['GOZ_2360', 'GOZ_2370', 'GOZ_2380', 'GOZ_2390', 'GOZ_2400', 'GOZ_2410']
    },
    {
        indikator: 'lange_behandlungsdauer',
        kategorie: 'zeitaufwand',
        textbaustein: 'überdurchschnittliche Behandlungsdauer',
        faktorZuschlag: 0.4,
        gozRelevant: [] // Alle
    },

    // === SCHWIERIGKEIT ===
    {
        indikator: 'verwurzelter_zahn',
        kategorie: 'schwierigkeit',
        textbaustein: 'überdurchschnittlicher Schwierigkeitsgrad durch ausgeprägte Wurzelverhältnisse',
        faktorZuschlag: 0.6,
        gozRelevant: ['GOZ_3000', 'GOZ_3010', 'GOZ_3020', 'GOZ_3040', 'GOZ_3045', 'GOZ_3050']
    },
    {
        indikator: 'frakturierte_wurzel',
        kategorie: 'schwierigkeit',
        textbaustein: 'besondere Schwierigkeiten durch Wurzelfraktur',
        faktorZuschlag: 0.8,
        gozRelevant: ['GOZ_3000', 'GOZ_3010', 'GOZ_3020', 'GOZ_3040', 'GOZ_3045']
    },
    {
        indikator: 'osteotomie_erforderlich',
        kategorie: 'schwierigkeit',
        textbaustein: 'Osteotomie erforderlich',
        faktorZuschlag: 0.0, // GOZ 3040 hat eigene Bewertung
        gozRelevant: ['GOZ_3040', 'GOZ_3045', 'GOZ_3050']
    },
    {
        indikator: 'tiefe_kavitaet',
        kategorie: 'schwierigkeit',
        textbaustein: 'überdurchschnittlicher Schwierigkeitsgrad durch tiefe Kavität',
        faktorZuschlag: 0.4,
        gozRelevant: ['GOZ_2060', 'GOZ_2080', 'GOZ_2100', 'GOZ_2120']
    },
    {
        indikator: 'subgingivaler_rand',
        kategorie: 'schwierigkeit',
        textbaustein: 'Präparation mit subgingivalem Federrandverlauf',
        faktorZuschlag: 0.5,
        gozRelevant: ['GOZ_2200', 'GOZ_2210', 'GOZ_5000', 'GOZ_5010', 'GOZ_5040']
    },
    {
        indikator: 'eingeschraenkte_mundoeffnung',
        kategorie: 'schwierigkeit',
        textbaustein: 'überdurchschnittlicher Schwierigkeitsgrad durch eingeschränkte Mundöffnung',
        faktorZuschlag: 0.5,
        gozRelevant: [] // Alle
    },

    // === PATIENTENBEDINGT ===
    {
        indikator: 'aengstlicher_patient',
        kategorie: 'patient',
        textbaustein: 'erhöhter Zeitaufwand durch patientenbedingte Erschwernisse',
        faktorZuschlag: 0.3,
        gozRelevant: [] // Alle
    },
    {
        indikator: 'wuergereflex',
        kategorie: 'patient',
        textbaustein: 'patientenbedingter erhöhter Aufwand durch ausgeprägten Würgereflex',
        faktorZuschlag: 0.4,
        gozRelevant: [] // Alle
    },
    {
        indikator: 'kooperationseinschraenkung',
        kategorie: 'patient',
        textbaustein: 'erhöhter Aufwand durch eingeschränkte Kooperationsfähigkeit',
        faktorZuschlag: 0.5,
        gozRelevant: [] // Alle
    },
    {
        indikator: 'behinderung',
        kategorie: 'patient',
        textbaustein: 'erhöhter Zeitaufwand aufgrund patientenbedingter Besonderheiten',
        faktorZuschlag: 0.5,
        gozRelevant: [] // Alle
    },
    {
        indikator: 'blutererkrankung',
        kategorie: 'patient',
        textbaustein: 'erhöhter Aufwand bei Blutgerinnungsstörung',
        faktorZuschlag: 0.5,
        gozRelevant: ['GOZ_3000', 'GOZ_3010', 'GOZ_3020', 'GOZ_3040', 'GOZ_3045', 'GOZ_3050']
    },

    // === ANATOMIE ===
    {
        indikator: 'enger_kiefer',
        kategorie: 'anatomie',
        textbaustein: 'anatomische Besonderheiten (enger Kiefer)',
        faktorZuschlag: 0.4,
        gozRelevant: [] // Alle
    },
    {
        indikator: 'gekruemmte_wurzel',
        kategorie: 'anatomie',
        textbaustein: 'anatomische Besonderheiten durch stark gekrümmten Wurzelverlauf',
        faktorZuschlag: 0.6,
        gozRelevant: ['GOZ_2360', 'GOZ_2370', 'GOZ_2380', 'GOZ_2390', 'GOZ_2400', 'GOZ_2410', 'GOZ_3000', 'GOZ_3010']
    },
    {
        indikator: 'nervnaehe',
        kategorie: 'anatomie',
        textbaustein: 'erhöhte Sorgfaltspflicht aufgrund Nervnähe',
        faktorZuschlag: 0.5,
        gozRelevant: ['GOZ_3040', 'GOZ_3045', 'GOZ_3050', 'GOZ_9040']
    },

    // === BESONDERE UMSTÄNDE ===
    {
        indikator: 'akute_entzuendung',
        kategorie: 'umstaende',
        textbaustein: 'besondere Umstände durch akute Entzündung',
        faktorZuschlag: 0.4,
        gozRelevant: [] // Viele
    },
    {
        indikator: 'revision',
        kategorie: 'umstaende',
        textbaustein: 'erhöhter Aufwand bei Revisionsbehandlung',
        faktorZuschlag: 0.5,
        gozRelevant: ['GOZ_2360', 'GOZ_2370', 'GOZ_2380', 'GOZ_2390', 'GOZ_2400', 'GOZ_2410', 'GOZ_2440']
    },
    {
        indikator: 'stiftentfernung',
        kategorie: 'umstaende',
        textbaustein: 'erhöhter Aufwand durch Stiftentfernung',
        faktorZuschlag: 0.6,
        gozRelevant: ['GOZ_2360', 'GOZ_2370', 'GOZ_2380', 'GOZ_2390', 'GOZ_2400', 'GOZ_2410', 'GOZ_2440']
    },
    {
        indikator: 'mehrfachbehandlung',
        kategorie: 'umstaende',
        textbaustein: 'erhöhter Aufwand bei mehrfacher Behandlung in einer Sitzung',
        faktorZuschlag: 0.3,
        gozRelevant: [] // Alle
    }
];

// ═══════════════════════════════════════════════════════════════
// HAUPTFUNKTIONEN
// ═══════════════════════════════════════════════════════════════

/**
 * Findet alle passenden Indikatoren für einen GOZ-Code
 */
export function findeIndikatoren(gozCode: string): IndikatorMapping[] {
    return INDIKATOREN.filter(ind =>
        ind.gozRelevant.length === 0 || ind.gozRelevant.includes(gozCode)
    );
}

/**
 * Berechnet den empfohlenen Faktor basierend auf Indikatoren
 */
export function berechneEmpfohlenenFaktor(
    indikatoren: string[],
    basisFaktor: number = 2.3
): number {
    let gesamtZuschlag = 0;

    for (const indikatorName of indikatoren) {
        const mapping = INDIKATOREN.find(ind => ind.indikator === indikatorName);
        if (mapping) {
            gesamtZuschlag += mapping.faktorZuschlag;
        }
    }

    // Maximum 3.5-fach (GOZ-Schwellenwert)
    return Math.min(basisFaktor + gesamtZuschlag, 3.5);
}

/**
 * Generiert rechtssichere Begründung für Steigerungsfaktor
 */
export function generiereBegruendung(
    gozCode: string,
    medizinischeIndikatoren: string[],
    zielFaktor: number = 3.5
): BegruendungsResult {
    const verwendeteIndikatoren: IndikatorMapping[] = [];
    const textbausteine: string[] = [];

    // Finde passende Indikatoren
    for (const indikatorName of medizinischeIndikatoren) {
        const mapping = INDIKATOREN.find(ind => ind.indikator === indikatorName);
        if (mapping) {
            // Prüfe ob für diesen GOZ-Code relevant
            if (mapping.gozRelevant.length === 0 || mapping.gozRelevant.includes(gozCode)) {
                verwendeteIndikatoren.push(mapping);
                textbausteine.push(mapping.textbaustein);
            }
        }
    }

    // Berechne empfohlenen Faktor
    const empfohleneFaktor = berechneEmpfohlenenFaktor(
        verwendeteIndikatoren.map(i => i.indikator),
        2.3
    );

    // Wähle passenden Faktor
    const tatsaechlicheFaktor = Math.min(zielFaktor, empfohleneFaktor);

    // Generiere Begründungstext
    let begruendungsText: string;
    if (textbausteine.length === 0) {
        begruendungsText = 'Der Steigerungsfaktor ist durch besondere Umstände bei der Behandlung begründet.';
    } else if (textbausteine.length === 1) {
        begruendungsText = `Gem. § 5 Abs. 2 GOZ: ${capitalizeFirst(textbausteine[0])}.`;
    } else {
        begruendungsText = `Gem. § 5 Abs. 2 GOZ: ${capitalizeFirst(textbausteine[0])}; ${textbausteine.slice(1).join('; ')}.`;
    }

    // Kurzform für Rechnung
    const kurzbegruendung = textbausteine.length > 0
        ? textbausteine.map(t => t.replace('erhöhter Zeitaufwand durch ', '')
            .replace('überdurchschnittlicher Schwierigkeitsgrad durch ', '')
            .replace('erhöhter Aufwand ', ''))
            .join(', ')
        : 'besondere Behandlungsumstände';

    return {
        gozCode,
        empfohleneFaktor: tatsaechlicheFaktor,
        begruendungsText,
        indikatoren: verwendeteIndikatoren.map(i => i.indikator),
        rechtsgrundlage: '§ 5 Abs. 2 GOZ',
        kurzbegruendung
    };
}

/**
 * Generiert Begründung für Standard-Fälle (Quick-Access)
 */
export function generiereStandardBegruendung(fallTyp: string): BegruendungsResult {
    const standardFaelle: Record<string, { goz: string; indikatoren: string[]; faktor: number }> = {
        'endo_molar_verkalkung': {
            goz: 'GOZ_2410',
            indikatoren: ['starke_verkalkung', 'gekruemmte_wurzel'],
            faktor: 3.5
        },
        'extraktion_verwurzelt': {
            goz: 'GOZ_3010',
            indikatoren: ['verwurzelter_zahn', 'erschwerte_blutstillung'],
            faktor: 3.5
        },
        'krone_subgingival': {
            goz: 'GOZ_5000',
            indikatoren: ['subgingivaler_rand', 'tiefe_kavitaet'],
            faktor: 3.2
        },
        'fuellung_tief_gross': {
            goz: 'GOZ_2100',
            indikatoren: ['tiefe_kavitaet', 'lange_behandlungsdauer'],
            faktor: 3.0
        }
    };

    const fall = standardFaelle[fallTyp];
    if (!fall) {
        throw new Error(`Unbekannter Falltyp: ${fallTyp}`);
    }

    return generiereBegruendung(fall.goz, fall.indikatoren, fall.faktor);
}

// ═══════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════

function capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

export const ALLE_INDIKATOREN = INDIKATOREN;

export default {
    generiereBegruendung,
    generiereStandardBegruendung,
    findeIndikatoren,
    berechneEmpfohlenenFaktor,
    ALLE_INDIKATOREN
};
