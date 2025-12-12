/**
 * Searchable Text Generator
 * 
 * Generiert optimierte, durchsuchbare Textfelder für jeden BillingCode,
 * um die semantische Suche (RAG) zu verbessern.
 */

import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface BillingCode {
    id: string;
    system: 'BEMA' | 'GOZ';
    nummer: string;
    bezeichnung: string;
    kurzform?: string;
    punkte?: number;
    kategorie?: string;
    leistungsinhalt?: string;
    dokumentation_erforderlich?: string;
    wichtig?: string;
    tipp?: string;
    regressfalle?: string;
    stand_2025?: string;
    // NEU: Generiertes Suchfeld
    searchableText?: string;
    // NEU: Verknüpfte Regeln
    regelIds?: string[];
}

export interface SearchableCodeResult {
    id: string;
    searchableText: string;
    keywords: string[];
    synonyme: string[];
}

// ═══════════════════════════════════════════════════════════════
// TEXT NORMALISIERUNG
// ═══════════════════════════════════════════════════════════════

/**
 * Normalisiert Text für bessere Suche
 */
export function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/[^\w\s]/g, ' ')  // Sonderzeichen entfernen
        .replace(/\s+/g, ' ')      // Mehrfache Leerzeichen
        .trim();
}

/**
 * Extrahiert relevante Keywords aus Text
 */
export function extractKeywords(text: string): string[] {
    const normalized = normalizeText(text);
    const words = normalized.split(' ');

    // Stopwörter entfernen
    const stopwords = new Set([
        'der', 'die', 'das', 'und', 'oder', 'in', 'im', 'an', 'am',
        'auf', 'aus', 'bei', 'mit', 'nach', 'von', 'zu', 'zum', 'zur',
        'ein', 'eine', 'einer', 'eines', 'einem', 'einen',
        'ist', 'sind', 'wird', 'werden', 'wurde', 'wurden',
        'nicht', 'nur', 'auch', 'als', 'wie', 'wenn', 'kann',
        'pro', 'je', 'bis', 'fuer', 'ueber', 'unter'
    ]);

    return words
        .filter(w => w.length > 2 && !stopwords.has(w))
        .filter((w, i, arr) => arr.indexOf(w) === i);  // Unique
}

// ═══════════════════════════════════════════════════════════════
// SYNONYME
// ═══════════════════════════════════════════════════════════════

const SYNONYME: Record<string, string[]> = {
    // Behandlungen
    'fuellung': ['fuellungen', 'fuellung', 'kompositfuellung', 'amalgam', 'composite'],
    'krone': ['kronen', 'ueberkronung', 'vollkrone', 'teilkrone'],
    'bruecke': ['bruecken', 'brueckenversorgung', 'brueckenglied', 'brueckenanker'],
    'prothese': ['prothesen', 'zahnersatz', 'teilprothese', 'vollprothese', 'totalprothese'],
    'extraktion': ['extraktionen', 'zahnentfernung', 'zahn ziehen', 'ziehen'],
    'wurzelbehandlung': ['endo', 'endodontie', 'wurzelkanalbehandlung', 'wkb', 'wurzelfuellung'],

    // Material
    'keramik': ['vollkeramik', 'zirkon', 'zirkonoxid', 'empress', 'emax'],
    'metall': ['nem', 'nichtedelmetall', 'edelmetall', 'gold', 'titan'],

    // Anatomie
    'molar': ['molaren', 'backenzahn', 'backenzaehne', '6er', '7er', '8er'],
    'praemolar': ['praemolaren', 'pm', '4er', '5er'],
    'frontzahn': ['frontzaehne', 'schneidezahn', 'schneidezaehne', '1er', '2er', '3er'],

    // Versicherung
    'gkv': ['gesetzlich', 'kassenpatient', 'kassenzahnersatz', 'regelversorgung'],
    'pkv': ['privat', 'privatpatient', 'privatversichert'],

    // Abrechnung
    'festzuschuss': ['fz', 'zuschuss', 'kassenzuschuss', 'festbetrag'],
    'mehrkosten': ['zuzahlung', 'eigenanteil', 'aufzahlung'],
    'gleichartig': ['gleichartige versorgung', 'teilprivat'],
    'andersartig': ['andersartige versorgung', 'vollprivat']
};

/**
 * Findet Synonyme für einen Begriff
 */
export function findSynonyme(text: string): string[] {
    const normalized = normalizeText(text);
    const result: string[] = [];

    for (const [key, synonyms] of Object.entries(SYNONYME)) {
        if (normalized.includes(key) || synonyms.some(s => normalized.includes(s))) {
            result.push(...synonyms);
        }
    }

    return [...new Set(result)];  // Unique
}

// ═══════════════════════════════════════════════════════════════
// HAUPTFUNKTIONEN
// ═══════════════════════════════════════════════════════════════

/**
 * Generiert durchsuchbaren Text für einen BillingCode
 */
export function generateSearchableText(code: BillingCode): SearchableCodeResult {
    const parts: string[] = [];

    // Grundinfos
    parts.push(`${code.system} ${code.nummer}`);
    parts.push(code.bezeichnung);

    if (code.kurzform) parts.push(code.kurzform);
    if (code.leistungsinhalt) parts.push(code.leistungsinhalt);
    if (code.dokumentation_erforderlich) parts.push(code.dokumentation_erforderlich);
    if (code.wichtig) parts.push(code.wichtig);
    if (code.tipp) parts.push(code.tipp);
    if (code.kategorie) parts.push(code.kategorie);
    if (code.regressfalle) parts.push(`Regressfalle: ${code.regressfalle}`);
    if (code.stand_2025) parts.push(`2025: ${code.stand_2025}`);

    const combinedText = parts.join(' ');
    const keywords = extractKeywords(combinedText);
    const synonyme = findSynonyme(combinedText);

    // Searchable Text = Original + Synonyme
    const searchableText = [
        combinedText,
        ...synonyme
    ].join(' ');

    return {
        id: code.id,
        searchableText: normalizeText(searchableText),
        keywords,
        synonyme
    };
}

/**
 * Verarbeitet alle Codes aus einer JSON-Datei
 */
export function processCodeCatalog(codes: BillingCode[]): Map<string, SearchableCodeResult> {
    const results = new Map<string, SearchableCodeResult>();

    for (const code of codes) {
        const result = generateSearchableText(code);
        results.set(code.id, result);
    }

    return results;
}

/**
 * Erweitert eine Code-Datei mit searchableText
 */
export function enrichCodesWithSearchable(codes: BillingCode[]): BillingCode[] {
    return codes.map(code => {
        const searchResult = generateSearchableText(code);
        return {
            ...code,
            searchableText: searchResult.searchableText
        };
    });
}

// ═══════════════════════════════════════════════════════════════
// FUZZY MATCHING
// ═══════════════════════════════════════════════════════════════

/**
 * Berechnet Levenshtein-Distanz für Fuzzy-Suche
 */
export function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Fuzzy-Suche in searchableText
 */
export function fuzzySearch(
    query: string,
    codes: Map<string, SearchableCodeResult>,
    maxDistance: number = 2
): SearchableCodeResult[] {
    const normalizedQuery = normalizeText(query);
    const results: { result: SearchableCodeResult; score: number }[] = [];

    for (const [id, codeResult] of codes) {
        // Exakte Übereinstimmung in Keywords
        const exactMatch = codeResult.keywords.some(k =>
            k === normalizedQuery || codeResult.searchableText.includes(normalizedQuery)
        );

        if (exactMatch) {
            results.push({ result: codeResult, score: 0 });
            continue;
        }

        // Fuzzy-Match in Keywords
        for (const keyword of codeResult.keywords) {
            const distance = levenshteinDistance(normalizedQuery, keyword);
            if (distance <= maxDistance) {
                results.push({ result: codeResult, score: distance });
                break;
            }
        }
    }

    // Sortieren nach Score (niedriger = besser)
    return results
        .sort((a, b) => a.score - b.score)
        .map(r => r.result);
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

export default {
    generateSearchableText,
    processCodeCatalog,
    enrichCodesWithSearchable,
    normalizeText,
    extractKeywords,
    findSynonyme,
    fuzzySearch,
    levenshteinDistance
};
