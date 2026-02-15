/**
 * Endo Signal Parser V2 — Deterministic Dictation Signal Extraction
 *
 * ═══════════════════════════════════════════════════════════════
 * Extracts structured signals from raw dictation text.
 * V2 adds: ISO sizes, taper, canal labels, obturation technique
 * Deterministic: same input => same output.
 * ═══════════════════════════════════════════════════════════════
 */

import type {
    EndoExtractedSignals,
    EndoPhase,
    IrrigationSolution,
    InstrumentationMode,
    WorkingLengthMethod,
    MedicamentType,
    WorkingLengthsByCanal,
    ApicalSizeEntry,
    WorkingLengthEntry,
    CanalLabel,
    ObturationTechnique,
    SealerTypeClass,
    PlannedAction,
} from '../../../contracts/questionEngineTypes';

// ═══════════════════════════════════════════════════════════════
// KEYWORD PATTERNS
// ═══════════════════════════════════════════════════════════════

const VISIT_PATTERNS: Array<{ pattern: RegExp; visit: number }> = [
    { pattern: /erste[rn]?\s+termin/i, visit: 1 },
    { pattern: /1\.\s*termin/i, visit: 1 },
    { pattern: /zweite[rn]?\s+termin/i, visit: 2 },
    { pattern: /2\.\s*termin/i, visit: 2 },
    { pattern: /dritte[rn]?\s+termin/i, visit: 3 },
    { pattern: /3\.\s*termin/i, visit: 3 },
];

const PHASE_KEYWORDS: Record<Exclude<EndoPhase, 'obturation'>, string[]> = {
    t1: ['trepanation', 'eröffn', 'zugangskavität', 'wkb begonnen', 'wurzelbehandlung gestartet'],
    t2: ['zwischensitzung', 'einlage erneuert', 'weiter aufbereitet', 'aufbereitung fortgesetzt', 'erneut aufbereitet'],
    t3: ['wurzelfüllung', 'guttapercha', 'obturation', 'abgeschlossen', 'wf eingebracht'],
};

const IRRIGATION_KEYWORDS: Array<{ pattern: RegExp; solution: IrrigationSolution }> = [
    { pattern: /naocl|natrium\s*hypochlorit|natriumhypochlorit|hypo/i, solution: 'NaOCl' },
    { pattern: /edta/i, solution: 'EDTA' },
    { pattern: /chx|chlorhexidin/i, solution: 'CHX' },
    { pattern: /nacl|kochsalz|physiolog/i, solution: 'NaCl' },
    { pattern: /h2o2|wasserstoff/i, solution: 'H2O2' },
];

const INSTRUMENTATION_KEYWORDS: Array<{ pattern: RegExp; mode: InstrumentationMode }> = [
    { pattern: /maschinell|rotierend|reciproc|protaper|waveone|mtwo/i, mode: 'rotary' },
    { pattern: /manuell|hand\s*feilen?|k-feilen?|hedström/i, mode: 'manual' },
];

const WORKING_LENGTH_METHOD_KEYWORDS: Array<{ pattern: RegExp; method: WorkingLengthMethod }> = [
    { pattern: /apex\s*lok|apexlokator|apex\s+locator|elektronisch|eal\b/i, method: 'apex_locator' },
    { pattern: /röntgen|rö\s*kontrolle|x-ray|messaufnahme/i, method: 'xray' },
];

const MEDICAMENT_KEYWORDS: Array<{ pattern: RegExp; type: MedicamentType }> = [
    { pattern: /ca\s*\(?oh\)?2|calcium\s*hydroxid|kalzium\s*hydroxid|caoh2/i, type: 'CaOH2' },
    { pattern: /ledermix/i, type: 'Ledermix' },
];

const OBTURATION_KEYWORDS: Array<{ pattern: RegExp; technique: ObturationTechnique }> = [
    // Accept "Wurzelfüllung warm" as warm vertical by default (common shorthand in dictations)
    { pattern: /warm\s*vertikal|vertikal\s*kondensation|thermafill?|obtura|wurzelfüllung\s*warm|wf\s*warm/i, technique: 'warm_vertical' },
    { pattern: /lateral(?:e[rn]?)?\s*kondensation|kalt\s*lateral/i, technique: 'lateral' },
    { pattern: /guttacore|trägerbasiert|carrier/i, technique: 'carrier' },
    { pattern: /single\s*cone|einzelstift/i, technique: 'single_cone' },
];

const SEALER_KEYWORDS: Array<{ pattern: RegExp; type: SealerTypeClass }> = [
    { pattern: /ah\s*plus|adseal|sealapex|endofill/i, type: 'resin' },
    { pattern: /bioceramic|mta|bioroot|totalfill|endosequence/i, type: 'bioceramic' },
];

// Canal name patterns (standard + German synonyms)
const CANAL_PATTERNS: Array<{ pattern: RegExp; label: CanalLabel }> = [
    { pattern: /\bmb1\b/i, label: 'MB1' },
    { pattern: /\bmb2\b/i, label: 'MB2' },
    { pattern: /\bmb\b|mesiobukkal|mesio\s*buccal/i, label: 'MB' },
    { pattern: /\bml\b|mesiolingual/i, label: 'ML' },
    { pattern: /\bmv\b|mesiovestibul/i, label: 'MV' },
    { pattern: /\bdb\b|distobukkal|disto\s*buccal/i, label: 'DB' },
    { pattern: /\bdl\b|distolingual/i, label: 'DL' },
    { pattern: /\bdv\b|distovestibul/i, label: 'DV' },
    { pattern: /\bd\b(?!\d)|distal(?!o)/i, label: 'D' },
    { pattern: /\bp\b|palatin/i, label: 'P' },
    { pattern: /\bl\b|lingual(?!o)/i, label: 'L' },
    { pattern: /\bb\b|bukkal/i, label: 'B' },
    { pattern: /\bk1\b|kanal\s*1/i, label: 'K1' },
    { pattern: /\bk2\b|kanal\s*2/i, label: 'K2' },
    { pattern: /\bk3\b|kanal\s*3/i, label: 'K3' },
    { pattern: /\bk4\b|kanal\s*4/i, label: 'K4' },
];

// ═══════════════════════════════════════════════════════════════
// MAIN PARSER FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Parse dictation text and extract structured signals (V2).
 * Deterministic: same input => same output.
 */
export function parseEndoSignals(dictationText: string): EndoExtractedSignals {
    const lower = dictationText.toLowerCase();

    return {
        tooth: extractTooth(dictationText),
        visitNumber: extractVisitNumber(lower),
        phase: extractPhase(lower),
        kofferdam: extractKofferdam(lower),
        kofferdamNotPossible: extractKofferdamNotPossible(lower),
        medicament: extractMedicament(lower),
        medicamentMentioned: extractMedicamentMentioned(lower),
        irrigationSolutions: extractIrrigationSolutions(lower),
        workingLengthsChecked: extractWorkingLengthsChecked(lower),
        workingLengthMethod: extractWorkingLengthMethod(lower),
        workingLengthsByCanal: extractWorkingLengthsByCanal(dictationText),
        workingLengths: extractWorkingLengthsStructured(dictationText),
        instrumentationMode: extractInstrumentationMode(lower),
        apicalSizes: extractApicalSizes(dictationText),
        canalLabels: extractCanalLabels(lower),
        obturationTechnique: extractObturationTechnique(lower),
        sealerTypeClass: extractSealerType(lower),
        // T2 Deviation fields
        plannedAction: extractPlannedAction(lower),
        fistulaPresent: extractFistulaPresent(lower),
        suppurationPresent: extractSuppurationPresent(lower),
        painPersistent: extractPainPersistent(lower),
        obturationPerformed: extractObturationPerformed(lower),
        irrigationMentioned: extractIrrigationMentioned(lower),
        instrumentationMentioned: extractInstrumentationMentioned(lower),
        workingLengthMentioned: extractWorkingLengthMentioned(lower),
        // T4 Apex/Negotiation deviation fields
        apexNotReachable: extractApexNotReachable(lower),
        canalNegotiationIssue: extractCanalNegotiationIssue(lower),
        canalsIncomplete: extractCanalsIncomplete(lower),
    };
}

// ═══════════════════════════════════════════════════════════════
// EXTRACTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function extractTooth(text: string): string | null {
    // Match "Zahn 36" or "Z. 36" or standalone "36" at word boundary
    // For multiple teeth, pick the last explicitly treated tooth
    const matches = text.match(/(?:zahn|z\.?)\s*(\d{2})/gi);
    if (matches && matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        const num = lastMatch.match(/(\d{2})/);
        return num ? num[1] : null;
    }
    // Fallback: standalone tooth number
    const standalone = text.match(/\b([1-4][1-8])\b/);
    return standalone ? standalone[1] : null;
}

function extractVisitNumber(lower: string): number | null {
    for (const { pattern, visit } of VISIT_PATTERNS) {
        if (pattern.test(lower)) {
            return visit;
        }
    }
    // Check for "Revision" -> typically T2
    if (/revision/i.test(lower)) {
        return 2;
    }
    return null;
}

function extractPhase(lower: string): EndoPhase | null {
    // Check t3/obturation first (most specific)
    for (const keyword of PHASE_KEYWORDS.t3) {
        if (lower.includes(keyword)) {
            return 't3';
        }
    }

    // Check t2 before t1 (interim > start specificity)
    for (const keyword of PHASE_KEYWORDS.t2) {
        if (lower.includes(keyword)) {
            return 't2';
        }
    }

    // Check t1
    for (const keyword of PHASE_KEYWORDS.t1) {
        if (lower.includes(keyword)) {
            return 't1';
        }
    }

    return null;
}

function extractKofferdam(lower: string): boolean {
    // Positive match but exclude "kein kofferdam"
    if (/keine?\s+kofferdam/i.test(lower)) return false;
    return /kofferdam|rubber\s*dam/i.test(lower);
}

function extractKofferdamNotPossible(lower: string): boolean {
    return /keine?\s+kofferdam|kofferdam\s+nicht\s+möglich/i.test(lower);
}

function extractMedicament(lower: string): MedicamentType | null {
    if (/keine?\s+einlage|ohne\s+einlage|kein\s+medikament|keine\s+medikation/i.test(lower)) {
        return 'none';
    }

    for (const { pattern, type } of MEDICAMENT_KEYWORDS) {
        if (pattern.test(lower)) {
            return type;
        }
    }

    // Check for generic "medikamentöse Einlage" without specific type
    if (/medikament|einlage/i.test(lower) && !/keine\s+einlage/i.test(lower)) {
        return null; // Mentioned but type not specified
    }

    return null;
}

function extractMedicamentMentioned(lower: string): boolean {
    if (/keine?\s+einlage|ohne\s+einlage|kein\s+medikament|keine\s+medikation/i.test(lower)) {
        return false;
    }
    return /medikament|einlage|medikation/i.test(lower);
}

function extractIrrigationSolutions(lower: string): IrrigationSolution[] {
    const solutions: IrrigationSolution[] = [];

    for (const { pattern, solution } of IRRIGATION_KEYWORDS) {
        if (pattern.test(lower)) {
            solutions.push(solution);
        }
    }

    return solutions;
}

function extractWorkingLengthsChecked(lower: string): boolean {
    return /arbeitslänge|arbeitsl[aä]ngen|working\s*length/i.test(lower);
}

function extractWorkingLengthMethod(lower: string): WorkingLengthMethod | null {
    let hasApex = false;
    let hasXray = false;

    for (const { pattern, method } of WORKING_LENGTH_METHOD_KEYWORDS) {
        if (pattern.test(lower)) {
            if (method === 'apex_locator') hasApex = true;
            if (method === 'xray') hasXray = true;
        }
    }

    if (hasApex && hasXray) return 'both';
    if (hasApex) return 'apex_locator';
    if (hasXray) return 'xray';
    return null;
}

function extractWorkingLengthsByCanal(text: string): WorkingLengthsByCanal | null {
    const lengths: WorkingLengthsByCanal = {};
    const lower = text.toLowerCase();

    // Simple direct patterns for each canal - more reliable
    const canalPatterns: Array<{ pattern: RegExp; label: string }> = [
        { pattern: /\bmb1\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/i, label: 'MB1' },
        { pattern: /\bmb2\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/i, label: 'MB2' },
        { pattern: /\bmb\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/i, label: 'MB' },
        { pattern: /\bml\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/i, label: 'ML' },
        { pattern: /\bmv\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/i, label: 'MV' },
        { pattern: /\bdb\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/i, label: 'DB' },
        { pattern: /\bdl\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/i, label: 'DL' },
        { pattern: /\bdv\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/i, label: 'DV' },
        { pattern: /\bd\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/i, label: 'D' },
        { pattern: /\bp\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/i, label: 'P' },
        { pattern: /\bk1\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/i, label: 'K1' },
        { pattern: /\bk2\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/i, label: 'K2' },
        { pattern: /\bk3\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/i, label: 'K3' },
    ];

    for (const { pattern, label } of canalPatterns) {
        const match = lower.match(pattern);
        if (match && match[1]) {
            const value = parseFloat(match[1].replace(',', '.'));
            // Avoid overwriting more specific labels (MB1/MB2 vs MB)
            if (!lengths[label]) {
                lengths[label] = value;
            }
        }
    }

    return Object.keys(lengths).length > 0 ? lengths : null;
}

function extractWorkingLengthsStructured(text: string): WorkingLengthEntry[] {
    const lengths: WorkingLengthEntry[] = [];
    const lower = text.toLowerCase();

    // Simple patterns for each canal with length capture
    const canalPatterns: Array<{ pattern: RegExp; label: CanalLabel }> = [
        { pattern: /\bmb1\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/gi, label: 'MB1' },
        { pattern: /\bmb2\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/gi, label: 'MB2' },
        { pattern: /\bmb\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/gi, label: 'MB' },
        { pattern: /\bml\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/gi, label: 'ML' },
        { pattern: /\bmv\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/gi, label: 'MV' },
        { pattern: /\bdb\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/gi, label: 'DB' },
        { pattern: /\bdl\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/gi, label: 'DL' },
        { pattern: /\bd\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/gi, label: 'D' },
        { pattern: /\bp\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/gi, label: 'P' },
        { pattern: /\bk1\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/gi, label: 'K1' },
        { pattern: /\bk2\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/gi, label: 'K2' },
        { pattern: /\bk3\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/gi, label: 'K3' },
    ];

    for (const { pattern, label } of canalPatterns) {
        let match;
        while ((match = pattern.exec(lower)) !== null) {
            const value = parseFloat(match[1].replace(',', '.'));
            lengths.push({
                canal: label,
                mm: value,
                evidence: match[0].trim(),
            });
        }
    }

    return lengths;
}

function extractInstrumentationMode(lower: string): InstrumentationMode | null {
    for (const { pattern, mode } of INSTRUMENTATION_KEYWORDS) {
        if (pattern.test(lower)) {
            return mode;
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
// V2: ISO SIZE EXTRACTION
// ═══════════════════════════════════════════════════════════════

/**
 * Extract ISO apical sizes from dictation.
 * Patterns: "ISO 25", "#25", "25er", "30/.04", "F2"
 */
function extractApicalSizes(text: string): ApicalSizeEntry[] {
    const sizes: ApicalSizeEntry[] = [];
    const lower = text.toLowerCase();

    // Pattern 1: "ISO 25" or "ISO25"
    const isoPattern = /iso\s*(\d{2})/gi;
    let match;
    while ((match = isoPattern.exec(lower)) !== null) {
        sizes.push({
            canal: findNearestCanal(text, match.index) || 'unknown',
            iso: parseInt(match[1], 10),
            evidence: match[0],
        });
    }

    // Pattern 2: "#25" or "# 25"
    const hashPattern = /#\s*(\d{2})/g;
    while ((match = hashPattern.exec(lower)) !== null) {
        sizes.push({
            canal: findNearestCanal(text, match.index) || 'unknown',
            iso: parseInt(match[1], 10),
            evidence: match[0],
        });
    }

    // Pattern 3: "25er" (German suffix)
    const erPattern = /(\d{2})er(?:\s*feile)?/gi;
    while ((match = erPattern.exec(lower)) !== null) {
        sizes.push({
            canal: findNearestCanal(text, match.index) || 'unknown',
            iso: parseInt(match[1], 10),
            evidence: match[0],
        });
    }

    // Pattern 4: "30/.04" or "25/.06" (size with taper)
    const taperPattern = /(\d{2})\s*\/\s*\.(\d{2})/g;
    while ((match = taperPattern.exec(lower)) !== null) {
        sizes.push({
            canal: findNearestCanal(text, match.index) || 'unknown',
            iso: parseInt(match[1], 10),
            taper: `.${match[2]}`,
            evidence: match[0],
        });
    }

    // Pattern 5: Canal-specific: "MB ISO 25" or "MB: 25" or "MB 25"
    const canalIsoPatterns: Array<{ pattern: RegExp; label: CanalLabel }> = [
        { pattern: /\bmb1\s*[:=]?\s*(?:iso\s*)?(\d{2})/gi, label: 'MB1' },
        { pattern: /\bmb2\s*[:=]?\s*(?:iso\s*)?(\d{2})/gi, label: 'MB2' },
        { pattern: /\bmb\s*[:=]?\s*(?:iso\s*)?(\d{2})/gi, label: 'MB' },
        { pattern: /\bml\s*[:=]?\s*(?:iso\s*)?(\d{2})/gi, label: 'ML' },
        { pattern: /\bmv\s*[:=]?\s*(?:iso\s*)?(\d{2})/gi, label: 'MV' },
        { pattern: /\bdb\s*[:=]?\s*(?:iso\s*)?(\d{2})/gi, label: 'DB' },
        { pattern: /\bdl\s*[:=]?\s*(?:iso\s*)?(\d{2})/gi, label: 'DL' },
        { pattern: /\bd\s*[:=]?\s*(?:iso\s*)?(\d{2})/gi, label: 'D' },
        { pattern: /\bp\s*[:=]?\s*(?:iso\s*)?(\d{2})/gi, label: 'P' },
        { pattern: /\bk1\s*[:=]?\s*(?:iso\s*)?(\d{2})/gi, label: 'K1' },
        { pattern: /\bk2\s*[:=]?\s*(?:iso\s*)?(\d{2})/gi, label: 'K2' },
        { pattern: /\bk3\s*[:=]?\s*(?:iso\s*)?(\d{2})/gi, label: 'K3' },
    ];

    for (const { pattern, label } of canalIsoPatterns) {
        while ((match = pattern.exec(lower)) !== null) {
            const isoValue = parseInt(match[1], 10);
            // Only add if this looks like an ISO size (8-80 range)
            if (isoValue >= 8 && isoValue <= 80) {
                sizes.push({
                    canal: label,
                    iso: isoValue,
                    evidence: match[0].trim(),
                });
            }
        }
    }

    // Deduplicate by canal
    const seen = new Set<string>();
    return sizes.filter(s => {
        const key = `${s.canal}-${s.iso}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Find the nearest canal label before a given position in text.
 */
function findNearestCanal(text: string, position: number): CanalLabel | null {
    const searchWindow = text.slice(Math.max(0, position - 30), position).toLowerCase();

    for (const { pattern, label } of CANAL_PATTERNS) {
        if (pattern.test(searchWindow)) {
            return label;
        }
    }
    return null;
}

/**
 * Extract canal labels mentioned in text (without values).
 */
function extractCanalLabels(lower: string): CanalLabel[] {
    const labels: CanalLabel[] = [];
    const seen = new Set<string>();

    for (const { pattern, label } of CANAL_PATTERNS) {
        if (pattern.test(lower) && !seen.has(label)) {
            labels.push(label);
            seen.add(label);
        }
    }

    return labels;
}

// ═══════════════════════════════════════════════════════════════
// V2: OBTURATION & SEALER EXTRACTION
// ═══════════════════════════════════════════════════════════════

function extractObturationTechnique(lower: string): ObturationTechnique | null {
    for (const { pattern, technique } of OBTURATION_KEYWORDS) {
        if (pattern.test(lower)) {
            return technique;
        }
    }
    return null;
}

function extractSealerType(lower: string): SealerTypeClass | null {
    for (const { pattern, type } of SEALER_KEYWORDS) {
        if (pattern.test(lower)) {
            return type;
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
// T2 DEVIATION SIGNAL EXTRACTION
// ═══════════════════════════════════════════════════════════════

/**
 * Extract planned action from dictation.
 * "heute eigentlich med-wechsel" => 'medChange'
 * "heute eigentlich abfüllen" => 'obturation'
 */
function extractPlannedAction(lower: string): PlannedAction | null {
    // MedChange patterns
    if (/heute\s+(?:eigentlich\s+)?(?:med(?:ikament(?:en)?)?[-\s]*wechsel|medwechsel)/i.test(lower)) {
        return 'medChange';
    }
    if (/geplant(?:er?)?\s*:?\s*med(?:ikament(?:en)?)?[-\s]*wechsel/i.test(lower)) {
        return 'medChange';
    }
    if (/(?:wollte|sollte)\s+(?:heute\s+)?(?:med[-\s]*wechsel|einlage\s+wechseln)/i.test(lower)) {
        return 'medChange';
    }

    // Obturation patterns
    if (/heute\s+(?:eigentlich\s+)?(?:ab)?f[üu]ll(?:en|ung)/i.test(lower)) {
        return 'obturation';
    }
    if (/geplant(?:er?)?\s*:?\s*(?:obturation|(?:ab)?f[üu]ll(?:en|ung)|wurzelf[üu]llung)/i.test(lower)) {
        return 'obturation';
    }
    if (/(?:wollte|sollte)\s+(?:heute\s+)?(?:ab)?f[üu]ll(?:en|ung)/i.test(lower)) {
        return 'obturation';
    }
    if (/obturation\s+geplant/i.test(lower)) {
        return 'obturation';
    }

    return null;
}

/**
 * Extract fistula presence from dictation.
 * True: "Fistel", "Fistelgang", "Sinus tract"
 * False: "fistelfrei", "keine Fistel", "Fistel weg"
 */
function extractFistulaPresent(lower: string): boolean | null {
    // Explicit negative first
    if (/fistel\s*frei|keine\s+fistel|fistel\s+(?:weg|verschwunden|abgeheilt)/i.test(lower)) {
        return false;
    }
    // Positive detection
    if (/fistel(?:gang)?|sinus\s*tract/i.test(lower)) {
        return true;
    }
    return null;
}

/**
 * Extract suppuration/exudate presence from dictation.
 * True: "Eiter", "Exsudat", "Sekret", "Drainage", "Eiteraustritt"
 * False: "kein Eiter", "trocken" (conservative)
 */
function extractSuppurationPresent(lower: string): boolean | null {
    // Explicit negative first
    if (/kein(?:en?)?\s+eiter|eiter\s*frei/i.test(lower)) {
        return false;
    }
    if (/kan[aä]l(?:e)?\s+trocken|trocken(?:gelegt)?/i.test(lower)) {
        return false;
    }
    // Positive detection
    if (/\beiter(?:austritt)?|exsudat|suppurat|sekret(?:ion)?|drainage/i.test(lower)) {
        return true;
    }
    return null;
}

/**
 * Extract persistent pain/symptoms from dictation.
 * True: "muckert", "noch schmerzhaft", "Beschwerden", "druckdolent"
 * False: "beschwerdefrei", "keine Beschwerden"
 */
function extractPainPersistent(lower: string): boolean | null {
    // Explicit negative first
    if (/beschwerde\s*frei|keine\s+beschwerden|symptom\s*frei|asymptomatisch/i.test(lower)) {
        return false;
    }
    // Positive detection - German pain indicators
    if (/muckert|gemuckert/i.test(lower)) {
        return true;
    }
    if (/noch\s+schmerz|weiterhin\s+schmerz|schmerz\s+persist|druckdolent|druckempfindlich/i.test(lower)) {
        return true;
    }
    if (/(?:persist(?:ie)?rende?|anhaltende?|weiterhin)\s+beschwerden/i.test(lower)) {
        return true;
    }
    if (/beschwerden\s+(?:noch|immer\s+noch|weiterhin)/i.test(lower)) {
        return true;
    }
    return null;
}

/**
 * Extract whether obturation was performed.
 * True: "abgefüllt", "obturiert", "Wurzelfüllung eingebracht"
 * False: "keine Obturation", "nicht abgefüllt", "heute nicht gefüllt"
 */
function extractObturationPerformed(lower: string): boolean | null {
    // Explicit negative first
    if (/keine\s+obturation|nicht\s+(?:ab)?gef[üu]llt|heute\s+nicht\s+(?:ab)?gef[üu]llt|nicht\s+obturiert/i.test(lower)) {
        return false;
    }
    if (/keine\s+wurzelf[üu]llung|wurzelf[üu]llung\s+(?:heute\s+)?nicht/i.test(lower)) {
        return false;
    }
    // Positive detection
    if (/(?:ab)?gef[üu]llt|obturiert|wurzelf[üu]llung\s+(?:eingebracht|gelegt|komplett)/i.test(lower)) {
        return true;
    }
    return null;
}

/**
 * Detect if irrigation ("gespült") was mentioned.
 */
function extractIrrigationMentioned(lower: string): boolean {
    return /gesp[üu]lt|sp[üu]l(?:ung|en)/i.test(lower);
}

/**
 * Detect if instrumentation ("aufbereitet") was mentioned.
 */
function extractInstrumentationMentioned(lower: string): boolean {
    return /aufbereitet|aufbereitung/i.test(lower);
}

/**
 * Detect if working length was mentioned.
 */
function extractWorkingLengthMentioned(lower: string): boolean {
    return /arbeitsl[äa]nge|wl\b|\bl[äa]nge\s+bestimmt|apexlokator|r[öo]ntgenmessaufnahme/i.test(lower);
}

// ═══════════════════════════════════════════════════════════════
// T4: APEX/NEGOTIATION DEVIATION EXTRACTION
// ═══════════════════════════════════════════════════════════════

/**
 * Detect if apex could not be reached (Stufe/Blockade).
 * Keywords: "nicht bis Apex", "Stufe", "Blockade", "nicht passierbar"
 */
function extractApexNotReachable(lower: string): boolean | null {
    // Positive patterns - apex not reachable
    if (/nicht\s+bis\s+(?:zum?\s+)?apex/i.test(lower)) {
        return true;
    }
    if (/\bstufe\b|blockade|nicht\s+passierbar/i.test(lower)) {
        return true;
    }
    if (/apex\s+nicht\s+(?:er)?reicht?|konnte\s+(?:nicht\s+)?apex/i.test(lower)) {
        return true;
    }
    if (/nur\s+bis\s+\d+\s*mm|verkürzt(?:e)?\s+aufbereitung/i.test(lower)) {
        return true;
    }

    // Explicit negative - we reached apex
    if (/bis\s+(?:zum?\s+)?apex\s+aufbereitet|apex\s+erreicht/i.test(lower)) {
        return false;
    }

    return null;
}

/**
 * Detect if there is a canal negotiation issue.
 */
function extractCanalNegotiationIssue(lower: string): boolean | null {
    // Positive patterns
    if (/kanal\s+nicht\s+(?:g[äa]ng(?:ig)?|passierbar|auffindbar|sondierbar)/i.test(lower)) {
        return true;
    }
    if (/(?:mb|ml|db|d|p|palatinal|mesio|distal)(?:\d)?\s+nicht\s+(?:g[äa]ng|passier|auffind)/i.test(lower)) {
        return true;
    }
    if (/obliter(?:iert|ation)|verkalkt|verstopft|blockiert/i.test(lower)) {
        return true;
    }
    if (/nur\s+\d+\s*(?:kanal|kan[äa]le)/i.test(lower)) {
        return true;
    }

    return null;
}

/**
 * Extract which specific canals are incomplete/blocked.
 */
function extractCanalsIncomplete(lower: string): string[] {
    const incomplete: string[] = [];

    // Patterns like "MB nicht", "MB1 nicht", "mesiobukkal nicht"
    const canalPatterns = [
        { pattern: /\b(mb1?)\s+nicht/i, canal: 'MB' },
        { pattern: /\b(mb2)\s+nicht/i, canal: 'MB2' },
        { pattern: /\b(ml)\s+nicht/i, canal: 'ML' },
        { pattern: /\b(db)\s+nicht/i, canal: 'DB' },
        { pattern: /\b(d)\s+nicht/i, canal: 'D' },
        { pattern: /\b(p)\s+nicht/i, canal: 'P' },
        { pattern: /mesio\s*bukkal\s+nicht/i, canal: 'MB' },
        { pattern: /mesio\s*lingual\s+nicht/i, canal: 'ML' },
        { pattern: /disto\s*bukkal\s+nicht/i, canal: 'DB' },
        { pattern: /distal\s+nicht/i, canal: 'D' },
        { pattern: /palatinal\s+nicht/i, canal: 'P' },
    ];

    for (const { pattern, canal } of canalPatterns) {
        if (pattern.test(lower)) {
            if (!incomplete.includes(canal)) {
                incomplete.push(canal);
            }
        }
    }

    return incomplete;
}

// ═══════════════════════════════════════════════════════════════
// V2 DEVIATION MODE: PATTERNS & DETECTION
// ═══════════════════════════════════════════════════════════════

import type {
    CanalId,
    CanalState,
    DeviationFlag,
    DeviationFlagType,
    LimitationReason,
    EndoDeviationSignals,
    VisitIntent,
    VisitOutcome,
    PerformedStep,
    PlannedStep,
} from './endoTypes';

// Deviation trigger patterns
const DEVIATION_PATTERNS: Record<DeviationFlagType, RegExp[]> = {
    'PAIN_PERSISTENT': [
        /noch\s+schmerz/i,
        /weiterhin\s+schmerz/i,
        /druckdolent/i,
        /beschwerden\s+persist/i,
        /immer\s+noch\s+schmerz/i,
        /sensibel\s+auf\s+perkussion/i,
        /perkussionsempfindlich/i,
    ],
    'NO_OBTURATION_DESPITE_PLAN': [
        /wollte[n]?\s+(?:heute\s+)?(?:ab)?füllen/i,
        /(?:ab)?füllung\s+geplant/i,
        /obturationsversuch/i,
        /heute\s+(?:ab)?füllen/i,
    ],
    'PARTIAL_NEGOTIABILITY': [
        /nicht\s+(?:bis\s+)?(?:zum\s+)?apex/i,
        /nicht\s+passierbar/i,
        /nicht\s+durchgängig/i,
        /obliteriert/i,
        /kalzifiziert/i,
        /stufe/i,
        /ledge/i,
        /blockiert/i,
        /nicht\s+sondierbar/i,
        /enge\s+(?:krümmung|anatomie)/i,
    ],
    'WL_NOT_REACHED': [
        /arbeitslänge\s+nicht\s+erreicht/i,
        /wl\s+nicht\s+erreicht/i,
        /konnte\s+(?:wl|al)\s+nicht/i,
    ],
    'EXUDATE_PRESENT': [
        /\bexsudat/i,
        /\bpus\b/i,
        /\beiter\b/i,
        /\beitrig/i,
        /\bsuppuration/i,
    ],
    'RE_MEDICATION': [
        /erneut\s+(?:caoh|ca\(oh\)|einlage)/i,
        /nochmal\s+(?:caoh|einlage)/i,
        /wieder\s+(?:caoh|einlage)/i,
        /erneute?\s+medikamentöse\s+einlage/i,
    ],
    'INSTRUMENT_SEPARATION': [
        /instrument\s+(?:separa|getrennt|abgebrochen)/i,
        /feilen?\s+(?:separa|abgebrochen|fraktur)/i,
        /filen?\s+fragmen/i,
    ],
    'LEDGE_CREATED': [
        /stufe\s+(?:gebildet|entstanden|iatrogen)/i,
        /ledge\s+(?:gebildet|entstanden)/i,
    ],
    'PERFORATION': [
        /perforat/i,
        /durchbruch/i,
    ],
    'RETREATMENT': [
        /revision/i,
        /retreatment/i,
        /wiederbehandlung/i,
        /re-endo/i,
    ],
};

// Canal-specific limitation patterns
const CANAL_LIMITATION_PATTERNS: Array<{
    pattern: RegExp;
    canalExtractor: RegExp;
    limitation: LimitationReason;
}> = [
        {
            pattern: /(mb|db|p|ml|dl|d|b|l|k[1-4])\s*(?:nicht\s+(?:bis\s+)?apex|nicht\s+passierbar|obliteriert|kalzifiziert)/i,
            canalExtractor: /(mb|db|p|ml|dl|d|b|l|k[1-4])/i,
            limitation: 'calcified',
        },
        {
            pattern: /(mb|db|p|ml|dl|d|b|l|k[1-4])\s*(?:stufe|ledge)/i,
            canalExtractor: /(mb|db|p|ml|dl|d|b|l|k[1-4])/i,
            limitation: 'ledge',
        },
        {
            pattern: /(mb|db|p|ml|dl|d|b|l|k[1-4])\s*blockiert/i,
            canalExtractor: /(mb|db|p|ml|dl|d|b|l|k[1-4])/i,
            limitation: 'blocked',
        },
        {
            pattern: /(mb|db|p|ml|dl|d|b|l|k[1-4])\s*(?:stark\s+)?(?:gekrümmt|krümmung)/i,
            canalExtractor: /(mb|db|p|ml|dl|d|b|l|k[1-4])/i,
            limitation: 'curved',
        },
    ];

// Intent patterns (what was planned)
const INTENT_PATTERNS: Array<{ pattern: RegExp; step: PlannedStep }> = [
    { pattern: /geplant(?:e)?\s+(?:ab)?füllung|heute\s+abfüllen|obturationsversuch/i, step: 'obturation' },
    { pattern: /weiter(?:e)?\s+aufbereitung/i, step: 'instrumentation' },
    { pattern: /einlage\s+(?:wechsel|erneuern)/i, step: 'medication' },
    { pattern: /kontrolle|nachkontrolle/i, step: 'review' },
];

// Outcome patterns (what was performed)
const OUTCOME_PATTERNS: Array<{ pattern: RegExp; step: PerformedStep }> = [
    { pattern: /kofferdam/i, step: 'kofferdam' },
    { pattern: /(?:alte\s+)?einlage\s+entfernt/i, step: 'removalMed' },
    { pattern: /arbeitslänge[n]?\s+(?:überprüft|bestätigt|kontrolliert|gemessen)/i, step: 'wlCheck' },
    { pattern: /aufbereitet|aufbereitung|instrumentiert/i, step: 'instrumentation' },
    { pattern: /gespült|spülung|naocl|edta/i, step: 'irrigation' },
    { pattern: /(?:caoh|ca\(oh\)2|caoh2)\s*einlage|(?:caoh|einlage|medikament)\s+(?:eingebracht|gelegt|appliziert)/i, step: 'medication' },
    { pattern: /prov(?:isorisch)?(?:er)?[.]?\s*verschluss|temp(?:orärer)?[.]?\s*verschluss/i, step: 'tempSeal' },
    { pattern: /teilweise\s+(?:ab)?gefüllt|partielle?\s+obturation/i, step: 'obturationPartial' },
    { pattern: /wurzelfüllung|abgefüllt|guttapercha|obturation\s+abgeschlossen/i, step: 'obturationComplete' },
];

/**
 * Parse deviation signals from dictation.
 * Deterministic: same input => same output.
 */
export function parseDeviationSignals(dictationText: string): EndoDeviationSignals {
    const lower = dictationText.toLowerCase();

    // 1. Detect deviation flags
    const deviationFlags = extractDeviationFlags(lower, dictationText);

    // 2. Detect canal states
    const { canalStates, detectedCanals } = extractCanalStates(dictationText, lower);

    // 3. Detect intent and outcome
    const intent = extractIntent(lower);
    const outcome = extractOutcome(lower);

    // 4. Determine if deviation mode is triggered
    const deviationMode =
        deviationFlags.length > 0 ||
        Array.from(canalStates.values()).some(c => c.negotiableToApex === false);

    return {
        deviationMode,
        deviationFlags,
        canalStates,
        detectedCanals,
        intent,
        outcome,
    };
}

/**
 * Extract deviation flags from dictation.
 */
function extractDeviationFlags(lower: string, original: string): DeviationFlag[] {
    const flags: DeviationFlag[] = [];

    for (const [type, patterns] of Object.entries(DEVIATION_PATTERNS) as [DeviationFlagType, RegExp[]][]) {
        const evidence: string[] = [];

        for (const pattern of patterns) {
            const match = lower.match(pattern);
            if (match) {
                // Extract surrounding context (±30 chars)
                const start = Math.max(0, match.index! - 20);
                const end = Math.min(original.length, match.index! + match[0].length + 20);
                evidence.push(original.slice(start, end).trim());
            }
        }

        if (evidence.length > 0) {
            flags.push({ type, evidence });
        }
    }

    // Special case: NO_OBTURATION_DESPITE_PLAN requires both intent and outcome mismatch
    const hasObturationIntent = flags.some(f => f.type === 'NO_OBTURATION_DESPITE_PLAN');
    const hasMedicationOutcome = /(?:caoh|einlage|medikament)/i.test(lower) &&
        !/(?:ab)?gefüllt|guttapercha|obturation(?:\s+abgeschlossen)?/i.test(lower);

    if (hasObturationIntent && !hasMedicationOutcome) {
        // Intent was obturation but no evidence of NOT obturating
        // Might have actually obtained - remove the flag
        const idx = flags.findIndex(f => f.type === 'NO_OBTURATION_DESPITE_PLAN');
        if (idx >= 0) flags.splice(idx, 1);
    }

    return flags;
}

/**
 * Extract canal-specific states from dictation.
 */
function extractCanalStates(
    text: string,
    lower: string
): { canalStates: Map<CanalId, CanalState>; detectedCanals: CanalId[] } {
    const canalStates = new Map<CanalId, CanalState>();
    const detectedCanals: CanalId[] = [];

    // First, find all mentioned canals
    for (const { pattern, label } of CANAL_PATTERNS) {
        if (pattern.test(lower)) {
            const canalId = label as CanalId;
            if (!detectedCanals.includes(canalId)) {
                detectedCanals.push(canalId);
                canalStates.set(canalId, {
                    canalId,
                    negotiableToApex: null, // Unknown by default
                });
            }
        }
    }

    // Look for canal-specific limitations
    for (const { pattern, canalExtractor, limitation } of CANAL_LIMITATION_PATTERNS) {
        const match = lower.match(pattern);
        if (match) {
            const canalMatch = match[0].match(canalExtractor);
            if (canalMatch) {
                const canalId = canalMatch[1].toUpperCase() as CanalId;
                const state = canalStates.get(canalId) || { canalId, negotiableToApex: null };
                state.negotiableToApex = false;
                state.limitationReason = limitation;
                state.evidence = match[0];
                canalStates.set(canalId, state);
            }
        }
    }

    // Look for positive negotiability ("P bis WL", "palatinal bis apex")
    // Also extract WL when present in this context: "P bis WL 21mm"
    const positiveWithWLPattern = /(mb|db|p|palatinal|ml|dl|d|b|l|k[1-4])\s*bis\s*(?:wl|al|arbeitslänge)\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/gi;
    let posWlMatch;
    while ((posWlMatch = positiveWithWLPattern.exec(lower)) !== null) {
        const rawCanal = posWlMatch[1].toUpperCase();
        const canalId = (rawCanal === 'PALATINAL' ? 'P' : rawCanal) as CanalId;
        const mm = parseFloat(posWlMatch[2].replace(',', '.'));
        const state = canalStates.get(canalId) || { canalId, negotiableToApex: null };
        state.negotiableToApex = true;
        state.workingLengthMm = mm;
        state.evidence = posWlMatch[0];
        canalStates.set(canalId, state);
        if (!detectedCanals.includes(canalId)) {
            detectedCanals.push(canalId);
        }
    }

    // Positive negotiability without WL value
    // Include German synonyms inline for canal matching
    const positivePatterns = [
        /(mb|db|p|palatinal|ml|dl|d|b|l|k[1-4])\s*bis\s*(?:apex|wl|al|arbeitslänge)(?!\s*\d)/i,
        /(mb|db|p|palatinal|ml|dl|d|b|l|k[1-4])\s*(?:gut\s+)?(?:passierbar|durchgängig)/i,
    ];

    for (const pattern of positivePatterns) {
        const matches = lower.matchAll(new RegExp(pattern.source, 'gi'));
        for (const match of matches) {
            const rawCanal = match[1].toUpperCase();
            // Map German synonym to standard canal ID
            const canalId = (rawCanal === 'PALATINAL' ? 'P' : rawCanal) as CanalId;
            const state = canalStates.get(canalId) || { canalId, negotiableToApex: null };
            // Only set if not already set (positiveWithWLPattern takes precedence)
            if (state.negotiableToApex === null) {
                state.negotiableToApex = true;
                state.evidence = match[0];
            }
            canalStates.set(canalId, state);
            if (!detectedCanals.includes(canalId)) {
                detectedCanals.push(canalId);
            }
        }
    }

    // Extract WL per canal (for negotiable canals)
    const wlPattern = /(mb|db|p|ml|dl|d|b|l|k[1-4])\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?/gi;
    let wlMatch;
    while ((wlMatch = wlPattern.exec(lower)) !== null) {
        const canalId = wlMatch[1].toUpperCase() as CanalId;
        const mm = parseFloat(wlMatch[2].replace(',', '.'));
        const state = canalStates.get(canalId) || { canalId, negotiableToApex: null };
        state.workingLengthMm = mm;
        // If WL is provided, assume negotiable to apex unless stated otherwise
        if (state.negotiableToApex === null) {
            state.negotiableToApex = true;
        }
        canalStates.set(canalId, state);
    }

    // Extract ISO per canal - pattern 1: "P ISO 30", "MB 25"
    const isoPattern = /(mb|db|p|ml|dl|d|b|l|k[1-4])\s*[:=]?\s*iso\s*(\d{2})(?:\s*\/\s*\.(\d{2}))?/gi;
    let isoMatch;
    while ((isoMatch = isoPattern.exec(lower)) !== null) {
        const canalId = isoMatch[1].toUpperCase() as CanalId;
        const iso = parseInt(isoMatch[2], 10);
        const state = canalStates.get(canalId) || { canalId, negotiableToApex: null };
        state.fileIso = iso;
        if (isoMatch[3]) {
            state.fileTaper = `.${isoMatch[3]}`;
        }
        canalStates.set(canalId, state);
    }

    // Extract ISO per canal - pattern 2: "P 21mm ISO 30" (canal + WL + ISO)
    const canalWLIsoPattern = /(mb|db|p|ml|dl|d|b|l|k[1-4])\s*\d{1,2}(?:[.,]\d)?\s*(?:mm)?\s*iso\s*(\d{2})/gi;
    let wlIsoMatch;
    while ((wlIsoMatch = canalWLIsoPattern.exec(lower)) !== null) {
        const canalId = wlIsoMatch[1].toUpperCase() as CanalId;
        const iso = parseInt(wlIsoMatch[2], 10);
        const state = canalStates.get(canalId) || { canalId, negotiableToApex: null };
        state.fileIso = iso;
        canalStates.set(canalId, state);
    }

    return { canalStates, detectedCanals };
}

/**
 * Extract visit intent from dictation.
 */
function extractIntent(lower: string): VisitIntent | undefined {
    for (const { pattern, step } of INTENT_PATTERNS) {
        const match = lower.match(pattern);
        if (match) {
            return {
                plannedStep: step,
                evidence: match[0],
            };
        }
    }
    return undefined;
}

/**
 * Extract visit outcome from dictation.
 */
function extractOutcome(lower: string): VisitOutcome | undefined {
    const performedSteps = new Set<PerformedStep>();
    const evidence: string[] = [];

    for (const { pattern, step } of OUTCOME_PATTERNS) {
        const match = lower.match(pattern);
        if (match) {
            performedSteps.add(step);
            evidence.push(match[0]);
        }
    }

    if (performedSteps.size > 0) {
        return { performedSteps, evidence };
    }
    return undefined;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default parseEndoSignals;
