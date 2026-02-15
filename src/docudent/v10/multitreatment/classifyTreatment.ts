/**
 * Segment Treatment Classifier (P14)
 *
 * Purpose: Pick a treatmentId for a dictation segment.
 * Rule: deterministic keyword matching, no LLM.
 */

export type ClassifiedTreatment = {
    treatmentId: 'fuellung' | 'endo' | 'extraction';
    confidence: 'high' | 'medium' | 'low';
    reason: string;
};

const ENDO_KEYWORDS = [
    'endo',
    'wurzel',
    'wurzelkanal',
    'kanal',
    'apex',
    'guttapercha',
    'sealer',
    'spülung',
    'naocl',
    'edta',
];

const EXTRACTION_KEYWORDS = [
    'extraktion',
    'ex',
    'zahn ziehen',
    'entfernt',
    'entfernung',
    'luxation',
    'alveole',
    'naht',
    'chirurg',
];

const FUELLUNG_KEYWORDS = [
    'füllung',
    'fuellung',
    'komposit',
    'amalgam',
    'giz',
    'glasionomer',
    'kavität',
    'karies',
    'adhäsiv',
    'adhesiv',
];

function hasAny(text: string, terms: string[]): string | null {
    const lower = text.toLowerCase();
    for (const term of terms) {
        if (lower.includes(term)) return term;
    }
    return null;
}

export function classifyTreatmentId(segmentText: string): ClassifiedTreatment {
    const extractionHit = hasAny(segmentText, EXTRACTION_KEYWORDS);
    if (extractionHit) {
        return { treatmentId: 'extraction', confidence: 'high', reason: `keyword:${extractionHit}` };
    }

    const endoHit = hasAny(segmentText, ENDO_KEYWORDS);
    if (endoHit) {
        return { treatmentId: 'endo', confidence: 'high', reason: `keyword:${endoHit}` };
    }

    const fuellungHit = hasAny(segmentText, FUELLUNG_KEYWORDS);
    if (fuellungHit) {
        return { treatmentId: 'fuellung', confidence: 'medium', reason: `keyword:${fuellungHit}` };
    }

    return { treatmentId: 'fuellung', confidence: 'low', reason: 'default' };
}
