/**
 * Chirurgie Billing Module
 * 
 * Behandlungsspezifische Billing-Logik für Extraktionen und Osteotomien.
 * WICHTIG: Osteotomie nur bei TATSÄCHLICHER Knochenabtragung!
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
// KEYWORD DETECTION
// ═══════════════════════════════════════════════════════════════

interface ChirurgieKeywords {
    osteotomie: boolean;
    retiniert: boolean;
    verlagert: boolean;
    wurzeltrennung: boolean;
    naht: boolean;
    blutung: boolean;
    wsr: boolean;
}

function detectKeywords(dictation: string): ChirurgieKeywords {
    const lower = dictation.toLowerCase();
    return {
        osteotomie: lower.includes('osteo') || lower.includes('knochen'),
        retiniert: lower.includes('retiniert') || lower.includes('retention'),
        verlagert: lower.includes('verlagert') || lower.includes('verlagerung'),
        wurzeltrennung: lower.includes('wurzeltrennung') || lower.includes('getrennt') || lower.includes('separiert'),
        naht: lower.includes('naht') || lower.includes('genäht') || lower.includes('sutur'),
        blutung: lower.includes('blutung') || lower.includes('blutstill') || lower.includes('kollagen'),
        wsr: lower.includes('wsr') || lower.includes('wurzelspitz') || lower.includes('resektion')
    };
}

// ═══════════════════════════════════════════════════════════════
// TOOTH CLASSIFICATION
// ═══════════════════════════════════════════════════════════════

function isEinwurzelig(zahnNummer: number): boolean {
    // Frontzähne (1-3) + Prämolaren im UK
    const zahn = zahnNummer % 10;
    return zahn <= 3 || zahn === 4 || zahn === 5;
}

function isWeisheitszahn(zahnNummer: number): boolean {
    return zahnNummer === 18 || zahnNummer === 28 || zahnNummer === 38 || zahnNummer === 48;
}

// ═══════════════════════════════════════════════════════════════
// EXTRAKTION MODULE
// ═══════════════════════════════════════════════════════════════

export const ChirurgieBillingModule: TreatmentBillingModule = {
    id: 'extraktion',
    label: 'Extraktion',

    canHandle(extracted: ExtractedData): boolean {
        if (extracted.versorgungsart === 'extraktion') return true;
        if (extracted.versorgungsart === 'wsr') return true;
        return false;
    },

    infer(context: BillingContext): BillingInferenceResult {
        const { extracted, insuranceType, rawDictation } = context;
        const suggestions: BillingSuggestion[] = [];
        const billingCodes: string[] = [];

        const dictLower = (rawDictation || extracted.diagnosis || '').toLowerCase();
        const keywords = detectKeywords(dictLower);

        const zahnNummer = extracted.tooth ? parseInt(extracted.tooth.replace(/\D/g, ''), 10) : 0;
        const einwurzelig = isEinwurzelig(zahnNummer);
        const weisheitszahn = isWeisheitszahn(zahnNummer);
        const isUK = zahnNummer >= 31 && zahnNummer <= 48;

        // ═══════════════════════════════════════════════════════════
        // 1. ANÄSTHESIE
        // ═══════════════════════════════════════════════════════════

        if (insuranceType === 'PKV') {
            // Oberflächenanästhesie
            suggestions.push({
                id: 'goz_oberfl_chir',
                type: 'goz',
                code: 'GOZ_0080',
                label: 'Oberflächenanästhesie',
                betrag: 7.25,
                priority: 'hoch',
                autoAccept: true
            });
            billingCodes.push('GOZ_0080');

            if (isUK) {
                suggestions.push({
                    id: 'goz_leitung_chir',
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
                    id: 'goz_infiltr_chir',
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
                    id: 'bema_leitung_chir',
                    type: 'bema',
                    code: 'BEMA_41a',
                    label: 'Leitungsanästhesie',
                    priority: 'hoch',
                    autoAccept: true
                });
                billingCodes.push('BEMA_41a');
            } else {
                suggestions.push({
                    id: 'bema_infiltr_chir',
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
        // 2. HAUPTLEISTUNG: EXTRAKTION vs OSTEOTOMIE
        // ═══════════════════════════════════════════════════════════

        const needsOsteotomie = keywords.osteotomie || keywords.retiniert || keywords.verlagert;

        if (insuranceType === 'GKV') {
            if (needsOsteotomie) {
                if (keywords.retiniert || keywords.verlagert) {
                    // BEMA 48: Retiniert/verlagert
                    suggestions.push({
                        id: 'bema_48',
                        type: 'bema',
                        code: 'BEMA_48',
                        label: 'Osteotomie retiniert/verlagert',
                        description: '56 Punkte - DOKUMENTIEREN: Retention/Verlagerung!',
                        priority: 'hoch',
                        autoAccept: true
                    });
                    billingCodes.push('BEMA_48');
                } else {
                    // BEMA 47a: Einfache Osteotomie
                    suggestions.push({
                        id: 'bema_47a',
                        type: 'bema',
                        code: 'BEMA_47a',
                        label: 'Osteotomie einfach',
                        description: '42 Punkte - NUR bei tatsächlicher Knochenabtragung!',
                        priority: 'hoch',
                        autoAccept: true
                    });
                    billingCodes.push('BEMA_47a');

                    // Warnung
                    suggestions.push({
                        id: 'warn_osteo',
                        type: 'warnung',
                        label: '⚠️ Regressgefahr',
                        description: 'BEMA 47a NUR wenn Knochen TATSÄCHLICH abgetragen wurde!',
                        priority: 'hoch'
                    });
                }
            } else if (keywords.wurzeltrennung) {
                // BEMA 45: Schwierige Extraktion
                suggestions.push({
                    id: 'bema_45',
                    type: 'bema',
                    code: 'BEMA_45',
                    label: 'Schwierige Extraktion mit Wurzeltrennung',
                    description: '25 Punkte - Wurzeltrennung dokumentieren!',
                    priority: 'hoch',
                    autoAccept: true
                });
                billingCodes.push('BEMA_45');
            } else {
                // Normale Extraktion
                const code = einwurzelig ? 'BEMA_43' : 'BEMA_44';
                const label = einwurzelig ? 'Extraktion einwurzelig' : 'Extraktion mehrwurzelig';
                const punkte = einwurzelig ? 10 : 15;

                suggestions.push({
                    id: `bema_ex_${zahnNummer}`,
                    type: 'bema',
                    code,
                    label,
                    description: `${punkte} Punkte`,
                    priority: 'hoch',
                    autoAccept: true
                });
                billingCodes.push(code);
            }
        } else {
            // PKV
            if (needsOsteotomie) {
                const code = einwurzelig ? 'GOZ_3100' : 'GOZ_3110';
                const betrag = einwurzelig ? 86.94 : 130.39;

                suggestions.push({
                    id: 'goz_osteo',
                    type: 'goz',
                    code,
                    label: einwurzelig ? 'Osteotomie einwurzelig' : 'Osteotomie mehrwurzelig',
                    betrag,
                    priority: 'hoch',
                    autoAccept: true
                });
                billingCodes.push(code);

                // OP-Zuschlag bei hoher Punktzahl
                if (!einwurzelig) {
                    suggestions.push({
                        id: 'goz_op_zuschlag',
                        type: 'goz',
                        code: 'GOZ_0520',
                        label: 'OP-Zuschlag (800-1199 Punkte)',
                        description: 'Nur 1,0-fach, nur 1x pro Tag!',
                        betrag: 42.52,
                        priority: 'mittel',
                        autoAccept: true
                    });
                    billingCodes.push('GOZ_0520');
                }
            } else {
                // Normale Extraktion
                let code: string;
                let label: string;
                let betrag: number;

                if (einwurzelig) {
                    code = 'GOZ_3000';
                    label = 'Extraktion einwurzelig';
                    betrag = 24.31;
                } else {
                    code = 'GOZ_3010';
                    label = 'Extraktion mehrwurzelig';
                    betrag = 32.59;
                }

                suggestions.push({
                    id: `goz_ex_${zahnNummer}`,
                    type: 'goz',
                    code,
                    label,
                    betrag,
                    priority: 'hoch',
                    autoAccept: true
                });
                billingCodes.push(code);
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 3. WUNDVERSORGUNG
        // ═══════════════════════════════════════════════════════════

        if (keywords.naht || needsOsteotomie) {
            if (insuranceType === 'GKV') {
                suggestions.push({
                    id: 'bema_naht',
                    type: 'bema',
                    code: 'BEMA_54',
                    label: 'Naht',
                    description: '8 Punkte',
                    priority: 'hoch',
                    autoAccept: true
                });
                billingCodes.push('BEMA_54');
            } else {
                suggestions.push({
                    id: 'goz_naht',
                    type: 'goz',
                    code: 'GOZ_3300',
                    label: 'Naht/Wundversorgung',
                    betrag: 25.16,
                    priority: 'hoch',
                    autoAccept: true
                });
                billingCodes.push('GOZ_3300');
            }
        }

        // Besondere Blutstillung (nur PKV)
        if (keywords.blutung && insuranceType === 'PKV') {
            suggestions.push({
                id: 'goz_blutstillung',
                type: 'goz',
                code: 'GOZ_3060',
                label: 'Blutstillung (besondere Maßnahmen)',
                description: 'Umstechung, Kollagen etc.',
                betrag: 24.31,
                priority: 'mittel',
                autoAccept: true
            });
            billingCodes.push('GOZ_3060');
        }

        // ═══════════════════════════════════════════════════════════
        // 4. DOKUMENTATIONS-HINWEISE
        // ═══════════════════════════════════════════════════════════

        suggestions.push({
            id: 'doku_hinweis',
            type: 'optimierung',
            label: '📝 Dokumentation erforderlich',
            description: 'Extraktionsgrund dokumentieren (nicht erhaltungsfähig wegen...)',
            priority: 'niedrig'
        });

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
registerBillingModule(ChirurgieBillingModule);

export default ChirurgieBillingModule;
