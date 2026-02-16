/**
 * Segment Treatment Classifier (P14)
 *
 * Purpose: Pick a treatmentId for a dictation segment.
 * Rule: deterministic keyword matching, no LLM.
 */

export type ClassifiedTreatment = {
    treatmentId: 'fuellung' | 'endo' | 'extraction' | 'crown_prep';
    confidence: 'high' | 'medium' | 'low';
    reason: string;
};

export type TreatmentSignal = {
    treatmentId: ClassifiedTreatment['treatmentId'];
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

const CROWN_PREP_CORE_KEYWORDS = [
    'kronenpräparation',
    'kronenpraparation',
    'kronenpraeparation',
    'kronenpräp',
    'kronenpraep',
    'krone',
    'krone beschliffen',
    'beschliffen',
    'präparation',
    'praeparation',
    'abformung',
];

function hasAny(text: string, terms: string[]): string | null {
    const lower = text.toLowerCase();
    for (const term of terms) {
        if (term.length <= 2) {
            const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const tokenPattern = new RegExp(`\\b${escaped}\\b`, 'i');
            if (tokenPattern.test(lower)) return term;
            continue;
        }
        if (lower.includes(term)) return term;
    }
    return null;
}

export function detectTreatmentSignals(segmentText: string): TreatmentSignal[] {
    const signals: TreatmentSignal[] = [];

    const extractionHit = hasAny(segmentText, EXTRACTION_KEYWORDS);
    if (extractionHit) {
        signals.push({ treatmentId: 'extraction', reason: `keyword:${extractionHit}` });
    }

    const endoHit = hasAny(segmentText, ENDO_KEYWORDS);
    if (endoHit) {
        signals.push({ treatmentId: 'endo', reason: `keyword:${endoHit}` });
    }

    const crownPrepHit = hasAny(segmentText, CROWN_PREP_CORE_KEYWORDS);
    if (crownPrepHit) {
        signals.push({ treatmentId: 'crown_prep', reason: `keyword:${crownPrepHit}` });
    }

    const fuellungHit = hasAny(segmentText, FUELLUNG_KEYWORDS);
    if (fuellungHit) {
        signals.push({ treatmentId: 'fuellung', reason: `keyword:${fuellungHit}` });
    }

    return signals;
}

export function classifyTreatmentId(segmentText: string): ClassifiedTreatment {
    const signals = detectTreatmentSignals(segmentText);
    const extractionSignal = signals.find(signal => signal.treatmentId === 'extraction');
    if (extractionSignal) {
        return { treatmentId: 'extraction', confidence: 'high', reason: extractionSignal.reason };
    }

    const endoSignal = signals.find(signal => signal.treatmentId === 'endo');
    if (endoSignal) {
        return { treatmentId: 'endo', confidence: 'high', reason: endoSignal.reason };
    }

    // Crown prep must have at least one strong signal.
    const crownPrepSignal = signals.find(signal => signal.treatmentId === 'crown_prep');
    if (crownPrepSignal) {
        return { treatmentId: 'crown_prep', confidence: 'high', reason: crownPrepSignal.reason };
    }

    const fuellungSignal = signals.find(signal => signal.treatmentId === 'fuellung');
    if (fuellungSignal) {
        return { treatmentId: 'fuellung', confidence: 'medium', reason: fuellungSignal.reason };
    }

    return { treatmentId: 'fuellung', confidence: 'low', reason: 'default' };
}
