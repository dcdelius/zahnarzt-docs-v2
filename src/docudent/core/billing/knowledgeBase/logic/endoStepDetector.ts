/**
 * Endo Step Detector — MVP keyword-based detection
 * 
 * Detects which phase of endodontic treatment was performed:
 * - endo_start: Trepanation, initial access, Ca(OH)2 placement
 * - endo_interim: Continued instrumentation, medication renewed
 * - endo_complete: Obturation (Guttapercha/Sealer), X-ray check
 * 
 * RULES:
 * - Detection is keyword-based, ordered by specificity (complete > interim > start)
 * - "einlage erneuert" => interim (NOT start)
 * - "einlage" alone => start
 * - If no keywords match => null (triggers askback)
 * - Deterministic: same input => same output
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type EndoStep = 'endo_start' | 'endo_interim' | 'endo_complete';

// ═══════════════════════════════════════════════════════════════
// LABELS (German, chairside-friendly)
// ═══════════════════════════════════════════════════════════════

export const ENDO_STEP_LABELS: Record<EndoStep, string> = {
    endo_start: 'Trepanation/Eröffnung',
    endo_interim: 'Zwischensitzung',
    endo_complete: 'Wurzelfüllung/Abschluss',
};

// ═══════════════════════════════════════════════════════════════
// KEYWORD PATTERNS (ordered by specificity)
// ═══════════════════════════════════════════════════════════════

const COMPLETE_KEYWORDS = [
    'wurzelfüllung',
    'wurzelfuellung',
    'guttapercha',
    'wf eingebracht',
    'wf abgeschlossen',
    'gefüllt',
    'gefuellt',
    'abgeschlossen',
    'obturation',
];

const INTERIM_KEYWORDS = [
    'einlage erneuert',
    'zwischensitzung',
    'weiter aufbereitet',
    'aufbereitung fortgesetzt',
    'medikament erneuert',
];

const START_KEYWORDS = [
    'trepanation',
    'eröffnet',
    'eroeffnet',
    'zugangskavität',
    'zugangskavitaet',
    'einlage',  // Note: "einlage erneuert" is checked first in interim
    'wkb begonnen',
    'wurzelbehandlung gestartet',
    'kanäle dargestellt',
    'kanaele dargestellt',
];

// ═══════════════════════════════════════════════════════════════
// DETECTION RESULT
// ═══════════════════════════════════════════════════════════════

export interface EndoStepDetectionResult {
    step: EndoStep | null;
    evidence: string[];
}

// ═══════════════════════════════════════════════════════════════
// MAIN DETECTION FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Detect endo step from raw dictation text.
 * 
 * @param rawText - Raw dictation text (any case)
 * @returns Detection result with step (or null if ambiguous) and evidence keywords
 */
export function detectEndoStep(rawText: string): EndoStepDetectionResult {
    const lower = rawText.toLowerCase();
    const evidence: string[] = [];

    // 1. Check COMPLETE first (most specific)
    for (const keyword of COMPLETE_KEYWORDS) {
        if (lower.includes(keyword)) {
            evidence.push(keyword);
            return { step: 'endo_complete', evidence };
        }
    }

    // 2. Check INTERIM (before start, because "einlage erneuert" > "einlage")
    for (const keyword of INTERIM_KEYWORDS) {
        if (lower.includes(keyword)) {
            evidence.push(keyword);
            return { step: 'endo_interim', evidence };
        }
    }

    // 3. Check START
    for (const keyword of START_KEYWORDS) {
        if (lower.includes(keyword)) {
            evidence.push(keyword);
            return { step: 'endo_start', evidence };
        }
    }

    // 4. No keywords matched => ambiguous, need askback
    return { step: null, evidence: [] };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
    detectEndoStep,
    ENDO_STEP_LABELS,
};
