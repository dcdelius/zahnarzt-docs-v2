/**
 * @deprecated DIESE DATEI IST VERALTET!
 * 
 * Verwende stattdessen:
 * - inferBillingV2() aus billingRegistry.ts
 * - processChipsToBilling() aus treatmentEngine.ts
 * 
 * Diese Datei wird noch von useDocudentV5.ts verwendet.
 * Migration nach useBillingV5Controller.ts empfohlen.
 */

/**
 * Billing Inference Engine (DEPRECATED)
 * 
 * Integrationsschicht zwischen Diktat-Extraktion und Abrechnungs-Logik.
 * Wandelt extrahierte klinische Daten in Abrechnungsvorschläge um.
 */

import {
    getBefundeFuerZahn,
    getBefundeFuerBruecke,
    getBefundeFuerProthese,
    istImVerblendbereich,
    ZahnSituation,
    LueckenSituation,
    BefundResult
} from './befundLogic';

import {
    berechneFestzuschuss,
    BonusStatus,
    FestzuschussResult
} from './festzuschussMapper';

import {
    berechneGleichartVersorgung,
    GleichartResult
} from './gleichartigCalculator';

import {
    pruefeKonflikte,
    generiereEmpfehlungen,
    buildRegelIndex,
    BillingRule,
    KonfliktPruefung,
    CodeEmpfehlung
} from './regelLinker';

import {
    generiereBegruendung,
    BegruendungsResult
} from './begruendungsGenerator';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type InsuranceType = 'GKV' | 'PKV';

export interface ExtractedData {
    tooth?: string;
    surfaces?: string[];
    diagnosis?: string;
    anesthesia?: string;
    material?: string;
    costs?: string;
    matrix?: boolean;
    stift?: boolean;
    stiftart?: 'konfektioniert' | 'gegossen';
    nachEndo?: boolean;
    // Brücken/Prothesen
    pfeiler?: string[];
    fehlend?: string[];
    versorgungsart?: 'krone' | 'bruecke' | 'prothese' | 'fuellung';
}

export interface TreatmentDefaults {
    dokumentation?: {
        aufklaerungImmer?: boolean;
        alternativenBesprochen?: boolean;
        risikenErklaert?: boolean;
    };
    anaesthesie?: {
        ukSeitenzahn?: 'leitung' | 'infiltration' | 'ila' | 'fragen';
        oberflaecheImmer?: boolean;
    };
    methodik?: {
        kofferdamStandard?: boolean;
        kariesdetektorBeiZweifel?: boolean;
    };
    tiefKaries?: {
        unterfuellungStandard?: boolean;
    };
}

export interface BillingSuggestion {
    id: string;
    type: 'festzuschuss' | 'bema' | 'goz' | 'warnung' | 'optimierung';
    code?: string;
    label: string;
    description: string;
    betrag?: number;
    priority: 'hoch' | 'mittel' | 'niedrig';
    autoAccept?: boolean;
    textSnippet?: string;
}

export interface BillingInferenceResult {
    // Befund-Analyse
    zahnSituation?: ZahnSituation;
    lueckeSituation?: LueckenSituation;
    befundResult?: BefundResult;

    // Festzuschüsse (GKV)
    festzuschuss?: FestzuschussResult;

    // BEMA/GOZ Splitting (gleichartig)
    gleichartResult?: GleichartResult;

    // Konflikt-Prüfung
    konflikte?: KonfliktPruefung;

    // Smart Suggestions
    suggestions: BillingSuggestion[];

    // GOZ-Begründungen (PKV)
    gozBegruendungen?: BegruendungsResult[];

    // Meta
    verblendbereich: boolean;
    befundklasse: number;
    insuranceType: InsuranceType;
}

// ═══════════════════════════════════════════════════════════════
// DIAGNOSIS MAPPING
// ═══════════════════════════════════════════════════════════════

/**
 * Mappt Diagnose-Text auf Befund-Flags
 */
function mapDiagnosisToBefund(diagnosis?: string): Partial<ZahnSituation> {
    if (!diagnosis) return {};

    const lower = diagnosis.toLowerCase();

    // Weitgehend zerstört
    if (lower.includes('profunda') ||
        lower.includes('weitgehend') ||
        lower.includes('subtotal') ||
        lower.includes('kronenfraktur') ||
        lower.includes('stark zerstört')) {
        return { weitgehendZerstoert: true };
    }

    // Partieller Defekt
    if (lower.includes('partial') ||
        lower.includes('partiell') ||
        lower.includes('teildefekt')) {
        return { partiellerDefekt: true };
    }

    // Erneuerungsbedürftig
    if (lower.includes('erneuerung') ||
        lower.includes('insuffizient') ||
        lower.includes('defekte krone') ||
        lower.includes('randspalt')) {
        return { erneuerungsbeduerftig: true };
    }

    return {};
}

/**
 * Mappt Material-Text auf Versorgungsart
 */
function mapMaterialToVersorgung(material?: string): 'regelversorgung' | 'gleichartig' | 'andersartig' {
    if (!material) return 'regelversorgung';

    const lower = material.toLowerCase();

    // Gleichartig (höherwertig aber mit BEMA-Basis)
    if (lower.includes('keramik') ||
        lower.includes('zirkon') ||
        lower.includes('vollkeramik') ||
        lower.includes('emax') ||
        lower.includes('empress')) {
        return 'gleichartig';
    }

    // Andersartig (komplett GOZ)
    if (lower.includes('implantat') ||
        lower.includes('veneer') ||
        lower.includes('inlay') && lower.includes('gold')) {
        return 'andersartig';
    }

    return 'regelversorgung';
}

// ═══════════════════════════════════════════════════════════════
// MAIN INFERENCE FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Hauptfunktion: Inferiert Abrechnungsdaten aus extrahierten klinischen Daten
 * 
 * @param rawDictation - Optional: Original-Diktattext für Keyword-Erkennung
 */
export function inferBilling(
    extracted: ExtractedData,
    insuranceType: InsuranceType = 'GKV',
    bonusStatus: BonusStatus = 'ohne',
    defaults?: TreatmentDefaults,
    rawDictation?: string
): BillingInferenceResult {
    const suggestions: BillingSuggestion[] = [];
    const gozBegruendungen: BegruendungsResult[] = [];

    // ═══════════════════════════════════════════════════════════
    // DIKTAT-KEYWORD-ERKENNUNG
    // ═══════════════════════════════════════════════════════════
    const dictLower = (rawDictation || extracted.diagnosis || '').toLowerCase();

    // Parse tooth number
    const zahnNummer = extracted.tooth ? parseInt(extracted.tooth.replace(/\D/g, ''), 10) : 0;
    const imVB = zahnNummer > 0 ? istImVerblendbereich(zahnNummer) : false;

    // Bestimme Versorgungsart - FÜLLUNG hat Priorität wenn surfaces vorhanden
    const versorgungsart = extracted.versorgungsart ||
        (extracted.surfaces && extracted.surfaces.length > 0 ? 'fuellung' :
            (extracted.pfeiler && extracted.fehlend ? 'bruecke' :
                extracted.fehlend && extracted.fehlend.length > 3 ? 'prothese' : 'krone'));

    // ═══════════════════════════════════════════════════════════
    // 1. FÜLLUNG (einfachster Fall) - MUSS VOR KRONE GEPRÜFT WERDEN
    // ═══════════════════════════════════════════════════════════
    if (versorgungsart === 'fuellung') {
        const surfaces = extracted.surfaces || [];

        // ─── KEYWORD-BASIERTE CODES ───────────────────────────────────
        const keywordsDetected = {
            kofferdam: dictLower.includes('kofferdam') || dictLower.includes('spanngummi') || dictLower.includes('rubber'),
            leitung: dictLower.includes('leitung') || dictLower.includes('leitungsanästhesie') || dictLower.includes('leitungsanaesthesie'),
            infiltration: dictLower.includes('infiltration') || dictLower.includes('injektion'),
            oberflaeche: dictLower.includes('oberfl') || dictLower.includes('topisch'),
            profunda: dictLower.includes('profunda') || dictLower.includes('tief') || dictLower.includes('pulpanah'),
            kariesdetektor: dictLower.includes('karies') && (dictLower.includes('detektor') || dictLower.includes('anfärb') || dictLower.includes('anfaerb')),
            unterfuellung: dictLower.includes('unterfüllung') || dictLower.includes('unterfuellung') || dictLower.includes('liner')
        };

        // Kofferdam aus Diktat (ÜBERSCHREIBT Defaults wenn explizit genannt!)
        if (keywordsDetected.kofferdam) {
            if (insuranceType === 'GKV') {
                suggestions.push({
                    id: `bema_kofferdam_keyword`,
                    type: 'bema',
                    code: 'BEMA_12',
                    label: 'Kofferdam (bMF)',
                    description: 'Aus Diktat erkannt: "Kofferdam"',
                    priority: 'hoch',
                    autoAccept: true
                });
            } else {
                suggestions.push({
                    id: `goz_kofferdam_keyword`,
                    type: 'goz',
                    code: 'GOZ_2040',
                    label: 'Kofferdam',
                    description: 'Aus Diktat erkannt: "Kofferdam"',
                    priority: 'hoch',
                    autoAccept: true
                });
            }
        }

        // Leitungsanästhesie aus Diktat
        if (keywordsDetected.leitung) {
            if (insuranceType === 'GKV') {
                suggestions.push({
                    id: `bema_leitung_keyword`,
                    type: 'bema',
                    code: 'BEMA_41a',
                    label: 'Leitungsanästhesie',
                    description: 'Aus Diktat erkannt: "Leitung"',
                    priority: 'hoch',
                    autoAccept: true
                });
            } else {
                suggestions.push({
                    id: `goz_leitung_keyword`,
                    type: 'goz',
                    code: 'GOZ_0100',
                    label: 'Leitungsanästhesie',
                    description: 'Aus Diktat erkannt: "Leitung"',
                    priority: 'hoch',
                    autoAccept: true
                });
            }
        } else if (keywordsDetected.infiltration) {
            // Infiltration aus Diktat
            if (insuranceType === 'GKV') {
                suggestions.push({
                    id: `bema_infiltr_keyword`,
                    type: 'bema',
                    code: 'BEMA_40',
                    label: 'Infiltrationsanästhesie',
                    description: 'Aus Diktat erkannt',
                    priority: 'hoch',
                    autoAccept: true
                });
            } else {
                suggestions.push({
                    id: `goz_infiltr_keyword`,
                    type: 'goz',
                    code: 'GOZ_0090',
                    label: 'Infiltrationsanästhesie',
                    description: 'Aus Diktat erkannt',
                    priority: 'hoch',
                    autoAccept: true
                });
            }
        }

        // Kariesdetektor (nur PKV, Analogposition!)
        if (keywordsDetected.kariesdetektor && insuranceType === 'PKV') {
            suggestions.push({
                id: `goz_kariesdetektor`,
                type: 'goz',
                code: 'GOZ_2020a',
                label: 'Kariesdetektor (analog §6 GOZ)',
                description: 'Kariesanfärbung zur selektiven Exkavation',
                priority: 'mittel',
                autoAccept: true
            });
        }

        // Unterfüllung (nur PKV)
        if (keywordsDetected.unterfuellung && insuranceType === 'PKV') {
            suggestions.push({
                id: `goz_unterfuellung`,
                type: 'goz',
                code: 'GOZ_2050',
                label: 'Unterfüllung',
                description: 'Liner/Unterfüllung vor Kompositfüllung',
                priority: 'hoch',
                autoAccept: true
            });
        }

        if (insuranceType === 'GKV') {
            // BEMA-Position basierend auf Flächenanzahl
            let bemaCode: string;
            let bemaLabel: string;

            if (surfaces.length <= 1) {
                bemaCode = 'BEMA_13a';
                bemaLabel = 'Einflächige Füllung';
            } else if (surfaces.length === 2) {
                bemaCode = 'BEMA_13b';
                bemaLabel = 'Zweiflächige Füllung';
            } else {
                bemaCode = 'BEMA_13c';
                bemaLabel = 'Dreiflächige oder mehr Füllung';
            }

            suggestions.push({
                id: `bema_fuellung_${zahnNummer}`,
                type: 'bema',
                code: bemaCode,
                label: bemaLabel,
                description: `Zahn ${zahnNummer} ${surfaces.join('')}`,
                priority: 'hoch',
                autoAccept: true
            });

            // Adhäsiv bei Komposit (GOZ-Mehrkosten)
            if (extracted.material?.toLowerCase().includes('komposit') ||
                extracted.material?.toLowerCase().includes('tetric') ||
                extracted.material?.toLowerCase().includes('composite')) {
                suggestions.push({
                    id: `goz_adhaesiv_${zahnNummer}`,
                    type: 'goz',
                    code: 'GOZ_2197',
                    label: 'Adhäsive Befestigung',
                    description: 'Mehrkosten bei Kompositfüllung (gleichartig)',
                    priority: 'mittel'
                });
            }

            // Tiefe Karies / Pulpa (Cp / P)
            // Nur wenn explizit in Diagnose oder Default bei 'profunda'
            const diagLower = extracted.diagnosis?.toLowerCase() || '';

            if (diagLower.includes('pulpa') && (diagLower.includes('eröffnet') || diagLower.includes('blutung'))) {
                suggestions.push({
                    id: `bema_p_${zahnNummer}`,
                    type: 'bema',
                    code: 'BEMA_26',
                    label: 'Direkte Überkappung (P)',
                    description: 'Pulpaeröffnung versorgt',
                    priority: 'hoch',
                    autoAccept: true
                });
            } else if (diagLower.includes('profunda') || diagLower.includes('cp') || (defaults && defaults.tiefKaries?.unterfuellungStandard && diagLower.includes('karies'))) {
                // Nur Cp wenn NICHT P
                suggestions.push({
                    id: `bema_cp_${zahnNummer}`,
                    type: 'bema',
                    code: 'BEMA_25',
                    label: 'Indirekte Überkappung (Cp)',
                    description: 'Caries profunda',
                    priority: 'hoch',
                    autoAccept: true
                });
            }
        } else {
            // PKV: GOZ-Positionen
            const gozCode = surfaces.length <= 1 ? 'GOZ_2060' :
                surfaces.length === 2 ? 'GOZ_2080' : 'GOZ_2100';

            suggestions.push({
                id: `goz_fuellung_${zahnNummer}`,
                type: 'goz',
                code: gozCode,
                label: `${surfaces.length}-flächige Kompositfüllung`,
                description: `Zahn ${zahnNummer} ${surfaces.join('')}`,
                priority: 'hoch',
                autoAccept: true
            });

            // Adhäsiv (GOZ 2197) auch bei PKV
            if (extracted.material?.toLowerCase().includes('komposit') ||
                extracted.material?.toLowerCase().includes('tetric') ||
                extracted.material?.toLowerCase().includes('composite')) {
                suggestions.push({
                    id: `goz_adhaesiv_pkv_${zahnNummer}`,
                    type: 'goz',
                    code: 'GOZ_2197',
                    label: 'Adhäsive Befestigung',
                    description: 'Zuschlag für Adhäsivtechnik',
                    priority: 'hoch',
                    autoAccept: true
                });
            }
        }

        // ═══════════════════════════════════════════════════════════
        // SMART DEFAULTS & BEGLEITLEISTUNGEN (Anästhesie, Kofferdam)
        // ═══════════════════════════════════════════════════════════
        if (defaults) {
            // 1. KOFFERDAM
            if (defaults.methodik?.kofferdamStandard) {
                if (insuranceType === 'GKV') {
                    suggestions.push({
                        id: `bema_kofferdam`,
                        type: 'bema',
                        code: 'BEMA_12',
                        label: 'Besondere Maßnahmen (Kofferdam)',
                        description: 'Standardmäßig aktiv',
                        priority: 'hoch',
                        autoAccept: true
                    });
                } else {
                    suggestions.push({
                        id: `goz_kofferdam`,
                        type: 'goz',
                        code: 'GOZ_2040',
                        label: 'Kofferdam',
                        description: 'Standardmäßig aktiv',
                        priority: 'hoch',
                        autoAccept: true
                    });
                }
            }

            // 2. ANÄSTHESIE
            const isUkSeitenzahn = (zahnNummer >= 34 && zahnNummer <= 38) || (zahnNummer >= 44 && zahnNummer <= 48);

            if (insuranceType === 'GKV') {
                if (isUkSeitenzahn && defaults.anaesthesie?.ukSeitenzahn === 'leitung') {
                    suggestions.push({
                        id: `bema_leitung`,
                        type: 'bema',
                        code: 'BEMA_41a',
                        label: 'Leitungsanästhesie',
                        description: 'Standard für UK Seitenzahn',
                        priority: 'hoch',
                        autoAccept: true
                    });
                } else {
                    suggestions.push({
                        id: `bema_infiltr`,
                        type: 'bema',
                        code: 'BEMA_40',
                        label: 'Infiltrationsanästhesie',
                        description: 'Lokalanästhesie',
                        priority: 'hoch',
                        autoAccept: true
                    });
                }
            } else {
                // PKV Anesthesia
                suggestions.push({
                    id: `goz_infiltr`,
                    type: 'goz',
                    code: 'GOZ_0090',
                    label: 'Infiltrationsanästhesie',
                    description: 'Lokalanästhesie',
                    priority: 'hoch',
                    autoAccept: true
                });
                if (isUkSeitenzahn && defaults.anaesthesie?.ukSeitenzahn === 'leitung') {
                    suggestions.push({
                        id: `goz_leitung`,
                        type: 'goz',
                        code: 'GOZ_0100',
                        label: 'Leitungsanästhesie',
                        description: 'Zusätzlich/Optional',
                        priority: 'mittel',
                        autoAccept: false
                    });
                }
            }

            // 3. OBERFLÄCHENANÄSTHESIE
            if (defaults.anaesthesie?.oberflaecheImmer) {
                if (insuranceType === 'PKV') {
                    suggestions.push({
                        id: `goz_oberfl`,
                        type: 'goz',
                        code: 'GOZ_0080',
                        label: 'Oberflächenanästhesie',
                        description: 'Vor Injektion',
                        priority: 'hoch',
                        autoAccept: true
                    });
                } else {
                    suggestions.push({
                        id: `goz_oberfl_gkv`,
                        type: 'goz',
                        code: 'GOZ_0080',
                        label: 'Oberflächenanästhesie (Privat)',
                        description: 'Keine Kassenleistung! Vereinbarung nötig.',
                        priority: 'niedrig',
                        autoAccept: false
                    });
                }
            }
        }

        return {
            suggestions,
            verblendbereich: imVB,
            befundklasse: 0,
            insuranceType
        };
    }

    // ═══════════════════════════════════════════════════════════
    // 2. KRONE / EINZELZAHN
    // ═══════════════════════════════════════════════════════════
    if (versorgungsart === 'krone' || (!extracted.pfeiler && !extracted.fehlend && zahnNummer > 0)) {

        const diagnosisBefund = mapDiagnosisToBefund(extracted.diagnosis);

        const zahnSituation: ZahnSituation = {
            zahnNummer,
            weitgehendZerstoert: diagnosisBefund.weitgehendZerstoert || false,
            partiellerDefekt: diagnosisBefund.partiellerDefekt || false,
            erneuerungsbeduerftig: diagnosisBefund.erneuerungsbeduerftig || false,
            nachEndo: extracted.nachEndo || false,
            stiftart: extracted.stiftart || (extracted.stift ? 'konfektioniert' : 'keine')
        };

        const befundResult = getBefundeFuerZahn(zahnSituation);

        // GKV: Festzuschuss berechnen
        if (insuranceType === 'GKV' && befundResult.befunde.length > 0) {
            const fzResult = berechneFestzuschuss(befundResult.befunde, bonusStatus);

            // Festzuschuss-Suggestion
            suggestions.push({
                id: `fz_${zahnNummer}`,
                type: 'festzuschuss',
                label: `Festzuschuss Zahn ${zahnNummer}`,
                description: `${befundResult.befunde.join(' + ')} = ${fzResult.gesamtbetrag.toFixed(2)}€`,
                betrag: fzResult.gesamtbetrag,
                priority: 'hoch',
                autoAccept: true,
                textSnippet: `Festzuschuss gem. §55 SGB V: ${fzResult.gesamtbetrag.toFixed(2)}€ (${bonusStatus === 'ohne' ? '60%' : bonusStatus === '5_jahre' ? '70%' : '75%'})`
            });

            // Verblendung-Hinweis
            if (imVB && befundResult.befunde.includes('FZ_1.3')) {
                suggestions.push({
                    id: `vb_${zahnNummer}`,
                    type: 'festzuschuss',
                    label: 'Verblendung im VB',
                    description: `Zahn ${zahnNummer} liegt im Verblendbereich → FZ 1.3 angesetzt`,
                    priority: 'niedrig',
                    autoAccept: true
                });
            } else if (!imVB && (versorgungsart === 'krone' || extracted.versorgungsart === 'krone')) {
                suggestions.push({
                    id: `no_vb_${zahnNummer}`,
                    type: 'warnung',
                    label: 'Außerhalb Verblendbereich',
                    description: `Zahn ${zahnNummer} außerhalb Verblendbereich → keine Verblendung nach Regelversorgung!`,
                    priority: 'mittel'
                });
            }

            // Gleichartig prüfen
            const versorgungTyp = mapMaterialToVersorgung(extracted.material);
            if (versorgungTyp === 'gleichartig') {
                suggestions.push({
                    id: `gleichartig_${zahnNummer}`,
                    type: 'bema',
                    label: 'Gleichartige Versorgung',
                    description: 'MKV erforderlich! BEMA-Kassenanteil + GOZ-Mehrkosten',
                    priority: 'hoch'
                });
            }

            // Warnungen weitergeben
            if (befundResult.warnungen) {
                for (const warnung of befundResult.warnungen) {
                    suggestions.push({
                        id: `warn_${zahnNummer}_${suggestions.length}`,
                        type: 'warnung',
                        label: 'G-BA Hinweis',
                        description: warnung,
                        priority: 'hoch'
                    });
                }
            }

            return {
                zahnSituation,
                befundResult,
                festzuschuss: fzResult,
                suggestions,
                verblendbereich: imVB,
                befundklasse: befundResult.befundklasse,
                insuranceType
            };
        }

        // PKV: GOZ-Empfehlungen
        if (insuranceType === 'PKV') {
            suggestions.push({
                id: `goz_${zahnNummer}`,
                type: 'goz',
                code: 'GOZ_2200',
                label: 'Vollkrone GOZ 2200',
                description: 'Vollständige Präparation und Eingliederung',
                priority: 'hoch'
            });

            if (extracted.nachEndo) {
                suggestions.push({
                    id: `goz_stift_${zahnNummer}`,
                    type: 'goz',
                    code: 'GOZ_2195',
                    label: 'Stiftpräparation GOZ 2195',
                    description: 'Zusätzlich bei Stiftversorgung',
                    priority: 'hoch'
                });
            }

            // Steigerungsfaktor-Begründung
            if (extracted.diagnosis?.toLowerCase().includes('profunda')) {
                const begruendung = generiereBegruendung(
                    'GOZ_2200',
                    ['tiefe_kavitaet', 'subgingivaler_rand'],
                    3.5
                );
                gozBegruendungen.push(begruendung);

                suggestions.push({
                    id: `faktor_${zahnNummer}`,
                    type: 'optimierung',
                    label: 'Faktor 3.5 möglich',
                    description: begruendung.kurzbegruendung,
                    priority: 'mittel',
                    textSnippet: begruendung.begruendungsText
                });
            }

            return {
                zahnSituation,
                befundResult,
                suggestions,
                gozBegruendungen,
                verblendbereich: imVB,
                befundklasse: befundResult.befundklasse,
                insuranceType
            };
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 2. BRÜCKE
    // ═══════════════════════════════════════════════════════════
    if (versorgungsart === 'bruecke' && extracted.pfeiler && extracted.fehlend) {
        const pfeilerNummern = extracted.pfeiler.map(p => parseInt(p.replace(/\D/g, ''), 10));
        const fehlendeNummern = extracted.fehlend.map(f => parseInt(f.replace(/\D/g, ''), 10));

        const lueckeSituation: LueckenSituation = {
            kiefer: pfeilerNummern[0] < 30 ? 'OK' : 'UK',
            fehlendeMenge: fehlendeNummern.length,
            zahnbegrenzt: true,
            freiendsituation: false
        };

        const befunde = getBefundeFuerBruecke(lueckeSituation, pfeilerNummern, fehlendeNummern);

        if (insuranceType === 'GKV') {
            const fzResult = berechneFestzuschuss(befunde, bonusStatus);

            suggestions.push({
                id: `fz_bruecke`,
                type: 'festzuschuss',
                label: `Festzuschuss Brücke`,
                description: `${befunde.join(' + ')} = ${fzResult.gesamtbetrag.toFixed(2)}€`,
                betrag: fzResult.gesamtbetrag,
                priority: 'hoch',
                autoAccept: true
            });

            // Verblendungen zählen
            const vbCount = befunde.filter(b => b === 'FZ_2.7').length;
            if (vbCount > 0) {
                suggestions.push({
                    id: `vb_bruecke`,
                    type: 'festzuschuss',
                    label: `${vbCount}x Verblendung`,
                    description: `${vbCount} Glieder im Verblendbereich`,
                    priority: 'niedrig'
                });
            }

            return {
                lueckeSituation,
                festzuschuss: fzResult,
                suggestions,
                verblendbereich: vbCount > 0,
                befundklasse: 2,
                insuranceType
            };
        }
    }


    // Fallback: Keine spezifische Inference
    return {
        suggestions: [{
            id: 'no_inference',
            type: 'warnung',
            label: 'Manuelle Prüfung erforderlich',
            description: 'Keine automatische Abrechnungs-Inference möglich',
            priority: 'hoch'
        }],
        verblendbereich: imVB,
        befundklasse: 0,
        insuranceType
    };
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Quick-Inference für Einzelzahn
 */
export function inferBillingForTooth(
    tooth: string,
    diagnosis: string,
    insuranceType: InsuranceType = 'GKV',
    bonusStatus: BonusStatus = 'ohne'
): BillingInferenceResult {
    return inferBilling(
        { tooth, diagnosis, versorgungsart: 'krone' },
        insuranceType,
        bonusStatus
    );
}

/**
 * Quick-Inference für Füllung
 */
export function inferBillingForFilling(
    tooth: string,
    surfaces: string[],
    material: string,
    insuranceType: InsuranceType = 'GKV'
): BillingInferenceResult {
    return inferBilling(
        { tooth, surfaces, material, versorgungsart: 'fuellung' },
        insuranceType,
        'ohne'
    );
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

export default {
    inferBilling,
    inferBillingForTooth,
    inferBillingForFilling
};
