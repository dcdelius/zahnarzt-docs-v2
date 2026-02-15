/**
 * Filling Signal Parser — Deterministic Extraction from Dictation
 *
 * ═══════════════════════════════════════════════════════════════
 * Regex/keyword-based signal extraction for filling dictations.
 * NO LLM dependency. Deterministic behavior only.
 * 
 * Extracts: tooth, surfaces, materials, anesthesia, isolation,
 *           caries depth, billing hints, deviation hints.
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface FillingExtractedSignals {
    // Core identifiers
    tooth: string | null;
    surfaces: string[] | null;

    // Materials
    compositeHint: boolean | null;
    glasionomerHint: boolean | null;
    amalgamHint: boolean | null;
    temporaryHint: boolean | null;

    // Clinical findings
    cariesDeepHint: boolean | null;
    pulpProximalHint: boolean | null;

    // Procedures
    anesthesiaHint: 'INFILTRATION' | 'CONDUCTION' | 'NONE' | null;
    rubberDamHint: boolean | null;

    // Billing
    privateHint: boolean | null;
    mehrkostenHint: boolean | null;

    // Deviation
    deviationHint: boolean | null;
}

// ═══════════════════════════════════════════════════════════════
// MAIN PARSER
// ═══════════════════════════════════════════════════════════════

export function parseFillingSignals(dictation: string): FillingExtractedSignals {
    const lower = dictation.toLowerCase();

    return {
        tooth: extractTooth(lower),
        surfaces: extractSurfaces(lower),

        compositeHint: extractCompositeHint(lower),
        glasionomerHint: extractGlasionomerHint(lower),
        amalgamHint: extractAmalgamHint(lower),
        temporaryHint: extractTemporaryHint(lower),

        cariesDeepHint: extractCariesDeepHint(lower),
        pulpProximalHint: extractPulpProximalHint(lower),

        anesthesiaHint: extractAnesthesiaHint(lower),
        rubberDamHint: extractRubberDamHint(lower),

        privateHint: extractPrivateHint(lower),
        mehrkostenHint: extractMehrkostenHint(lower),

        deviationHint: extractDeviationHint(lower),
    };
}

// ═══════════════════════════════════════════════════════════════
// EXTRACTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function extractTooth(lower: string): string | null {
    // FDI notation: 11-48
    const fdiMatch = lower.match(/\b([1-4][1-8])\b/);
    if (fdiMatch) return fdiMatch[1];

    // German words: "zahn 36", "am 46", "der 26"
    const wordMatch = lower.match(/(?:zahn|am|der)\s*([1-4][1-8])/);
    if (wordMatch) return wordMatch[1];

    return null;
}

function extractSurfaces(lower: string): string[] | null {
    const surfaces: string[] = [];

    // Compound surfaces (most specific first)
    if (/mod[bpli]?l?/.test(lower)) {
        if (/modbl/.test(lower)) surfaces.push('MODBL');
        else if (/modb/.test(lower)) surfaces.push('MODB');
        else surfaces.push('MOD');
    } else if (/m[- ]?o[- ]?d/.test(lower)) {
        surfaces.push('MOD');
    }

    // Two-surface
    if (!surfaces.length && /mo\b/.test(lower)) surfaces.push('MO');
    if (!surfaces.length && /od\b/.test(lower)) surfaces.push('OD');

    // Single surfaces
    const singleSurfacePatterns: [RegExp, string][] = [
        [/\bokklusal[e]?\b|\bo\s*-?\s*fläche/, 'O'],
        [/\bmesial[e]?\b/, 'M'],
        [/\bdistal[e]?\b/, 'D'],
        [/\bbukkal[e]?\b/, 'B'],
        [/\blingual[e]?\b/, 'L'],
        [/\binzisal[e]?\b/, 'I'],
        [/\bpalatinal[e]?\b/, 'P'],
    ];

    for (const [pattern, code] of singleSurfacePatterns) {
        if (pattern.test(lower) && !surfaces.includes(code)) {
            surfaces.push(code);
        }
    }

    // Approximal context: "zwischen 36/37"
    if (/zwischen\s*\d{2}\s*[/und]\s*\d{2}/.test(lower)) {
        // Approximal surfaces
        if (!surfaces.includes('M') && !surfaces.includes('D')) {
            if (/mesial|m\s*-?\s*fläche/.test(lower)) surfaces.push('M');
            else if (/distal|d\s*-?\s*fläche/.test(lower)) surfaces.push('D');
            else surfaces.push('M'); // Default to mesial for approximal
        }
    }

    return surfaces.length > 0 ? surfaces : null;
}

function extractCompositeHint(lower: string): boolean | null {
    const compositePatterns = [
        /komposit/,
        /composite/,
        /kunststoff/,
        /zahnfarben/,
        /weiße?\s*füllung/,
        /plastisch\s*(?:weiß|zahnfarben)/,
    ];

    for (const pattern of compositePatterns) {
        if (pattern.test(lower)) return true;
    }
    return null;
}

function extractGlasionomerHint(lower: string): boolean | null {
    const patterns = [
        /glasionomer/,
        /giz/,
        /gic/,
        /glass\s*ionomer/,
        /zement\s*füllung/,
    ];

    for (const pattern of patterns) {
        if (pattern.test(lower)) return true;
    }
    return null;
}

function extractAmalgamHint(lower: string): boolean | null {
    if (/amalgam/.test(lower)) return true;
    return null;
}

function extractTemporaryHint(lower: string): boolean | null {
    const patterns = [
        /provisor/,
        /temporär/,
        /temp\s*füllung/,
        /zwischenfüllung/,
        /cavit/,
        /nur\s*(?:erstmal|erst\s*mal)/,
    ];

    for (const pattern of patterns) {
        if (pattern.test(lower)) return true;
    }
    return null;
}

function extractCariesDeepHint(lower: string): boolean | null {
    const patterns = [
        /tiefe?\s*(?:karies|dentinkaries)/,
        /caries\s*profunda/,
        /tief\s*(?:ins|im)\s*dentin/,
        /fast\s*(?:an|auf)\s*(?:die|der)?\s*pulpa/,
        /kurz\s*vor(?:m|der)?\s*pulpa/,
    ];

    for (const pattern of patterns) {
        if (pattern.test(lower)) return true;
    }
    return null;
}

function extractPulpProximalHint(lower: string): boolean | null {
    const patterns = [
        /pulpanah/,
        /pulpa\s*-?\s*nah/,
        /pulp[ae]\s*proximal/,
        /fast\s*(?:an|auf|bis)\s*(?:die|der|zur)?\s*pulpa/,
        /haarscharf\s*(?:an|vor)/,
        /grenze\s*(?:zur)?\s*pulpa/,
    ];

    for (const pattern of patterns) {
        if (pattern.test(lower)) return true;
    }
    return null;
}

function extractAnesthesiaHint(lower: string): 'INFILTRATION' | 'CONDUCTION' | 'NONE' | null {
    // Conduction first (more specific)
    if (/leitungs\s*an[äa]sthesie|leitungs\s*betäubung|block\s*an[äa]sthesie/.test(lower)) {
        return 'CONDUCTION';
    }

    // Infiltration
    const infiltrationPatterns = [
        /infiltration/,
        /local\s*an[äa]sthes/,
        /lokal\s*an[äa]sthes/,
        /betäub/,
        /gespritzt/,
        /spritze/,
        /pieks/,
        /piks/,
        /anästhesiert/,
    ];

    for (const pattern of infiltrationPatterns) {
        if (pattern.test(lower)) return 'INFILTRATION';
    }

    // Explicit no anesthesia
    if (/ohne\s*(?:an[äa]sthesie|betäubung|spritze)/.test(lower)) {
        return 'NONE';
    }

    return null;
}

function extractRubberDamHint(lower: string): boolean | null {
    const positivePatterns = [
        /kofferdam/,
        /rubber\s*dam/,
        /spanngummi/,
        /absolute?\s*(?:trocken\s*)?legung/,
    ];

    for (const pattern of positivePatterns) {
        if (pattern.test(lower)) return true;
    }

    // Relative isolation mentioned → no rubber dam
    if (/relative?\s*trocken\s*legung/.test(lower)) {
        return false;
    }

    return null;
}

function extractPrivateHint(lower: string): boolean | null {
    const patterns = [
        /privat/,
        /pkv/,
        /privat\s*versichert/,
        /privatpatient/,
        /als\s*privatleistung/,
    ];

    for (const pattern of patterns) {
        if (pattern.test(lower)) return true;
    }
    return null;
}

function extractMehrkostenHint(lower: string): boolean | null {
    const patterns = [
        /mehrkosten/,
        /zuzahlung/,
        /privatanteil/,
        /aufpreis/,
        /eigenanteil/,
        /aufgeklärt\s*(?:über)?\s*(?:die)?\s*kosten/,
        /patient\s*zahlt/,
        /hab\s*ich\s*privat/,
        /machen\s*wir\s*privat/,
    ];

    for (const pattern of patterns) {
        if (pattern.test(lower)) return true;
    }
    return null;
}

function extractDeviationHint(lower: string): boolean | null {
    const patterns = [
        /eigentlich\s*(?:wollten|geplant)/,
        /stattdessen/,
        /leider\s*(?:nur|doch)/,
        /plan\s*geändert/,
        /anders\s*als\s*geplant/,
        /abweichung/,
        /provisorisch\s*(?:erstmal|erst\s*mal)/,
    ];

    for (const pattern of patterns) {
        if (pattern.test(lower)) return true;
    }
    return null;
}

export default parseFillingSignals;
