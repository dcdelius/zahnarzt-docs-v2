/**
 * Füllung Billing Module
 * 
 * REFACTORED: Nutzt jetzt treatmentEngine.processChipsToBilling()
 * statt hardcodierter Billing-Logik.
 * 
 * Die Keyword-Erkennung wird beibehalten, um aktive Chips zu inferieren.
 */

import type {
    TreatmentBillingModule,
    BillingContext,
    BillingInferenceResult,
    BillingSuggestion,
    ExtractedData
} from '../billingRegistry';
import { registerBillingModule } from '../billingRegistry';
import { istImVerblendbereich } from '../befundLogic';
import {
    processChipsToBilling,
    lookupBillingCode,
    getDefaultActiveChipsFromJSON
} from '../treatmentEngine';

// ═══════════════════════════════════════════════════════════════
// KEYWORD DETECTION (beibehalten für Chip-Inferenz)
// ═══════════════════════════════════════════════════════════════

interface FuellungKeywords {
    kofferdam: boolean;
    leitung: boolean;
    infiltration: boolean;
    oberflaeche: boolean;
    profunda: boolean;
    kariesdetektor: boolean;
    unterfuellung: boolean;
    anaesthesieGeneric: boolean;
    mehrschicht: boolean;
    cp: boolean;
    p: boolean;
}

function detectKeywords(dictation: string): FuellungKeywords {
    const lower = dictation.toLowerCase();

    const hasLeitung = lower.includes('leitung') || lower.includes('leitungsanästhesie') || lower.includes('leitungsanaesthesie');
    const hasInfiltration = lower.includes('infiltration') || lower.includes('injektion');

    const hasGenericAnaesthesie = !hasLeitung && !hasInfiltration && (
        lower.includes('anästhesie') ||
        lower.includes('anaesthesie') ||
        lower.includes('la gegeben') ||
        lower.includes('betäubung') ||
        lower.includes('spritze') ||
        lower.includes('lokalanästhesie')
    );

    return {
        kofferdam: lower.includes('kofferdam') || lower.includes('spanngummi') || lower.includes('rubber'),
        leitung: hasLeitung,
        infiltration: hasInfiltration,
        oberflaeche: lower.includes('oberfl') || lower.includes('topisch'),
        profunda: lower.includes('profunda') || lower.includes('tief') || lower.includes('pulpanah'),
        kariesdetektor: lower.includes('karies') && (lower.includes('detektor') || lower.includes('anfärb') || lower.includes('anfaerb')),
        unterfuellung: lower.includes('unterfüllung') || lower.includes('unterfuellung') || lower.includes('liner'),
        anaesthesieGeneric: hasGenericAnaesthesie,
        mehrschicht: lower.includes('mehrschicht') || lower.includes('schichtweise') || lower.includes('adhäsiv'),
        cp: lower.includes('indirekte überkappung') || lower.includes('cp ') || (lower.includes('pulpanah') && !lower.includes('eröffnung')),
        p: lower.includes('direkte überkappung') || lower.includes(' p ') || lower.includes('pulpaeröffnung')
    };
}

// ═══════════════════════════════════════════════════════════════
// KEYWORD → CHIP MAPPING
// ═══════════════════════════════════════════════════════════════

function keywordsToChipIds(
    keywords: FuellungKeywords,
    zahnNummer: number,
    hasMKV: boolean
): string[] {
    const chips: string[] = [];

    // Anästhesie
    if (keywords.leitung) {
        chips.push('la_leitung');
    } else if (keywords.infiltration) {
        chips.push('la_infiltr');
    } else if (keywords.anaesthesieGeneric) {
        // UK-Seitenzähne = Leitung, sonst Infiltration
        const isUkMolar = (zahnNummer >= 36 && zahnNummer <= 38) || (zahnNummer >= 46 && zahnNummer <= 48);
        chips.push(isUkMolar ? 'la_leitung' : 'la_infiltr');
    }

    // Kofferdam
    if (keywords.kofferdam) {
        chips.push('kofferdam');
    }

    // Überkappung
    if (keywords.cp) {
        chips.push('cp');
    } else if (keywords.p) {
        chips.push('p');
    }

    // Exkavation (immer dabei)
    chips.push('exkavation');

    // Füllung - Mehrschicht nur bei MKV oder Keywords
    if (keywords.mehrschicht || hasMKV) {
        chips.push('mehrschicht');
    } else {
        chips.push('komposit_basic');
    }

    // Kariesdetektor
    if (keywords.kariesdetektor) {
        chips.push('kariesdetektor');
    }

    // Unterfüllung
    if (keywords.unterfuellung) {
        chips.push('unterfuellung');
    }

    // Finishing (immer dabei)
    chips.push('finishing');

    return chips;
}

// ═══════════════════════════════════════════════════════════════
// FÜLLUNG MODULE (REFACTORED)
// ═══════════════════════════════════════════════════════════════

export const FuellungBillingModule: TreatmentBillingModule = {
    id: 'fuellung',
    label: 'Füllung',

    canHandle(extracted: ExtractedData): boolean {
        if (extracted.surfaces && extracted.surfaces.length > 0) return true;
        if (extracted.versorgungsart === 'fuellung') return true;
        return false;
    },

    infer(context: BillingContext): BillingInferenceResult {
        const { extracted, insuranceType, rawDictation } = context;
        const hasMKV = context.hasZuzahlung || false;

        const dictLower = (rawDictation || extracted.diagnosis || '').toLowerCase();
        const keywords = detectKeywords(dictLower);

        const zahnNummer = extracted.tooth ? parseInt(extracted.tooth.replace(/\D/g, ''), 10) : 0;
        const surfaces = extracted.surfaces || [];
        const imVB = zahnNummer > 0 ? istImVerblendbereich(zahnNummer) : false;

        // ═══════════════════════════════════════════════════════════
        // Chips aus Keywords ableiten
        // ═══════════════════════════════════════════════════════════
        const activeChips = keywordsToChipIds(keywords, zahnNummer, hasMKV);

        // ═══════════════════════════════════════════════════════════
        // ZENTRALE ENGINE AUFRUFEN
        // ═══════════════════════════════════════════════════════════
        const engineResult = processChipsToBilling(
            'fuellung',
            activeChips,
            insuranceType,
            hasMKV,
            { surfaces, tooth: extracted.tooth || '' },
            'mittel'
        );

        // ═══════════════════════════════════════════════════════════
        // Ergebnis in BillingInferenceResult umwandeln
        // ═══════════════════════════════════════════════════════════
        const suggestions: BillingSuggestion[] = [];

        for (const code of engineResult.billingCodes) {
            const codeData = lookupBillingCode(code);
            suggestions.push({
                id: `${code}_engine`,
                type: code.startsWith('GOZ_') ? 'goz' : 'bema',
                code,
                label: codeData?.bezeichnung || code,
                description: 'Aus TreatmentEngine',
                priority: 'hoch',
                autoAccept: true
            });
        }

        // Warnungen als Suggestions hinzufügen
        for (const warning of engineResult.warnings) {
            suggestions.push({
                id: `warning_${suggestions.length}`,
                type: 'warnung',
                label: warning,
                description: '',
                priority: warning.includes('REGRESS') ? 'hoch' : 'mittel'
            });
        }

        return {
            suggestions,
            billingCodes: engineResult.billingCodes,
            verblendbereich: imVB,
            befundklasse: 0,
            insuranceType
        };
    }
};

// Auto-register
registerBillingModule(FuellungBillingModule);

export default FuellungBillingModule;
