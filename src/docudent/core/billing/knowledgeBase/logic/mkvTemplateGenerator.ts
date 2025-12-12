/**
 * MKV-Template Generator
 * 
 * Generiert rechtssichere Mehrkostenvereinbarungen (MKV)
 * für gleichartige und andersartige Versorgungen.
 */

import { berechneFestzuschuss, BonusStatus } from './festzuschussMapper';


// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface PatientData {
    name: string;
    vorname: string;
    geburtsdatum: string;
    versichertenNr?: string;
    kasseName?: string;
}

export interface PraxisData {
    praxisName: string;
    zahnarztName: string;
    adresse: string;
    telefon?: string;
}

export interface MKVPosition {
    beschreibung: string;
    einzelpreis: number;
    anzahl: number;
    betrag: number;
    typ: 'goz' | 'labor' | 'material';
}

export interface MKVResult {
    versorgungsart: 'gleichartig' | 'andersartig';
    zaehne: number[];
    therapie: string;

    // Kostenaufstellung
    positionen: MKVPosition[];
    gesamtMehrkosten: number;

    // Festzuschuss-Info
    festzuschussBefunde: string[];
    festzuschussBetrag: number;
    kassenAnteil: number;
    patientEigenanteil: number;

    // Template-Text
    templateText: string;

    // Meta
    erstelltAm: string;
    gueltigBis: string;
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE TEXTE
// ═══════════════════════════════════════════════════════════════

const MKV_HEADER = `
MEHRKOSTENVEREINBARUNG
(Vereinbarung über privatzahnärztliche Leistungen bei gesetzlich versichertem Patienten)

gemäß § 28 Abs. 2 SGB V in Verbindung mit § 2 Abs. 3 GOZ
`;

const MKV_ERKLAERUNG_GLEICHARTIG = `
ERLÄUTERUNG:
Bei der geplanten zahnärztlichen Versorgung handelt es sich um eine "gleichartige" Versorgung. 
Diese umfasst die Regelversorgung der gesetzlichen Krankenversicherung (BEMA) sowie darüber 
hinausgehende höherwertige Leistungen nach der privaten Gebührenordnung (GOZ).

Der Festzuschuss Ihrer Krankenkasse basiert auf dem zahnärztlichen Befund und wird auf die 
Gesamtkosten angerechnet. Die entstehenden Mehrkosten sind vom Patienten zu tragen.
`;

const MKV_ERKLAERUNG_ANDERSARTIG = `
ERLÄUTERUNG:
Bei der geplanten zahnärztlichen Versorgung handelt es sich um eine "andersartige" Versorgung.
Diese unterscheidet sich vollständig von der Regelversorgung der gesetzlichen Krankenversicherung.
Die gesamte Behandlung erfolgt nach der privaten Gebührenordnung (GOZ).

Der Festzuschuss Ihrer Krankenkasse wird auf die Gesamtkosten angerechnet. Die verbleibenden 
Kosten sind vom Patienten zu tragen.
`;

const MKV_FOOTER = `
☐ Ich wünsche diese Versorgung und habe die Möglichkeit, die Regelversorgung zu wählen, zur Kenntnis genommen.
☐ Die Kosteninformation ist verständlich und vollständig.
☐ Mir ist bekannt, dass ich ohne Angabe von Gründen innerhalb von 14 Tagen widerrufen kann.

_________________________    _________________________
Ort, Datum                   Unterschrift Patient/Betreuer

_________________________    
Unterschrift Zahnarzt/Praxis
`;

// ═══════════════════════════════════════════════════════════════
// HAUPTFUNKTIONEN
// ═══════════════════════════════════════════════════════════════

/**
 * Generiert eine MKV für gleichartige Versorgung
 */
export function generiereMKV(
    patient: PatientData,
    praxis: PraxisData,
    zaehne: number[],
    therapie: string,
    versorgungsart: 'gleichartig' | 'andersartig',
    positionen: MKVPosition[],
    festzuschussBefunde: string[],
    bonusStatus: BonusStatus = 'ohne'
): MKVResult {
    // Berechne Festzuschuss
    const fzResult = berechneFestzuschuss(festzuschussBefunde, bonusStatus);

    // Berechne Gesamtkosten
    const gesamtMehrkosten = positionen.reduce((sum, p) => sum + p.betrag, 0);

    // Kassenanteil (bei gleichartig: BEMA + FZ, bei andersartig: nur FZ)
    const kassenAnteil = fzResult.gesamtbetrag;
    const patientEigenanteil = gesamtMehrkosten;

    // Formatiere Datum
    const heute = new Date();
    const erstelltAm = heute.toLocaleDateString('de-DE');
    const gueltigBis = new Date(heute.getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE');

    // Generiere Template-Text
    const templateText = generiereTemplateText(
        patient,
        praxis,
        zaehne,
        therapie,
        versorgungsart,
        positionen,
        fzResult,
        gesamtMehrkosten,
        kassenAnteil,
        patientEigenanteil,
        erstelltAm,
        gueltigBis
    );

    return {
        versorgungsart,
        zaehne,
        therapie,
        positionen,
        gesamtMehrkosten: Math.round(gesamtMehrkosten * 100) / 100,
        festzuschussBefunde,
        festzuschussBetrag: fzResult.gesamtbetrag,
        kassenAnteil,
        patientEigenanteil: Math.round(patientEigenanteil * 100) / 100,
        templateText,
        erstelltAm,
        gueltigBis
    };
}

/**
 * Generiert den vollständigen Template-Text
 */
function generiereTemplateText(
    patient: PatientData,
    praxis: PraxisData,
    zaehne: number[],
    therapie: string,
    versorgungsart: 'gleichartig' | 'andersartig',
    positionen: MKVPosition[],
    fzResult: { gesamtbetrag: number; befunde: string[] },
    gesamtMehrkosten: number,
    kassenAnteil: number,
    patientEigenanteil: number,
    erstelltAm: string,
    gueltigBis: string
): string {
    const erklaerung = versorgungsart === 'gleichartig'
        ? MKV_ERKLAERUNG_GLEICHARTIG
        : MKV_ERKLAERUNG_ANDERSARTIG;

    // Formatiere Positionen als Tabelle
    let positionenText = `
KOSTENAUFSTELLUNG:
──────────────────────────────────────────────────────────────────
Leistung                                          Anzahl    Betrag
──────────────────────────────────────────────────────────────────
`;

    for (const pos of positionen) {
        const zeile = `${pos.beschreibung.padEnd(45)} ${String(pos.anzahl).padStart(6)}    ${formatCurrency(pos.betrag).padStart(10)}`;
        positionenText += zeile + '\n';
    }

    positionenText += `──────────────────────────────────────────────────────────────────
Gesamtkosten der Mehrleistungen                           ${formatCurrency(gesamtMehrkosten).padStart(10)}

FESTZUSCHUSS IHRER KRANKENKASSE:
Befund(e): ${fzResult.befunde.join(', ')}
Festzuschussbetrag:                                       ${formatCurrency(kassenAnteil).padStart(10)}

══════════════════════════════════════════════════════════════════
IHR EIGENANTEIL (zu zahlen an Praxis):                    ${formatCurrency(patientEigenanteil).padStart(10)}
══════════════════════════════════════════════════════════════════
`;

    return `${MKV_HEADER}

${praxis.praxisName}
${praxis.zahnarztName}
${praxis.adresse}
${praxis.telefon ? `Tel: ${praxis.telefon}` : ''}

PATIENT:
Name: ${patient.name}, ${patient.vorname}
Geb.: ${patient.geburtsdatum}
${patient.versichertenNr ? `Vers.-Nr.: ${patient.versichertenNr}` : ''}
${patient.kasseName ? `Krankenkasse: ${patient.kasseName}` : ''}

GEPLANTE VERSORGUNG:
Zahn/Zähne: ${zaehne.join(', ')}
Therapie: ${therapie}
Versorgungsart: ${versorgungsart.charAt(0).toUpperCase() + versorgungsart.slice(1)}

${erklaerung}

${positionenText}

Erstellungsdatum: ${erstelltAm}
Gültig bis: ${gueltigBis}

${MKV_FOOTER}`;
}

/**
 * Quick-Funktion für Standard-MKV
 */
export function generiereMKVFuerKrone(
    patient: PatientData,
    praxis: PraxisData,
    zahnNummer: number,
    kronenTyp: 'vollkeramik' | 'zirkon' | 'vmk',
    mitStift: boolean = false,
    bonusStatus: BonusStatus = 'ohne'
): MKVResult {
    // Bestimme Positionen basierend auf Kronentyp
    const positionen: MKVPosition[] = [];

    // GOZ-Mehrkosten
    positionen.push({
        beschreibung: 'Adhäsive Befestigung (GOZ 2197)',
        einzelpreis: 61.55,
        anzahl: 1,
        betrag: 61.55,
        typ: 'goz'
    });

    if (mitStift) {
        positionen.push({
            beschreibung: 'Stiftpräparation (GOZ 2195)',
            einzelpreis: 48.37,
            anzahl: 1,
            betrag: 48.37,
            typ: 'goz'
        });
        positionen.push({
            beschreibung: 'Aufbaufüllung (GOZ 2180)',
            einzelpreis: 73.85,
            anzahl: 1,
            betrag: 73.85,
            typ: 'goz'
        });
    }

    // Labor-Mehrkosten
    const laborMehrkosten = {
        vollkeramik: 280,
        zirkon: 350,
        vmk: 180
    };

    positionen.push({
        beschreibung: `Labormehrkosten ${kronenTyp.toUpperCase()}-Krone`,
        einzelpreis: laborMehrkosten[kronenTyp],
        anzahl: 1,
        betrag: laborMehrkosten[kronenTyp],
        typ: 'labor'
    });

    // Bestimme Festzuschuss-Befunde
    const befunde: string[] = ['FZ_1.1'];

    // Prüfe Verblendbereich
    const quadrant = Math.floor(zahnNummer / 10);
    const position = zahnNummer % 10;
    const imVB = (quadrant === 1 || quadrant === 2)
        ? position <= 5
        : position <= 4;

    if (imVB) {
        befunde.push('FZ_1.3');
    }

    if (mitStift) {
        befunde.push('FZ_1.4');
    }

    return generiereMKV(
        patient,
        praxis,
        [zahnNummer],
        `${kronenTyp.charAt(0).toUpperCase() + kronenTyp.slice(1)}-Krone${mitStift ? ' mit Stiftaufbau' : ''}`,
        'gleichartig',
        positionen,
        befunde,
        bonusStatus
    );
}

// ═══════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════

function formatCurrency(betrag: number): string {
    return `${betrag.toFixed(2)} €`;
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

export default {
    generiereMKV,
    generiereMKVFuerKrone
};
