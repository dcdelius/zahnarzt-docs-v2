/**
 * Billing Validation Engine
 * 
 * Lädt Abrechnungsregeln aus JSON und prüft auf Konflikte
 */

import kombinationenRegeln from '../regeln/kombinationen.json';
import {
    buildRegelIndex,
    pruefeKonflikte,
    BillingRule,
    KonfliktPruefung
} from './regelLinker';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ValidationResult {
    gueltig: boolean;
    konflikte: {
        regelId: string;
        titel: string;
        beschreibung: string;
        schweregrad: 'regress' | 'warnung' | 'info';
        betroffeneCodes: string[];
    }[];
    warnungen: string[];
    hinweise: string[];
}

// ═══════════════════════════════════════════════════════════════
// RULE LOADING
// ═══════════════════════════════════════════════════════════════

/**
 * Konvertiert JSON-Regeln in das regelLinker-Format
 */
function convertJsonRules(jsonRules: any[]): BillingRule[] {
    return jsonRules.map(rule => ({
        id: rule.id,
        typ: rule.typ as BillingRule['typ'],
        titel: rule.titel,
        beschreibung: rule.beschreibung,
        betrifft: rule.betrifft || [],
        regel: rule.regel,
        schweregrad: rule.schweregrad as BillingRule['schweregrad'],
        quelle: rule.quelle?.dokument
    }));
}

// Geladene und konvertierte Regeln (lazy init)
let cachedRules: BillingRule[] | null = null;
let cachedIndex: ReturnType<typeof buildRegelIndex> | null = null;

/**
 * Lädt alle Regeln (cached)
 */
export function loadBillingRules(): BillingRule[] {
    if (!cachedRules) {
        cachedRules = convertJsonRules(kombinationenRegeln);
    }
    return cachedRules;
}

/**
 * Baut den Regel-Index (cached)
 */
export function getRegelIndex() {
    if (!cachedIndex) {
        const rules = loadBillingRules();
        cachedIndex = buildRegelIndex(rules);
    }
    return cachedIndex;
}

// ═══════════════════════════════════════════════════════════════
// MAIN VALIDATION FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Prüft eine Liste von Abrechnungs-Codes auf Konflikte
 */
export function validateBillingCodes(codes: string[]): ValidationResult {
    const rules = loadBillingRules();
    const index = getRegelIndex();

    const konflikte: ValidationResult['konflikte'] = [];
    const warnungen: string[] = [];
    const hinweise: string[] = [];

    // 1. Prüfe Ausschluss-Konflikte (dürfen nicht zusammen)
    const konfliktResult = pruefeKonflikte(codes, rules, index);

    for (const konflikt of konfliktResult.konflikte) {
        const regel = rules.find(r => r.id === konflikt.regelId);

        konflikte.push({
            regelId: konflikt.regelId,
            titel: regel?.titel || konflikt.regelId,
            beschreibung: konflikt.beschreibung,
            schweregrad: konflikt.schweregrad,
            betroffeneCodes: regel?.betrifft || []
        });

        // Nach Schweregrad einsortieren
        if (konflikt.schweregrad === 'regress') {
            warnungen.push(`🔴 REGRESS-RISIKO: ${konflikt.beschreibung}`);
        } else if (konflikt.schweregrad === 'warnung') {
            warnungen.push(`⚠️ ${konflikt.beschreibung}`);
        } else {
            hinweise.push(`ℹ️ ${konflikt.beschreibung}`);
        }
    }

    // 2. Prüfe Bedingungs-Regeln (brauchen zusätzliche Dokumentation)
    for (const rule of rules) {
        const ruleTyp = rule.typ as string;  // Cast to string for flexible comparison
        if (ruleTyp === 'bedingung' || ruleTyp === 'dokumentation') {
            const codeMatches = rule.betrifft.some(b => codes.includes(b));

            if (codeMatches && rule.schweregrad !== 'info') {
                // Hinweis auf Dokumentationspflicht
                hinweise.push(`📋 ${rule.titel}: ${rule.beschreibung}`);
            }
        }
    }

    return {
        gueltig: konflikte.filter(k => k.schweregrad === 'regress').length === 0,
        konflikte,
        warnungen,
        hinweise
    };
}

/**
 * Quick-Check: Sind zwei Codes kompatibel?
 */
export function sindCodesKompatibel(codeA: string, codeB: string): boolean {
    const result = validateBillingCodes([codeA, codeB]);
    return result.gueltig;
}

/**
 * Gibt alle Regeln für einen bestimmten Code zurück
 */
export function getRegelnFuerCode(code: string): BillingRule[] {
    const rules = loadBillingRules();
    return rules.filter(r => r.betrifft.includes(code));
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

export default {
    validateBillingCodes,
    sindCodesKompatibel,
    getRegelnFuerCode,
    loadBillingRules,
    getRegelIndex
};
