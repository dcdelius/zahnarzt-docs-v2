/**
 * Regel-Linker
 * 
 * Erstellt bidirektionale Verlinkungen zwischen Abrechnungsregeln
 * und Billing-Codes für schnelleren Zugriff.
 */

import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface BillingRule {
    id: string;
    typ: 'ausschluss' | 'bedingung' | 'haeufigkeit' | 'kombination' | 'inklusiv';
    titel: string;
    beschreibung?: string;
    betrifft: string[];           // z.B. ["BEMA_13a", "BEMA_13b"]
    regel?: {
        operator?: string;
        bedingung?: string;
        wert?: number | string;
        zeitraum?: string;
        bezug?: string;
    };
    schweregrad: 'regress' | 'warnung' | 'info';
    quelle?: string;
}

export interface LinkedCode {
    codeId: string;
    regelIds: string[];
    regressRegeln: string[];      // Kritische Regeln
    warnungRegeln: string[];      // Wichtige Hinweise
    infoRegeln: string[];         // Informative Regeln
}

export interface RegelIndex {
    regelZuCodes: Map<string, string[]>;   // Regel → betroffene Codes
    codeZuRegeln: Map<string, LinkedCode>; // Code → verknüpfte Regeln
}

// ═══════════════════════════════════════════════════════════════
// HAUPTFUNKTIONEN
// ═══════════════════════════════════════════════════════════════

/**
 * Erstellt bidirektionalen Index aus Regeln
 */
export function buildRegelIndex(regeln: BillingRule[]): RegelIndex {
    const regelZuCodes = new Map<string, string[]>();
    const codeZuRegeln = new Map<string, LinkedCode>();

    for (const regel of regeln) {
        // Regel → Codes
        regelZuCodes.set(regel.id, regel.betrifft);

        // Codes → Regel
        for (const codeId of regel.betrifft) {
            let linkedCode = codeZuRegeln.get(codeId);

            if (!linkedCode) {
                linkedCode = {
                    codeId,
                    regelIds: [],
                    regressRegeln: [],
                    warnungRegeln: [],
                    infoRegeln: []
                };
                codeZuRegeln.set(codeId, linkedCode);
            }

            linkedCode.regelIds.push(regel.id);

            // Nach Schweregrad kategorisieren
            switch (regel.schweregrad) {
                case 'regress':
                    linkedCode.regressRegeln.push(regel.id);
                    break;
                case 'warnung':
                    linkedCode.warnungRegeln.push(regel.id);
                    break;
                case 'info':
                    linkedCode.infoRegeln.push(regel.id);
                    break;
            }
        }
    }

    return { regelZuCodes, codeZuRegeln };
}

/**
 * Findet alle Regeln für einen Code
 */
export function getRegelnFuerCode(
    codeId: string,
    index: RegelIndex
): LinkedCode | null {
    return index.codeZuRegeln.get(codeId) || null;
}

/**
 * Findet alle betroffenen Codes für eine Regel
 */
export function getCodesFuerRegel(
    regelId: string,
    index: RegelIndex
): string[] {
    return index.regelZuCodes.get(regelId) || [];
}

/**
 * Prüft ob zwei Codes durch eine Regel verbunden sind
 */
export function habenGemeinsameRegel(
    codeA: string,
    codeB: string,
    index: RegelIndex
): { gemeinsam: boolean; regeln: string[] } {
    const regelnA = index.codeZuRegeln.get(codeA)?.regelIds || [];
    const regelnB = index.codeZuRegeln.get(codeB)?.regelIds || [];

    const gemeinsameRegeln = regelnA.filter(r => regelnB.includes(r));

    return {
        gemeinsam: gemeinsameRegeln.length > 0,
        regeln: gemeinsameRegeln
    };
}

// ═══════════════════════════════════════════════════════════════
// KONFLIKT-ERKENNUNG
// ═══════════════════════════════════════════════════════════════

export interface KonfliktPruefung {
    hatKonflikt: boolean;
    konflikte: {
        regelId: string;
        typ: string;
        beschreibung: string;
        schweregrad: 'regress' | 'warnung' | 'info';
    }[];
}

/**
 * Prüft ob eine Code-Kombination Konflikte hat
 */
export function pruefeKonflikte(
    codes: string[],
    regeln: BillingRule[],
    index: RegelIndex
): KonfliktPruefung {
    const konflikte: KonfliktPruefung['konflikte'] = [];

    // Jede Regel prüfen
    for (const regel of regeln) {
        // Bei Ausschluss-Regeln: Prüfe ob mehrere betroffene Codes gleichzeitig vorkommen
        if (regel.typ === 'ausschluss') {
            const betroffeneImSet = regel.betrifft.filter(b => codes.includes(b));

            if (betroffeneImSet.length > 1) {
                konflikte.push({
                    regelId: regel.id,
                    typ: 'ausschluss',
                    beschreibung: regel.beschreibung || `${betroffeneImSet.join(' und ')} nicht kombinierbar`,
                    schweregrad: regel.schweregrad
                });
            }
        }

        // Bei Bedingungs-Regeln: Prüfe ob Bedingung erfüllt ist
        if (regel.typ === 'bedingung') {
            const betrifftCode = regel.betrifft.some(b => codes.includes(b));

            if (betrifftCode && regel.regel?.bedingung) {
                // Vereinfachte Prüfung - hier könnte komplexere Logik folgen
                const bedingungCode = regel.regel.bedingung;
                if (!codes.includes(bedingungCode)) {
                    konflikte.push({
                        regelId: regel.id,
                        typ: 'bedingung_fehlt',
                        beschreibung: regel.beschreibung || `Bedingung ${bedingungCode} fehlt`,
                        schweregrad: regel.schweregrad
                    });
                }
            }
        }
    }

    return {
        hatKonflikt: konflikte.length > 0,
        konflikte
    };
}

// ═══════════════════════════════════════════════════════════════
// EMPFEHLUNGEN
// ═══════════════════════════════════════════════════════════════

export interface CodeEmpfehlung {
    codeId: string;
    grund: string;
    regelId: string;
    prioritaet: 'hoch' | 'mittel' | 'niedrig';
}

/**
 * Generiert Empfehlungen basierend auf aktuellen Codes
 */
export function generiereEmpfehlungen(
    vorhandeneCodes: string[],
    regeln: BillingRule[],
    index: RegelIndex
): CodeEmpfehlung[] {
    const empfehlungen: CodeEmpfehlung[] = [];

    for (const regel of regeln) {
        // Kombinations-Regeln: Wenn einer vorhanden, anderen empfehlen
        if (regel.typ === 'kombination') {
            const vorhandeneBetroffene = regel.betrifft.filter(b => vorhandeneCodes.includes(b));
            const fehlende = regel.betrifft.filter(b => !vorhandeneCodes.includes(b));

            if (vorhandeneBetroffene.length > 0 && fehlende.length > 0) {
                for (const fehlt of fehlende) {
                    empfehlungen.push({
                        codeId: fehlt,
                        grund: regel.beschreibung || `Kombinierbar mit ${vorhandeneBetroffene.join(', ')}`,
                        regelId: regel.id,
                        prioritaet: regel.schweregrad === 'regress' ? 'hoch' : 'mittel'
                    });
                }
            }
        }

        // Bedingungs-Regeln: Wenn Code fehlt aber Bedingung erfüllt
        if (regel.typ === 'bedingung' && regel.regel?.bedingung) {
            const bedingungErfuellt = vorhandeneCodes.includes(regel.regel.bedingung);
            const codeNichtVorhanden = regel.betrifft.every(b => !vorhandeneCodes.includes(b));

            if (bedingungErfuellt && codeNichtVorhanden) {
                for (const code of regel.betrifft) {
                    empfehlungen.push({
                        codeId: code,
                        grund: regel.beschreibung || `Kann hinzugefügt werden wegen ${regel.regel.bedingung}`,
                        regelId: regel.id,
                        prioritaet: 'niedrig'
                    });
                }
            }
        }
    }

    // Deduplizieren und nach Priorität sortieren
    const unique = new Map<string, CodeEmpfehlung>();
    for (const e of empfehlungen) {
        const existing = unique.get(e.codeId);
        if (!existing || getPrioritaetWert(e.prioritaet) > getPrioritaetWert(existing.prioritaet)) {
            unique.set(e.codeId, e);
        }
    }

    return Array.from(unique.values())
        .sort((a, b) => getPrioritaetWert(b.prioritaet) - getPrioritaetWert(a.prioritaet));
}

function getPrioritaetWert(p: 'hoch' | 'mittel' | 'niedrig'): number {
    return { hoch: 3, mittel: 2, niedrig: 1 }[p];
}

// ═══════════════════════════════════════════════════════════════
// CODE-ENRICHMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Erweitert Codes mit regelIds
 */
export function enrichCodesWithRegelIds<T extends { id: string }>(
    codes: T[],
    index: RegelIndex
): (T & { regelIds: string[] })[] {
    return codes.map(code => ({
        ...code,
        regelIds: index.codeZuRegeln.get(code.id)?.regelIds || []
    }));
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

export default {
    buildRegelIndex,
    getRegelnFuerCode,
    getCodesFuerRegel,
    habenGemeinsameRegel,
    pruefeKonflikte,
    generiereEmpfehlungen,
    enrichCodesWithRegelIds
};
