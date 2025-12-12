/**
 * Endodontie Billing Module
 * 
 * Behandlungsspezifische Billing-Logik für Wurzelbehandlungen.
 * WICHTIG: Viele Positionen sind JE KANAL berechenbar!
 */

import type {
    TreatmentBillingModule,
    BillingContext,
    BillingInferenceResult,
    BillingSuggestion,
    ExtractedData
} from '../billingRegistry';
import { registerBillingModule } from '../billingRegistry';

// ═══════════════════════════════════════════════════════════════
// ENDO CONSTANTS
// ═══════════════════════════════════════════════════════════════

// Typische Kanalzahlen nach Zahntyp
const KANAL_DEFAULTS: Record<string, number> = {
    // Oberkiefer
    '11': 1, '12': 1, '13': 1, '14': 2, '15': 2, '16': 3, '17': 3, '18': 3,
    '21': 1, '22': 1, '23': 1, '24': 2, '25': 2, '26': 3, '27': 3, '28': 3,
    // Unterkiefer
    '31': 1, '32': 1, '33': 1, '34': 1, '35': 1, '36': 3, '37': 3, '38': 3,
    '41': 1, '42': 1, '43': 1, '44': 1, '45': 1, '46': 3, '47': 3, '48': 3,
};

// BEMA Wurzelbehandlung nach Wurzelzahl
const BEMA_ENDO: Record<number, { aufbereitung: string; fuellung: string; punkte_aufb: number; punkte_fuell: number }> = {
    1: { aufbereitung: 'BEMA_32a', fuellung: 'BEMA_35a', punkte_aufb: 25, punkte_fuell: 20 },
    2: { aufbereitung: 'BEMA_32a', fuellung: 'BEMA_35a', punkte_aufb: 25, punkte_fuell: 20 },
    3: { aufbereitung: 'BEMA_32b', fuellung: 'BEMA_35b', punkte_aufb: 45, punkte_fuell: 40 },
    4: { aufbereitung: 'BEMA_32b', fuellung: 'BEMA_35b', punkte_aufb: 45, punkte_fuell: 40 },
};

// ═══════════════════════════════════════════════════════════════
// KEYWORD DETECTION
// ═══════════════════════════════════════════════════════════════

interface EndoKeywords {
    gangraen: boolean;
    pulpitis: boolean;
    revision: boolean;
    endometrie: boolean;
    maschinell: boolean;
    laser: boolean;
    mikroskop: boolean;
    kofferdam: boolean;
}

function detectKeywords(dictation: string): EndoKeywords {
    const lower = dictation.toLowerCase();
    return {
        gangraen: lower.includes('gangrän') || lower.includes('gangrae') || lower.includes('nekrose') || lower.includes('abgestorben'),
        pulpitis: lower.includes('pulpitis') || lower.includes('vital'),
        revision: lower.includes('revision') || lower.includes('re-endo') || lower.includes('reendo'),
        endometrie: lower.includes('endometrie') || lower.includes('apex') || lower.includes('längenmess') || lower.includes('laengenmess'),
        maschinell: lower.includes('maschinell') || lower.includes('niti') || lower.includes('reciproc') || lower.includes('protaper'),
        laser: lower.includes('laser'),
        mikroskop: lower.includes('mikroskop') || lower.includes('op-mikroskop'),
        kofferdam: lower.includes('kofferdam') || lower.includes('spanngummi')
    };
}

// ═══════════════════════════════════════════════════════════════
// ENDO MODULE
// ═══════════════════════════════════════════════════════════════

export const EndoBillingModule: TreatmentBillingModule = {
    id: 'endo',
    label: 'Wurzelbehandlung',

    canHandle(extracted: ExtractedData): boolean {
        if (extracted.versorgungsart === 'endo') return true;
        // Heuristik: Kanalzahl angegeben
        if (extracted.kanaele && extracted.kanaele > 0) return true;
        return false;
    },

    infer(context: BillingContext): BillingInferenceResult {
        const { extracted, insuranceType, defaults, rawDictation } = context;
        const suggestions: BillingSuggestion[] = [];
        const billingCodes: string[] = [];

        const dictLower = (rawDictation || extracted.diagnosis || '').toLowerCase();
        const keywords = detectKeywords(dictLower);

        const zahnNummer = extracted.tooth ? parseInt(extracted.tooth.replace(/\D/g, ''), 10) : 0;
        const zahnStr = zahnNummer.toString();

        // Kanalzahl: explizit > Default nach Zahn
        const kanalzahl = extracted.kanaele || KANAL_DEFAULTS[zahnStr] || 1;
        const wurzelzahl = kanalzahl >= 3 ? 3 : kanalzahl >= 2 ? 2 : 1;

        // ═══════════════════════════════════════════════════════════
        // 1. KOFFERDAM (Pflicht bei Endo!)
        // ═══════════════════════════════════════════════════════════

        if (insuranceType === 'GKV') {
            suggestions.push({
                id: 'bema_kofferdam_endo',
                type: 'bema',
                code: 'BEMA_12',
                label: 'Kofferdam (Pflicht bei Endo)',
                description: 'Absolute Trockenlegung erforderlich',
                priority: 'hoch',
                autoAccept: true
            });
            billingCodes.push('BEMA_12');
        } else {
            suggestions.push({
                id: 'goz_kofferdam_endo',
                type: 'goz',
                code: 'GOZ_2040',
                label: 'Kofferdam',
                description: 'Absolute Trockenlegung',
                betrag: 21.74,
                priority: 'hoch',
                autoAccept: true
            });
            billingCodes.push('GOZ_2040');
        }

        // ═══════════════════════════════════════════════════════════
        // 2. ANÄSTHESIE
        // ═══════════════════════════════════════════════════════════

        const isUK = zahnNummer >= 31 && zahnNummer <= 48;

        if (insuranceType === 'PKV') {
            // Oberflächenanästhesie
            suggestions.push({
                id: 'goz_oberfl_endo',
                type: 'goz',
                code: 'GOZ_0080',
                label: 'Oberflächenanästhesie',
                betrag: 7.25,
                priority: 'hoch',
                autoAccept: true
            });
            billingCodes.push('GOZ_0080');

            // Leitung/Infiltration
            if (isUK) {
                suggestions.push({
                    id: 'goz_leitung_endo',
                    type: 'goz',
                    code: 'GOZ_0100',
                    label: 'Leitungsanästhesie',
                    betrag: 24.31,
                    priority: 'hoch',
                    autoAccept: true
                });
                billingCodes.push('GOZ_0100');
            } else {
                suggestions.push({
                    id: 'goz_infiltr_endo',
                    type: 'goz',
                    code: 'GOZ_0090',
                    label: 'Infiltrationsanästhesie',
                    betrag: 16.22,
                    priority: 'hoch',
                    autoAccept: true
                });
                billingCodes.push('GOZ_0090');
            }
        } else {
            // GKV
            if (isUK) {
                suggestions.push({
                    id: 'bema_leitung_endo',
                    type: 'bema',
                    code: 'BEMA_41a',
                    label: 'Leitungsanästhesie',
                    priority: 'hoch',
                    autoAccept: true
                });
                billingCodes.push('BEMA_41a');
            } else {
                suggestions.push({
                    id: 'bema_infiltr_endo',
                    type: 'bema',
                    code: 'BEMA_40',
                    label: 'Infiltrationsanästhesie',
                    priority: 'hoch',
                    autoAccept: true
                });
                billingCodes.push('BEMA_40');
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 3. HAUPT-ENDO-LEISTUNGEN
        // ═══════════════════════════════════════════════════════════

        if (insuranceType === 'GKV') {
            // BEMA Aufbereitung + Füllung
            const bemaEndo = BEMA_ENDO[wurzelzahl] || BEMA_ENDO[1];

            suggestions.push({
                id: 'bema_aufbereitung',
                type: 'bema',
                code: bemaEndo.aufbereitung,
                label: `Wurzelkanalaufbereitung (${wurzelzahl}-wurzelig)`,
                description: `${bemaEndo.punkte_aufb} Punkte`,
                priority: 'hoch',
                autoAccept: true
            });
            billingCodes.push(bemaEndo.aufbereitung);

            suggestions.push({
                id: 'bema_fuellung',
                type: 'bema',
                code: bemaEndo.fuellung,
                label: `Wurzelfüllung (${wurzelzahl}-wurzelig)`,
                description: `${bemaEndo.punkte_fuell} Punkte`,
                priority: 'hoch',
                autoAccept: true
            });
            billingCodes.push(bemaEndo.fuellung);

            // PRIVAT-Zusatzleistungen bei GKV
            if (keywords.endometrie) {
                suggestions.push({
                    id: 'goz_endometrie_gkv',
                    type: 'goz',
                    code: 'GOZ_2400',
                    label: `Endometrie (${kanalzahl}x)`,
                    description: `Privatleistung! Schriftliche Vereinbarung erforderlich. ${(18.61 * kanalzahl).toFixed(2)}€`,
                    betrag: 18.61 * kanalzahl,
                    priority: 'mittel',
                    autoAccept: false
                });
            }
        } else {
            // PKV: Alles je Kanal!

            // Trepanation (wenn noch nicht eröffnet)
            suggestions.push({
                id: 'goz_trepanation',
                type: 'goz',
                code: 'GOZ_2380',
                label: 'Trepanation',
                description: 'Eröffnung der Pulpakammer',
                betrag: 34.78,
                priority: 'hoch',
                autoAccept: true
            });
            billingCodes.push('GOZ_2380');

            // Aufbereitung JE KANAL
            suggestions.push({
                id: 'goz_aufbereitung',
                type: 'goz',
                code: 'GOZ_2390',
                label: `Aufbereitung (${kanalzahl}x)`,
                description: `Je Kanal: 31,30€ → ${(31.30 * kanalzahl).toFixed(2)}€`,
                betrag: 31.30 * kanalzahl,
                priority: 'hoch',
                autoAccept: true
            });
            billingCodes.push('GOZ_2390');

            // Endometrie JE KANAL
            if (keywords.endometrie || true) { // Fast immer bei PKV Endo
                suggestions.push({
                    id: 'goz_endometrie',
                    type: 'goz',
                    code: 'GOZ_2400',
                    label: `Endometrie (${kanalzahl}x)`,
                    description: `Je Kanal: 18,61€ → ${(18.61 * kanalzahl).toFixed(2)}€`,
                    betrag: 18.61 * kanalzahl,
                    priority: 'hoch',
                    autoAccept: true,
                    textSnippet: 'Elektrometrische Längenbestimmung mit Apex-Locator'
                });
                billingCodes.push('GOZ_2400');
            }

            // Maschinelle Aufbereitung
            if (keywords.maschinell || true) { // Standard heute
                suggestions.push({
                    id: 'goz_maschinell',
                    type: 'goz',
                    code: 'GOZ_2410',
                    label: `Maschinelle Aufbereitung (${kanalzahl}x)`,
                    description: `NiTi-System, je Kanal: 27,90€ → ${(27.90 * kanalzahl).toFixed(2)}€`,
                    betrag: 27.90 * kanalzahl,
                    priority: 'hoch',
                    autoAccept: true
                });
                billingCodes.push('GOZ_2410');
            }

            // Spülung JE KANAL
            suggestions.push({
                id: 'goz_spuelung',
                type: 'goz',
                code: 'GOZ_2420',
                label: `Spülung (${kanalzahl}x)`,
                description: `Je Kanal: 8,69€ → ${(8.69 * kanalzahl).toFixed(2)}€`,
                betrag: 8.69 * kanalzahl,
                priority: 'hoch',
                autoAccept: true
            });
            billingCodes.push('GOZ_2420');

            // Wurzelfüllung JE KANAL
            suggestions.push({
                id: 'goz_wf',
                type: 'goz',
                code: 'GOZ_2440',
                label: `Wurzelfüllung (${kanalzahl}x)`,
                description: `Je Kanal: 37,12€ → ${(37.12 * kanalzahl).toFixed(2)}€`,
                betrag: 37.12 * kanalzahl,
                priority: 'hoch',
                autoAccept: true
            });
            billingCodes.push('GOZ_2440');

            // OP-Mikroskop
            if (keywords.mikroskop) {
                suggestions.push({
                    id: 'goz_mikroskop',
                    type: 'goz',
                    code: 'GOZ_0110',
                    label: 'Operationsmikroskop',
                    description: 'Zuschlag für Mikroskop-Einsatz',
                    betrag: 29.76,
                    priority: 'mittel',
                    autoAccept: true
                });
                billingCodes.push('GOZ_0110');
            }

            // Laser
            if (keywords.laser) {
                suggestions.push({
                    id: 'goz_laser',
                    type: 'goz',
                    code: 'GOZ_0120',
                    label: 'Laser-Desinfektion',
                    betrag: 14.88,
                    priority: 'mittel',
                    autoAccept: true
                });
                billingCodes.push('GOZ_0120');
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 4. RÖNTGEN
        // ═══════════════════════════════════════════════════════════

        if (insuranceType === 'GKV') {
            suggestions.push({
                id: 'bema_roentgen',
                type: 'bema',
                code: 'BEMA_Ä925a',
                label: 'Röntgen (2x)',
                description: 'Diagnostik + Kontrolle',
                priority: 'hoch',
                autoAccept: true
            });
            billingCodes.push('BEMA_Ä925a');
        } else {
            suggestions.push({
                id: 'goz_roentgen',
                type: 'goz',
                code: 'GOZ_5000',
                label: 'Röntgen (2x)',
                description: 'Diagnostik + Kontrolle, je 11,57€',
                betrag: 23.14,
                priority: 'hoch',
                autoAccept: true
            });
            billingCodes.push('GOZ_5000');
        }

        // ═══════════════════════════════════════════════════════════
        // 5. SUMMEN-HINWEIS (nur PKV)
        // ═══════════════════════════════════════════════════════════

        if (insuranceType === 'PKV') {
            const summe = suggestions
                .filter(s => s.betrag)
                .reduce((sum, s) => sum + (s.betrag || 0), 0);

            suggestions.push({
                id: 'summe_hinweis',
                type: 'optimierung',
                label: `Honorar-Summe: ${summe.toFixed(2)}€`,
                description: `Endo Zahn ${zahnNummer} mit ${kanalzahl} Kanälen (zzgl. Material)`,
                priority: 'niedrig'
            });
        }

        return {
            suggestions,
            billingCodes,
            verblendbereich: false,
            befundklasse: 0,
            insuranceType
        };
    }
};

// Auto-register
registerBillingModule(EndoBillingModule);

export default EndoBillingModule;
