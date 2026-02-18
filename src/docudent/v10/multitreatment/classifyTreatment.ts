/**
 * Segment Treatment Classifier (P14)
 *
 * Purpose: Pick a treatmentId for a dictation segment.
 * Rule: deterministic keyword matching, no LLM.
 */

import {
    CLASSIFIER_TREATMENT_IDS as MANIFEST_CLASSIFIER_TREATMENT_IDS,
    type ClassifierTreatmentId,
} from '@/docudent/contracts/treatments.manifest';

export const CLASSIFIER_TREATMENT_IDS = [...MANIFEST_CLASSIFIER_TREATMENT_IDS] as const;

export type ClassifiedTreatment = {
    treatmentId: ClassifierTreatmentId;
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
    'kanäle',
    'kanaele',
    'apex',
    'guttapercha',
    'sealer',
    'spülung',
    'spuelung',
    'naocl',
    'edta',
    'trepanation',
    'trepaniert',
    'wurzelfüllung',
    'wurzelfuellung',
    'arbeitslänge',
    'arbeitslaenge',
    'arbeitslängenbestimmung',
    'arbeitslaengenbestimmung',
];

const EXTRACTION_KEYWORDS = [
    'extraktion',
    'ex',
    'zahn ziehen',
    'luxation',
    'alveole',
    'naht',
    'chirurg',
];

const PZR_KEYWORDS = [
    'pzr',
    'professionelle zahnreinigung',
    'zahnreinigung',
    'zahnstein',
    'belagsentfernung',
    'politur',
    'fluoridierung',
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

const KRONE_KEYWORDS = [
    'vollkrone',
    'definitive krone',
    'endgueltige krone',
    'endgültige krone',
    'provisorische krone',
    'krone eingegliedert',
    'krone eingesetzt',
    'krone zementiert',
    'eingliederung krone',
];

const BRUECKE_KEYWORDS = [
    'brücke',
    'bruecke',
    'brückenglied',
    'brueckenglied',
    'adhasivbruecke',
    'adhäsivbrücke',
    'klebebrücke',
    'klebebruecke',
];

const TEILKRONE_KEYWORDS = [
    'teilkrone',
    'onlay',
    'overlay',
    'provisorische teilkrone',
    'teilkrone eingegliedert',
    'teilkrone eingesetzt',
    'teilkrone zementiert',
];

const WSR_KEYWORDS = [
    'wsr',
    'wurzelspitzenresektion',
    'wurzelspitze reseziert',
    'apikoektomie',
    'apektomie',
    'wurzelspitzenamputation',
];

const TRAUMA_KEYWORDS = [
    'trauma',
    'zahntrauma',
    'dental trauma',
    'traumazahn',
    'luxationstrauma',
    'avulsion',
    'zahnunfall',
    'unfallzahn',
    'schienung',
];

const IMPLANT_KEYWORDS = [
    'implant',
    'implantat',
    'implantologie',
    'implantation',
    'implantatinsertion',
    'implantatfreilegung',
    'freilegung implantat',
];

const SCHIENE_KEYWORDS = [
    'okklusionsschiene',
    'aufbissschiene',
    'knirscherschiene',
    'protrusionsschiene',
    'schnarchschiene',
    'schienentherapie',
];

const TEILPROTHESE_KEYWORDS = [
    'teilprothese',
    'interimsteilprothese',
    'klammerprothese',
    'modellgussprothese',
    'modellguss',
];

const TOTALPROTHESE_KEYWORDS = [
    'totalprothese',
    'vollprothese',
    'totale',
    'zahnlos',
    'immediatprothese',
];

const ROENTGEN_KEYWORDS = [
    'röntgen',
    'rontgen',
    'roentgen',
    'xray',
    'zahnfilm',
    'einzelzahnaufnahme',
    'opg',
    'orthopantomogramm',
];

const UNTERSUCHUNG_KEYWORDS = [
    'untersuchung',
    'kontrolluntersuchung',
    'befundkontrolle',
    'check-up',
    'vorsorgeuntersuchung',
];

const UEBERKAPPUNG_KEYWORDS = [
    'überkappung',
    'ueberkappung',
    'direkte ueberkappung',
    'indirekte ueberkappung',
    'pulpaeröffnung',
    'pulpaeroeffnung',
];

const FISSUREN_KEYWORDS = [
    'fissurenversiegelung',
    'fissuren versiegelung',
    'versiegelung',
    'sealant',
    'ip5',
];

const EXPLICIT_FUELLUNG_RE = /\b(f[üu]llung|aufbauf[üu]llung|adh[aä]siv(?:e|er|es|en)?\s+aufbau)\b/i;
const BUILDUP_CONTEXT_RE = /\b(aufbau|kompositaufbau|stumpfaufbau|core\s+buildup)\b/i;
const EXPLICIT_ENDO_RE = /\b(endo|wurzelkanal|aufbereitung|guttapercha|sealer|naocl|edta|trepanation)\b/i;
const EXPLICIT_EXTRACTION_RE = /\b(extraktion|zahn ziehen|entfernt|entfernung|gezogen|alveole|nahtversorgung)\b/i;
const EXPLICIT_CROWN_PREP_RE = /\b(kronenpr[aä]paration|kronenpraeparation|beschliffen|abformung|praeparation|pr[aä]paration)\b/i;

const PARODONTOLOGIE_KEYWORDS = [
    'parodontologie',
    'parodontitis',
    'parodontal',
    'paro',
    'psi',
    'ait',
];

const UPT_KEYWORDS = [
    'upt',
    'unterstuetzende parodontitistherapie',
    'unterstützende parodontitistherapie',
    'recall',
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
    const fissurenHit = hasAny(segmentText, FISSUREN_KEYWORDS);
    const wsrHit = hasAny(segmentText, WSR_KEYWORDS);

    const traumaHit = hasAny(segmentText, TRAUMA_KEYWORDS);
    if (traumaHit) {
        signals.push({ treatmentId: 'trauma', reason: `keyword:${traumaHit}` });
    }

    const implantHit = hasAny(segmentText, IMPLANT_KEYWORDS);
    if (implantHit) {
        signals.push({ treatmentId: 'implant', reason: `keyword:${implantHit}` });
    }

    const schieneHit = hasAny(segmentText, SCHIENE_KEYWORDS);
    if (schieneHit) {
        signals.push({ treatmentId: 'schiene', reason: `keyword:${schieneHit}` });
    }

    const teilprotheseHit = hasAny(segmentText, TEILPROTHESE_KEYWORDS);
    if (teilprotheseHit) {
        signals.push({ treatmentId: 'teilprothese', reason: `keyword:${teilprotheseHit}` });
    }

    const totalprotheseHit = hasAny(segmentText, TOTALPROTHESE_KEYWORDS);
    if (totalprotheseHit) {
        signals.push({ treatmentId: 'totalprothese', reason: `keyword:${totalprotheseHit}` });
    }

    const extractionHit = hasAny(segmentText, EXTRACTION_KEYWORDS);
    const suppressExtractionBecauseTrauma =
        Boolean(traumaHit)
        && !EXPLICIT_EXTRACTION_RE.test(segmentText);
    if (extractionHit && !suppressExtractionBecauseTrauma) {
        signals.push({ treatmentId: 'extraction', reason: `keyword:${extractionHit}` });
    }

    const pzrHit = hasAny(segmentText, PZR_KEYWORDS);
    if (pzrHit) {
        signals.push({ treatmentId: 'pzr', reason: `keyword:${pzrHit}` });
    }

    const endoHit = hasAny(segmentText, ENDO_KEYWORDS);
    const suppressEndoBecauseWsr =
        Boolean(wsrHit)
        && !EXPLICIT_ENDO_RE.test(segmentText);
    if (endoHit && !suppressEndoBecauseWsr) {
        signals.push({ treatmentId: 'endo', reason: `keyword:${endoHit}` });
    }

    const kroneHit = hasAny(segmentText, KRONE_KEYWORDS);
    if (kroneHit) {
        signals.push({ treatmentId: 'krone', reason: `keyword:${kroneHit}` });
    }

    const brueckeHit = hasAny(segmentText, BRUECKE_KEYWORDS);
    if (brueckeHit) {
        signals.push({ treatmentId: 'bruecke', reason: `keyword:${brueckeHit}` });
    }

    const teilkroneHit = hasAny(segmentText, TEILKRONE_KEYWORDS);
    if (teilkroneHit) {
        signals.push({ treatmentId: 'teilkrone', reason: `keyword:${teilkroneHit}` });
    }

    if (wsrHit) {
        signals.push({ treatmentId: 'wsr', reason: `keyword:${wsrHit}` });
    }

    const crownPrepHit = hasAny(segmentText, CROWN_PREP_CORE_KEYWORDS);
    const suppressCrownPrepBecauseKrone =
        Boolean(kroneHit)
        && !EXPLICIT_CROWN_PREP_RE.test(segmentText);
    const suppressCrownPrepBecauseTeilkrone =
        Boolean(teilkroneHit)
        && !EXPLICIT_CROWN_PREP_RE.test(segmentText);
    if (crownPrepHit && !suppressCrownPrepBecauseKrone && !suppressCrownPrepBecauseTeilkrone) {
        signals.push({ treatmentId: 'crown_prep', reason: `keyword:${crownPrepHit}` });
    }

    const fuellungHit = hasAny(segmentText, FUELLUNG_KEYWORDS);
    const suppressFuellungBecauseFissuren =
        Boolean(fissurenHit)
        && !EXPLICIT_FUELLUNG_RE.test(segmentText);
    const suppressFuellungBecauseCrownContext =
        (Boolean(crownPrepHit) || Boolean(kroneHit) || Boolean(teilkroneHit))
        && !EXPLICIT_FUELLUNG_RE.test(segmentText)
        && !BUILDUP_CONTEXT_RE.test(segmentText);
    if (fuellungHit && !suppressFuellungBecauseFissuren && !suppressFuellungBecauseCrownContext) {
        signals.push({ treatmentId: 'fuellung', reason: `keyword:${fuellungHit}` });
    }

    const roentgenHit = hasAny(segmentText, ROENTGEN_KEYWORDS);
    if (roentgenHit) {
        signals.push({ treatmentId: 'roentgen', reason: `keyword:${roentgenHit}` });
    }

    const untersuchungHit = hasAny(segmentText, UNTERSUCHUNG_KEYWORDS);
    if (untersuchungHit) {
        signals.push({ treatmentId: 'untersuchung', reason: `keyword:${untersuchungHit}` });
    }

    const ueberkappungHit = hasAny(segmentText, UEBERKAPPUNG_KEYWORDS);
    if (ueberkappungHit) {
        signals.push({ treatmentId: 'ueberkappung', reason: `keyword:${ueberkappungHit}` });
    }

    if (fissurenHit) {
        signals.push({ treatmentId: 'fissurenversiegelung', reason: `keyword:${fissurenHit}` });
    }

    const parodontologieHit = hasAny(segmentText, PARODONTOLOGIE_KEYWORDS);
    if (parodontologieHit) {
        signals.push({ treatmentId: 'parodontologie', reason: `keyword:${parodontologieHit}` });
    }

    const uptHit = hasAny(segmentText, UPT_KEYWORDS);
    if (uptHit) {
        signals.push({ treatmentId: 'upt', reason: `keyword:${uptHit}` });
    }

    return signals;
}

export function classifyTreatmentId(segmentText: string): ClassifiedTreatment {
    const signals = detectTreatmentSignals(segmentText);
    const traumaSignal = signals.find(signal => signal.treatmentId === 'trauma');
    if (traumaSignal) {
        return { treatmentId: 'trauma', confidence: 'high', reason: traumaSignal.reason };
    }

    const implantSignal = signals.find(signal => signal.treatmentId === 'implant');
    if (implantSignal) {
        return { treatmentId: 'implant', confidence: 'high', reason: implantSignal.reason };
    }

    const schieneSignal = signals.find(signal => signal.treatmentId === 'schiene');
    if (schieneSignal) {
        return { treatmentId: 'schiene', confidence: 'high', reason: schieneSignal.reason };
    }

    const teilprotheseSignal = signals.find(signal => signal.treatmentId === 'teilprothese');
    if (teilprotheseSignal) {
        return { treatmentId: 'teilprothese', confidence: 'high', reason: teilprotheseSignal.reason };
    }

    const totalprotheseSignal = signals.find(signal => signal.treatmentId === 'totalprothese');
    if (totalprotheseSignal) {
        return { treatmentId: 'totalprothese', confidence: 'high', reason: totalprotheseSignal.reason };
    }

    const extractionSignal = signals.find(signal => signal.treatmentId === 'extraction');
    if (extractionSignal) {
        return { treatmentId: 'extraction', confidence: 'high', reason: extractionSignal.reason };
    }

    const pzrSignal = signals.find(signal => signal.treatmentId === 'pzr');
    if (pzrSignal) {
        return { treatmentId: 'pzr', confidence: 'high', reason: pzrSignal.reason };
    }

    const endoSignal = signals.find(signal => signal.treatmentId === 'endo');
    if (endoSignal) {
        return { treatmentId: 'endo', confidence: 'high', reason: endoSignal.reason };
    }

    const kroneSignal = signals.find(signal => signal.treatmentId === 'krone');
    if (kroneSignal) {
        return { treatmentId: 'krone', confidence: 'high', reason: kroneSignal.reason };
    }

    const brueckeSignal = signals.find(signal => signal.treatmentId === 'bruecke');
    if (brueckeSignal) {
        return { treatmentId: 'bruecke', confidence: 'high', reason: brueckeSignal.reason };
    }

    const teilkroneSignal = signals.find(signal => signal.treatmentId === 'teilkrone');
    if (teilkroneSignal) {
        return { treatmentId: 'teilkrone', confidence: 'high', reason: teilkroneSignal.reason };
    }

    const wsrSignal = signals.find(signal => signal.treatmentId === 'wsr');
    if (wsrSignal) {
        return { treatmentId: 'wsr', confidence: 'high', reason: wsrSignal.reason };
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

    const roentgenSignal = signals.find(signal => signal.treatmentId === 'roentgen');
    if (roentgenSignal) {
        return { treatmentId: 'roentgen', confidence: 'medium', reason: roentgenSignal.reason };
    }

    const untersuchungSignal = signals.find(signal => signal.treatmentId === 'untersuchung');
    if (untersuchungSignal) {
        return { treatmentId: 'untersuchung', confidence: 'medium', reason: untersuchungSignal.reason };
    }

    const ueberkappungSignal = signals.find(signal => signal.treatmentId === 'ueberkappung');
    if (ueberkappungSignal) {
        return { treatmentId: 'ueberkappung', confidence: 'medium', reason: ueberkappungSignal.reason };
    }

    const fissurenSignal = signals.find(signal => signal.treatmentId === 'fissurenversiegelung');
    if (fissurenSignal) {
        return { treatmentId: 'fissurenversiegelung', confidence: 'medium', reason: fissurenSignal.reason };
    }

    const uptSignal = signals.find(signal => signal.treatmentId === 'upt');
    if (uptSignal) {
        return { treatmentId: 'upt', confidence: 'medium', reason: uptSignal.reason };
    }

    const parodontologieSignal = signals.find(signal => signal.treatmentId === 'parodontologie');
    if (parodontologieSignal) {
        return { treatmentId: 'parodontologie', confidence: 'medium', reason: parodontologieSignal.reason };
    }

    return { treatmentId: 'fuellung', confidence: 'low', reason: 'default' };
}
