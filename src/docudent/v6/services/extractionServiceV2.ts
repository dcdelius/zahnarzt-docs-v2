/**
 * V6 Extraction Service V2 — SSOT COMPLIANT
 *
 * Two-Stage Extraction:
 * - Stage A: Deterministic pre-parser (regex/tokenizer)
 * - Stage B: Optional LLM for ambiguous cases
 *
 * Rules:
 * - NO silent defaults
 * - Unknown values stay unknown, not guessed
 * - Every field has confidence + evidence
 */

import {
    type ExtractedDataV2,
    type Field,
    type Surface,
    type AnesthesiaType,
    type TiefeType,
    type VitalityType,
    type PercussionType,
    type CappingType,
    type CappingMaterial,
    type AnesthesiaInfo,
    type CappingInfo,
    type KeywordFlags,
    createField,
    unknownField,
    certainField,
    createEmptyExtraction,
} from '../../contracts/extraction';

// ═══════════════════════════════════════════════════════════════
// STAGE A: DETERMINISTIC PRE-PARSER
// ═══════════════════════════════════════════════════════════════

interface ParsedToken {
    type: string;
    value: string;
    evidence: string;
    position: number;
}

/**
 * Extract tooth number (FDI notation)
 */
function parseTooth(text: string): Field<string> {
    const patterns = [
        // Direct FDI: 36, 47, etc
        /\b([1-4][1-8])\b/g,
        // With suffix: 36er, 45er
        /\b([1-4][1-8])er\b/gi,
        // Written out: "Zahn 36"
        /zahn\s+([1-4][1-8])\b/gi,
    ];

    for (const pattern of patterns) {
        const match = pattern.exec(text);
        if (match) {
            return certainField(match[1], [match[0]]);
        }
    }

    // Word-to-number: support both "ß" and "ss" variants
    const wordPatterns: Record<string, string> = {
        'einundzwanzig': '21', 'zweiundzwanzig': '22', 'dreiundzwanzig': '23', 'vierundzwanzig': '24',
        'fünfundzwanzig': '25', 'sechsundzwanzig': '26', 'siebenundzwanzig': '27', 'achtundzwanzig': '28',
        // Both ß and ss variants for dreißig
        'einunddreißig': '31', 'einunddreissig': '31',
        'zweiunddreißig': '32', 'zweiunddreissig': '32',
        'dreiunddreißig': '33', 'dreiunddreissig': '33',
        'vierunddreißig': '34', 'vierunddreissig': '34',
        'fünfunddreißig': '35', 'fünfunddreissig': '35',
        'sechsunddreißig': '36', 'sechsunddreissig': '36',
        'siebenunddreißig': '37', 'siebenunddreissig': '37',
        'achtunddreißig': '38', 'achtunddreissig': '38',
        'einundvierzig': '41', 'zweiundvierzig': '42', 'dreiundvierzig': '43', 'vierundvierzig': '44',
        'fünfundvierzig': '45', 'sechsundvierzig': '46', 'siebenundvierzig': '47', 'achtundvierzig': '48',
    };

    const lower = text.toLowerCase();
    for (const [word, num] of Object.entries(wordPatterns)) {
        if (lower.includes(word)) {
            return certainField(num, [word]);
        }
    }

    return unknownField();
}

/**
 * Extract surfaces
 */
function parseSurfaces(text: string): Field<Surface[]> {
    const lower = text.toLowerCase();
    const surfaces: Surface[] = [];
    const evidence: string[] = [];

    // Combined patterns: mod, mo, do, ob, etc
    const combos: Record<string, Surface[]> = {
        'mod': ['m', 'o', 'd'],
        'm/o/d': ['m', 'o', 'd'],
        'mol': ['m', 'o', 'l'],
        'dol': ['d', 'o', 'l'],
        'iob': ['i', 'o', 'b'],
        'ob': ['o', 'b'],
        'od': ['o', 'd'],
        'do': ['d', 'o'],
        'mo': ['m', 'o'],
        'md': ['m', 'd'],
    };

    for (const [pattern, surfs] of Object.entries(combos)) {
        // Match as word boundary or with space/punctuation
        const regex = new RegExp(`\\b${pattern}\\b|\\s${pattern}\\s|^${pattern}\\s|\\s${pattern}$`, 'i');
        if (regex.test(lower)) {
            return certainField(surfs, [pattern]);
        }
    }

    // Handle "Klasse 4" (incisal edge fracture) -> inzisal surface
    if (lower.includes('klasse 4') || lower.includes('klasse vier') || lower.includes('klasse iv')) {
        return certainField(['i'], ['klasse 4']);
    }

    // Handle single "o" as standalone surface
    if (lower.match(/\bo\b/) && !lower.includes('od') && !lower.includes('ob') && !lower.includes('mo')) {
        surfaces.push('o');
        evidence.push('o');
    }

    // Word patterns
    const wordMap: Record<string, Surface> = {
        'mesial': 'm',
        'okklusal': 'o',
        'okklusaldistal': 'o', // Will also add d below
        'distal': 'd',
        'bukkal': 'b',
        'lingual': 'l',
        'palatinal': 'l',
        'inzisal': 'i',
        'approximal': 'm', // Will also add d
    };

    for (const [word, surf] of Object.entries(wordMap)) {
        if (lower.includes(word)) {
            if (!surfaces.includes(surf)) {
                surfaces.push(surf);
                evidence.push(word);
            }
            // Handle okklusaldistal
            if (word === 'okklusaldistal' && !surfaces.includes('d')) {
                surfaces.push('d');
            }
            // Handle approximal = m+d
            if (word === 'approximal' && !surfaces.includes('d')) {
                surfaces.push('d');
            }
        }
    }

    if (surfaces.length > 0) {
        return certainField(surfaces, evidence);
    }

    return unknownField();
}

/**
 * Extract costs (in EUR)
 */
function parseCosts(text: string): Field<number> {
    const patterns = [
        /(\d+)\s*€/,
        /(\d+)\s*euro/i,
        /EUR\s*(\d+)/i,
        /(\d+)\s*EUR/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const value = parseInt(match[1], 10);
            if (!isNaN(value) && value > 0 && value < 10000) {
                return certainField(value, [match[0]]);
            }
        }
    }

    return unknownField();
}

/**
 * Extract keyword flags (FACTUAL: what words were SAID, not what they MEAN)
 * 
 * This is NOT diagnosis. This is raw keyword detection.
 * Engine/Rules will interpret these flags into actual diagnosis.
 */
function parseKeywordFlags(text: string): KeywordFlags {
    const lower = text.toLowerCase();

    return {
        // Deep cavity keywords
        saidDeepCavity: lower.includes('profunda') ||
            lower.includes('pulpanah') ||
            (lower.includes('tief') && !lower.includes('nicht tief')),

        // Superficial keywords
        saidSuperficial: lower.includes('superficialis') ||
            lower.includes('oberflächlich'),

        // Fracture keywords
        saidFracture: lower.includes('fraktur') ||
            lower.includes('abgebrochen') ||
            lower.includes('ecke fehlt'),

        // Caries keywords (generic)
        saidCaries: lower.includes('karies') ||
            lower.includes('caries') ||
            lower.includes('media'),
    };
}

/**
 * Extract anesthesia info
 */
function parseAnesthesia(text: string): Field<AnesthesiaInfo> {
    const lower = text.toLowerCase();

    // Explicit "keine" or "ohne"
    if ((lower.includes('ohne') && (lower.includes('anästhesie') || lower.includes('la') || lower.includes('betäubung'))) ||
        lower.includes('keine la') || lower.includes('keine anästhesie')) {
        return certainField({ present: false, type: 'keine' }, ['ohne anästhesie']);
    }

    // Leitung explicit
    if (lower.includes('leitung') || lower.includes('leitungsanästhesie')) {
        const evidence = lower.includes('leitungsanästhesie') ? 'leitungsanästhesie' : 'leitung';
        return certainField({ present: true, type: 'leitung' }, [evidence]);
    }

    // Infiltration explicit
    if (lower.includes('infiltr')) {
        return certainField({ present: true, type: 'infiltr' }, ['infiltration']);
    }

    // Generic anesthesia mentioned but type unknown
    if (lower.includes('anästhesie') || lower.match(/\bla\b/) || lower.includes('betäubung') ||
        lower.includes('lokalanästhesie')) {
        const evidence = lower.includes('lokalanästhesie') ? 'lokalanästhesie' :
            lower.includes('anästhesie') ? 'anästhesie' :
                lower.includes('betäubung') ? 'betäubung' : 'la';
        return createField({ present: true, type: 'unknown' }, 0.7, [evidence], true);
    }

    // No mention = unknown (NOT "keine")
    return unknownField();
}

/**
 * Extract kofferdam
 */
function parseKofferdam(text: string): Field<boolean> {
    const lower = text.toLowerCase();

    // Check "relative" FIRST - it means NO kofferdam
    if (lower.includes('relative trockenlegung') ||
        (lower.includes('relativ') && !lower.includes('kofferdam'))) {
        return certainField(false, ['relativ']);
    }

    if (lower.includes('watteroll')) {
        return certainField(false, ['watteroll']);
    }

    if (lower.includes('ohne kofferdam')) {
        return certainField(false, ['ohne kofferdam']);
    }

    // Kofferdam = true cases
    if (lower.includes('kofferdam')) {
        return certainField(true, ['kofferdam']);
    }

    if (lower.includes('absolut') && lower.includes('trocken')) {
        return certainField(true, ['absolut trocken']);
    }

    return unknownField();
}

/**
 * Extract tiefe
 */
function parseTiefe(text: string): Field<TiefeType> {
    const lower = text.toLowerCase();

    if (lower.includes('tief') && !lower.includes('nicht tief')) {
        return certainField('tief', ['tief']);
    }

    if (lower.includes('profunda') || lower.includes('pulpanah')) {
        const evidence = lower.includes('profunda') ? 'profunda' : 'pulpanah';
        return certainField('tief', [evidence]);
    }

    if (lower.includes('nicht tief') || lower.includes('media') || lower.includes('superficialis')) {
        const evidence = lower.includes('nicht tief') ? 'nicht tief' :
            lower.includes('superficialis') ? 'superficialis' : 'media';
        return certainField('normal', [evidence]);
    }

    return unknownField();
}

/**
 * Extract vitality
 */
function parseVitality(text: string): Field<VitalityType> {
    const lower = text.toLowerCase();

    // Positive
    if (lower.match(/vipr?\s*\+/) || lower.match(/vipr?\s+pos/) || lower.match(/vipr?\s+plus/) ||
        (lower.includes('vital') && !lower.includes('devital') && !lower.includes('avital'))) {
        const evidence = lower.includes('vital') ? 'vital' : 'vipr+';
        return certainField('+', [evidence]);
    }

    // Negative
    if (lower.match(/vipr?\s*-/) || lower.match(/vipr?\s+neg/) || lower.match(/vipr?\s+minus/) ||
        lower.includes('devital') || lower.includes('avital')) {
        const evidence = lower.includes('devital') ? 'devital' :
            lower.includes('avital') ? 'avital' : 'vipr-';
        return certainField('-', [evidence]);
    }

    return unknownField();
}

/**
 * Extract percussion
 */
function parsePercussion(text: string): Field<PercussionType> {
    const lower = text.toLowerCase();

    // Negative (no pain)
    if (lower.match(/perk\s*-/) || lower.match(/perk\s+neg/) || lower.match(/perk\s+minus/) ||
        lower.includes('perkussionsnegativ') || lower.includes('perkussion negativ')) {
        return certainField('-', ['perk-']);
    }

    // Positive (pain)
    if (lower.match(/perk\s*\+/) || lower.match(/perk\s+pos/) || lower.match(/perk\s+plus/) ||
        lower.includes('perkussionspositiv') || lower.includes('perkussion positiv') ||
        lower.includes('perkussionsempfindlich')) {
        const evidence = lower.includes('perkussionsempfindlich') ? 'perkussionsempfindlich' : 'perk+';
        return certainField('+', [evidence]);
    }

    return unknownField();
}

/**
 * Extract capping
 */
function parseCapping(text: string): Field<CappingInfo> {
    const lower = text.toLowerCase();
    let type: CappingType = 'unknown';
    let material: CappingMaterial = 'unknown';
    const evidence: string[] = [];

    // CP (indirect)
    if (lower.includes(' cp ') || lower.includes(' cp') ||
        (lower.includes('indirekt') && lower.includes('überkapp'))) {
        type = 'cp';
        evidence.push('cp');
    }

    // P (direct)
    if (lower.includes(' p ') || lower.includes('direkt') && lower.includes('überkapp')) {
        type = 'p';
        evidence.push(lower.includes('direkt') ? 'direkte überkappung' : 'p');
    }

    // Materials
    if (lower.includes('caoh') || lower.includes('calciumhydroxid')) {
        material = 'CaOH';
        evidence.push('CaOH');
    } else if (lower.includes('mta')) {
        material = 'MTA';
        evidence.push('MTA');
    } else if (lower.includes('biodentine')) {
        material = 'Biodentine';
        evidence.push('Biodentine');
    }

    if (type !== 'unknown' || material !== 'unknown') {
        const present = type !== 'unknown';
        return certainField({ present, type, material }, evidence);
    }

    return unknownField();
}

/**
 * Extract material
 */
function parseMaterial(text: string): Field<string> {
    const lower = text.toLowerCase();

    if (lower.includes('komposit') || lower.includes('composite')) {
        return certainField('Komposit', ['komposit']);
    }

    if (lower.includes('amalgam')) {
        return certainField('Amalgam', ['amalgam']);
    }

    if (lower.includes('glasionomer') || lower.includes('giz')) {
        const evidence = lower.includes('glasionomer') ? 'glasionomer' : 'giz';
        return certainField('Glasionomer', [evidence]);
    }

    return unknownField();
}

/**
 * Check for multiple teeth (segmentation needed)
 */
function checkMultipleTeeth(text: string): boolean {
    const matches = text.match(/\b[1-4][1-8]\b/g);
    return matches !== null && matches.length > 1;
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXTRACTION FUNCTION
// ═══════════════════════════════════════════════════════════════

export interface ExtractionOptions {
    skipLLM?: boolean;
}

export async function extractFromDictationV2(
    dictation: string,
    options: ExtractionOptions = {}
): Promise<ExtractedDataV2> {
    console.log('[V6 Extract V2] Input:', dictation);

    // Normalize text
    const normalized = dictation.trim();

    // Check for multiple teeth (segmentation case)
    const hasMultipleTeeth = checkMultipleTeeth(normalized);
    if (hasMultipleTeeth) {
        console.log('[V6 Extract V2] WARNING: Multiple teeth detected, needs segmentation');
    }

    // Stage A: Deterministic parsing
    const result = createEmptyExtraction(dictation, normalized);

    // Parse all fields
    result.tooth = hasMultipleTeeth ? unknownField() : parseTooth(normalized);
    result.surfaces = hasMultipleTeeth ? unknownField() : parseSurfaces(normalized);
    // NO diagnosis - that's Engine logic, not extraction
    result.costs = parseCosts(normalized);
    result.mentioned.anesthesia = parseAnesthesia(normalized);
    result.mentioned.kofferdam = parseKofferdam(normalized);
    result.mentioned.tiefe = parseTiefe(normalized);
    result.mentioned.vitality = parseVitality(normalized);
    result.mentioned.percussion = parsePercussion(normalized);
    result.mentioned.capping = parseCapping(normalized);
    result.mentioned.material = parseMaterial(normalized);
    // Factual keyword flags
    result.keywordFlags = parseKeywordFlags(normalized);

    // Mark segmentation hint
    if (hasMultipleTeeth) {
        result.tooth.needsConfirmation = true;
        result.surfaces.needsConfirmation = true;
    }

    console.log('[V6 Extract V2] Stage A result:', {
        tooth: result.tooth,
        surfaces: result.surfaces,
        costs: result.costs,
        anesthesia: result.mentioned.anesthesia,
    });

    // Stage B: LLM (optional, for ambiguous cases)
    // DISABLED for now - only deterministic extraction
    // if (!options.skipLLM && hasAmbiguousFields(result)) {
    //     await enhanceWithLLM(result);
    // }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export { extractFromDictationV2 as extractFromDictation };
